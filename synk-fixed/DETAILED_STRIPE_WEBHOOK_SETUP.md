# 🔗 Complete Stripe Webhook Setup Guide

This is a **step-by-step guide** with screenshots and exact settings for configuring Stripe webhooks for Synk.

---

## 📋 **STEP 1: Access Stripe Dashboard**

1. **Login to Stripe Dashboard**
   - Go to: https://dashboard.stripe.com/
   - Login with your Stripe account credentials

2. **Navigate to Webhooks Section**
   - In the left sidebar, click **"Developers"**
   - Click **"Webhooks"** from the dropdown menu
   - You'll see the webhooks management page

---

## 🔧 **STEP 2: Create New Webhook Endpoint**

### **2.1 Click "Add endpoint"**
- Look for the blue **"+ Add endpoint"** button
- Click it to open the webhook creation form

### **2.2 Configure Endpoint URL**

**For Local Testing (Recommended for setup):**
```
Endpoint URL: https://your-ngrok-url.ngrok.io/webhook/stripe
```

**For Production Deployment:**
```
Endpoint URL: https://your-domain.com/webhook/stripe
```

**Examples:**
- Local: `https://abc123.ngrok.io/webhook/stripe`
- Production: `https://synk-webhooks.render.com/webhook/stripe`

---

## 📡 **STEP 3: Configure Events to Send**

### **3.1 Select "Select events"**
- Click the **"Select events"** button
- This opens the event selection modal

### **3.2 Choose Specific Events (IMPORTANT)**
**Select EXACTLY these events:**

#### **Checkout Events:**
- ✅ `checkout.session.completed`
- ✅ `checkout.session.async_payment_succeeded`

#### **Subscription Events:**
- ✅ `customer.subscription.created`
- ✅ `customer.subscription.updated`
- ✅ `customer.subscription.deleted`

#### **Invoice Events:**
- ✅ `invoice.payment_succeeded`
- ✅ `invoice.payment_failed`

#### **Customer Events:**
- ✅ `customer.subscription.trial_will_end`

### **3.3 Event Selection Process:**
1. **Search for events**: Use the search box to find each event
2. **Check the boxes**: Click the checkbox next to each event name
3. **Verify selection**: Ensure all 8 events are selected
4. **Click "Add events"**: Confirm your selection

---

## ⚙️ **STEP 4: Advanced Configuration**

### **4.1 API Version**
- **Select**: `2023-10-16` (or latest stable version)
- **Why**: Ensures compatibility with webhook processing

### **4.2 Filter Events (Optional)**
- **Leave blank** for now
- **Advanced users**: Can add filters later if needed

### **4.3 Metadata (Optional)**
- **Leave blank** for standard setup
- **Custom**: Add `app: synk` if you want to identify the source

---

## 🔒 **STEP 5: Security Settings**

### **5.1 Webhook Signing**
- **Enable**: ✅ **"Enable webhook signing"** (should be enabled by default)
- **Algorithm**: `HMAC-SHA256` (default)

### **5.2 Retry Logic**
- **Enable**: ✅ **"Enable automatic retries"**
- **Max retries**: `3` (default)
- **Retry interval**: `Exponential backoff` (default)

---

## 💾 **STEP 6: Save and Get Secret**

### **6.1 Create Webhook**
- Click **"Add endpoint"** button at the bottom
- Stripe will create your webhook and redirect to its details page

### **6.2 Copy Webhook Secret**
1. **Find the "Signing secret" section**
2. **Click "Reveal"** to show the secret
3. **Copy the secret** (starts with `whsec_`)
4. **Save it securely** - you'll need this for your app

**Example secret format:**
```
whsec_1234567890abcdef1234567890abcdef12345678
```

---

## 🌐 **STEP 7: Local Testing Setup (ngrok)**

### **7.1 Install ngrok**
```bash
# Windows (using npm)
npm install -g ngrok

# Windows (using Chocolatey)
choco install ngrok

# Mac (using Homebrew)
brew install ngrok
```

### **7.2 Start Your Synk App**
```bash
cd c:\Users\david\Desktop\synk\synk-fixed
npm start
```

### **7.3 Start ngrok Tunnel**
```bash
# In a new terminal window
ngrok http 3001
```

### **7.4 Copy ngrok URL**
- ngrok will show a URL like: `https://abc123.ngrok.io`
- **Copy this URL** and add `/webhook/stripe`
- **Full webhook URL**: `https://abc123.ngrok.io/webhook/stripe`

### **7.5 Update Stripe Webhook**
1. **Go back to Stripe Dashboard**
2. **Click on your webhook**
3. **Click "Update details"**
4. **Update the endpoint URL** with your ngrok URL
5. **Save changes**

---

## 🔧 **STEP 8: Configure Your App**

