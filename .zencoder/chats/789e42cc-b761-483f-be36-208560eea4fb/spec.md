# Technical Specification: Auto-Trial System

## Technical Context

**Platform**: Static Website (Vanilla HTML/CSS/JavaScript)  
**Language**: JavaScript ES6+ (no transpilation, browser-native)  
**Deployment**: Netlify (static file hosting with SPA redirects)  
**Authentication**: JWT-based (custom backend API)  
**Payment Processing**: Stripe Checkout (server-side integration)  
**Backend API**: https://synk-web.onrender.com  

### Dependencies
- **Supabase JS v2** (CDN): Legacy authentication support (minimal usage)
- **Stripe.js v3** (CDN): Already loaded in `account.html`
- **Backend API Endpoints**:
  - `POST /signup` - Create account with auto-trial
  - `POST /login` - User login
  - `GET /me` - Get authenticated user info
  - `GET /api/user/trial-status` - Get trial status and days remaining
  - `POST /api/upgrade` - Create Stripe Checkout session

### Current Architecture
```
synk-web/
├── index.html              # Landing page with hero CTA
├── pricing.html            # Pricing page with plan comparison
├── signup.html             # User registration form
├── login.html              # User login form
├── account.html            # User dashboard/account management
├── download.html           # Desktop app download page
├── css/
│   ├── styles.css          # Main site styles (dark theme, gradients)
│   ├── auth.css            # Authentication page styles
│   └── account.css         # Account dashboard styles
├── js/
│   ├── supabase-auth-manager.js  # Auth state management
│   └── scripts.js                # Main site functionality
└── netlify.toml           # Deployment configuration
```

### Authentication Flow (Current)
1. User signs up via `signup.html` → POST to `/signup`
2. Backend returns `{success, token, user: {email, plan, trial_ends_at}}`
3. Token stored in `localStorage` as `synk_auth_token`
4. Email stored in `localStorage` as `synk_user_email`
5. `SupabaseAuthManager` class manages auth state and UI updates
6. After signup, user redirected to `download.html`

### Design System
- **Colors**: Dark theme (`#0a0a0a` background, `#ffffff` text, orange accents `#ff4500`)
- **Typography**: System fonts, clamp() for responsive sizing
- **Components**: `.cta-button`, `.auth-card`, `.account-card`, gradient backgrounds
- **Effects**: Starfield backgrounds, gradient animations, hover transforms

---

## Technical Implementation Brief

### Core Strategy
Transform the website from "sign up → download app" to "sign up → onboarding → trial experience." This requires:

1. **Content Changes**: Update hero CTAs, pricing messaging, navigation
2. **New Onboarding Page**: Create guided setup flow post-signup
3. **Trial Status Integration**: Fetch and display trial info in account dashboard
4. **Upgrade Flow**: Stripe Checkout integration for Pro conversion

### Key Technical Decisions

#### Decision 1: Onboarding as Separate Page
**Choice**: Create `onboarding.html` as standalone page (not modal/overlay)  
**Rationale**: 
- Simpler state management (each step is full-page)
- Better mobile UX (no modal complexity)
- Allows deep linking to specific steps
- Matches existing page architecture

#### Decision 2: Trial Status as Dashboard Banner
**Choice**: Banner component at top of `account.html` (not separate page)  
**Rationale**:
- Always visible without navigation
- Matches common SaaS UX patterns
- Can be dismissed per session
- Non-intrusive but persistent reminder

#### Decision 3: Backend-First Trial Logic
**Choice**: Backend auto-creates trials; frontend just displays status  
**Rationale**:
- Backend already implements trial creation (per user clarification)
- Frontend doesn't need to send trial flags
- Single source of truth for trial state
- Simpler frontend logic

#### Decision 4: Minimal JavaScript Refactoring
**Choice**: Extend existing auth manager, don't rebuild  
**Rationale**:
- `SupabaseAuthManager` already handles token storage and UI updates
- Add new methods for trial status fetching
- Maintain backward compatibility
- Reduce regression risk

#### Decision 5: OAuth Placeholder in Onboarding
**Choice**: Onboarding shows OAuth buttons but links to existing flows  
**Rationale**:
- Google Calendar and Notion OAuth already implemented (assumption)
- Onboarding just triggers existing integration flows
- No need to rebuild OAuth in onboarding context
- Can enhance later with in-flow OAuth

