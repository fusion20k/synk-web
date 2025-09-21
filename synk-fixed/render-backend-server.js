// Complete Render Backend Server for Synk OAuth
const express = require('express');
const cors = require('cors');
const { google } = require('googleapis');
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();

// Simple in-memory plan store (use real DB in production)
const planStore = new Map(); // userId -> planData

// Supabase client (server)
const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY; // fallback if SRK not provided
const supabase = (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY)
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  : null;
if (!supabase) console.warn('[Supabase] Not configured - using in-memory only');

// Stripe setup
let stripe = null;
let stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';
try {
  if (process.env.STRIPE_SECRET_KEY) {
    const Stripe = require('stripe');
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
} catch (e) {
  console.warn('[Stripe] SDK not available:', e.message);
}

// At top of server file
const oauthResults = {}; // { state: { tokens, createdAt, provider } }
console.log('[Server] BACKEND_URL=', process.env.BACKEND_URL || 'NOT SET');

// Middleware
app.use(cors());
// Raw body for Stripe webhooks must be BEFORE JSON parsers
app.use('/webhook', express.raw({ type: '*/*' }));
app.use('/stripe/webhook', express.raw({ type: '*/*' }));
// JSON parsers for everything else
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ensure OAuth2 client uses BACKEND_URL env variable as redirect URI
const BACKEND_URL = process.env.BACKEND_URL || 'https://synk-backend.onrender.com';
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `${BACKEND_URL}/oauth2callback`
);

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ 
    status: 'Synk Backend Running',
    timestamp: new Date().toISOString(),
    endpoints: [
      'POST /signup',
      'POST /login',
      'GET /me',
      'POST /create-checkout-session',
      'POST /stripe/webhook',
      'GET /api/plan/current?userId=... - Get plan (legacy)',
      'POST /api/plan/update - Update plan (manual/dev)',
      'GET /oauth-success - Success page',
      'GET /oauth-error - Error page'
    ]
  });
});

// Health/debug endpoints for webhook
app.get('/webhook', (req, res) => res.status(200).send('Webhook endpoint is up. Use POST from Stripe.'));
app.get('/stripe/webhook', (req, res) => res.status(200).send('Stripe webhook endpoint is up. Use POST from Stripe.'));
app.head('/webhook', (req, res) => res.status(200).send('OK'));
app.head('/stripe/webhook', (req, res) => res.status(200).send('OK'));

// Auth helpers
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'REPLACE_ME_SECURE_SECRET';

function authMiddleware(req, res, next) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ success: false, error: 'missing_token' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    return next();
  } catch (e) {
    return res.status(401).json({ success: false, error: 'invalid_token' });
  }
}

