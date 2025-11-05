# Retention Coupon - ONE-TIME 20% OFF Implementation

## Overview
The retention coupon is a **ONE-TIME offer per user** showing **20% off** (changed from 30%). Once accepted, it won't show again.

---

## 📋 Stripe Configuration

### Create Coupon in Stripe Dashboard

1. Go to **Products → Coupons → Create Coupon**
2. Fill in:
   - **Name**: `Cancel Offer`
   - **Discount Type**: Percentage off
   - **Percentage discount**: `20` (changed from 30)
   - **Duration**: `Once` (applies only once per customer)
   - **Max redemptions**: Leave blank (allows one-time use per customer due to "Once" duration)

3. **Save the coupon ID** (usually auto-generated, e.g., `CANCEL_OFFER_20`)

---

## 🔧 Backend Implementation Required

The frontend now expects these two API endpoints:

### 1. **GET `/api/stripe/check-retention-coupon`**

Check if user has already used the retention coupon.

**Headers:**
```
Authorization: Bearer {authToken}
```

**Response (200):**
```json
{
  "coupon_used": false,  // or true if already applied
  "coupon_id": "CANCEL_OFFER_20"
}
```

**Implementation Notes:**
- Query your database to check if user has a record of using this coupon
- Store in a table like `user_retention_coupons` with columns:
  - `user_id`
  - `coupon_id` (e.g., "CANCEL_OFFER_20")
  - `applied_at` (timestamp)
  - `applied_successfully` (boolean)

---

### 2. **POST `/api/stripe/apply-retention-coupon`**

Apply the 20% retention coupon to user's active subscription.

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Headers:**
```
Authorization: Bearer {authToken}
Content-Type: application/json
```

**Response (200):**
```json
{
  "success": true,
  "message": "Coupon applied successfully",
  "subscription_id": "sub_xxxxx",
  "coupon_code": "CANCEL_OFFER_20"
}
```

**Error Response (400/409):**
```json
{
  "error": "User has already used this coupon"
}
```

**Implementation Notes:**
- Find user's active Stripe subscription
- Use Stripe API to apply coupon: `stripe.subscriptions.update(subscriptionId, { coupon: couponId })`
- Store usage record in database immediately (before user refreshes)
- Return error if already used

**Stripe API Example (Node.js):**
```javascript
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Get subscription
const subscription = await stripe.subscriptions.list({ 
  customer: customerId, 
  status: 'active',
  limit: 1 
});

// Apply coupon
await stripe.subscriptions.update(subscription.data[0].id, {
  coupon: 'CANCEL_OFFER_20'
});
```

---

## 🎨 Frontend Flow

### User Experience:

1. **User clicks "Cancel Subscription"**
   - Modal opens
   - `loadRetentionOffers()` is called
   - Checks `/api/stripe/check-retention-coupon`

2. **If coupon NOT used:**
   - Shows: ✨ "Get 20% off for the next 3 months!"
   - Button: "Accept Offer"
   - On click → `acceptRetentionOffer()`

3. **If coupon ALREADY used:**
   - Shows: ✓ "You're already enjoying 20% off!"
   - No button (offer hidden)

4. **User clicks "Accept Offer":**
   - Calls `POST /api/stripe/apply-retention-coupon`
   - If successful → Shows success message
   - Offer disappears from modal
   - Page reloads

---

## 📊 Database Schema (Suggested)

### Table: `user_retention_coupons`
```sql
CREATE TABLE user_retention_coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  coupon_id VARCHAR(50) NOT NULL,
  applied_at TIMESTAMP DEFAULT NOW(),
  applied_successfully BOOLEAN DEFAULT true,
  subscription_id VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_user_coupon 
  ON user_retention_coupons(user_id, coupon_id);
```

---

## ✅ Testing Checklist

- [ ] Stripe coupon created with **20% discount** and **Once duration**
- [ ] Backend endpoint `/api/stripe/check-retention-coupon` implemented
- [ ] Backend endpoint `/api/stripe/apply-retention-coupon` implemented
- [ ] Database tracking for one-time use working
- [ ] User sees offer on first cancel modal open
- [ ] Offer disappears after applying
- [ ] User doesn't see offer on subsequent cancels (if they cancel again)
- [ ] Success message displays "20% off" (not 30%)

---

## 🔄 Notes

- **One-time per user**: Stripe's "Once" duration enforces one redemption per customer
- **No duplication**: Database records prevent double-apply attempts
- **Fallback UI**: If API fails, offer still shows (graceful degradation)
- **After cancellation**: User gets re-subscribe coupon code (separate system) valid for 90 days
