# Technical Specification: Email Verification for New User Signups

## Technical Context

**Language/Version**: JavaScript ES6+, HTML5, CSS3  
**Runtime**: Browser (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)  
**Authentication**: Supabase Auth v2 (via CDN), Custom Backend API  
**Backend API**: `https://synk-web.onrender.com`  
**Supabase Project**: `https://nbolvclqiaqrupxknvlu.supabase.co`  
**Deployment**: Netlify static site with SPA redirects

## Technical Implementation Brief

### Current Authentication Architecture

The project uses a **hybrid authentication system**:
1. **Signup**: Custom backend API (`/signup` endpoint) that creates users
2. **Login**: Supabase Auth client-side (`signInWithPassword`)
3. **Session Management**: Mixed - localStorage tokens for backend API, Supabase session for auth state

### Email Confirmation Challenge

When Supabase email confirmation is enabled:
- Users must verify email before account is fully activated
- The backend API at `/signup` needs to be configured to work with this flow
- Frontend must handle unverified user states and provide verification UI

### Key Technical Decisions

1. **Signup Flow Modification**
   - After calling backend `/signup`, check if email confirmation is required
   - If required, redirect to `verify-email.html` instead of `onboarding.html`
   - Store user email in sessionStorage for verification page context

2. **Email Confirmation Handler**
   - Supabase sends confirmation emails with magic links
   - Links redirect to site with confirmation token in URL hash
   - Need to handle `#access_token` and `#error` URL fragments
   - Create dedicated handler page or use redirect logic in existing pages

3. **Resend Email Functionality**
   - Use Supabase client `resend` method via auth API
   - Implement client-side cooldown timer (60 seconds)
   - Store last resend timestamp in sessionStorage

4. **Backend API Integration**
   - Backend must use Supabase Admin API to create users
   - Must NOT auto-confirm users if email confirmation is enabled
   - Should return indication that email verification is required

## Source Code Structure

```
synk-web/
├── verify-email.html          [NEW] Email verification waiting page
├── js/
│   ├── supabase-auth-manager.js  [MODIFY] Add resend email method
│   ├── auth.js                   [MODIFY] Update signup flow
│   └── email-confirmation.js     [NEW] Handle email confirmation callbacks
├── css/
│   └── auth.css                  [MODIFY] Add verification page styles
└── netlify.toml                  [NO CHANGE] Already has SPA redirects
```

## Contracts

### 1. Supabase Auth Configuration (Dashboard)

**Settings → Authentication → Email**:
```
Enable email confirmations: ✓ ON
Confirm email: Enabled
Site URL: https://synk-web.netlify.app (or your production domain)
Redirect URLs: 
  - https://synk-web.netlify.app/pricing
  - https://synk-web.netlify.app/**
```

### 2. Backend API Contract Changes

**Endpoint**: `POST https://synk-web.onrender.com/signup`

**Current Response**:
```json
{
  "success": true,
  "token": "jwt_token_here",
  "message": "User created successfully"
}
```

**Required Response (with email confirmation enabled)**:
```json
{
  "success": true,
  "token": null,
  "requiresEmailVerification": true,
  "message": "Please check your email to verify your account"
}
```

**Backend Implementation Notes**:
- Use Supabase Admin SDK to create users: `supabase.auth.admin.createUser()`
- Set `email_confirm: false` in options (let Supabase handle confirmation flow)
- The confirmation email will be sent automatically by Supabase
- Return indication that verification is needed

### 3. Supabase Resend Email API

**Method**: Use Supabase client method
```javascript
const { data, error } = await supabaseClient.auth.resend({
  type: 'signup',
  email: userEmail
});
```

### 4. Email Confirmation URL Format

**Supabase Confirmation Link**: 
```
https://[your-site]/#access_token=TOKEN&type=signup&...
```

**After Processing**: Redirect to pricing page
```
https://[your-site]/pricing
```

### 5. New Page: verify-email.html

**URL Parameters**: None (uses sessionStorage)  
**SessionStorage Keys**:
- `pending_verification_email`: Email address waiting for verification
- `last_resend_time`: Timestamp of last resend attempt (for cooldown)

**UI Components**:
- Email icon/graphic
- Message: "Check your email"
- Email address display
- Resend button with cooldown timer
- Link to support/help

### 6. SupabaseAuthManager New Method

```javascript
/**
 * Resend verification email
 * @param {string} email - User email address
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async resendVerificationEmail(email) {
  // Implementation
}
```

### 7. URL Hash Handler

**Location**: `js/email-confirmation.js`

**Handles**:
- `#access_token=...` → Extract token, confirm user, redirect to pricing
- `#error=...` → Show error message, redirect to login
- `#error_description=...` → Display specific error

## Delivery Phases

### Phase 1: Backend API Update & Supabase Configuration

**Deliverable**: Backend properly configured to work with email confirmation

**Tasks**:
1. Update Supabase dashboard settings (enable email confirmation)
2. Configure redirect URLs in Supabase
3. Update backend `/signup` endpoint to return `requiresEmailVerification`
4. Test backend returns correct response structure

**Verification**: 
- Manual test: Call backend API, verify response includes `requiresEmailVerification: true`
- Check Supabase sends confirmation email after signup

### Phase 2: Email Verification Page

**Deliverable**: Standalone `verify-email.html` page with resend functionality

**Tasks**:
1. Create `verify-email.html` with matching design system
2. Add verification page styles to `css/auth.css`
3. Implement resend button with 60-second cooldown
4. Add countdown timer display
5. Store/retrieve email from sessionStorage

**Verification**:
- Load page directly, verify UI matches design
- Test resend button shows cooldown timer
- Verify email address displays correctly from sessionStorage

### Phase 3: Signup Flow Integration