// Stripe webhook - persist to Supabase by email metadata
// Accept both /stripe/webhook and /webhook for tolerance
async function handleStripeWebhook(req, res) {
  try {
    console.log('[Webhook] POST received');
    const raw = Buffer.isBuffer(req.body) ? req.body : Buffer.from(req.body || '');
    let event = null;
    if (stripe && stripeWebhookSecret && req.headers['stripe-signature']) {
      try {
        event = stripe.webhooks.constructEvent(raw, req.headers['stripe-signature'], stripeWebhookSecret);
        console.log('[Webhook] Event verified:', event.type);
      } catch (err) {
        console.error('[Webhook] Signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
      }
    } else {
      // Fallback (works if signature not configured in env)
      event = JSON.parse(raw.toString('utf8'));
      console.log('[Webhook] Event parsed (no signature):', event.type);
    }

    const type = event.type;
    const obj = event.data?.object || {};

    // Handle Stripe customer deletion using stripe_customer_id (no email required)
    if (type === 'customer.deleted') {
      const customerId = obj?.id;
      try {
        if (supabase && customerId) {
          const { error } = await supabase
            .from('users')
            .update({
              plan: null,
              billing_period: null,
              trial_end: null,
              stripe_customer_id: null,
            })
            .eq('stripe_customer_id', customerId);
          if (error) throw error;
        }
      
        console.log(`[Webhook] Customer deleted: ${customerId} — soft-cleared subscription fields`);
        return res.json({ received: true });
      } catch (err) {
        console.error('[Webhook] Error handling customer.deleted:', err?.message || err);
        return res.status(500).send('server_error');
      }
    }

    // Create or attach user when a Stripe customer is created/updated
    if (type === 'customer.created' || type === 'customer.updated') {
      const customer = obj || {};
      const customerEmail = customer.email || null;
      const customerId = customer.id || null;
      try {
        if (supabase && customerEmail && customerId) {
          await upsertUserByEmail(customerEmail, { stripe_customer_id: customerId });
        }
        console.log(`[Webhook] ${type} processed for ${customerEmail} (${customerId})`);
        return res.json({ received: true });
      } catch (err) {
        console.error(`[Webhook] Error handling ${type}:`, err?.message || err);
        return res.status(500).send('server_error');
      }
    }

    // Hook customer into our DB on checkout completion (ensures record exists from Stripe-only flow)
    if (type === 'checkout.session.completed') {
      try {
        const session = obj || {};
        const customerId = session.customer || session.customer_id || obj.customer || null;
        const clientRef = session.client_reference_id || null;
        const email = session.customer_details?.email || session.customer_email || null;
        console.log('[Webhook] checkout.session.completed payload:', {
          customerId,
          clientRef,
          email,
        });
        if (!customerId) {
          console.warn('[Webhook] Missing customerId in checkout.session.completed');
        }
        if (supabase) {
          // Prefer updating by client_reference_id (Supabase user UUID) if provided
          if (clientRef) {
            const patch = { stripe_customer_id: customerId || null, billing_period: 'monthly' };
            const { error } = await supabase.from('users').update(patch).eq('id', clientRef);
            if (error) throw error;
          } else if (email) {
            await upsertUserByEmail(email, { stripe_customer_id: customerId || null });
          } else if (customerId) {
            // If no email and no clientRef, ensure we at least have a row keyed by stripe_customer_id for later linking
            const existing = await getUserByStripeCustomerId(customerId);
            if (!existing) {
              await insertUser({ stripe_customer_id: customerId });
            }
          }
        }
        console.log('[Webhook] checkout.session.completed processed');
        return res.json({ received: true });
      } catch (err) {
        console.error('[Webhook] Error handling checkout.session.completed:', err?.message || err);
        return res.status(500).send('server_error');
      }
    }

    // Resolve user email (for other events)
    let userEmail = obj.metadata?.user_email || obj.customer_details?.email || event.data?.object?.customer_email || null;
    // Fallback: try resolve by Stripe customer ID if email is missing
    if (!userEmail && obj?.customer && supabase) {
      try {
        const u = await getUserByStripeCustomerId(obj.customer);
        if (u?.email) userEmail = u.email;
      } catch (e) {
        console.warn('[Webhook] Failed fallback lookup by customer id:', e?.message || e);
      }
    }
    if (!userEmail) {
      console.warn('[Webhook] Missing user_email; cannot map plan to user');
      return res.status(200).json({ received: true, note: 'missing_user_email' });
    }

    // Cancellation
    if (type === 'customer.subscription.deleted') {
      if (supabase) {
        if (obj?.customer) {
          await updateUserByStripeCustomerId(obj.customer, { plan: null, billing_period: null });
        } else {
          await updateUser(userEmail, { plan: null, billing_period: null });
        }
      }
      console.log(`[Webhook] Subscription cancelled for ${userEmail || obj?.customer}`);
      return res.json({ received: true });
    }

    // Determine cycle and plan
    const price = obj.items?.data?.[0]?.price || obj.lines?.data?.[0]?.price || {};
    const interval = price.recurring?.interval;
    const unitAmount = price.unit_amount || 0;
    const billingCycle = interval === 'year' ? 'yearly' : 'monthly';
    const plan = unitAmount >= 2499 ? 'ultimate' : 'pro';

    if (supabase) {
      if (obj?.customer) {
        await updateUserByStripeCustomerId(obj.customer, { plan, billing_period: billingCycle });
      } else {
        await updateUser(userEmail, { plan, billing_period: billingCycle });
      }
    }

    console.log(`[Webhook] Plan updated for ${userEmail || obj?.customer} to ${plan} (${billingCycle})`);
    return res.json({ received: true });
  } catch (e) {
    console.error('[Webhook] Error:', e.message);
    return res.status(400).send('bad_request');
  }
}

app.post('/stripe/webhook', handleStripeWebhook);
app.post('/webhook', handleStripeWebhook);

// Helpers to read/write users in Supabase
async function getUserByEmail(email) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}
async function insertUser(row) {
  if (!supabase) return;
  const { error } = await supabase.from('users').insert(row);
  if (error) throw error;
}
async function updateUser(email, patch) {
  if (!supabase) return;
  const { error } = await supabase.from('users').update(patch).eq('email', email);
  if (error) throw error;
}
// Update helper by stripe_customer_id
async function updateUserByStripeCustomerId(customerId, patch) {
  if (!supabase || !customerId) return;
  const { error } = await supabase.from('users').update(patch).eq('stripe_customer_id', customerId);
  if (error) throw error;
}
// Lookup helper by stripe_customer_id
async function getUserByStripeCustomerId(customerId) {
  if (!supabase || !customerId) return null;
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('stripe_customer_id', customerId)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

// Upsert helper: ensures a user row exists for the given email
async function upsertUserByEmail(email, patch = {}) {
  if (!supabase || !email) return null;
  const existing = await getUserByEmail(email);
  if (existing) {
    await updateUser(email, patch);
    return { ...existing, ...patch };
  } else {
    const row = { email, ...patch };
    await insertUser(row);
    return row;
  }
}

// Signup (About tab form will call this)
app.post('/signup', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ success: false, error: 'missing_params' });

    // Check existing
    const existing = supabase ? await getUserByEmail(email) : null;
    if (existing) return res.status(409).json({ success: false, error: 'user_exists' });

    const id = 'user_' + Math.random().toString(36).slice(2);
    const password_hash = await bcrypt.hash(password, 10);

    // Create Stripe customer immediately (recommended)
    let stripe_customer_id = null;
    if (process.env.STRIPE_SECRET_KEY) {
      try {
        const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
        const customer = await stripe.customers.create({ email });
        stripe_customer_id = customer.id;
      } catch (err) {
        console.warn('[Signup] Failed to create Stripe customer:', err.message);
      }
    }

    const trial_end = new Date(Date.now() + 14*24*60*60*1000).toISOString();
    const row = { email, password_hash, stripe_customer_id, plan: 'pro', billing_period: 'trial', trial_end };
    if (supabase) await insertUser(row);

    const token = jwt.sign({ id, email }, JWT_SECRET, { expiresIn: '30d' });
    return res.json({ success: true, token, user: { id, email } });
  } catch (e) {
    console.error('[POST /signup] Error:', e.message);
    return res.status(500).json({ success: false, error: 'server_error' });
  }
});

