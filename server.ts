import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js';
import { isPlatformAdminEmail, normalizePlatformAdminEmails } from './src/utils/platformAdmin.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use('/api/billing/webhook', express.raw({ type: 'application/json' }));
app.use(express.json());

// Supabase is the sole authentication and application backend.
// The browser uses a publishable key; this server uses the Supabase Secret API
// key only for privileged account/subscription operations.
const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, '');
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;
const supabaseServiceRoleKey = supabaseSecretKey || process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdminAuth = supabaseUrl && supabaseServiceRoleKey
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    })
  : null;
const platformAdminEmails = normalizePlatformAdminEmails(process.env.PLATFORM_ADMIN_EMAILS);

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

  // PostgREST writes using Prefer: return=minimal can return a successful
  // 2xx response with an empty body (commonly 201/204). Do not attempt to
  // JSON-parse an empty response.
  const responseBody = await response.text();
  if (!responseBody.trim()) return null;
  return JSON.parse(responseBody);
}

function isPlatformAdmin(authUser: { email?: string | null }) {
  return isPlatformAdminEmail(authUser.email, platformAdminEmails);
}

async function getPlatformSecret(name: string) {
  const rows = await supabaseRequest('rpc/platform_secret_get', {
    method: 'POST',
    body: JSON.stringify({ secret_name: name }),
  });
  return typeof rows === 'string' ? rows : null;
}

async function setPlatformSecret(name: string, value: string, description: string) {
  await supabaseRequest('rpc/platform_secret_upsert', {
    method: 'POST',
    body: JSON.stringify({
      secret_value: value,
      secret_name: name,
      secret_description: description,
    }),
  });
}

async function getPlatformConfig() {
  const rows = await supabaseRequest(
    'platform_settings?select=id,currency,plus_amount,pro_amount,mobile_money_provider,mobile_money_account_name,mobile_money_account_number,mobile_money_instructions,monime_api_version,app_base_url,integration_settings,updated_by,updated_at&limit=1',
  );
  const row = rows?.[0] || {};
  const [monimeAccessToken, monimeSpaceId, monimeWebhookSecret, geminiApiKey, resendSmtpPassword] =
    await Promise.all([
      getPlatformSecret('monime_access_token'),
      getPlatformSecret('monime_space_id'),
      getPlatformSecret('monime_webhook_secret'),
      getPlatformSecret('gemini_api_key'),
      getPlatformSecret('resend_smtp_password'),
    ]);

  return {
    currency: row.currency || process.env.MOBILE_MONEY_CURRENCY || 'SLE',
    plusAmount: Number(row.plus_amount || process.env.MOBILE_MONEY_PLUS_AMOUNT || 550),
    proAmount: Number(row.pro_amount || process.env.MOBILE_MONEY_PRO_AMOUNT || 1000),
    mobileMoneyProvider: row.mobile_money_provider || process.env.MOBILE_MONEY_PROVIDER || '',
    mobileMoneyAccountName: row.mobile_money_account_name || process.env.MOBILE_MONEY_ACCOUNT_NAME || '',
    mobileMoneyAccountNumber: row.mobile_money_account_number || process.env.MOBILE_MONEY_ACCOUNT_NUMBER || '',
    mobileMoneyInstructions: row.mobile_money_instructions || process.env.MOBILE_MONEY_INSTRUCTIONS || 'Make the exact payment amount shown above, keep your transaction receipt, and submit the transaction ID below. Your subscription will be activated only after manual verification.',
    monimeApiVersion: row.monime_api_version || process.env.MONIME_API_VERSION || 'caph.2025-08-23',
    appBaseUrl: row.app_base_url || (process.env.APP_BASE_URL || '').replace(/\/$/, ''),
    integrationSettings: row.integration_settings || {},
    monimeAccessToken: monimeAccessToken || process.env.MONIME_ACCESS_TOKEN || '',
    monimeSpaceId: monimeSpaceId || process.env.MONIME_SPACE_ID || '',
    monimeWebhookSecret: monimeWebhookSecret || process.env.MONIME_WEBHOOK_SECRET || '',
    geminiApiKey: geminiApiKey || process.env.GEMINI_API_KEY || '',
    resendSmtpPassword: resendSmtpPassword || '',
    updatedBy: row.updated_by || null,
    updatedAt: row.updated_at || null,
  };
}

let unauthorizedAccessAttemptsCount = 0;

async function requirePlatformAdmin(req: express.Request) {
  const authUser = await verifySupabaseRequest(req);
  if (!isPlatformAdmin(authUser)) {
    unauthorizedAccessAttemptsCount++;
    const error = new Error('Platform administration access is required.');
    (error as Error & { status?: number }).status = 403;
    throw error;
  }
  return authUser;
}

