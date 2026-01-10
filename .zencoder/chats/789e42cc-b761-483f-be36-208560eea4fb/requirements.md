# Feature Specification: Auto-Trial System

## Overview

Transform Synk's website from an optional trial model to an automatic trial model where all new users receive a 7-day Pro trial upon signup. This includes redesigning the marketing messaging, pricing page, onboarding flow, and account dashboard to support the new trial-first approach.

## User Stories

### User Story 1 - New User Starting Trial

**As a** new user visiting the Synk website  
**I want to** immediately understand that I can try Pro features for free  
**So that** I feel confident signing up without risk

**Acceptance Scenarios**:

1. **Given** I visit the homepage, **When** I look at the hero section, **Then** I see "Start 7-Day Free Trial" as the primary CTA with "No credit card required" messaging
2. **Given** I'm on any marketing page, **When** I see signup CTAs, **Then** they all emphasize "Free Trial" rather than "Download" or "Sign Up"
3. **Given** I click "Start 7-Day Free Trial", **When** the signup page loads, **Then** I see clear messaging that I'm starting a Pro trial

### User Story 2 - New User Onboarding Experience

**As a** user who just signed up  
**I want to** be guided through connecting my accounts during the trial  
**So that** I can experience the Pro features immediately

**Acceptance Scenarios**:

1. **Given** I complete signup, **When** I'm logged in, **Then** I see an onboarding flow with steps: Trial Started → Connect Calendar → Connect Notion → First Sync
2. **Given** I'm in the onboarding flow, **When** I complete a step, **Then** the progress indicator updates and the next step is shown
3. **Given** I'm in onboarding, **When** I want to skip setup, **Then** I can click "Skip setup, go to dashboard" and access my account
4. **Given** I complete the onboarding, **When** I reach the final step, **Then** I see my trial end date and a link to the dashboard

### User Story 3 - Understanding Pricing After Trial

**As a** user researching the product  
**I want to** understand what happens after my free trial  
**So that** I can make an informed decision about upgrading

**Acceptance Scenarios**:

1. **Given** I visit the pricing page, **When** the page loads, **Then** I see a prominent section explaining "Start with a 7-day free trial of Pro"
2. **Given** I'm viewing the pricing table, **When** I see the plans, **Then** they're labeled "After your trial" and both Free and Pro plans offer the same "Start Free Trial" button
3. **Given** I'm on the pricing page, **When** I look for information about billing, **Then** I see an FAQ explaining no credit card is required and I auto-downgrade to Free after 7 days
4. **Given** I'm on the pricing page, **When** I review the Free plan, **Then** I see it offers unlimited manual syncs (not a 50-sync limit) but no automation

### User Story 4 - Active Trial User Dashboard Experience

**As a** user with an active trial  
**I want to** see my trial status and upgrade options  
**So that** I can decide whether to upgrade before my trial ends

**Acceptance Scenarios**:

1. **Given** I have an active Pro trial, **When** I load the account dashboard, **Then** I see a banner showing "Pro Trial: X days remaining" with an "Upgrade to Pro" button
2. **Given** I'm on trial, **When** I view my account page, **Then** all Pro features are visible and accessible
3. **Given** my trial is ending soon (1-2 days remaining), **When** I see the banner, **Then** it displays urgency messaging about days remaining
4. **Given** I click "Upgrade to Pro", **When** the upgrade flow starts, **Then** I'm redirected to Stripe Checkout

### User Story 5 - Post-Trial Experience (Free Plan)

**As a** user whose trial has expired  
**I want to** understand what features I've lost and how to get them back  
**So that** I can decide if upgrading is worth it

**Acceptance Scenarios**:

1. **Given** my trial has expired, **When** I load the dashboard, **Then** I see a banner stating "You're on the Free plan (manual sync). Upgrade for automatic sync"
2. **Given** I'm on the Free plan, **When** I attempt to use Pro features, **Then** they're disabled with clear upgrade prompts
3. **Given** I'm on Free plan, **When** I click "Upgrade to Pro" in the banner, **Then** I'm sent to Stripe Checkout
4. **Given** I complete payment, **When** I return to the dashboard, **Then** I see confirmation of Pro activation and all features are enabled

### User Story 6 - Successful Upgrade

**As a** user who upgraded to Pro  
**I want to** see confirmation that my upgrade was successful  
**So that** I know I have full access to Pro features

**Acceptance Scenarios**:

1. **Given** I complete Stripe payment, **When** I'm redirected back to the website, **Then** I land on a success page confirming my upgrade
2. **Given** I'm on the upgrade success page, **When** I wait or click to continue, **Then** I'm redirected to my dashboard
3. **Given** I'm a paid Pro user, **When** I load the dashboard, **Then** the banner shows "Pro plan active. Thank you for upgrading!" with no upgrade button

---

## Requirements

### Functional Requirements

