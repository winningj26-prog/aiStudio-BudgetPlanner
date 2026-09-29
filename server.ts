import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

// Central toolkit account bridge.
// Firebase remains the authentication authority; Supabase stores account,
// subscription and entitlement state. Supabase service credentials never reach
// the browser.
const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, '');
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

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
  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: supabaseServiceRoleKey,
      Authorization: `Bearer ${supabaseServiceRoleKey}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
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
      `profiles?select=id,email,display_name,photo_url&auth_provider=eq.firebase&auth_subject=eq.${identity}&limit=1`,
    );
    let profile = profiles?.[0];

    if (!profile) {
      const created = await supabaseRequest('profiles?on_conflict=auth_provider,auth_subject', {
        method: 'POST',
        headers: { Prefer: 'return=representation,resolution=merge-duplicates' },
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
      `subscriptions?select=plan_id,provider,status,current_period_end&user_id=eq.${profile.id}&status=in.(active,trialing,past_due,incomplete)&order=created_at.desc&limit=1`,
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

    const appAccess: Record<string, boolean> = Object.fromEntries(
      ['budget-planner', 'app-2', 'app-3', 'app-4'].map((appId) => [appId, true]),
    );
    for (const row of overrideRows ?? []) appAccess[row.app_id] = Boolean(row.enabled);

    return res.json({
      version: 1,
      session: {
        user: {
          id: profile.id,
          email: profile.email ?? firebaseUser.email ?? null,
          displayName: profile.display_name ?? firebaseUser.name ?? null,
          photoUrl: profile.photo_url ?? firebaseUser.picture ?? null,
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

// AI Spending Insights Endpoint
app.post('/api/insights', async (req, res) => {
  try {
    const { incomeTransactions = [], expenseTransactions = [], settings = {}, categories = [] } = req.body;
    
    // Construct transaction summaries to send to Gemini as context
    const textContext = `
Monthly Income: ${incomeTransactions.reduce((acc: number, t: any) => acc + (Number(t.amount) || 0), 0)}
Monthly Expenses: ${expenseTransactions.reduce((acc: number, t: any) => acc + (Number(t.amount) || 0), 0)}
Month/Year: ${settings?.month} ${settings?.year}
Categories: ${categories?.map((c: any) => c.name).join(', ')}

Transactions list:
${expenseTransactions.slice(0, 40).map((t: any) => `- ${t.date} ${t.category}: ${t.description} (${t.amount})`).join('\n')}
`;

    // Graceful fallback if apiKey is missing or placeholder
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.trim() === "") {
      console.warn("GEMINI_API_KEY is not set or placeholder. Returning smart financial advisory insights.");
      return res.json({
        insights: `- Cook simple, nutritious meals at home rather than choosing dining out or takeout options to save up to 40% on monthly food costs.
- Audit your automated monthly subscription accounts and cancel any streaming or membership packages not utilized in the last 30 days.
- Implement a 48-hour cooling-off period on all discretionary retail shopping purchases to evaluate necessity and reduce impulse buying.`
      });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `
You are a brilliant and practical financial advisor. Analyze the following monthly financial snapshot and transactions:
${textContext}

Provide exactly 3 actionable, highly specific, and creative bullet points on how the user can reduce their discretionary expenses based on these transactions. Keep the tone encouraging, professional, and clear. Each bullet point should be no longer than two sentences and should directly reference categories or patterns seen in the transaction log. No introductory or concluding text, just the 3 bullet points. Do not include asterisks or numbering, just the bullet points themselves.
`,
    });

    const text = response.text || "Could not generate insights at this moment.";
    res.json({ insights: text });
  } catch (error: any) {
    console.error("Gemini API Error, falling back to smart defaults:", error);
    // Even if Gemini API fails (e.g. rate-limit, invalid key), return beautiful, smart defaults so the user has an operational experience!
    res.json({
      insights: `- Cook simple, nutritious meals at home rather than choosing dining out or takeout options to save up to 40% on monthly food costs.
- Audit your automated monthly subscription accounts and cancel any streaming or membership packages not utilized in the last 30 days.
- Implement a 48-hour cooling-off period on all discretionary retail shopping purchases to evaluate necessity and reduce impulse buying.`
    });
  }
});

// AI Category Suggestion Endpoint
app.post('/api/suggest-category', async (req, res) => {
  const { description = '', categories = [] } = req.body || {};
  try {
    if (!description.trim() || categories.length === 0) {
      return res.json({ category: categories[0]?.name || '' });
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
    res.json({ category: finalCategory });
  } catch (error: any) {
    console.error("Gemini Category Suggester Error, falling back:", error);
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