---

## Source Code Structure

### New Files

#### 1. `onboarding.html`
Multi-step guided setup page shown after signup.

**Structure**:
```html
<!DOCTYPE html>
<html>
<head>
  <!-- Standard head with styles.css + new onboarding.css -->
</head>
<body class="onboarding-body">
  <header><!-- Same header as other pages --></header>
  <main class="onboarding-page">
    <div class="onboarding-container">
      <!-- Progress Bar -->
      <div class="onboarding-progress">
        <div class="step" data-step="1">Welcome</div>
        <div class="step" data-step="2">Calendar</div>
        <div class="step" data-step="3">Notion</div>
        <div class="step" data-step="4">Complete</div>
      </div>
      
      <!-- Step 1: Welcome -->
      <div class="onboarding-step active" id="step-1">...</div>
      
      <!-- Step 2: Connect Calendar -->
      <div class="onboarding-step" id="step-2">...</div>
      
      <!-- Step 3: Connect Notion -->
      <div class="onboarding-step" id="step-3">...</div>
      
      <!-- Step 4: Complete -->
      <div class="onboarding-step" id="step-4">...</div>
    </div>
  </main>
  <script src="js/onboarding.js"></script>
  <script src="js/supabase-auth-manager.js"></script>
  <script src="js/scripts.js"></script>
</body>
</html>
```

#### 2. `upgrade-success.html`
Stripe redirect landing page after successful payment.

**Structure**:
```html
<!DOCTYPE html>
<html>
<head><!-- Standard head --></head>
<body class="auth-body">
  <header><!-- Standard header --></header>
  <main class="auth-page">
    <div class="auth-container">
      <div class="auth-card success-card">
        <h1>Welcome to Synk Pro! 🎉</h1>
        <p>Your payment was successful.</p>
        <p>Redirecting in <span id="countdown">5</span>s...</p>
        <a href="account.html" class="cta-button">Go to Dashboard</a>
      </div>
    </div>
  </main>
  <script src="js/upgrade-success.js"></script>
</body>
</html>
```

#### 3. `css/onboarding.css`
Onboarding-specific styles (progress bar, step cards, animations).

**Key Classes**:
- `.onboarding-progress` - 4-step progress indicator
- `.onboarding-step` - Individual step container
- `.onboarding-step.active` - Current step display
- `.skip-link` - Skip to dashboard link

#### 4. `js/onboarding.js`
Onboarding flow state management and API calls.

**Responsibilities**:
- Check auth token (redirect to login if missing)
- Fetch trial end date from backend
- Handle step navigation (next/prev/skip)
- Update progress indicator
- Trigger OAuth flows (links to external flows)
- Complete onboarding (redirect to account.html)

#### 5. `js/upgrade-success.js`
Countdown timer and auto-redirect after payment.

**Responsibilities**:
- Display countdown from 5 to 0
- Auto-redirect to `account.html` after countdown
- Manual redirect on button click

#### 6. `js/trial-banner.js`
Trial status banner component for account dashboard.

**Responsibilities**:
- Fetch trial status from `GET /api/user/trial-status`
- Render banner with appropriate message
- Handle "Upgrade to Pro" button click
- Handle banner dismissal (store in sessionStorage)
- Auto-refresh trial status every 30 seconds (optional)

### Modified Files

#### 1. `index.html` (Landing Page)
**Changes**:
- Line ~65: Update `<h1>` to emphasize 7-day free trial
- Line ~67: Update subheadline to mention trial
- Line ~70: Change CTA button text to "Start 7-Day Free Trial"
- Line ~70: Update href from `signup.html` to `signup.html` (same, but context changes)
- Line ~82-96: Update trust signals to mention trial benefits

#### 2. `pricing.html` (Pricing Page)
**Changes**:
- After `<section class="pricing-section">` opening: Add trial explainer section
- Update section header to "Start with 7-day free trial"
- Add "After your trial" label above pricing grid
- Update Free plan card: Remove "Start Trial" CTA, update features to show manual sync limits
- Update Pro plan card: Update CTA to "Start Free Trial"
- Add FAQ section with trial-specific Q&A

#### 3. `signup.html` (Signup Form)
**Changes**:
- Line ~59: Update subheadline to "Start your 7-day Pro trial"
- After form, before submit button: Add note "By signing up, you'll start a 7-day Pro trial"
- Line ~172: Change redirect from `download.html` to `onboarding.html`