#### FR1: Landing Page Transformation
- **FR1.1**: Hero section must display primary headline emphasizing automatic sync + 7-day free trial
- **FR1.2**: Primary CTA button text must be "Start 7-Day Free Trial"
- **FR1.3**: Supporting text under primary CTA must state "No credit card required. Get full Pro access"
- **FR1.4**: All secondary CTAs on homepage must change from "Sign Up" / "Download" to "Start Free Trial"
- **FR1.5**: Value proposition section must highlight trial benefits (✓ Automatic sync ✓ Unlimited calendars ✓ Priority setup)

#### FR2: Pricing Page Redesign
- **FR2.1**: Page must have a pre-plans section with headline "Start with a 7-day free trial of Pro" and primary "Start 7-Day Free Trial" CTA
- **FR2.2**: Plan comparison table must be labeled "After your trial"
- **FR2.3**: Free plan card must emphasize limitations: unlimited manual sync, no automation, no scheduling, no bulk operations
- **FR2.4**: Pro plan card must emphasize pain relief: "Never manually sync again", automatic sync, scheduling
- **FR2.5**: Both Free and Pro plan cards must have the same CTA: "Start Free Trial" (since all users get trial first)
- **FR2.6**: FAQ section must include: "What happens after 7 days?", "Do I need a credit card?", "Can I cancel?", "What's the difference between Free and Pro?"

#### FR3: Signup Flow
- **FR3.1**: Signup page must include note: "By signing up, you'll start a 7-day Pro trial"
- **FR3.2**: Upon signup, POST to backend `/signup` endpoint with email/password
- **FR3.3**: Store returned JWT token in localStorage
- **FR3.4**: After successful signup, redirect to onboarding page (not directly to dashboard)

#### FR4: Onboarding Flow
- **FR4.1**: New onboarding page (`onboarding.html`) with 4-step progress indicator
- **FR4.2**: Step 1: Welcome message displaying trial end date (fetched from backend), "Set up your first sync" button, "Skip to dashboard" link
- **FR4.3**: Step 2: Connect Google Calendar with button triggering OAuth flow
- **FR4.4**: Step 3: Connect Notion with button triggering OAuth flow
- **FR4.5**: Step 4: Simplified sync rule creation form
- **FR4.6**: Step 5 (completion): Success message with trial end date reminder and "Go to Dashboard" link
- **FR4.7**: Each step must update progress indicator visually
- **FR4.8**: User must be able to skip onboarding at any point

#### FR5: Trial Status Banner (Account Dashboard)
- **FR5.1**: Banner positioned at top of account.html, below header
- **FR5.2**: On page load, fetch trial status from backend `GET /api/user/trial-status`
- **FR5.3**: Display different messages based on plan:
  - **Active trial**: "Pro Trial: X days remaining. Upgrade to keep automatic sync." + "Upgrade to Pro" button
  - **Free plan**: "You're on the Free plan (manual sync). Upgrade for automatic sync." + "Upgrade to Pro" button
  - **Paid Pro**: "Pro plan active. Thank you for upgrading!" (no button)
- **FR5.4**: Banner must be dismissible with X button (stores dismissal in sessionStorage)
- **FR5.5**: "Upgrade to Pro" button must trigger upgrade flow (FR6)

#### FR6: Upgrade Flow
- **FR6.1**: When user clicks "Upgrade to Pro", POST to `/api/upgrade` with `{priceId, successUrl, cancelUrl}`
- **FR6.2**: Backend returns `{success, checkout_url}` (Stripe Checkout URL)
- **FR6.3**: Redirect user to `checkout_url`
- **FR6.4**: Create success page (`upgrade-success.html`) that Stripe redirects to after payment
- **FR6.5**: Success page displays: "Welcome to Synk Pro!", confirmation message, countdown redirect to dashboard
- **FR6.6**: Success page auto-redirects to `/account.html` after 5 seconds

#### FR7: Navigation Updates
- **FR7.1**: Main navigation "Sign Up" link must change to "Start Free Trial"
- **FR7.2**: "Download" link remains but is styled as secondary/less prominent
- **FR7.3**: Ensure "Pricing" link is present in navigation

#### FR8: Authentication State Management
- **FR8.1**: JWT token stored in localStorage after signup/login
- **FR8.2**: All API requests to backend must include `Authorization: Bearer ${token}` header
- **FR8.3**: Account dashboard must verify token is present; if not, redirect to login
- **FR8.4**: Onboarding page must verify token is present; if not, redirect to login

### Non-Functional Requirements

#### NFR1: Design Consistency
- Use existing color scheme from css/styles.css
- Follow existing button styles and components
- Maintain responsive design patterns (mobile-first)
- Ensure all new pages match dark theme aesthetic

#### NFR2: Performance
- Banner trial status fetch must not block page rendering (load asynchronously)
- Onboarding flow must feel fast (no unnecessary delays between steps)
- Stripe Checkout redirect must happen immediately after button click

