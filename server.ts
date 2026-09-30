import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use('/api/billing/webhook', express.raw({ type: 'application/json' }));
app.use(express.json());

// Central toolkit account bridge.
// Firebase remains the authentication authority; Supabase stores account,
// subscription and entitlement state. Supabase service credentials never reach
// the browser.
const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, '');
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;
// Keep the legacy variable as a temporary fallback during the Supabase API-key migration.
// The preferred server credential is the new Secret API key (sb_secret_...).
const supabaseServiceRoleKey = supabaseSecretKey || process.env.SUPABASE_SERVICE_ROLE_KEY;

const firebaseAdminApp = (() => {
  if (getApps().length > 0) return getApps()[0];
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!serviceAccountJson) return null;
  try {
    return initializeApp({ credential: cert(JSON.parse(serviceAccountJson)) });
  } catch (error) {
    console.error('Invalid FIREBASE_SERVICE_ACCOUNT_JSON:', error);
    return null;
  }
})();

const firebaseAdminAuth = firebaseAdminApp ? getAuth(firebaseAdminApp) : null;

async function supabaseRequest(path: string, init: RequestInit = {}) {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error('Supabase account service is not configured.');
  }
  const headers: Record<string, string> = {
    apikey: supabaseServiceRoleKey,
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string> | undefined),
  };

  // New Supabase Secret API keys are not JWTs. They must be sent through
  // the apikey header and must not be placed in Authorization: Bearer.
  // Legacy service_role JWTs still require the Authorization header.
  if (!supabaseSecretKey) {
    headers.Authorization = `Bearer ${supabaseServiceRoleKey}`;
  }

  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    ...init,
    headers,
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Supabase request failed (${response.status}): ${body}`);
  }
  if (response.status === 204) return null;
  return response.json();
}

app.get('/api/account/session', async (req, res) => {
  const authorization = req.headers.authorization;
  const idToken = authorization?.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length)
    : null;

  if (!idToken) return res.status(401).json({ error: 'Missing Firebase ID token.' });

  if (!firebaseAdminAuth || !supabaseUrl || !supabaseServiceRoleKey) {
    return res.status(503).json({
      error: 'Central account service is not configured.',
      code: 'ACCOUNT_SERVICE_NOT_CONFIGURED',
    });
  }

  try {
    const firebaseUser = await firebaseAdminAuth.verifyIdToken(idToken);
    const identity = encodeURIComponent(firebaseUser.uid);
    const profiles = await supabaseRequest(
      `profiles?select=id,email,display_name,photo_url,onboarding_completed&auth_provider=eq.firebase&auth_subject=eq.${identity}&limit=1`,
    );
    let profile = profiles?.[0];

    if (!profile) {
      // The identity migration uses a unique index rather than a named
      // PostgreSQL constraint. Avoid PostgREST's on_conflict target here and
      // create the profile only after the identity lookup above confirms it is
      // absent.
      const created = await supabaseRequest('profiles', {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({
          auth_provider: 'firebase',
          auth_subject: firebaseUser.uid,
          email: firebaseUser.email ?? null,
          display_name: firebaseUser.name ?? null,
          photo_url: firebaseUser.picture ?? null,
        }),
      });
      profile = created?.[0];
    }

    if (!profile?.id) throw new Error('Could not create or load toolkit profile.');

    const liveSubscriptions = await supabaseRequest(
      `subscriptions?select=plan_id,provider,status,current_period_end&user_id=eq.${profile.id}&status=in.(active,trialing,past_due,incomplete)&or=(current_period_end.is.null,current_period_end.gt.${encodeURIComponent(new Date().toISOString())})&order=created_at.desc&limit=1`,
    );
    let subscription = liveSubscriptions?.[0];

    if (!subscription) {
      const created = await supabaseRequest('subscriptions', {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({
          user_id: profile.id,
          plan_id: 'free',
          provider: 'none',
          status: 'active',
        }),
      });
      subscription = created?.[0];
    }

    const planId = subscription?.plan_id || 'free';
    const entitlementRows = (await supabaseRequest(
      `plan_entitlements?select=feature_key,enabled&plan_id=eq.${encodeURIComponent(planId)}&enabled=eq.true`,
    )) as Array<{ feature_key: string; enabled: boolean }> | null;
    const overrideRows = (await supabaseRequest(
      `app_entitlements?select=app_id,enabled&user_id=eq.${profile.id}`,
    )) as Array<{ app_id: string; enabled: boolean }> | null;

    const appAccess: Record<string, boolean> = {
      'budget-planner': true,
      'app-2': false,
      'app-3': false,
      'app-4': false,
    };
    for (const row of overrideRows ?? []) appAccess[row.app_id] = Boolean(row.enabled);

    return res.json({
      version: 1,
      session: {
        user: {
          id: profile.id,
          email: profile.email ?? firebaseUser.email ?? null,
          displayName: profile.display_name ?? firebaseUser.name ?? null,
          photoUrl: profile.photo_url ?? firebaseUser.picture ?? null,
          onboardingComplete: Boolean(profile.onboarding_completed),
        },
        subscription: {
          planId,
          status: subscription?.status || 'active',
          provider: subscription?.provider || 'none',
          currentPeriodEnd: subscription?.current_period_end || null,
        },
        entitlements: {
          apps: appAccess,
          features: Object.fromEntries(
            (entitlementRows ?? []).map((row) => [row.feature_key, Boolean(row.enabled)]),
          ),
        },
      },
    });
  } catch (error) {
    console.error('Toolkit account session error:', error);
    return res.status(500).json({ error: 'Unable to load toolkit account session.' });
  }
});

app.post('/api/account/onboarding', async (req, res) => {
  const authorization = req.headers.authorization;
  const idToken = authorization?.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length)
    : null;

  if (!idToken) return res.status(401).json({ error: 'Missing Firebase ID token.' });
  if (!firebaseAdminAuth || !supabaseUrl || !supabaseServiceRoleKey) {
    return res.status(503).json({ error: 'Central account service is not configured.' });
  }

  try {
    const firebaseUser = await firebaseAdminAuth.verifyIdToken(idToken);
    const displayName = typeof req.body?.displayName === 'string' ? req.body.displayName.trim() : '';
    const planId = req.body?.planId;

    if (!displayName) return res.status(400).json({ error: 'Display name is required.' });
    if (!['free', 'plus', 'pro'].includes(planId)) {
      return res.status(400).json({ error: 'Invalid subscription plan.' });
    }

    const profile = await getToolkitProfile(firebaseUser.uid);
    if (!profile?.id) return res.status(404).json({ error: 'Toolkit profile not found.' });

    await supabaseRequest(`profiles?id=eq.${profile.id}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({
        display_name: displayName,
        onboarding_completed: true,
        onboarding_completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }),
    });

    // Free selection is immediately active. Paid selection only records that
    // onboarding is complete; Monime checkout/webhooks remain the authority
    // that activates Plus or Pro.
    if (planId === 'free') {
      const live = await supabaseRequest(
        `subscriptions?select=id&user_id=eq.${profile.id}&status=in.(active,trialing,past_due,incomplete)&or=(current_period_end.is.null,current_period_end.gt.${encodeURIComponent(new Date().toISOString())})&limit=1`,
      );
      if (live?.[0]?.id) {
        await supabaseRequest(`subscriptions?id=eq.${live[0].id}`, {
          method: 'PATCH',
          headers: { Prefer: 'return=minimal' },
          body: JSON.stringify({
            plan_id: 'free',
            provider: 'none',
            provider_subscription_id: null,
            status: 'active',
            current_period_end: null,
            updated_at: new Date().toISOString(),
          }),
        });
      }
    }

    return res.json({ ok: true, planId });
  } catch (error) {
    console.error('Toolkit onboarding error:', error);
    return res.status(500).json({ error: 'Unable to save onboarding details.' });
  }
});