// Login
app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ success: false, error: 'missing_params' });

    let userRow = supabase ? await getUserByEmail(email) : null;
    if (!userRow) return res.status(401).json({ success: false, error: 'invalid_credentials' });

    const ok = await bcrypt.compare(password, userRow.password_hash || '');
    if (!ok) return res.status(401).json({ success: false, error: 'invalid_credentials' });

    const token = jwt.sign({ id: userRow.id || ('user_' + Math.random().toString(36).slice(2)), email }, JWT_SECRET, { expiresIn: '30d' });
    return res.json({ success: true, token, user: { id: userRow.id || null, email } });
  } catch (e) {
    console.error('[POST /login] Error:', e.message);
    return res.status(500).json({ success: false, error: 'server_error' });
  }
});

// /me endpoint - core source of truth for app
app.get('/me', authMiddleware, async (req, res) => {
  try {
    const email = req.user.email;
    const u = supabase ? await getUserByEmail(email) : null;
    if (!u) return res.status(404).json({ success: false, error: 'user_not_found' });

    // expire trial if needed (legacy billing_period-based)
    if (u.trial_end && new Date() > new Date(u.trial_end) && u.billing_period === 'trial') {
      await updateUser(email, { plan: null, billing_period: null, trial_end: null, is_trial: false });
      u.plan = null; u.billing_period = null; u.trial_end = null; u.is_trial = false;
    }

    const plan = u.plan ? { type: u.plan, billingCycle: u.billing_period } : null;
    return res.json({
      success: true,
      email,
      plan,
      billing_period: u.billing_period,
      trial_end: u.trial_end,
      is_trial: !!u.is_trial
    });
  } catch (e) {
    console.error('[GET /me] Error:', e.message);
    return res.status(500).json({ success: false, error: 'server_error' });
  }
});