#### NFR3: Security
- Never expose JWT tokens in URL parameters
- Store tokens only in localStorage (not cookies without HttpOnly flag)
- Validate all backend responses before displaying data
- Sanitize any user input in onboarding forms

#### NFR4: Accessibility
- All new CTAs must be keyboard accessible
- Trial banner must be screen-reader friendly
- Onboarding progress indicator must have ARIA labels
- Success/error messages must have appropriate ARIA live regions

#### NFR5: Browser Compatibility
- Support Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- Ensure localStorage is available (fallback if disabled)
- Test Stripe Checkout redirect in all supported browsers

---

## Success Criteria

### Metric-Based Success Criteria

1. **Trial Conversion Rate**: Track % of new signups that complete onboarding (target: >60%)
2. **Trial-to-Paid Conversion**: Track % of trial users that upgrade to Pro (target: baseline establishment in first month)
3. **Onboarding Completion**: Track % of users that complete all 4 onboarding steps vs. skip (target: >40% completion)
4. **Time-to-First-Sync**: Measure average time from signup to first sync creation (target: <5 minutes for completed onboarding)

### Qualitative Success Criteria

1. **Clear Value Proposition**: User interviews/feedback confirm that the free trial offer is clear and compelling
2. **Reduced Friction**: Users report that the signup → onboarding → first sync flow feels seamless
3. **Pricing Clarity**: Users understand what happens after trial expires (no confusion about billing)
4. **Professional UI**: New pages and components match existing design quality

### Technical Success Criteria

1. **Zero Breaking Changes**: Existing functionality (login, account page, download) remains fully functional
2. **API Integration**: All backend endpoints integrate correctly with zero failed requests under normal operation
3. **Stripe Integration**: Upgrade flow successfully creates Stripe Checkout sessions and handles redirects
4. **Authentication**: Token-based auth works across all new pages (onboarding, upgrade success)
5. **Responsive Design**: All new pages render correctly on mobile, tablet, and desktop viewports
6. **Performance**: Page load times remain under 2 seconds; banner status fetch completes within 500ms

### Acceptance Testing Checklist

- [ ] New user can visit homepage and see "Start 7-Day Free Trial" as primary CTA
- [ ] Pricing page clearly explains trial-first model and post-trial options
- [ ] Signup flow creates trial account and stores JWT token
- [ ] Onboarding flow guides user through 4 steps with progress indicator
- [ ] User can skip onboarding and go directly to dashboard
- [ ] Account dashboard displays correct trial status banner for active trial users
- [ ] Account dashboard displays correct banner for expired trial (Free plan) users
- [ ] Account dashboard displays correct banner for paid Pro users
- [ ] "Upgrade to Pro" button successfully initiates Stripe Checkout
- [ ] Upgrade success page displays after payment and redirects to dashboard
- [ ] All Pro features are accessible during trial period
- [ ] Pro features are correctly restricted after trial expires (Free plan)
- [ ] Navigation reflects new trial-first messaging
- [ ] All pages are responsive and accessible
- [ ] JWT authentication works across all protected pages

---

## Out of Scope (For This Phase)

1. **Desktop App Integration**: Onboarding connects accounts via web only; desktop app sync handled separately
2. **Email Notifications**: Trial reminder emails are backend responsibility (not website)
3. **Multi-Plan Options**: Only Free and Pro plans; no intermediate tiers
4. **Promo Codes**: No discount or referral code system
5. **Analytics Tracking**: No custom analytics events (can be added later)
6. **A/B Testing**: Single version of trial messaging (can test variants later)
7. **Localization**: English only for all trial messaging
8. **Cancellation Flow**: Users simply don't upgrade; no explicit cancellation UI needed
9. **Downgrade Flow**: Auto-downgrade after trial; no manual downgrade option needed
10. **Historical Trial Data**: No display of "you had a trial before" for returning users

---

## Assumptions

1. Backend endpoints (`/signup`, `/login`, `/me`, `/api/user/trial-status`, `/api/upgrade`) are already implemented and functional
2. Backend automatically creates trial for all new signups (no frontend flag needed)
3. Stripe Checkout is configured on backend with correct price IDs
4. Google Calendar and Notion OAuth flows are already implemented (onboarding just triggers existing flows)
5. Sync rule creation logic exists in backend (onboarding form just submits to existing endpoint)
6. Backend returns consistent data structures as documented
7. JWT tokens do not expire during typical user sessions (or backend handles refresh)
8. Existing `account.html` has mounting points for new trial banner component

---

## Dependencies

1. **Backend API**: Must be deployed at `https://synk-web.onrender.com` with documented endpoints functional
2. **Stripe Account**: Active Stripe account with Checkout configured
3. **OAuth Apps**: Google Calendar and Notion OAuth apps must be configured for production domain
4. **Domain**: `synk-official.com` must be deployed and SSL-configured
5. **Existing Codebase**: Current website (`index.html`, `pricing.html`, `signup.html`, `account.html`) must be functional