#### 4. `account.html` (Dashboard)
**Changes**:
- After `<main class="account-page">` opening, before `.page-header`: Insert trial banner div
- Add `<div id="trial-banner">` container (populated by trial-banner.js)
- Line ~9: Add `<script src="js/trial-banner.js"></script>` before closing body

#### 5. `index.html`, `pricing.html`, `about.html`, etc. (Navigation)
**Changes**:
- Line ~33: Change "Sign Up" button text to "Start Free Trial"
- Ensure all header nav structures are consistent

#### 6. `js/supabase-auth-manager.js` (Auth Manager)
**Changes**:
- Add method `async getTrialStatus()` to fetch from `/api/user/trial-status`
- Add method `async initUpgrade(priceId, successUrl, cancelUrl)` to POST to `/api/upgrade`
- Export these methods for use by trial-banner.js

---

## Contracts

### Data Models

#### Backend Response: `/signup`
```json
{
  "success": true,
  "token": "eyJhbGc...",
  "user": {
    "email": "user@example.com",
    "plan": "trial",
    "trial_ends_at": "2026-01-17T12:00:00Z"
  },
  "trial_message": "Your 7-day Pro trial has started!"
}
```

#### Backend Response: `/api/user/trial-status`
```json
{
  "plan": "trial",
  "can_access_pro_features": true,
  "reason": "trial",
  "days_remaining": 5,
  "trial_ends_at": "2026-01-17T12:00:00Z"
}
```

**Possible `plan` values**: `"trial"`, `"free"`, `"pro"`  
**Possible `reason` values**: `"trial"`, `"paid"`, `null`

#### Backend Request: `/api/upgrade`
```json
{
  "priceId": "price_1234567890",
  "successUrl": "https://synk-official.com/upgrade-success.html",
  "cancelUrl": "https://synk-official.com/account.html"
}
```

#### Backend Response: `/api/upgrade`
```json
{
  "success": true,
  "checkout_url": "https://checkout.stripe.com/c/pay/cs_test_..."
}
```

### API Interfaces

#### SupabaseAuthManager Extensions

```javascript
class SupabaseAuthManager {
  // Existing methods...
  
  /**
   * Fetch trial status for current user
   * @returns {Promise<Object>} Trial status object
   * @throws {Error} If not authenticated or request fails
   */
  async getTrialStatus() {
    const token = localStorage.getItem('synk_auth_token');
    if (!token) throw new Error('Not authenticated');
    
    const response = await fetch('https://synk-web.onrender.com/api/user/trial-status', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) throw new Error('Failed to fetch trial status');
    return await response.json();
  }
  
  /**
   * Initiate Stripe Checkout for upgrade
   * @param {string} priceId - Stripe price ID
   * @param {string} successUrl - Redirect URL after payment
   * @param {string} cancelUrl - Redirect URL if cancelled
   * @returns {Promise<string>} Stripe Checkout URL
   * @throws {Error} If not authenticated or request fails
   */
  async initiateUpgrade(priceId, successUrl, cancelUrl) {
    const token = localStorage.getItem('synk_auth_token');
    if (!token) throw new Error('Not authenticated');
    
    const response = await fetch('https://synk-web.onrender.com/api/upgrade', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ priceId, successUrl, cancelUrl })
    });
    
    if (!response.ok) throw new Error('Failed to create checkout session');
    const data = await response.json();
    return data.checkout_url;
  }
}
```

### Component Interfaces

#### Trial Banner Component

**HTML Contract**:
```html
<div id="trial-banner" class="trial-banner" style="display: none;">
  <div class="banner-content">
    <span class="banner-icon">⏰</span>
    <span id="trial-message">Loading...</span>
    <button id="upgrade-button" class="banner-btn">Upgrade to Pro</button>
    <button id="dismiss-banner" class="banner-close">×</button>
  </div>
</div>
```

**CSS Classes**:
- `.trial-banner` - Container with background, border, padding
- `.trial-banner.active-trial` - Orange accent for active trials
- `.trial-banner.expired-trial` - Red accent for expired trials
- `.trial-banner.pro-user` - Green accent for Pro users
- `.banner-content` - Flex container for message and buttons
- `.banner-btn` - Primary action button
- `.banner-close` - Dismiss button