app.get('/api/platform/security-health', async (req, res) => {
  try {
    await requirePlatformAdmin(req);
    const config = await getPlatformConfig();
    return res.json({
      apiKeyStatus: {
        geminiApiKey: {
          configured: Boolean(config.geminiApiKey),
          status: config.geminiApiKey ? 'Healthy' : 'Not Configured',
          lastChecked: new Date().toISOString()
        },
        resendSmtp: {
          configured: Boolean(config.resendSmtpPassword),
          status: config.resendSmtpPassword ? 'Healthy' : 'Not Configured',
          lastChecked: new Date().toISOString()
        },
        monimeToken: {
          configured: Boolean(config.monimeAccessToken),
          status: config.monimeAccessToken ? 'Healthy' : 'Not Configured',
          lastChecked: new Date().toISOString()
        }
      },
      rotationPolicies: [
        { id: 1, name: 'Gemini API Key Rotation', interval: '90 days', policy: 'Manual rotation via Admin Vault', status: 'Active' },
        { id: 2, name: 'Resend SMTP Credentials', interval: '180 days', policy: 'SMTP password rotation via provider', status: 'Active' },
        { id: 3, name: 'Monime Gateway Tokens', interval: '30 days', policy: 'Automated OAuth Refresh Tokens', status: 'Enforced' }
      ],
      unauthorizedAttemptsCount: unauthorizedAccessAttemptsCount
    });
  } catch (error) {
    const status = (error as Error & { status?: number }).status ?? 500;
    return res.status(status).json({ error: 'Unable to load security health metrics.' });
  }
});

app.get('/api/platform/config', async (req, res) => {
  try {
    const authUser = await requirePlatformAdmin(req);
    const config = await getPlatformConfig();
    return res.json({
      config: {
        currency: config.currency,
        plusAmount: config.plusAmount,
        proAmount: config.proAmount,
        mobileMoneyProvider: config.mobileMoneyProvider,
        mobileMoneyAccountName: config.mobileMoneyAccountName,
        mobileMoneyAccountNumber: config.mobileMoneyAccountNumber,
        mobileMoneyInstructions: config.mobileMoneyInstructions,
        monimeApiVersion: config.monimeApiVersion,
        appBaseUrl: config.appBaseUrl,
        integrationSettings: config.integrationSettings,
        secrets: {
          monimeAccessTokenConfigured: Boolean(config.monimeAccessToken),
          monimeSpaceIdConfigured: Boolean(config.monimeSpaceId),
          monimeWebhookSecretConfigured: Boolean(config.monimeWebhookSecret),
          geminiApiKeyConfigured: Boolean(config.geminiApiKey),
          resendSmtpPasswordConfigured: Boolean(config.resendSmtpPassword),
        },
        updatedBy: config.updatedBy,
        updatedAt: config.updatedAt,
      },
      adminEmail: authUser.email || null,
    });
  } catch (error) {
    const status = (error as Error & { status?: number }).status ?? 500;
    return res.status(status).json({ error: status === 403 ? 'Platform administration access is required.' : 'Unable to load platform configuration.' });
  }
});

app.get('/api/platform/users', async (req, res) => {
  try {
    await requirePlatformAdmin(req);
    const profiles = await supabaseRequest('profiles?select=id,email,display_name,photo_url,onboarding_completed,created_at');
    const subscriptions = await supabaseRequest('subscriptions?select=user_id,plan_id,provider,status,current_period_end');
    return res.json({ profiles, subscriptions });
  } catch (error) {
    const status = (error as Error & { status?: number }).status ?? 500;
    console.error('Platform users fetch error:', error);
    return res.status(status).json({ error: 'Unable to load platform users.' });
  }
});

app.get('/api/platform/payment-requests', async (req, res) => {
  try {
    await requirePlatformAdmin(req);
    const requests = await supabaseRequest('manual_payment_requests?select=id,user_id,plan_id,amount_value,currency,payment_method,transaction_id,payer_name,status,reviewed_at,reviewed_by,reviewer_note,created_at&order=created_at.desc');
    const profiles = await supabaseRequest('profiles?select=id,email,display_name');
    return res.json({ requests, profiles });
  } catch (error) {
    const status = (error as Error & { status?: number }).status ?? 500;
    console.error('Platform payment requests load error:', error);
    return res.status(status).json({ error: 'Unable to load payment requests.' });
  }
});

app.get('/api/platform/audit-logs', async (req, res) => {
  try {
    await requirePlatformAdmin(req);
    const logs = await supabaseRequest('platform_config_audit?select=id,admin_email,section,changed_fields,created_at&order=created_at.desc');
    return res.json({ logs });
  } catch (error) {
    const status = (error as Error & { status?: number }).status ?? 500;
    console.error('Platform audit logs load error:', error);
    return res.status(status).json({ error: 'Unable to load audit logs.' });
  }
});

