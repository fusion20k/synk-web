---
description: Repository Information Overview
alwaysApply: true
---

# Synk Website Information

## Summary
A modern static website for Synk, a service that seamlessly connects Notion and Google Calendar with real-time synchronization. Built with vanilla HTML/CSS/JavaScript, featuring Supabase authentication, responsive design, and deployed on Netlify.

## Structure
```
synk-web/
├── assets/           # Icons and images
│   ├── icons/
│   └── images/
├── css/              # Stylesheets
│   ├── styles.css    # Main site styles (37 KB)
│   ├── auth.css      # Authentication UI styles (20 KB)
│   └── account.css   # Account page styles (13 KB)
├── js/               # JavaScript modules
│   ├── supabase-auth-manager.js  # Unified authentication manager
│   ├── auth-state.js             # Auth state handling
│   ├── auth.js                   # Auth form logic
│   ├── scripts.js                # Main site functionality
│   └── release-manager.js        # Release management
├── *.html            # Page templates (index, about, contact, pricing, etc.)
├── netlify.toml      # Netlify deployment configuration
└── *.md              # Documentation files
```

## Language & Runtime
**Language**: HTML5, CSS3, Vanilla JavaScript  
**Version**: ES6+ (Modern browser JavaScript)  
**Build System**: None (static website)  
**Package Manager**: None (no Node.js dependencies)  
**Deployment**: Netlify with SPA redirects

## Dependencies
**External Libraries** (loaded via CDN):
- `@supabase/supabase-js@2` - Authentication and database client
  - Loaded from: `https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2`
- Google Fonts - Inter font family

**No npm/yarn packages** - All dependencies loaded directly in browser via CDN.

**Supabase Configuration**:
- Project URL: `https://nbolvclqiaqrupxknvlu.supabase.co`
- Authentication: Email/password with OAuth callbacks
- Database: Public users table with plan and sync management

## Deployment

### Netlify Configuration
**Configuration File**: `netlify.toml`

**Settings**:
- Publish directory: Root (empty string)
- Build command: None (static files served directly)
- SPA redirect: All routes redirect to `/index.html` with 200 status

**Headers**:
- Security headers: X-Frame-Options, X-XSS-Protection, X-Content-Type-Options, Referrer-Policy
- Cache headers: 1-year caching for CSS, JS, and assets

**Deployment**:
1. Connect repository to Netlify
2. Auto-deploy on push to main branch
3. No build step required

## Main Files & Resources

### Entry Points
**Main Pages**:
- `index.html` - Homepage with hero, features, and CTA sections
- `about.html` - How it works page with detailed process
- `pricing.html` - Pricing tiers and subscription options
- `download.html` - Application download page (v1.1.0)
- `contact.html` - Contact form and FAQ
- `login.html` - User login page
- `signup.html` - User registration page
- `account.html` - User account management dashboard
- `privacy.html` - Privacy policy
- `terms.html` - Terms of service

### Core JavaScript Modules
- `js/supabase-auth-manager.js` - Centralized authentication manager with real-time session handling
- `js/auth-state.js` - Auth state management and UI updates
- `js/scripts.js` - Main site functionality (navigation, animations, form handling)
- `js/auth.js` - Authentication form logic and validation

### Stylesheets
- `css/styles.css` - Main site styles with dark theme, gradients, responsive design
- `css/auth.css` - Authentication page styles and UI components
- `css/account.css` - Account dashboard styles

### Design System
**Colors**: Dark theme (#121111 background, #FFFFFF text, accent colors: blue #5C6BC0, purple #7E57C2, teal #00BFA5)  
**Typography**: Inter font family, fluid responsive sizing  
**Components**: Gradient buttons, hover animations, mobile-responsive navigation

## Testing & Validation

**Testing Approach**: Manual browser testing  
**Test Files**: `test-auth-ui.html` - Manual authentication UI testing page

**No automated testing framework** - Project uses manual testing and browser console verification.

**Browser Support**:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

**Performance Targets**:
- Lighthouse Score: 95+ across all metrics
- First Contentful Paint: < 1.5s
- Largest Contentful Paint: < 2.5s
- Cumulative Layout Shift: < 0.1

**Accessibility**: WCAG 2.1 AA compliant with semantic HTML, ARIA labels, keyboard navigation

**Manual Testing Workflow**:
1. Open browser console on any page
2. Run `window.toggleAuthDemo()` to verify dynamic auth state changes
3. Test authentication flows (signup, login, logout)
4. Verify responsive design on mobile/tablet/desktop
5. Check Supabase session management

## Key Features
- **Dynamic Authentication**: Real-time auth state updates without page reload
- **Supabase Integration**: Email/password authentication with session management
- **Responsive Design**: Mobile-first with hamburger menu and adaptive layouts
- **Professional UI**: Dark theme with gradients, smooth animations, hover effects
- **Security**: Secure headers, XSS protection, content security policies
- **SEO Optimized**: Semantic HTML, meta tags, structured content
- **Fast Loading**: Optimized assets with aggressive caching strategy