**JavaScript Interface**:
```javascript
class TrialBanner {
  constructor(containerId) { }
  async init() { } // Fetch status and render
  render(status) { } // Update DOM based on status
  handleUpgrade() { } // Trigger Stripe Checkout
  dismiss() { } // Hide banner and store in sessionStorage
}
```

### URL Routes

#### New Routes
- `/onboarding.html` - Post-signup onboarding flow
- `/upgrade-success.html` - Stripe success redirect

#### Modified Redirects
- Signup success: `download.html` → `onboarding.html`
- Onboarding skip/complete: → `account.html`
- Upgrade cancel: → `account.html`
- Upgrade success: → `upgrade-success.html` → `account.html` (5s delay)

---

## Delivery Phases

### Phase 1: Content Updates (Landing, Pricing, Navigation)

**Scope**: Update existing marketing pages to reflect trial-first messaging

**Deliverables**:
1. Update `index.html` hero section with trial CTA
2. Redesign `pricing.html` with trial explainer and updated plan cards
3. Update navigation "Sign Up" → "Start Free Trial" across all pages
4. Update `signup.html` with trial messaging

**Files Modified**:
- `index.html`
- `pricing.html`
- `signup.html`
- `about.html` (header nav)
- `contact.html` (header nav)
- `download.html` (header nav)
- `login.html` (header nav)

**Acceptance Criteria**:
- [ ] Homepage hero CTA says "Start 7-Day Free Trial"
- [ ] Pricing page has trial explainer section above plans
- [ ] Free plan shows "unlimited manual sync" (not 50-sync limit)
- [ ] Pro plan CTA says "Start Free Trial"
- [ ] All nav headers have "Start Free Trial" instead of "Sign Up"
- [ ] Signup page mentions trial in subheadline

**Verification**:
- Visual inspection: Open each page in browser, verify content changes
- Responsive test: Check mobile (< 768px) and desktop layouts
- Cross-page consistency: All headers match new structure

---

### Phase 2: Onboarding Flow

**Scope**: Create guided post-signup onboarding experience

**Deliverables**:
1. Create `onboarding.html` with 4-step flow
2. Create `css/onboarding.css` with progress bar and step styles
3. Create `js/onboarding.js` with step navigation logic
4. Update `signup.html` redirect to point to onboarding
5. Integrate trial end date fetching from backend

**Files Created**:
- `onboarding.html`
- `css/onboarding.css`
- `js/onboarding.js`

**Files Modified**:
- `signup.html` (line 172: redirect change)

**Acceptance Criteria**:
- [ ] After signup, user redirected to `/onboarding.html`
- [ ] Onboarding requires auth token (redirects to login if missing)
- [ ] Step 1 displays trial end date from backend
- [ ] Progress indicator updates as user navigates steps
- [ ] "Skip setup" link goes to `account.html`
- [ ] Step 4 "Go to Dashboard" goes to `account.html`
- [ ] Mobile responsive (stacked progress on < 768px)

**Verification**:
- Manual flow test: Sign up → complete onboarding → land on dashboard
- Auth test: Visit `/onboarding.html` without token → redirect to login
- API test: Verify trial end date matches backend response
- Responsive test: Test on mobile viewport

**API Dependencies**:
- `GET /me` or trial status endpoint to fetch `trial_ends_at`

---

### Phase 3: Trial Status Banner (Dashboard Integration)

**Scope**: Add trial status display to account dashboard with upgrade CTA

**Deliverables**:
1. Create `js/trial-banner.js` component
2. Add trial banner HTML container to `account.html`
3. Add CSS for banner styles (in existing `css/account.css` or new section)
4. Extend `SupabaseAuthManager` with `getTrialStatus()` method
5. Implement upgrade button handler

**Files Created**:
- `js/trial-banner.js`

**Files Modified**:
- `account.html` (add banner container, include script)
- `css/account.css` or inline `<style>` in account.html
- `js/supabase-auth-manager.js` (add `getTrialStatus()` method)

**Acceptance Criteria**:
- [ ] Banner loads on `account.html` page load
- [ ] Active trial: Shows "Pro Trial: X days remaining" + "Upgrade to Pro" button
- [ ] Expired trial (Free plan): Shows "You're on the Free plan..." + "Upgrade to Pro" button
- [ ] Paid Pro: Shows "Pro plan active. Thank you!" (no button)
- [ ] Banner dismissible with X button (hidden for session)
- [ ] Upgrade button redirects to Stripe Checkout
- [ ] Banner re-appears on page refresh (if not Pro user)