// Plan APIs
app.get('/api/plan/current', (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ success: false, error: 'missing_userId' });
  const plan = planStore.get(userId) || null;
  return res.json({ success: true, plan });
});

app.post('/api/plan/update', (req, res) => {
  const { userId, plan } = req.body || {};
  if (!userId || !plan) return res.status(400).json({ success: false, error: 'missing_params' });
  plan.updatedAt = new Date().toISOString();
  plan.userId = userId;
  planStore.set(userId, plan);
  return res.json({ success: true, plan });
});

// Server-side Stripe Checkout (LIVE keys only) - ties to user by email
app.post('/create-checkout-session', authMiddleware, async (req, res) => {
  try {
    const { plan, billing_period } = req.body || {};
    const email = req.user.email;
    if (!email || !plan || !billing_period) {
      return res.status(400).json({ success: false, error: 'missing_params' });
    }
    if (!process.env.STRIPE_SECRET_KEY) {
      return res.status(500).json({ success: false, error: 'missing_STRIPE_SECRET_KEY' });
    }

    // Map to live price IDs
    const getStripePriceId = (plan, period) => {
      const key = `${plan}:${period}`;
      const map = {
        'pro:monthly': process.env.STRIPE_PRICE_PRO_MONTHLY,
        'pro:yearly': process.env.STRIPE_PRICE_PRO_YEARLY,
        'ultimate:monthly': process.env.STRIPE_PRICE_ULTIMATE_MONTHLY,
        'ultimate:yearly': process.env.STRIPE_PRICE_ULTIMATE_YEARLY,
      };
      return map[key];
    };

    const priceId = getStripePriceId(plan, billing_period);
    if (!priceId) return res.status(400).json({ success: false, error: 'invalid_plan_or_period' });

    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

    // Get or create customer
    let stripeCustomerId = null;
    if (supabase) {
      const u = await getUserByEmail(email);
      stripeCustomerId = u?.stripe_customer_id || null;
    }
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({ email });
      stripeCustomerId = customer.id;
      if (supabase) await updateUser(email, { stripe_customer_id: stripeCustomerId });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      customer: stripeCustomerId,
      success_url: `${BACKEND_URL}/oauth-success`,
      cancel_url: `${BACKEND_URL}/oauth-error?error=checkout_cancelled`,
      allow_promotion_codes: true,
      metadata: { user_email: email },
      subscription_data: { metadata: { user_email: email } }
    });

    return res.json({ success: true, url: session.url });
  } catch (err) {
    console.error('[Checkout] Error creating session:', err.message);
    return res.status(500).json({ success: false, error: 'server_error' });
  }
});

app.get('/oauth2callback', async (req, res) => {
  console.log('[OAuth2Callback] incoming request', { query: req.query });
  const { code, state } = req.query;
  if (!code || !state) return res.status(400).send('Missing code or state');

  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauthResults[state] = { tokens, createdAt: Date.now() };
    console.log('[OAuth2Callback] tokens stored for state:', state);
    return res.send('<html><body><h2>Synk connected — close this tab.</h2></body></html>');
  } catch (err) {
    console.error('[OAuth2Callback] token exchange error:', err && err.message);
    return res.status(500).send('OAuth token exchange failed');
  }
});