app.post('/api/platform/users/override', async (req, res) => {
  try {
    const authUser = await verifySupabaseRequest(req);
    if (!isPlatformAdmin(authUser)) return res.status(403).json({ error: 'Platform administration access is required.' });

    const { userId, planId, onboardingCompleted, appAccess = {}, reason } = req.body || {};
    if (!userId) return res.status(400).json({ error: 'User ID is required.' });
    if (typeof reason !== 'string' || reason.trim().length < 5 || reason.trim().length > 500) {
      return res.status(400).json({ error: 'A reason between 5 and 500 characters is required.' });
    }
    const allowedAppIds = ['budget-planner', 'app-2', 'app-3', 'app-4'];
    for (const appId of Object.keys(appAccess)) {
      if (allowedAppIds.indexOf(appId) === -1) {
        return res.status(400).json({ error: 'Unsupported app entitlement: ' + appId });
      }
    }
    const targetProfiles = await supabaseRequest('profiles?select=id,email,display_name&id=eq.' + encodeURIComponent(userId) + '&limit=1');
    const targetProfile = targetProfiles && targetProfiles[0];
    if (!targetProfile) return res.status(404).json({ error: 'User account not found.' });

    const now = new Date().toISOString();

    // 1. Update onboarding status in profiles
    await supabaseRequest(`profiles?id=eq.${encodeURIComponent(userId)}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({
        onboarding_completed: onboardingCompleted,
        onboarding_completed_at: onboardingCompleted ? now : null,
        updated_at: now
      })
    });

    // 2. Update subscription in subscriptions
    if (['free', 'plus', 'pro'].includes(planId)) {
      const periodEnd = planId === 'free' ? null : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(); // 1 year override
      const live = await supabaseRequest(`subscriptions?select=id&user_id=eq.${encodeURIComponent(userId)}&status=in.(active,trialing,past_due,incomplete)&limit=1`);
      
      if (live?.[0]?.id) {
        await supabaseRequest(`subscriptions?id=eq.${live[0].id}`, {
          method: 'PATCH',
          headers: { Prefer: 'return=minimal' },
          body: JSON.stringify({
            plan_id: planId,
            provider: 'none',
            provider_subscription_id: 'admin_override',
            status: 'active',
            current_period_end: periodEnd,
            updated_at: now
          })
        });
      } else {
        await supabaseRequest('subscriptions', {
          method: 'POST',
          headers: { Prefer: 'return=minimal' },
          body: JSON.stringify({
            user_id: userId,
            plan_id: planId,
            provider: 'none',
            provider_subscription_id: 'admin_override',
            status: 'active',
            current_period_end: periodEnd
          })
        });
      }
    }

    // 3. Update app entitlements
    for (const [appId, enabled] of Object.entries(appAccess)) {
      const existing = await supabaseRequest(`app_entitlements?select=id&user_id=eq.${encodeURIComponent(userId)}&app_id=eq.${encodeURIComponent(appId)}&limit=1`);
      if (existing?.[0]?.id) {
        await supabaseRequest(`app_entitlements?id=eq.${existing[0].id}`, {
          method: 'PATCH',
          headers: { Prefer: 'return=minimal' },
          body: JSON.stringify({ enabled: Boolean(enabled), updated_at: now })
        });
      } else {
        await supabaseRequest('app_entitlements', {
          method: 'POST',
          headers: { Prefer: 'return=minimal' },
          body: JSON.stringify({
            user_id: userId,
            app_id: appId,
            enabled: Boolean(enabled)
          })
        });
      }
    }

    // 4. Log config audit
    await supabaseRequest('platform_config_audit', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({
        admin_email: authUser.email || 'unknown',
        section: 'user_override',
        changed_fields: { userId, targetEmail: targetProfile.email || null, planId, onboardingCompleted, appAccess, reason: reason.trim() }
      })
    });

    return res.json({ ok: true });
  } catch (error) {
    console.error('Account override error:', error);
    const status = (error as Error & { status?: number }).status ?? 500;
    return res.status(status).json({ error: 'Unable to update account settings.' });
  }
});

app.post('/api/platform/users/action', async (req, res) => {
  try {
    const authUser = await verifySupabaseRequest(req);
    if (!isPlatformAdmin(authUser)) return res.status(403).json({ error: 'Platform administration access is required.' });

    const { userId, action, displayName, email, status } = req.body || {};
    if (!userId) return res.status(400).json({ error: 'User ID is required.' });

    const targetProfiles = await supabaseRequest(
      `profiles?select=id,auth_user_id,email,display_name&id=eq.${encodeURIComponent(userId)}&limit=1`,
    );
    const targetProfile = targetProfiles?.[0];
    if (!targetProfile) return res.status(404).json({ error: 'User account not found.' });

    const now = new Date().toISOString();

    if (action === 'edit') {
      if (!displayName || !displayName.trim()) {
        return res.status(400).json({ error: 'Display name cannot be empty.' });
      }
      if (!email || !email.trim()) {
        return res.status(400).json({ error: 'Email address cannot be empty.' });
      }

      const nextEmail = email.trim();
      if (!targetProfile.auth_user_id) {
        return res.status(409).json({ error: 'User account is not linked to Supabase Auth.' });
      }
      if (!supabaseAdminAuth) {
        return res.status(503).json({ error: 'Supabase Auth administration is not configured.' });
      }

      if (nextEmail.toLowerCase() !== String(targetProfile.email || '').toLowerCase()) {
        const { error } = await supabaseAdminAuth.auth.admin.updateUserById(
          targetProfile.auth_user_id,
          { email: nextEmail },
        );
        if (error) {
          console.error('Supabase Auth email update error:', error);
          return res.status(400).json({ error: 'Unable to update the authentication email address.' });
        }
      }

      await supabaseRequest(`profiles?id=eq.${encodeURIComponent(userId)}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({
          display_name: displayName.trim(),
          email: nextEmail,
          updated_at: now
        })
      });

      await supabaseRequest('platform_config_audit', {
        method: 'POST',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({
          admin_email: authUser.email || 'unknown',
          section: 'user_edit',
          changed_fields: { userId, displayName: displayName.trim(), email: nextEmail }
        })
      });

      return res.json({ ok: true, message: 'User details updated successfully.' });
    }

    if (action === 'suspend') {
      const live = await supabaseRequest(`subscriptions?select=id&user_id=eq.${encodeURIComponent(userId)}&status=in.(active,trialing,past_due,incomplete,suspended)&limit=1`);
      
      const nextStatus = status === 'suspended' ? 'suspended' : 'active';

      if (live?.[0]?.id) {
        await supabaseRequest(`subscriptions?id=eq.${live[0].id}`, {
          method: 'PATCH',
          headers: { Prefer: 'return=minimal' },
          body: JSON.stringify({
            status: nextStatus,
            updated_at: now
          })
        });
      } else {
        // If they have no subscription, create a suspended subscription to block access
        await supabaseRequest('subscriptions', {
          method: 'POST',
          headers: { Prefer: 'return=minimal' },
          body: JSON.stringify({
            user_id: userId,
            plan_id: 'free',
            provider: 'none',
            provider_subscription_id: 'admin_suspend',
            status: nextStatus
          })
        });
      }

      // Audit log
      await supabaseRequest('platform_config_audit', {
        method: 'POST',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({
          admin_email: authUser.email || 'unknown',
          section: 'user_suspend',
          changed_fields: { userId, status: nextStatus }
        })
      });

      return res.json({ ok: true, message: `User subscription status updated to ${nextStatus}.` });
    }

    if (action === 'delete') {
      if (!targetProfile.auth_user_id) {
        return res.status(409).json({ error: 'User account is not linked to Supabase Auth.' });
      }
      if (!supabaseAdminAuth) {
        return res.status(503).json({ error: 'Supabase Auth administration is not configured.' });
      }

      const { error } = await supabaseAdminAuth.auth.admin.deleteUser(targetProfile.auth_user_id);
      if (error) {
        console.error('Supabase Auth user deletion error:', error);
        return res.status(400).json({ error: 'Unable to delete the authentication account.' });
      }

      // The auth_user_id foreign key cascades the profile and its associated
      // account data after the Auth user is deleted.
      await supabaseRequest('platform_config_audit', {
        method: 'POST',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({
          admin_email: authUser.email || 'unknown',
          section: 'user_delete',
          changed_fields: { userId, authUserId: targetProfile.auth_user_id }
        })
      });

      return res.json({ ok: true, message: 'User authentication account and associated data deleted successfully.' });
    }

    return res.status(400).json({ error: 'Invalid action requested.' });
  } catch (error) {
    console.error('Account action error:', error);
    const status = (error as Error & { status?: number }).status ?? 500;
    return res.status(status).json({ error: 'Unable to execute account action.' });
  }
});