**Verification**:
- Mock trial status: Temporarily hardcode different plan states in trial-banner.js, verify rendering
- API test: Verify `GET /api/user/trial-status` returns expected JSON
- Dismiss test: Click X, verify `sessionStorage` stores dismissal, refresh page (banner hidden)
- Upgrade test: Click "Upgrade to Pro", verify Stripe Checkout opens (may need test mode)

**API Dependencies**:
- `GET /api/user/trial-status`

---

### Phase 4: Upgrade Flow (Stripe Integration)

**Scope**: Complete Pro upgrade journey from trial banner to payment success

**Deliverables**:
1. Create `upgrade-success.html` success page
2. Create `js/upgrade-success.js` countdown/redirect script
3. Extend `SupabaseAuthManager` with `initiateUpgrade()` method
4. Wire up trial banner "Upgrade to Pro" button to Stripe flow
5. Add Stripe price ID configuration

**Files Created**:
- `upgrade-success.html`
- `js/upgrade-success.js`

**Files Modified**:
- `js/supabase-auth-manager.js` (add `initiateUpgrade()` method)
- `js/trial-banner.js` (implement upgrade button handler)

**Acceptance Criteria**:
- [ ] Clicking "Upgrade to Pro" calls `/api/upgrade` with correct payload
- [ ] Backend returns Stripe Checkout URL
- [ ] User redirected to Stripe Checkout
- [ ] After payment, Stripe redirects to `/upgrade-success.html`
- [ ] Success page shows countdown from 5 seconds
- [ ] Auto-redirect to `/account.html` after countdown
- [ ] Manual "Go to Dashboard" button works
- [ ] Account dashboard shows "Pro plan active" after upgrade

**Verification**:
- Stripe test mode: Use test credit card (4242 4242 4242 4242) to complete payment
- Redirect flow: Verify full journey: banner → Stripe → success → dashboard
- Error handling: Test cancel (click back in Stripe) → redirects to cancel URL
- Dashboard update: After upgrade, refresh dashboard, verify Pro badge/features

**API Dependencies**:
- `POST /api/upgrade`
- Stripe Checkout session creation (backend responsibility)

**Configuration Required**:
- Stripe price ID (hardcoded in `trial-banner.js` or fetched from backend)
- Success URL: `https://synk-official.com/upgrade-success.html`
- Cancel URL: `https://synk-official.com/account.html`

---

### Phase 5: Polish & Validation

**Scope**: Final QA, cross-browser testing, mobile optimization, edge cases

**Deliverables**:
1. Cross-browser testing (Chrome, Firefox, Safari, Edge)
2. Mobile responsiveness audit (iPhone, Android)
3. Edge case handling (expired tokens, network errors, slow APIs)
4. Accessibility audit (keyboard nav, screen readers, ARIA labels)
5. Performance optimization (lazy load scripts, minimize reflows)

**Acceptance Criteria**:
- [ ] All pages load and function in Chrome, Firefox, Safari, Edge
- [ ] Mobile viewports (< 768px) render correctly without horizontal scroll
- [ ] Trial banner handles API errors gracefully (shows fallback message)
- [ ] Onboarding handles missing trial date (uses generic "7 days" message)
- [ ] Keyboard navigation works (Tab, Enter, Escape)
- [ ] Screen reader announces trial status and upgrade options
- [ ] Page load time < 2s on 3G connection (Lighthouse test)

**Verification**:
- BrowserStack or manual device testing
- Lighthouse audit (Performance, Accessibility, Best Practices > 90)
- Manual keyboard-only navigation test
- WAVE accessibility checker (0 errors)
- Network throttle test (Chrome DevTools → Slow 3G)

**Checklist**:
- [ ] Test signup → onboarding → dashboard flow end-to-end
- [ ] Test trial banner for all plan states (trial, free, pro)
- [ ] Test upgrade flow with Stripe test card
- [ ] Test mobile menu and responsive layouts
- [ ] Test auth token expiration (manually delete token, verify redirects)
- [ ] Test sessionStorage dismissal persistence
- [ ] Validate WCAG 2.1 AA compliance

---

## Verification Strategy

### Automated Verification

**Current Project Test Setup**: None (static HTML project with no test framework)