async function getToolkitProfile(firebaseUid: string) {
  const identity = encodeURIComponent(firebaseUid);
  const profiles = await supabaseRequest(
    `profiles?select=id,email,display_name,photo_url&auth_provider=eq.firebase&auth_subject=eq.${identity}&limit=1`,
  );
  return profiles?.[0] ?? null;
}

async function requireToolkitFeature(firebaseUid: string, featureKey: string) {
  const profile = await getToolkitProfile(firebaseUid);
  if (!profile?.id) {
    const error = new Error('Toolkit profile not found.');
    (error as Error & { status?: number }).status = 404;
    throw error;
  }

  const subscriptions = await supabaseRequest(
    `subscriptions?select=plan_id,status,current_period_end&user_id=eq.${profile.id}&status=in.(active,trialing,past_due,incomplete)&or=(current_period_end.is.null,current_period_end.gt.${encodeURIComponent(new Date().toISOString())})&order=created_at.desc&limit=1`,
  );
  const planId = subscriptions?.[0]?.plan_id ?? 'free';
  const entitlements = await supabaseRequest(
    `plan_entitlements?select=enabled&plan_id=eq.${encodeURIComponent(planId)}&feature_key=eq.${encodeURIComponent(featureKey)}&enabled=eq.true&limit=1`,
  );

  if (!entitlements?.[0]?.enabled) {
    const error = new Error(`Feature ${featureKey} is not enabled for this account.`);
    (error as Error & { status?: number }).status = 403;
    throw error;
  }

  return profile;
}