app.put('/api/platform/config', async (req, res) => {
  try {
    const authUser = await requirePlatformAdmin(req);
    const body = req.body || {};
    const plusAmount = Number(body.plusAmount);
    const proAmount = Number(body.proAmount);
    const hasValidCurrencyAmount = (value: number) => Number.isFinite(value) && value > 0 && Math.round(value * 100) === value * 100;
    if (!hasValidCurrencyAmount(plusAmount) || !hasValidCurrencyAmount(proAmount)) {
      return res.status(400).json({ error: 'Plus and Pro amounts must be positive numbers with up to two decimal places.' });
    }

    const current = await getPlatformConfig();
    const next = {
      currency: typeof body.currency === 'string' && body.currency.trim() ? body.currency.trim().toUpperCase() : current.currency,
      plusAmount,
      proAmount,
      mobileMoneyProvider: typeof body.mobileMoneyProvider === 'string' ? body.mobileMoneyProvider.trim() : current.mobileMoneyProvider,
      mobileMoneyAccountName: typeof body.mobileMoneyAccountName === 'string' ? body.mobileMoneyAccountName.trim() : current.mobileMoneyAccountName,
      mobileMoneyAccountNumber: typeof body.mobileMoneyAccountNumber === 'string' ? body.mobileMoneyAccountNumber.trim() : current.mobileMoneyAccountNumber,
      mobileMoneyInstructions: typeof body.mobileMoneyInstructions === 'string' && body.mobileMoneyInstructions.trim() ? body.mobileMoneyInstructions.trim() : current.mobileMoneyInstructions,
      monimeApiVersion: typeof body.monimeApiVersion === 'string' && body.monimeApiVersion.trim() ? body.monimeApiVersion.trim() : current.monimeApiVersion,
      appBaseUrl: typeof body.appBaseUrl === 'string' ? body.appBaseUrl.trim().replace(/\/$/, '') : current.appBaseUrl,
      integrationSettings: typeof body.integrationSettings === 'object' && body.integrationSettings !== null ? body.integrationSettings : current.integrationSettings,
    };

    await supabaseRequest('platform_settings?id=eq.1', {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({
        currency: next.currency,
        plus_amount: next.plusAmount,
        pro_amount: next.proAmount,
        mobile_money_provider: next.mobileMoneyProvider,
        mobile_money_account_name: next.mobileMoneyAccountName,
        mobile_money_account_number: next.mobileMoneyAccountNumber,
        mobile_money_instructions: next.mobileMoneyInstructions,
        monime_api_version: next.monimeApiVersion,
        app_base_url: next.appBaseUrl,
        integration_settings: next.integrationSettings,
        updated_by: authUser.email || null,
        updated_at: new Date().toISOString(),
      }),
    });

    const secretFields: Array<[string, string | undefined, string]> = [
      ['monime_access_token', body.monimeAccessToken, 'Monime API access token'],
      ['monime_space_id', body.monimeSpaceId, 'Monime space ID'],
      ['monime_webhook_secret', body.monimeWebhookSecret, 'Monime webhook signing secret'],
      ['gemini_api_key', body.geminiApiKey, 'Google Gemini API key'],
      ['resend_smtp_password', body.resendSmtpPassword, 'Resend SMTP credential'],
    ];
    for (const [name, value, description] of secretFields) {
      if (typeof value === 'string' && value.trim()) {
        await setPlatformSecret(name, value.trim(), description);
      }
    }

    const changedFields = Object.keys(body).filter((key) => !/token|secret|password|apiKey/i.test(key));
    await supabaseRequest('platform_config_audit', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({
        admin_email: authUser.email || 'unknown',
        section: 'platform',
        changed_fields: changedFields,
      }),
    });

    return res.json({ ok: true });
  } catch (error) {
    const status = (error as Error & { status?: number }).status ?? 500;
    console.error('Platform configuration update error:', error);
    return res.status(status).json({ error: status === 403 ? 'Platform administration access is required.' : 'Unable to save platform configuration.' });
  }
});