**Deliverable**: Updated signup flow redirects to verification page

**Tasks**:
1. Modify `signup.html` inline script to check `requiresEmailVerification`
2. Store email in sessionStorage before redirect
3. Redirect to `verify-email.html` instead of `onboarding.html`
4. Update success message to mention email verification

**Verification**:
- Complete signup flow, verify redirect to verify-email.html
- Check email is displayed correctly on verification page
- Confirm email is received in inbox

### Phase 4: Email Confirmation Handler

**Deliverable**: Email confirmation link properly processes and redirects

**Tasks**:
1. Create `js/email-confirmation.js` script
2. Parse URL hash for access_token or error
3. Exchange token for session using Supabase
4. Redirect to pricing page on success
5. Handle and display errors
6. Add script to all relevant pages (verify-email.html, pricing.html)

**Verification**:
- Click confirmation link in email
- Verify user is redirected to pricing page
- Confirm user session is established
- Test error scenarios (expired link, invalid token)

### Phase 5: Resend Email Functionality

**Deliverable**: Working resend email button with cooldown

**Tasks**:
1. Add `resendVerificationEmail()` to SupabaseAuthManager
2. Implement cooldown logic in verify-email.html
3. Display success/error messages
4. Update button state during cooldown

**Verification**:
- Click resend button, verify new email is sent
- Check 60-second cooldown enforces correctly
- Verify countdown timer updates every second
- Test multiple resend attempts

### Phase 6: Testing & Edge Cases

**Deliverable**: Fully tested email verification flow

**Tasks**:
1. Test complete flow end-to-end
2. Test with multiple email providers (Gmail, Outlook, Yahoo)
3. Handle expired confirmation links
4. Test concurrent signups with same email
5. Verify mobile responsive design
6. Test browser back/forward navigation
7. Test direct URL access to verify-email.html without context

**Verification**:
- Complete at least 5 full signup → verify → login cycles
- Test on mobile, tablet, desktop viewports
- Verify all error messages display correctly
- Confirm no console errors throughout flow

## Verification Strategy

### Automated Verification

**No automated tests available** - Project uses manual testing workflow.

### Manual Verification Commands

**Check Supabase Configuration**:
```bash
# No CLI command - verify via Supabase Dashboard
# Navigate to: Project Settings → Authentication → Email
```

**Test Backend API Response**:
```bash
curl -X POST https://synk-web.onrender.com/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPass123"}'

# Expected response should include "requiresEmailVerification": true
```

**Browser Console Verification**:
```javascript
// On verify-email.html, check sessionStorage
console.log(sessionStorage.getItem('pending_verification_email'));

// Test resend email method
await window.authManager.resendVerificationEmail('test@example.com');
```

### Helper Scripts

**Script 1**: `test-email-verification.html` - Manual UI testing page

**Purpose**: Test email verification flow without actual signups

**Location**: `c:\Users\david\Desktop\synk\synk-web\test-email-verification.html`

**Features**:
- Simulate signup with verification required
- Test verify-email page UI
- Mock resend email with cooldown
- Test URL hash parsing
- Display detailed logs

**Script 2**: Backend verification script (instructions for user)

**Purpose**: Verify backend API returns correct response

**Instructions to provide user**:
```markdown
## Backend API Verification

Test your backend `/signup` endpoint returns the correct response:

1. Open terminal
2. Run this curl command:
   ```bash
   curl -X POST https://synk-web.onrender.com/signup \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"TestPass123"}'
   ```

3. Verify response includes:
   ```json
   {
     "success": true,
     "requiresEmailVerification": true,
     "message": "Please check your email to verify your account"
   }
   ```

4. Check the test email inbox for confirmation email from Supabase

If you need to update the backend, modify your signup endpoint to:
- Use Supabase Admin SDK: `supabase.auth.admin.createUser({email, password, email_confirm: false})`
- Return `requiresEmailVerification: true` in response
- Do NOT return a token until email is verified
```

### Sample Input Artifacts

**Test Email Addresses**:
- Use temporary email services: `https://temp-mail.org`
- Or create test Gmail addresses with `+` notation: `yourname+test1@gmail.com`

**Supabase Test Users**:
- Can be created/managed via Supabase Dashboard → Authentication → Users
- Manually confirm users for testing: Click user → "Confirm email"

### MCP Servers

**No additional MCP servers required** for this implementation.

### Verification Checklist

- [ ] Supabase email confirmation enabled in dashboard
- [ ] Backend API returns `requiresEmailVerification: true`
- [ ] Confirmation email arrives in inbox within 5 seconds
- [ ] verify-email.html page displays correctly
- [ ] Email address shown on verification page matches signup email
- [ ] Resend button works and enforces 60-second cooldown
- [ ] Countdown timer updates every second
- [ ] Clicking confirmation link redirects to pricing page
- [ ] User session established after email confirmation
- [ ] Expired link shows appropriate error message
- [ ] Mobile responsive design works on all pages
- [ ] Browser console shows no errors
- [ ] Can complete full signup → verify → login flow

## Security Considerations

1. **Token Handling**: Use Supabase built-in token validation, never expose tokens in logs
2. **Rate Limiting**: Implement client-side cooldown for resend (60s), backend should have server-side rate limiting
3. **Email Validation**: Backend must validate email format before sending confirmation
4. **Session Security**: Only establish session after successful email verification
5. **URL Parameter Sanitization**: Sanitize all URL hash parameters before processing

## Browser Compatibility

- **Chrome 90+**: Full support
- **Firefox 88+**: Full support  
- **Safari 14+**: Full support (test localStorage/sessionStorage)
- **Edge 90+**: Full support
- **Mobile Safari**: Test touch interactions and viewport sizing
- **Mobile Chrome**: Test responsiveness and button sizes