async function requireCloudSync(firebaseUid: string) {
  const profile = await getToolkitProfile(firebaseUid);
  if (!profile?.id) {
    const error = new Error('Toolkit profile not found.');
    (error as Error & { status?: number }).status = 404;
    throw error;
  }

  const subscriptions = await supabaseRequest(
    `subscriptions?select=plan_id,status&user_id=eq.${profile.id}&status=in.(active,trialing,past_due,incomplete)&or=(current_period_end.is.null,current_period_end.gt.${encodeURIComponent(new Date().toISOString())})&order=created_at.desc&limit=1`,
  );
  const planId = subscriptions?.[0]?.plan_id ?? 'free';
  const entitlements = await supabaseRequest(
    `plan_entitlements?select=enabled&plan_id=eq.${encodeURIComponent(planId)}&feature_key=eq.budget.cloudSync&enabled=eq.true&limit=1`,
  );

  if (!entitlements?.[0]?.enabled) {
    const error = new Error('Cloud sync is not enabled for this account.');
    (error as Error & { status?: number }).status = 403;
    throw error;
  }

  return profile;
}

async function verifyFirebaseRequest(req: express.Request) {
  const authorization = req.headers.authorization;
  const idToken = authorization?.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length)
    : null;

  if (!idToken) {
    const error = new Error('Missing Firebase ID token.');
    (error as Error & { status?: number }).status = 401;
    throw error;
  }
  if (!firebaseAdminAuth || !supabaseUrl || !supabaseServiceRoleKey) {
    const error = new Error('Central account service is not configured.');
    (error as Error & { status?: number }).status = 503;
    throw error;
  }

  return firebaseAdminAuth.verifyIdToken(idToken);
}

app.get('/api/workbook', async (req, res) => {
  try {
    const firebaseUser = await verifyFirebaseRequest(req);
    const profile = await requireCloudSync(firebaseUser.uid);
    const rows = await supabaseRequest(
      `workbook_snapshots?select=data,version,updated_at&user_id=eq.${profile.id}&limit=1`,
    );
    const snapshot = rows?.[0];

    return res.json({
      data: snapshot?.data ?? null,
      version: snapshot?.version ?? null,
      updatedAt: snapshot?.updated_at ?? null,
    });
  } catch (error) {
    const status = (error as Error & { status?: number }).status ?? 500;
    console.error('Cloud workbook load error:', error);
    return res.status(status).json({ error: status === 403 ? 'Cloud sync is not enabled for this account.' : 'Unable to load cloud workbook.' });
  }
});