**Lint Commands**:
- No linting currently configured
- **Recommendation**: Add HTML validation via https://validator.w3.org/ (manual check)
- **Recommendation**: Add CSS validation via https://jigsaw.w3.org/css-validator/ (manual check)

**Browser Testing**:
- Chrome DevTools for responsive design mode
- Lighthouse for performance/accessibility audits

### Manual Verification Scripts

#### 1. Trial Status Mock Server (Optional Helper)

For testing trial banner without backend dependency:

**File**: `test/mock-trial-api.js` (Node.js script)

```javascript
// Simple Express server to mock /api/user/trial-status
const express = require('express');
const app = express();

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  next();
});

app.get('/api/user/trial-status', (req, res) => {
  const mockStatus = process.env.MOCK_STATUS || 'trial';
  
  const responses = {
    trial: { plan: 'trial', can_access_pro_features: true, days_remaining: 5, trial_ends_at: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString() },
    free: { plan: 'free', can_access_pro_features: false, days_remaining: 0, trial_ends_at: null },
    pro: { plan: 'pro', can_access_pro_features: true, reason: 'paid', days_remaining: null, trial_ends_at: null }
  };
  
  res.json(responses[mockStatus] || responses.trial);
});

app.listen(3001, () => console.log('Mock API on http://localhost:3001'));
```

**Usage**:
```bash
node test/mock-trial-api.js
# Then update trial-banner.js to use http://localhost:3001 instead of production API
```

#### 2. Visual Regression Test Script

**File**: `test/screenshot-test.sh` (Bash script using Playwright or Puppeteer)

```bash
#!/bin/bash
# Take screenshots of key pages for visual comparison

# Requires: npm install -g playwright-cli

playwright screenshot http://localhost:8080/index.html screenshots/index-desktop.png --viewport-size=1920,1080
playwright screenshot http://localhost:8080/index.html screenshots/index-mobile.png --viewport-size=375,667
playwright screenshot http://localhost:8080/pricing.html screenshots/pricing-desktop.png --viewport-size=1920,1080
playwright screenshot http://localhost:8080/onboarding.html screenshots/onboarding-desktop.png --viewport-size=1920,1080
playwright screenshot http://localhost:8080/account.html screenshots/account-desktop.png --viewport-size=1920,1080

echo "Screenshots saved to screenshots/"
```

**Usage**:
```bash
# Start local server first
npx http-server . -p 8080
# Run screenshots
./test/screenshot-test.sh
```

#### 3. Onboarding Flow E2E Test (Manual Checklist)

**File**: `test/onboarding-e2e-checklist.md`

```markdown
# Onboarding E2E Test Checklist

## Prerequisites
- [ ] Backend API running at https://synk-web.onrender.com
- [ ] Test user account: test+[timestamp]@example.com
- [ ] Browser: Chrome (latest)

## Test Steps

### 1. Signup
- [ ] Go to /signup.html
- [ ] Enter email: test+[timestamp]@example.com
- [ ] Enter password: TestPass123!
- [ ] Check "I agree to Terms"
- [ ] Click "Create Account"
- [ ] Verify redirect to /onboarding.html

### 2. Onboarding Step 1
- [ ] Verify URL: /onboarding.html
- [ ] Verify progress: Step 1 active
- [ ] Verify trial end date displayed (future date)
- [ ] Click "Set up your first sync"
- [ ] Verify Step 2 active

### 3. Onboarding Step 2
- [ ] Verify "Connect Google Calendar" button visible
- [ ] Click button (may open OAuth popup - OK to close for test)
- [ ] Click "Next" or manually navigate to Step 3

### 4. Onboarding Step 3
- [ ] Verify "Connect Notion" button visible
- [ ] Click button (may open OAuth popup - OK to close for test)
- [ ] Click "Next" or manually navigate to Step 4

### 5. Onboarding Step 4
- [ ] Verify "Go to Dashboard" button visible
- [ ] Click button
- [ ] Verify redirect to /account.html

### 6. Dashboard Trial Banner
- [ ] Verify trial banner visible at top
- [ ] Verify message: "Pro Trial: X days remaining"
- [ ] Verify "Upgrade to Pro" button visible
- [ ] Click X to dismiss
- [ ] Refresh page → banner should stay hidden (session)

### 7. Skip Flow
- [ ] Repeat signup with new email
- [ ] On Step 1, click "Skip setup, go to dashboard"
- [ ] Verify redirect to /account.html
- [ ] Verify trial banner still appears

## Pass Criteria
All checkboxes checked with no errors or broken redirects.
```