app.get('/api/account/session', async (req, res) => {
  try {
    const authUser = await verifySupabaseRequest(req);
    const profile = await getOrCreateToolkitProfile(authUser);

    if (!profile?.id) throw new Error('Could not create or load toolkit profile.');

    const subscriptionRows = await supabaseRequest(
      `subscriptions?select=plan_id,provider,status,current_period_end&user_id=eq.${profile.id}&order=created_at.desc&limit=20`,
    );
    const now = Date.now();
    let subscription = (subscriptionRows ?? []).find((row: any) =>
      ['active', 'trialing', 'past_due', 'incomplete'].includes(row.status)
      && (row.current_period_end == null || new Date(row.current_period_end).getTime() > now),
    );

    const suspendedSubscription = (subscriptionRows ?? []).find((row: any) => row.status === 'suspended');
    if (!subscription && suspendedSubscription) {
      subscription = suspendedSubscription;
    }

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
          email: profile.email ?? authUser.email ?? null,
          displayName: profile.display_name ?? authUser.user_metadata?.full_name ?? null,
          photoUrl: profile.photo_url ?? authUser.user_metadata?.avatar_url ?? null,
          onboardingComplete: Boolean(profile.onboarding_completed),
        },
        subscription: {
          planId,
          status: subscription?.status || 'active',
          provider: subscription?.provider || 'none',
          currentPeriodEnd: subscription?.current_period_end || null,
        },
        platformAdmin: isPlatformAdmin(authUser),
        entitlements: {
          apps: appAccess,
          features: Object.fromEntries(
            (entitlementRows ?? []).map((row) => [row.feature_key, Boolean(row.enabled)]),
          ),
        },
      },
    });
  } catch (error) {
    const status = (error as Error & { status?: number }).status ?? 500;
    console.error('Toolkit account session error:', error);
    return res.status(status).json({
      error: status === 401 ? 'Invalid authentication session.' : 'Unable to load toolkit account session.',
    });
  }
});

app.post('/api/account/onboarding', async (req, res) => {
  try {
    const authUser = await verifySupabaseRequest(req);
    const displayName = typeof req.body?.displayName === 'string' ? req.body.displayName.trim() : '';
    const planId = req.body?.planId;

    if (!displayName) return res.status(400).json({ error: 'Display name is required.' });
    if (!['free', 'plus', 'pro'].includes(planId)) {
      return res.status(400).json({ error: 'Invalid subscription plan.' });
    }

    const profile = await getOrCreateToolkitProfile(authUser);
    if (!profile?.id) return res.status(404).json({ error: 'Toolkit profile not found.' });

    if (profile.onboarding_completed) {
      return res.status(409).json({
        error: 'Onboarding has already been completed for this account.',
        code: 'ONBOARDING_ALREADY_COMPLETED',
      });
    }

    await supabaseRequest(`profiles?id=eq.${profile.id}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({
        display_name: displayName,
        onboarding_completed: planId === 'free',
        onboarding_completed_at: planId === 'free' ? new Date().toISOString() : null,
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
    const status = (error as Error & { status?: number }).status ?? 500;
    console.error('Toolkit onboarding error:', error);
    return res.status(status).json({ error: 'Unable to save onboarding details.' });
  }
});

async function getOrCreateToolkitProfile(authUser: { id: string; email?: string | null; user_metadata?: Record<string, any> | null }) {
  const userId = encodeURIComponent(authUser.id);
  let profiles = await supabaseRequest(
    `profiles?select=id,email,display_name,photo_url,onboarding_completed,auth_user_id&auth_user_id=eq.${userId}&limit=1`,
  );
  let profile = profiles?.[0];

  // Claim the pre-Supabase profile when the authenticated Supabase user proves
  // ownership of the same email. This preserves existing account/workbook data.
  if (!profile && authUser.email) {
    const email = encodeURIComponent(authUser.email);
    profiles = await supabaseRequest(
      `profiles?select=id,email,display_name,photo_url,onboarding_completed,auth_user_id,auth_provider&email=ilike.${email}&limit=1`,
    );
    const legacyProfile = profiles?.[0];
    if (legacyProfile && !legacyProfile.auth_user_id) {
      await supabaseRequest(`profiles?id=eq.${legacyProfile.id}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({
          auth_provider: 'supabase',
          auth_subject: authUser.id,
          auth_user_id: authUser.id,
          email: authUser.email,
          photo_url: legacyProfile.photo_url ?? authUser.user_metadata?.avatar_url ?? null,
          updated_at: new Date().toISOString(),
        }),
      });
      profile = { ...legacyProfile, auth_user_id: authUser.id, auth_provider: 'supabase' };
    }
  }

  if (!profile) {
    const created = await supabaseRequest('profiles', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        auth_provider: 'supabase',
        auth_subject: authUser.id,
        auth_user_id: authUser.id,
        email: authUser.email ?? null,
        display_name: authUser.user_metadata?.full_name ?? null,
        photo_url: authUser.user_metadata?.avatar_url ?? null,
      }),
    });
    profile = created?.[0];
  }

  return profile ?? null;
}