app.put('/api/workbook', async (req, res) => {
  try {
    const firebaseUser = await verifyFirebaseRequest(req);
    const profile = await requireCloudSync(firebaseUser.uid);
    const data = req.body?.data;

    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return res.status(400).json({ error: 'Workbook data must be an object.' });
    }

    // user_id is the primary key, so this is a deterministic account-scoped
    // upsert. The client never supplies the account identifier.
    const rows = await supabaseRequest('workbook_snapshots?on_conflict=user_id', {
      method: 'POST',
      headers: { Prefer: 'return=representation,resolution=merge-duplicates' },
      body: JSON.stringify({
        user_id: profile.id,
        data,
        version: 1,
      }),
    });
    const snapshot = rows?.[0];

    return res.json({
      data: snapshot?.data ?? data,
      version: snapshot?.version ?? 1,
      updatedAt: snapshot?.updated_at ?? null,
    });
  } catch (error) {
    const status = (error as Error & { status?: number }).status ?? 500;
    console.error('Cloud workbook save error:', error);
    return res.status(status).json({ error: status === 403 ? 'Cloud sync is not enabled for this account.' : 'Unable to save cloud workbook.' });
  }
});



const monimeAccessToken = process.env.MONIME_ACCESS_TOKEN;
const monimeSpaceId = process.env.MONIME_SPACE_ID;
const monimeWebhookSecret = process.env.MONIME_WEBHOOK_SECRET;
const monimeApiVersion = process.env.MONIME_API_VERSION || 'caph.2025-08-23';
const monimeCurrency = process.env.MONIME_CURRENCY || 'SLE';
const monimePlusAmount = Number(process.env.MONIME_PLUS_AMOUNT || 0);
const monimeProAmount = Number(process.env.MONIME_PRO_AMOUNT || 0);
const appBaseUrl = (process.env.APP_BASE_URL || '').replace(/\/$/, '');

const monimePlanConfig = {
  plus: { name: 'Toolkit Plus', amount: monimePlusAmount },
  pro: { name: 'Toolkit Pro', amount: monimeProAmount },
} as const;

async function monimeRequest(pathname: string, init: RequestInit = {}) {
  if (!monimeAccessToken || !monimeSpaceId) {
    throw new Error('Monime billing is not configured.');
  }
  const headers: Record<string, string> = {
    Authorization: `Bearer ${monimeAccessToken}`,
    'Content-Type': 'application/json',
    'Monime-Space-Id': monimeSpaceId,
    'Monime-Version': monimeApiVersion,
    ...(init.headers as Record<string, string> | undefined),
  };
  const response = await fetch(`https://api.monime.io${pathname}`, { ...init, headers });
  const body = await response.text();
  if (!response.ok) throw new Error(`Monime request failed (${response.status}): ${body}`);
  return body ? JSON.parse(body) : null;
}

function getMonimeSignatureHeader(req: express.Request) {
  const configured = (process.env.MONIME_WEBHOOK_SIGNATURE_HEADER || 'monime-signature').toLowerCase();
  return req.headers[configured] as string | undefined;
}

