# Stripe Product and Pricing Update Guide

This guide explains how to update Stripe to match the new Synk pricing structure.

## Plan Name Changes

### Old Pricing
- **Pro Plan**: $7.99/month (was $12.99 with 40% discount)
- **Ultimate Plan**: $14.99/month (was $24.99 with 40% discount)

### New Pricing
- **Free Plan**: $0/month (NEW - limit to 1 calendar, 1 database, manual sync only)
- **Pro Plan**: $5.00/month (replaces old Ultimate pricing)

## Steps to Update in Stripe Dashboard

### 1. **Create Free Plan Product**
   - Go to [Stripe Dashboard](https://dashboard.stripe.com) → Products
   - Click "Add product"
   - **Name**: "Free" or "Synk Free"
   - **Type**: Service
   - Create prices:
     - Monthly: $0/month (price_id will be generated)
     - Yearly: $0/year (price_id will be generated)
   - Save the price IDs for use in `.env` file

### 2. **Rename Pro Plan (Old Ultimate)**
   - In Products, find the product currently named "Ultimate" (or "Pro")
   - Rename it to **"Pro"** or **"Synk Pro"**
   - **IMPORTANT**: Keep the existing price IDs - they map to the database
   - Update description/metadata as needed

### 3. **Archive Old Pro Plan (If Separate)**
   - If the old Pro plan ($7.99) is a separate product:
     - Find it in Products
     - Click the three-dot menu → Archive
     - This prevents users from purchasing the old plan

### 4. **Update Product Descriptions** (Optional but recommended)
   - **Free Plan**: "1 calendar, 1 database, manual sync, community support"
   - **Pro Plan**: "3 calendars, 3 databases, automatic sync, email support"

## Environment Variables to Update

The `.env` file has been updated with the new structure. Here are the mappings:

```env
# Free Plan (NEW)
STRIPE_PRICE_FREE_MONTHLY=price_XXXXXXXXXXXXXXXX  # Get from Stripe Dashboard
STRIPE_PRICE_FREE_YEARLY=price_XXXXXXXXXXXXXXXX   # Get from Stripe Dashboard

# Pro Plan (formerly Ultimate)
STRIPE_PRICE_PRO_MONTHLY=price_1S7kTG2VdGqzvJRLkzpyLNfr
STRIPE_PRICE_PRO_YEARLY=price_1S7kUO2VdGqzvJRLd9hBPSKw
```

After creating the Free plan in Stripe, copy the price IDs and update the `.env` file:
- Replace `price_XXXXXXXXXXXXXXXX` with actual price IDs from Stripe

## Testing Webhooks

1. After updating products, test your webhook configuration:
   ```bash
   # Verify webhook is receiving events
   curl -X GET https://your-backend-url/stripe/ping
   ```

2. Test a subscription using Stripe's test mode:
   - Use test card: `4242 4242 4242 4242`
   - Any future expiry date
   - Any CVC

## Database Updates

The Supabase migration file (`migrations/update_plan_names.sql`) will:
- Convert existing `plan = 'pro'` to `plan = 'free'`
- Convert existing `plan = 'ultimate'` to `plan = 'pro'`
- Keep `plan = NULL` unchanged

## Verification Checklist

After completing all updates:

- [ ] Free product created in Stripe with correct pricing
- [ ] Pro product renamed/verified in Stripe
- [ ] `.env` file updated with new price IDs
- [ ] Supabase migration executed
- [ ] Website pricing page displays Free/Pro plans
- [ ] Account page shows Free/Pro in comparison table
- [ ] Test webhook receives subscription events
- [ ] Test checkout flow for both Free and Pro plans
- [ ] New signups create users with 'free' plan in database

## Rollback Plan

If you need to rollback these changes:

1. Restore the previous `.env` file
2. In Supabase, run reverse migration:
   ```sql
   UPDATE users SET plan = 'pro' WHERE plan = 'free';
   UPDATE users SET plan = 'ultimate' WHERE plan = 'pro';
   ```
3. Restore previous versions of pricing page and account page HTML
4. Restore old Stripe products

## Need Help?

- Check Stripe webhook logs: Dashboard → Developers → Events
- Check server logs for Stripe webhook errors: `journalctl -u synk-backend -f`
- Verify database plan values: In Supabase SQL Editor, run `SELECT plan, COUNT(*) FROM users GROUP BY plan;`