app.get('/api/oauth/result', (req, res) => {
  const { state } = req.query;
  console.log('[API.OAuthResult] poll request for state:', state);
  if (!state) return res.status(400).json({ error: 'missing_state' });

  const entry = oauthResults[state];
  if (!entry) {
    return res.status(200).json({ status: 'pending' });
  }

  const { tokens, provider } = entry;
  delete oauthResults[state];
  console.log('[API.OAuthResult] returning ready for state:', state);
  return res.status(200).json({ status: 'ready', tokens, provider });
});

// Notion OAuth callback (if needed)
app.get('/oauth2callback/notion', async (req, res) => {
  try {
    const { code, state, error } = req.query;
    
    console.log('📥 Notion OAuth callback received:', { code: !!code, state, error });
    
    if (error) {
      console.error('Notion OAuth error:', error);
      return res.redirect(`/oauth-error?error=${encodeURIComponent(error)}`);
    }
    
    if (!code || !state) {
      console.error('Missing code or state parameter for Notion');
      return res.redirect('/oauth-error?error=missing_parameters');
    }
    
    // TODO: Implement Notion token exchange
    console.log('🔄 Notion OAuth - token exchange not implemented yet');
    
    // For now, just redirect to success
    res.redirect('/oauth-success');
    
  } catch (error) {
    console.error('Notion OAuth callback error:', error);
    res.redirect(`/oauth-error?error=${encodeURIComponent(error.message)}`);
  }
});

// Success page
app.get('/oauth-success', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>OAuth Success - Synk</title>
        <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f5f5f5; }
            .container { background: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); max-width: 400px; margin: 0 auto; }
            .success { color: #4CAF50; font-size: 48px; margin-bottom: 20px; }
            h1 { color: #333; margin-bottom: 20px; }
            p { color: #666; margin-bottom: 30px; }
            .close-btn { background: #4CAF50; color: white; border: none; padding: 12px 24px; border-radius: 5px; cursor: pointer; font-size: 16px; }
            .close-btn:hover { background: #45a049; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="success">✅</div>
            <h1>Authentication Successful!</h1>
            <p>You can now close this window and return to the Synk app.</p>
            <button class="close-btn" onclick="window.close()">Close Window</button>
        </div>
        <script>
            // Auto-close after 5 seconds
            setTimeout(() => {
                window.close();
            }, 5000);
        </script>
    </body>
    </html>
  `);
});

// Error page
app.get('/oauth-error', (req, res) => {
  const error = req.query.error || 'Unknown error';
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>OAuth Error - Synk</title>
        <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f5f5f5; }
            .container { background: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); max-width: 400px; margin: 0 auto; }
            .error { color: #f44336; font-size: 48px; margin-bottom: 20px; }
            h1 { color: #333; margin-bottom: 20px; }
            p { color: #666; margin-bottom: 30px; }
            .error-details { background: #ffebee; padding: 15px; border-radius: 5px; margin-bottom: 20px; color: #c62828; }
            .retry-btn { background: #2196F3; color: white; border: none; padding: 12px 24px; border-radius: 5px; cursor: pointer; font-size: 16px; margin-right: 10px; }
            .close-btn { background: #666; color: white; border: none; padding: 12px 24px; border-radius: 5px; cursor: pointer; font-size: 16px; }
            .retry-btn:hover { background: #1976D2; }
            .close-btn:hover { background: #555; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="error">❌</div>
            <h1>Authentication Failed</h1>
            <div class="error-details">
                Error: ${error}
            </div>
            <p>Please try again in the Synk app.</p>
            <button class="retry-btn" onclick="window.close()">Try Again</button>
            <button class="close-btn" onclick="window.close()">Close Window</button>
        </div>
    </body>
    </html>
  `);
});

app.get('/_health', (req, res) => res.json({ ok: true, host: BACKEND_URL }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`[Server] Listening on port ${PORT}`));

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Server shutting down...');
  process.exit(0);
});

module.exports = app;