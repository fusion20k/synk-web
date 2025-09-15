# 🔗 Stripe Webhook Setup Guide for Synk

This guide will help you set up Stripe webhooks to automatically update user plans when payments are processed.

## 📋 Overview

The Synk app now includes a complete plan management system that:
- ✅ Detects user plans (Trial, Pro, Ultimate)
- ✅ Manages 14-day free trials
- ✅ Stores plan data locally in `~/.synk/plan.json`
- ✅ Runs a webhook server to receive Stripe events
- ✅ Updates plans automatically when payments succeed

## 🚀 Quick Setup

### 1. Stripe Dashboard Setup

1. **Log into your Stripe Dashboard**
   - Go to https://dashboard.stripe.com/

2. **Navigate to Webhooks**
   - Go to Developers → Webhooks
   - Click "Add endpoint"

3. **Configure Webhook Endpoint**
   ```
   Endpoint URL: https://your-domain.com/webhook/stripe
   ```
   
   **Events to send:**
   - `checkout.session.completed`
   - `invoice.payment_succeeded`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`

4. **Get Webhook Secret**
   - After creating the webhook, click on it
   - Copy the "Signing secret" (starts with `whsec_`)

### 2. Environment Configuration

Update your `.env` file:

```env
# Stripe Webhook Configuration
STRIPE_WEBHOOK_SECRET=whsec_your_actual_webhook_secret_here
WEBHOOK_PORT=3001
```

### 3. Deployment Options

#### Option A: Use ngrok for Local Testing

1. **Install ngrok**
   ```bash
   npm install -g ngrok
   ```

2. **Start your Synk app**
   ```bash
   npm start
   ```

3. **In another terminal, expose the webhook port**
   ```bash
   ngrok http 3001
   ```

4. **Update Stripe webhook URL**
   - Copy the ngrok URL (e.g., `https://abc123.ngrok.io`)
   - Update your Stripe webhook endpoint to: `https://abc123.ngrok.io/webhook/stripe`

#### Option B: Deploy Webhook Server to Cloud

1. **Deploy to Render/Heroku/Vercel**
   - Use the webhook server code in `src/webhookServer.js`
   - Set environment variables in your deployment platform

2. **Update Stripe webhook URL**
   - Use your deployed URL: `https://your-app.render.com/webhook/stripe`

## 🔧 How It Works

### Plan Detection Flow

1. **First Launch**: User gets "Free Trial" status
2. **Connect Services**: When both Google Calendar and Notion are connected, 14-day trial starts
3. **Purchase**: When user buys Pro/Ultimate, Stripe webhook updates plan
4. **Renewal**: Automatic plan renewal via Stripe webhooks

### Webhook Events Handled

| Event | Action |
|-------|--------|
| `checkout.session.completed` | Activate new subscription |
| `invoice.payment_succeeded` | Renew existing subscription |
| `customer.subscription.updated` | Update plan details |
| `customer.subscription.deleted` | Cancel subscription |

### Plan Data Structure

```json
{
  "type": "pro",
  "name": "Pro",
  "description": "You are subscribed to Synk Pro (monthly).",
  "features": [
    "Unlimited Notion databases",
    "Unlimited Google calendars",
    "Real-time bidirectional sync",
    "Email support"
  ],
  "status": "active",
  "subscriptionId": "sub_1234567890",
  "customerEmail": "user@example.com",
  "billingCycle": "monthly",
  "currentPeriodEnd": "2024-02-15T00:00:00.000Z",
  "updatedAt": "2024-01-15T12:00:00.000Z",
  "userId": "uuid-here"
}
```

## 🧪 Testing

### Test Webhook Locally

1. **Start the app**
   ```bash
   npm start
   ```

2. **Test webhook endpoint**
   ```bash
   curl -X POST http://localhost:3001/webhook/stripe \
     -H "Content-Type: application/json" \
     -d '{"type": "checkout.session.completed", "data": {"object": {"amount_total": 1299}}}'
   ```

3. **Check plan update**
   - Open Synk app
   - Go to About tab
   - Verify plan status updated

### Test with Stripe CLI

1. **Install Stripe CLI**
   ```bash
   # Windows
   scoop install stripe
   
   # Mac
   brew install stripe/stripe-cli/stripe
   ```

2. **Login to Stripe**
   ```bash
   stripe login
   ```

3. **Forward events to local webhook**
   ```bash
   stripe listen --forward-to localhost:3001/webhook/stripe
   ```

4. **Trigger test events**
   ```bash
   stripe trigger checkout.session.completed
   ```

## 🔒 Security

### Webhook Signature Verification

The webhook server automatically verifies Stripe signatures using your webhook secret. This ensures only legitimate Stripe events are processed.

### Data Storage

- Plan data is stored locally in `~/.synk/plan.json`
- No sensitive payment data is stored
- Only plan status and subscription metadata is kept

## 🚨 Troubleshooting

### Common Issues

1. **Webhook not receiving events**
   - Check webhook URL is correct
   - Verify ngrok tunnel is active
   - Check Stripe webhook logs

2. **Signature verification failed**
   - Ensure `STRIPE_WEBHOOK_SECRET` is correct
   - Check webhook secret in Stripe dashboard

3. **Plan not updating**
   - Check app logs for errors
   - Verify webhook events are being sent
   - Test with manual API call

### Debug Endpoints

The webhook server includes debug endpoints:

```bash
# Health check
GET http://localhost:3001/health

# Get current plan
GET http://localhost:3001/api/plan/current

# Manual plan update (for testing)
POST http://localhost:3001/api/plan/update
Content-Type: application/json

{
  "customer_email": "test@example.com",
  "subscription_id": "sub_test123",
  "product_name": "Synk Pro",
  "billing_cycle": "monthly",
  "status": "active",
  "current_period_end": "2024-02-15T00:00:00.000Z"
}
```

## 📞 Support

If you need help setting up webhooks:

1. Check the app logs for error messages
2. Test webhook connectivity with ngrok
3. Verify Stripe webhook configuration
4. Contact support with specific error messages

## 🎯 Next Steps

After webhook setup is complete:

1. **Test the full flow**: Purchase → Webhook → Plan Update
2. **Monitor webhook logs** in Stripe dashboard
3. **Set up monitoring** for webhook failures
4. **Configure backup webhook endpoints** for redundancy

---

**✅ Setup Complete!** Your Synk app now has full Stripe integration with automatic plan management.