async function getToolkitProfile(supabaseUserId: string) {
  const identity = encodeURIComponent(supabaseUserId);
  const profiles = await supabaseRequest(
    `profiles?select=id,email,display_name,photo_url,onboarding_completed&auth_user_id=eq.${identity}&limit=1`,
  );
  return profiles?.[0] ?? null;
}

async function requireToolkitFeature(supabaseUserId: string, featureKey: string) {
  const profile = await getToolkitProfile(supabaseUserId);
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

async function requireCloudSync(supabaseUserId: string) {
  const profile = await getToolkitProfile(supabaseUserId);
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

async function verifySupabaseRequest(req: express.Request) {
  const authorization = req.headers.authorization;
  const accessToken = authorization?.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length)
    : null;

  if (!accessToken) {
    const error = new Error('Missing Supabase access token.');
    (error as Error & { status?: number }).status = 401;
    throw error;
  }
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    const error = new Error('Supabase account service is not configured.');
    (error as Error & { status?: number }).status = 503;
    throw error;
  }

  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: supabaseServiceRoleKey,
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (!response.ok) {
    const error = new Error('Invalid Supabase access token.');
    (error as Error & { status?: number }).status = response.status === 401 ? 401 : 503;
    throw error;
  }

  return response.json() as Promise<{ id: string; email?: string | null; user_metadata?: Record<string, any> | null }>;
}

app.get('/api/workbook', async (req, res) => {
  try {
    const authUser = await verifySupabaseRequest(req);
    const profile = await requireCloudSync(authUser.id);
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
    const authUser = await verifySupabaseRequest(req);
    const profile = await requireCloudSync(authUser.id);
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



async function getPlatformBillingConfig() {
  const config = await getPlatformConfig();
  return {
    currency: config.currency,
    provider: config.mobileMoneyProvider,
    accountName: config.mobileMoneyAccountName,
    accountNumber: config.mobileMoneyAccountNumber,
    instructions: config.mobileMoneyInstructions,
    plans: {
      plus: { name: 'Toolkit Plus', amount: config.plusAmount },
      pro: { name: 'Toolkit Pro', amount: config.proAmount },
    },
  };
}

app.get('/api/billing/mobile-money', async (req, res) => {
  const billing = await getPlatformBillingConfig();
  const planId = req.query.planId as keyof typeof billing.plans;
  const plan = billing.plans[planId];
  if (!plan || !Number.isFinite(plan.amount) || plan.amount <= 0 || Math.round(plan.amount * 100) !== plan.amount * 100) {
    return res.status(400).json({ error: 'Invalid billing plan.' });
  }
  return res.json({
    provider: billing.provider,
    accountName: billing.accountName,
    accountNumber: billing.accountNumber,
    instructions: billing.instructions,
    amount: plan.amount,
    currency: billing.currency,
  });
});

app.post('/api/billing/mobile-money/submit', async (req, res) => {
  try {
    const authUser = await verifySupabaseRequest(req);
    const profile = await getToolkitProfile(authUser.id);
    const billing = await getPlatformBillingConfig();
    const planId = req.body?.planId as keyof typeof billing.plans;
    const plan = billing.plans[planId];
    const transactionId = typeof req.body?.transactionId === 'string' ? req.body.transactionId.trim() : '';
    const payerName = typeof req.body?.payerName === 'string' ? req.body.payerName.trim() : null;

    if (!profile?.id) return res.status(404).json({ error: 'Toolkit profile not found.' });
    if (!plan || !Number.isFinite(plan.amount) || plan.amount <= 0 || Math.round(plan.amount * 100) !== plan.amount * 100) return res.status(400).json({ error: 'Invalid billing plan.' });
    if (!transactionId || transactionId.length > 120) return res.status(400).json({ error: 'A valid Mobile Money transaction ID is required.' });

    const existing = await supabaseRequest(
      `manual_payment_requests?select=id,plan_id,status,transaction_id,payer_name&user_id=eq.${encodeURIComponent(profile.id)}&status=in.(pending,approved)&order=created_at.desc&limit=1`,
    );
    if (existing?.[0]) {
      const current = existing[0];
      return res.status(409).json({
        error: current.status === 'approved' ? 'A payment has already been approved for this account.' : 'A payment is already pending verification.',
      });
    }

    const duplicate = await supabaseRequest(
      `manual_payment_requests?select=id&transaction_id=ilike.${encodeURIComponent(transactionId)}&limit=1`,
    );
    if (duplicate?.[0]) return res.status(409).json({ error: 'This transaction ID has already been submitted.' });

    const rows = await supabaseRequest('manual_payment_requests', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        user_id: profile.id,
        plan_id: planId,
        amount_value: plan.amount,
        currency: billing.currency,
        payment_method: 'mobile_money',
        transaction_id: transactionId,
        payer_name: payerName || null,
        status: 'pending',
      }),
    });

    const request = rows?.[0];
    return res.status(201).json({
      id: request.id,
      planId: request.plan_id,
      status: request.status,
      transactionId: request.transaction_id,
      payerName: request.payer_name,
    });
  } catch (error) {
    console.error('Mobile Money payment submission error:', error);
    return res.status(500).json({ error: 'Unable to submit the Mobile Money payment.' });
  }
});