function verifyMonimeWebhookSignature(rawBody: Buffer, signatureHeader: string | undefined) {
  if (!monimeWebhookSecret || !signatureHeader) return false;
  const match = signatureHeader.match(/(?:^|[, ]+)(?:sha256=|v1=)?([a-f0-9]{64})(?:$|[, ]+)/i);
  const supplied = match?.[1] || (signatureHeader.match(/^[a-f0-9]{64}$/i)?.[0] ?? '');
  if (!supplied) return false;
  const expected = crypto.createHmac('sha256', monimeWebhookSecret).update(rawBody).digest('hex');
  const a = Buffer.from(supplied, 'hex');
  const b = Buffer.from(expected, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

app.post('/api/billing/checkout', async (req, res) => {
  try {
    const firebaseUser = await verifyFirebaseRequest(req);
    const profile = await getToolkitProfile(firebaseUser.uid);
    const planId = req.body?.planId as keyof typeof monimePlanConfig;
    const plan = monimePlanConfig[planId];

    if (!profile?.id) return res.status(404).json({ error: 'Toolkit profile not found.' });
    if (!plan || !Number.isSafeInteger(plan.amount) || plan.amount <= 0) {
      return res.status(503).json({ error: 'This billing plan is not configured yet.' });
    }
    if (!appBaseUrl) {
      return res.status(503).json({ error: 'APP_BASE_URL is not configured.' });
    }

    const reference = `budgetplanner-${profile.id}-${planId}-${Date.now()}`;
    const idempotencyKey = crypto.randomUUID();
    const checkout = await monimeRequest('/v1/checkout-sessions', {
      method: 'POST',
      headers: { 'Idempotency-Key': idempotencyKey },
      body: JSON.stringify({
        name: plan.name,
        lineItems: [{
          name: plan.name,
          price: { currency: monimeCurrency, value: plan.amount },
          type: 'custom',
          quantity: 1,
          reference: planId,
          description: `BudgetPlanner ${planId} toolkit plan - 30 day billing period`,
        }],
        description: `BudgetPlanner ${planId} plan`,
        cancelUrl: `${appBaseUrl}/?billing=cancelled`,
        successUrl: `${appBaseUrl}/?billing=success`,
        reference,
        metadata: {
          toolkitUserId: profile.id,
          planId,
          product: 'budget-planner-toolkit',
        },
      }),
    });

    const session = checkout?.result;
    if (!session?.id || !session?.redirectUrl) throw new Error('Monime returned an invalid checkout session.');

    await supabaseRequest('billing_checkout_sessions', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({
        user_id: profile.id,
        plan_id: planId,
        provider: 'monime',
        provider_session_id: session.id,
        status: 'pending',
        amount_value: plan.amount,
        currency: monimeCurrency,
      }),
    });

    return res.json({ checkoutUrl: session.redirectUrl, sessionId: session.id, planId });
  } catch (error) {
    console.error('Monime checkout error:', error);
    const message = error instanceof Error ? error.message : '';
    return res.status(message.includes('not configured') ? 503 : 500).json({
      error: message.includes('not configured') ? message : 'Unable to start Monime checkout.',
    });
  }
});

app.post('/api/billing/webhook', async (req, res) => {
  const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from('');
  if (!verifyMonimeWebhookSignature(rawBody, getMonimeSignatureHeader(req))) {
    return res.status(401).json({ error: 'Invalid webhook signature.' });
  }

  try {
    const payload = JSON.parse(rawBody.toString('utf8'));
    const eventId = payload?.event?.id;
    const eventName = payload?.event?.name;
    const objectId = payload?.object?.id;

    if (!eventId || !eventName) return res.status(400).json({ error: 'Invalid Monime webhook payload.' });

    const existing = await supabaseRequest(
      `billing_events?select=id&provider=eq.monime&id=eq.${encodeURIComponent(eventId)}&limit=1`,
    );
    if (existing?.[0]) return res.status(200).json({ received: true, duplicate: true });

    await supabaseRequest('billing_events', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({
        id: eventId,
        provider: 'monime',
        event_name: eventName,
        object_id: objectId ?? null,
        payload,
      }),
    });

    if (eventName !== 'checkout_session.completed') {
      return res.status(200).json({ received: true });
    }

    const checkoutRows = await supabaseRequest(
      `billing_checkout_sessions?select=id,user_id,plan_id,status&provider_session_id=eq.${encodeURIComponent(objectId)}&limit=1`,
    );
    const checkout = checkoutRows?.[0];
    if (!checkout) {
      console.warn('Monime checkout completed without a local checkout record:', objectId);
      return res.status(200).json({ received: true });
    }

    const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const live = await supabaseRequest(
      `subscriptions?select=id&user_id=eq.${checkout.user_id}&status=in.(active,trialing,past_due,incomplete)&limit=1`,
    );

    if (live?.[0]?.id) {
      await supabaseRequest(`subscriptions?id=eq.${live[0].id}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({
          plan_id: checkout.plan_id,
          provider: 'monime',
          provider_subscription_id: objectId,
          status: 'active',
          current_period_end: periodEnd,
          updated_at: new Date().toISOString(),
        }),
      });
    } else {
      await supabaseRequest('subscriptions', {
        method: 'POST',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({
          user_id: checkout.user_id,
          plan_id: checkout.plan_id,
          provider: 'monime',
          provider_subscription_id: objectId,
          status: 'active',
          current_period_end: periodEnd,
        }),
      });
    }

    await supabaseRequest(`billing_checkout_sessions?provider_session_id=eq.${encodeURIComponent(objectId)}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ status: 'completed', updated_at: new Date().toISOString() }),
    });

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('Monime webhook processing error:', error);
    return res.status(500).json({ error: 'Unable to process Monime webhook.' });
  }
});