### MCP Servers (None Required)

This project is a static website with no complex data processing or external integrations beyond standard HTTP APIs. No MCP servers are needed for verification.

### Sample Artifacts

#### 1. Test User Accounts

**Source**: Generated by developer  
**Location**: None (ephemeral, created during testing)  
**Generation**:
```javascript
// Use timestamp-based emails for unique test accounts
const testEmail = `test+${Date.now()}@example.com`;
const testPassword = 'TestPass123!';
```

#### 2. Stripe Test Cards

**Source**: Stripe documentation (https://stripe.com/docs/testing)  
**Card Numbers**:
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- Requires authentication: `4000 0025 0000 3155`

**Usage**: Enter in Stripe Checkout during upgrade flow testing

#### 3. Mock API Responses

**Source**: Generated by developer (see mock-trial-api.js above)  
**Usage**: For frontend-only testing without backend dependency

---

## Risk Mitigation

### Risk 1: Backend API Downtime During Development
**Mitigation**: Use mock API server (mock-trial-api.js) for local development  
**Fallback**: Hardcode trial status in trial-banner.js during testing phase

### Risk 2: Stripe Checkout Redirect Breaks
**Mitigation**: Test with Stripe test mode early in Phase 4  
**Fallback**: Add error handling to show modal with manual payment link if redirect fails

### Risk 3: Token Expiration During Onboarding
**Mitigation**: Add token refresh logic or session extension request at onboarding start  
**Fallback**: Display error message with "Re-login" link if token invalid

### Risk 4: OAuth Flows Break Onboarding State
**Mitigation**: Store onboarding step in localStorage before OAuth redirect  
**Fallback**: Allow users to skip OAuth steps and configure later in dashboard

### Risk 5: Mobile Safari localStorage Issues
**Mitigation**: Test early on iOS Safari, add fallback to in-memory storage  
**Fallback**: Display browser compatibility warning for unsupported browsers

---

## Performance Targets

- **Page Load Time**: < 2 seconds on 3G connection
- **Trial Status Fetch**: < 500ms (backend API responsibility)
- **Stripe Redirect**: < 1 second from button click to redirect
- **Onboarding Step Transition**: < 200ms (client-side animation)
- **Lighthouse Score**: 
  - Performance: > 90
  - Accessibility: > 95
  - Best Practices: > 90
  - SEO: > 90

---

## Security Considerations

1. **JWT Token Storage**: Stored in localStorage (acceptable for client-side apps, no HttpOnly cookies needed)
2. **XSS Prevention**: Sanitize any user input (email display) before rendering
3. **CSRF**: Not applicable (no cookies used for auth)
4. **Stripe Checkout**: Server-side session creation prevents price manipulation
5. **OAuth**: Handled by backend, frontend just receives redirect URLs
6. **API Errors**: Never expose stack traces or sensitive backend errors to frontend

---

## Rollback Plan

If critical issues arise post-deployment:

1. **Revert Content Changes**: Git revert to previous commit for index.html, pricing.html
2. **Disable Onboarding**: Change signup.html redirect back to download.html
3. **Hide Trial Banner**: Add `display: none !important;` to `#trial-banner` in account.html
4. **Disable Upgrade Flow**: Comment out upgrade button handler in trial-banner.js

**Rollback Time**: < 5 minutes (simple file revert + Netlify deploy)

---

## Future Enhancements (Out of Scope for MVP)

1. **In-App OAuth**: Complete Google Calendar and Notion OAuth within onboarding (no external redirects)
2. **Email Drip Campaign**: Automated trial reminder emails (Days 1, 3, 6)
3. **Onboarding Analytics**: Track completion rates, drop-off points (GA4 events)
4. **A/B Testing**: Test different trial lengths (7 vs 14 days) or CTA copy
5. **Referral Program**: "Invite a friend" during onboarding for trial extension
6. **Trial Extension**: Allow one-time 3-day extension for users near expiration
7. **Downgrade Flow**: Manual downgrade from Pro to Free with confirmation modal
8. **Multi-Currency Pricing**: Support EUR, GBP in Stripe Checkout
9. **Annual Billing**: Add annual plan option with discount
10. **Promo Codes**: Discount code input during upgrade flow