### **8.1 Update .env File**
```env
# Add these lines to your .env file
STRIPE_WEBHOOK_SECRET=whsec_your_actual_secret_here
WEBHOOK_PORT=3001
```

### **8.2 Restart Your App**
```bash
# Stop the app (Ctrl+C) and restart
npm start
```

---

## 🧪 **STEP 9: Test Your Setup**

### **9.1 Test Webhook Connectivity**
```bash
# Test health endpoint
curl http://localhost:3001/health

# Should return: {"status":"ok","service":"Synk Webhook Server","timestamp":"..."}
```

### **9.2 Test with Stripe CLI (Optional)**
```bash
# Install Stripe CLI
npm install -g stripe-cli

# Login to Stripe
stripe login

# Test webhook
stripe listen --forward-to localhost:3001/webhook/stripe
```

### **9.3 Test Real Payment**
1. **Use your Stripe payment links**
2. **Make a test purchase** (use Stripe test cards)
3. **Check app logs** for webhook events
4. **Verify plan update** in Synk About tab

---

## 📊 **STEP 10: Monitor Webhook Delivery**

### **10.1 Stripe Dashboard Monitoring**
1. **Go to Webhooks section**
2. **Click on your webhook**
3. **View "Recent deliveries"** tab
4. **Check for successful deliveries** (200 status codes)

### **10.2 Common Status Codes**
- ✅ **200**: Success - webhook processed correctly
- ❌ **400**: Bad request - check webhook URL
- ❌ **404**: Not found - verify endpoint URL
- ❌ **500**: Server error - check app logs

---

## 🚨 **TROUBLESHOOTING**

### **Problem: Webhook not receiving events**
**Solutions:**
1. **Check ngrok tunnel**: Ensure it's still running
2. **Verify URL**: Confirm webhook URL is correct
3. **Check firewall**: Ensure port 3001 is accessible
4. **Test connectivity**: Use curl to test endpoint

### **Problem: Signature verification failed**
**Solutions:**
1. **Check webhook secret**: Ensure it's correct in .env
2. **Restart app**: After updating .env file
3. **Verify secret**: Copy again from Stripe dashboard

### **Problem: Events not triggering**
**Solutions:**
1. **Check event selection**: Ensure all 8 events are selected
2. **Test with Stripe CLI**: Use `stripe trigger` commands
3. **Check logs**: Look for error messages in app console

### **Problem: Plan not updating**
**Solutions:**
1. **Check webhook logs**: Look for processing errors
2. **Verify plan data**: Check ~/.synk/plan.json file
3. **Test manually**: Use debug API endpoints

---

## 🔄 **STEP 11: Production Deployment**

### **11.1 Deploy Webhook Server**

**Option A: Render.com**
1. **Create new Web Service**
2. **Connect GitHub repository**
3. **Set build command**: `npm install`
4. **Set start command**: `node src/webhookServer.js`
5. **Add environment variables**: `STRIPE_WEBHOOK_SECRET`

**Option B: Heroku**
1. **Create new app**: `heroku create synk-webhooks`
2. **Deploy code**: `git push heroku main`
3. **Set config vars**: `heroku config:set STRIPE_WEBHOOK_SECRET=whsec_...`

**Option C: Custom Server**
1. **Deploy to your VPS/cloud server**
2. **Ensure port 3001 is accessible**
3. **Set up SSL certificate** (required for webhooks)
4. **Configure environment variables**

### **11.2 Update Stripe Webhook URL**
1. **Go to Stripe Dashboard**
2. **Update webhook endpoint URL** to your production URL
3. **Test with real payment** to verify

---

## ✅ **VERIFICATION CHECKLIST**

Before going live, verify:

- [ ] **Webhook endpoint created** in Stripe Dashboard
- [ ] **All 8 events selected** correctly
- [ ] **Webhook secret copied** to .env file
- [ ] **App restarted** after .env update
- [ ] **ngrok tunnel running** (for local testing)
- [ ] **Webhook URL updated** in Stripe
- [ ] **Health endpoint responding** (200 status)
- [ ] **Test payment processed** successfully
- [ ] **Plan updated** in app after payment
- [ ] **Webhook delivery logs** show success (200)
- [ ] **Production deployment** completed (if applicable)

---

## 📞 **SUPPORT**

If you encounter issues:

1. **Check app logs** for error messages
2. **Review Stripe webhook logs** for delivery status
3. **Test with curl** to verify connectivity
4. **Use Stripe CLI** for local testing
5. **Contact support** with specific error messages

---

## 🎯 **FINAL RESULT**

After completing this setup:

✅ **Automatic plan management** - No manual intervention needed  
✅ **Real-time updates** - Plans update instantly after payment  
✅ **Secure processing** - Webhook signature verification  
✅ **Reliable delivery** - Automatic retries for failed webhooks  
✅ **Complete monitoring** - Full visibility into webhook events  

**Your Synk app is now fully integrated with Stripe for automatic plan management!**