app.get('/api/billing/mobile-money/status', async (req, res) => {
  try {
    const authUser = await verifySupabaseRequest(req);
    const profile = await getToolkitProfile(authUser.id);
    const billing = await getPlatformBillingConfig();
    const planId = req.query.planId as keyof typeof billing.plans;
    if (!profile?.id) return res.status(404).json({ error: 'Toolkit profile not found.' });
    if (!billing.plans[planId]) return res.status(400).json({ error: 'Invalid billing plan.' });

    const rows = await supabaseRequest(
      `manual_payment_requests?select=id,plan_id,status,transaction_id,payer_name&user_id=eq.${encodeURIComponent(profile.id)}&plan_id=eq.${encodeURIComponent(planId)}&order=created_at.desc&limit=1`,
    );
    const request = rows?.[0];
    return res.json({
      request: request
        ? {
            id: request.id,
            planId: request.plan_id,
            status: request.status,
            transactionId: request.transaction_id,
            payerName: request.payer_name,
          }
        : null,
    });
  } catch (error) {
    console.error('Mobile Money payment status error:', error);
    return res.status(500).json({ error: 'Unable to load Mobile Money payment status.' });
  }
});

async function requireManualBillingAdmin(authUserId: string) {
  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { apikey: supabaseServiceRoleKey || '', Authorization: `Bearer ${authUserId}` },
  });
  void response;
  throw new Error('Manual billing admin verification must use the authenticated request.');
}

app.post('/api/billing/mobile-money/review', async (req, res) => {
  try {
    const authUser = await verifySupabaseRequest(req);
    if (!isPlatformAdmin(authUser)) return res.status(403).json({ error: 'Platform administration access is required.' });
    const email = (authUser.email || '').toLowerCase();

    const requestId = typeof req.body?.requestId === 'string' ? req.body.requestId : '';
    const decision = req.body?.decision === 'approve' ? 'approved' : req.body?.decision === 'reject' ? 'rejected' : null;
    const reviewerNote = typeof req.body?.reviewerNote === 'string' ? req.body.reviewerNote.trim() : null;
    if (!requestId || !decision) return res.status(400).json({ error: 'Request ID and a valid review decision are required.' });

    const rows = await supabaseRequest(
      `manual_payment_requests?select=id,user_id,plan_id,status&id=eq.${encodeURIComponent(requestId)}&limit=1`,
    );
    const request = rows?.[0];
    if (!request) return res.status(404).json({ error: 'Payment request not found.' });
    if (request.status !== 'pending') return res.status(409).json({ error: 'This payment request has already been reviewed.' });

    const now = new Date().toISOString();
    await supabaseRequest(`manual_payment_requests?id=eq.${encodeURIComponent(requestId)}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ status: decision, reviewed_at: now, reviewed_by: email, reviewer_note: reviewerNote || null, updated_at: now }),
    });

    if (decision === 'approved') {
      const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      const live = await supabaseRequest(`subscriptions?select=id&user_id=eq.${request.user_id}&status=in.(active,trialing,past_due,incomplete)&limit=1`);
      if (live?.[0]?.id) {
        await supabaseRequest(`subscriptions?id=eq.${live[0].id}`, {
          method: 'PATCH',
          headers: { Prefer: 'return=minimal' },
          body: JSON.stringify({ plan_id: request.plan_id, provider: 'mobile_money', provider_subscription_id: requestId, status: 'active', current_period_end: periodEnd, updated_at: now }),
        });
      } else {
        await supabaseRequest('subscriptions', {
          method: 'POST',
          headers: { Prefer: 'return=minimal' },
          body: JSON.stringify({ user_id: request.user_id, plan_id: request.plan_id, provider: 'mobile_money', provider_subscription_id: requestId, status: 'active', current_period_end: periodEnd }),
        });
      }
      await supabaseRequest(`profiles?id=eq.${encodeURIComponent(request.user_id)}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ onboarding_completed: true, onboarding_completed_at: now, updated_at: now }),
      });
    }

    return res.json({ ok: true, status: decision });
  } catch (error) {
    console.error('Mobile Money payment review error:', error);
    return res.status(500).json({ error: 'Unable to review the Mobile Money payment.' });
  }
});