// Initialize Gemini Client
const apiKey = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({
  apiKey: apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Lightweight production health check for load balancers and deployment smoke tests
app.get('/healthz', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

// In-memory caches to prevent exceeding free tier quotas
const insightsCache = new Map<string, { insights: string; timestamp: number }>();
const categoryCache = new Map<string, string>();

// AI Spending Insights Endpoint
app.post('/api/insights', async (req, res) => {
  try {
    const firebaseUser = await verifyFirebaseRequest(req);
    const profile = await requireToolkitFeature(firebaseUser.uid, 'budget.aiInsights');

    const { incomeTransactions = [], expenseTransactions = [], settings = {}, categories = [] } = req.body || {};
    const incomeTotal = incomeTransactions.reduce((acc: number, t: any) => acc + (Number(t.amount) || 0), 0);
    const expenseTotal = expenseTransactions.reduce((acc: number, t: any) => acc + (Number(t.amount) || 0), 0);
    const cacheKey = `${profile.id}-${incomeTransactions.length}-${expenseTransactions.length}-${incomeTotal}-${expenseTotal}-${settings?.month || ''}-${settings?.year || ''}`;

    const cachedItem = insightsCache.get(cacheKey);
    const THIRTY_MINUTES = 30 * 60 * 1000;
    if (cachedItem && Date.now() - cachedItem.timestamp < THIRTY_MINUTES) {
      return res.json({ insights: cachedItem.insights, fallback: false, cached: true });
    }

    // Count billable AI insight generations server-side. Cached responses do not
    // consume another usage unit.
    await supabaseRequest('rpc/increment_usage', {
      method: 'POST',
      body: JSON.stringify({
        p_user_id: profile.id,
        p_usage_key: 'budget.aiInsights',
        p_period_start: `${new Date().toISOString().slice(0, 7)}-01`,
        p_quantity: 1,
      }),
    });

    const textContext = `
Monthly Income: ${incomeTotal}
Monthly Expenses: ${expenseTotal}
Month/Year: ${settings?.month} ${settings?.year}
Categories: ${categories?.map((c: any) => c.name).join(', ')}

Transactions list:
${expenseTransactions.slice(0, 40).map((t: any) => `- ${t.date} ${t.category}: ${t.description} (${t.amount})`).join('\\n')}
`;

    if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.trim() === "") {
      return res.json({
        insights: `- Review your highest-spend categories and identify one recurring discretionary expense to reduce this month.
- Check subscriptions and memberships for services you have not used recently.
- Consider a short cooling-off period before discretionary purchases so planned spending stays aligned with your monthly budget.`,
        fallback: true,
      });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `
You are a practical financial budgeting assistant. Analyze the following monthly financial snapshot and transactions:
${textContext}

Provide exactly 3 actionable, highly specific bullet points based on the transaction patterns. Keep the tone encouraging, professional, and clear. Each bullet should be no longer than two sentences. Do not provide investment, lending, tax, or other regulated financial advice. Do not include introductory or concluding text.
`,
    });

    const text = response.text || 'Could not generate insights at this moment.';
    insightsCache.set(cacheKey, { insights: text, timestamp: Date.now() });
    return res.json({ insights: text, fallback: false, cached: false });
  } catch (error) {
    const status = (error as Error & { status?: number }).status ?? 500;
    console.warn('AI insights request failed:', error);
    if (status === 403) {
      return res.status(403).json({ error: 'AI Insights is not enabled for this account.' });
    }
    return res.status(status).json({ error: 'Unable to generate AI insights.' });
  }
});

// AI Category Suggestion Endpoint
app.post('/api/suggest-category', async (req, res) => {
  const { description = '', categories = [] } = req.body || {};
  try {
    if (!description.trim() || categories.length === 0) {
      return res.json({ category: categories[0]?.name || '' });
    }

    const normalizedDesc = description.trim().toLowerCase();
    if (categoryCache.has(normalizedDesc)) {
      const cachedCategory = categoryCache.get(normalizedDesc);
      // Double check cached category still exists in current categories
      if (categories.some((c: any) => c.name === cachedCategory)) {
        console.log("Serving category recommendation from memory cache.");
        return res.json({ category: cachedCategory });
      }
    }

    // Graceful fallback if apiKey is missing
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.trim() === "") {
      const desc = description.toLowerCase();
      let matched = categories[0]?.name || '';
      for (const cat of categories) {
        const catName = cat.name.toLowerCase();
        if (desc.includes(catName) || catName.includes(desc)) {
          matched = cat.name;
          break;
        }
      }
      return res.json({ category: matched });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `
You are a highly efficient financial transaction classification assistant.
Given the transaction description: "${description}"
And the list of available categories: ${categories.map((c: any) => c.name).join(', ')}

Suggest the single best matching category name from the provided list that fits the description.
Respond with ONLY the exact category name from the list, with no extra characters, quotes, explanation, or punctuation.
If no category fits well, return the first item in the list: "${categories[0]?.name}".
`,
    });

    const category = (response.text || "").trim().replace(/['"‘“’”]/g, "");
    const finalCategory = categories.find((c: any) => c.name.toLowerCase() === category.toLowerCase())?.name || categories[0]?.name;
    
    // Save to cache
    if (finalCategory) {
      categoryCache.set(normalizedDesc, finalCategory);
    }
    
    res.json({ category: finalCategory });
  } catch (error: any) {
    console.warn("Gemini Category Suggester fell back to default category matching due to rate limits or missing keys.");
    res.json({ category: categories[0]?.name || '' });
  }
});

// Configure Vite integration
const isProd = process.env.NODE_ENV === 'production';
const port = Number(process.env.PORT) || 3000;

if (!isProd) {
  // Use Vite middlewares in dev mode
  const vite = await import('vite').then((v) =>
    v.createServer({
      server: { middlewareMode: true },
      appType: 'custom',
    })
  );
  app.use(vite.middlewares);
  
  // Serve HTML
  app.use('*', async (req, res, next) => {
    const url = req.originalUrl;
    try {
      let template = await import('fs').then((fs) =>
        fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8')
      );
      template = await vite.transformIndexHtml(url, template);
      res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
} else {
  // Serve static files in production
  app.use(express.static(path.resolve(__dirname, 'dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'dist/index.html'));
  });
}

app.listen(port, '0.0.0.0', () => {
  console.log(`Server running at http://localhost:${port}`);
});