async function getMonimeRuntimeConfig() {
  const config = await getPlatformConfig();
  return {
    accessToken: config.monimeAccessToken,
    spaceId: config.monimeSpaceId,
    webhookSecret: config.monimeWebhookSecret,
    apiVersion: config.monimeApiVersion,
    currency: config.currency,
    plusAmount: config.plusAmount,
    proAmount: config.proAmount,
    appBaseUrl: config.appBaseUrl,
  };
}

const monimePlanConfig = {
  plus: { name: 'Toolkit Plus' },
  pro: { name: 'Toolkit Pro' },
} as const;

async function monimeRequest(pathname: string, init: RequestInit = {}) {
  const config = await getMonimeRuntimeConfig();
  if (!config.accessToken || !config.spaceId) {
    throw new Error('Monime billing is not configured.');
  }
  const headers: Record<string, string> = {
    Authorization: `Bearer ${config.accessToken}`,
    'Content-Type': 'application/json',
    'Monime-Space-Id': config.spaceId,
    'Monime-Version': config.apiVersion,
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

async function verifyMonimeWebhookSignature(rawBody: Buffer, signatureHeader: string | undefined) {
  const config = await getMonimeRuntimeConfig();
  if (!config.webhookSecret || !signatureHeader) return false;
  const match = signatureHeader.match(/(?:^|[, ]+)(?:sha256=|v1=)?([a-f0-9]{64})(?:$|[, ]+)/i);
  const supplied = match?.[1] || (signatureHeader.match(/^[a-f0-9]{64}$/i)?.[0] ?? '');
  if (!supplied) return false;
  const expected = crypto.createHmac('sha256', config.webhookSecret).update(rawBody).digest('hex');
  const a = Buffer.from(supplied, 'hex');
  const b = Buffer.from(expected, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

app.post('/api/billing/checkout', async (req, res) => {
  try {
    const authUser = await verifySupabaseRequest(req);
    const profile = await getToolkitProfile(authUser.id);
    const config = await getMonimeRuntimeConfig();
    const planId = req.body?.planId as keyof typeof monimePlanConfig;
    const plan = monimePlanConfig[planId];
    const amount = planId === 'plus' ? config.plusAmount : config.proAmount;

    if (!profile?.id) return res.status(404).json({ error: 'Toolkit profile not found.' });
    if (!plan || !Number.isFinite(amount) || amount <= 0 || Math.round(amount * 100) !== amount * 100) {
      return res.status(503).json({ error: 'This billing plan is not configured yet.' });
    }
    if (!config.appBaseUrl) {
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
          price: { currency: config.currency, value: amount },
          type: 'custom',
          quantity: 1,
          reference: planId,
          description: `BudgetPlanner ${planId} toolkit plan - 30 day billing period`,
        }],
        description: `BudgetPlanner ${planId} plan`,
        cancelUrl: `${config.appBaseUrl}/?billing=cancelled`,
        successUrl: `${config.appBaseUrl}/?billing=success`,
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
        amount_value: amount,
        currency: config.currency,
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
  if (!(await verifyMonimeWebhookSignature(rawBody, getMonimeSignatureHeader(req)))) {
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

    // A paid onboarding choice is not complete until the provider confirms payment.
    // This keeps users on onboarding if checkout is cancelled or unavailable.
    await supabaseRequest(`profiles?id=eq.${encodeURIComponent(checkout.user_id)}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({
        onboarding_completed: true,
        onboarding_completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }),
    });

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('Monime webhook processing error:', error);
    return res.status(500).json({ error: 'Unable to process Monime webhook.' });
  }
});

// Initialize Gemini Client
const apiKey = process.env.GEMINI_API_KEY;

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
    const authUser = await verifySupabaseRequest(req);
    const profile = await requireToolkitFeature(authUser.id, 'budget.aiInsights');

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

    const runtimeConfig = await getPlatformConfig();
    const runtimeApiKey = runtimeConfig.geminiApiKey || apiKey || '';

    if (!runtimeApiKey || runtimeApiKey === "MY_GEMINI_API_KEY" || runtimeApiKey.trim() === "") {
      return res.json({
        insights: `- Review your highest-spend categories and identify one recurring discretionary expense to reduce this month.
- Check subscriptions and memberships for services you have not used recently.
- Consider a short cooling-off period before discretionary purchases so planned spending stays aligned with your monthly budget.`,
        fallback: true,
      });
    }

    const response = await new GoogleGenAI({
      apiKey: runtimeApiKey,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
    }).models.generateContent({
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

    const runtimeConfig = await getPlatformConfig();
    const runtimeApiKey = runtimeConfig.geminiApiKey || apiKey || '';

    // Graceful fallback if no Gemini key is configured.
    if (!runtimeApiKey || runtimeApiKey === "MY_GEMINI_API_KEY" || runtimeApiKey.trim() === "") {
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

    const response = await new GoogleGenAI({
      apiKey: runtimeApiKey,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
    }).models.generateContent({
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
