# Technical Specification: Why Synk? Comparison Landing Page

## Technical Context

**Language/Version**: HTML5, CSS3, Vanilla JavaScript (ES6+)  
**Runtime**: Modern browsers (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)  
**Build System**: None (static website)  
**Dependencies**: 
- Supabase JS SDK v2 (CDN: `https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2`)
- Google Fonts (Inter font family)

**Deployment**: Netlify with static file serving, SPA redirects configured in `netlify.toml`

## Technical Implementation Brief

### Architecture
This feature adds a new comparison landing page (`why-synk.html`) to the existing static website. The implementation follows established patterns:
- Standalone HTML file with inline styles for page-specific CSS
- Supabase authentication integration via shared `js/supabase-auth-manager.js` and `js/auth-state.js`
- Responsive design using CSS Grid and Flexbox
- Mobile-first approach with hamburger menu integration
- FAQ accordion using vanilla JavaScript (pattern from `contact.html`)

### Key Technical Decisions

1. **Comparison Table**: Implement as responsive CSS Grid with 3 columns (desktop) collapsing to stacked cards (mobile)
2. **Testimonials**: Card-based grid layout, 2-3 testimonials with user avatars/initials
3. **FAQ**: Reuse accordion pattern from `contact.html` with `toggleFAQ` function
4. **Navigation Updates**: Batch update all 10 HTML files to replace "How It Works" link with "Why Synk?"
5. **Video Placeholder**: Use a styled container with placeholder text and icon, ready for iframe/video embed
6. **Page-Specific Styles**: Inline `<style>` block for comparison table, testimonials, and unique sections
7. **Global Styles**: Leverage existing `css/styles.css` for header, footer, buttons, and base components

### Responsive Breakpoints
- Mobile: `< 768px` (stacked layout, full-width cards)
- Tablet: `768px - 1024px` (2-column grid where applicable)
- Desktop: `> 1024px` (3-column comparison table, multi-column testimonials)

## Source Code Structure

### New Files
```
synk-web/
├── why-synk.html         # Main comparison landing page
```

### Modified Files
```
synk-web/
├── index.html            # Navigation update: "How It Works" → "Why Synk?"
├── about.html            # Navigation update (removed from nav, file remains)
├── pricing.html          # Navigation update + add link to why-synk.html
├── download.html         # Navigation update
├── contact.html          # Navigation update
├── login.html            # Navigation update
├── signup.html           # Navigation update
├── account.html          # Navigation update (if exists)
├── privacy.html          # Navigation update
└── terms.html            # Navigation update
```

### JavaScript Dependencies
- `js/supabase-auth-manager.js` - Auth manager (existing, no changes)
- `js/auth-state.js` - Auth state handling (existing, no changes)
- `js/scripts.js` - Mobile menu toggle (existing, no changes)

### CSS Architecture
- Global: `css/styles.css` (no modifications needed)
- Page-specific: Inline `<style>` block in `why-synk.html` for:
  - Comparison table styles
  - Testimonial card styles
  - Video placeholder styles
  - FAQ section (reuse contact.html pattern)
  - Hero section adjustments

## Contracts

### Data Models
No new data models. Page uses static content only.

### HTML Structure Contracts

#### 1. Comparison Table Component
```html
<section class="comparison-section">
  <div class="container">
    <h2><!-- Section title --></h2>
    <div class="comparison-table">
      <div class="comparison-column">
        <div class="comparison-header"><!-- Tool name --></div>
        <div class="comparison-row">
          <span class="row-label"><!-- Feature name --></span>
          <span class="row-value"><!-- Feature value --></span>
        </div>
        <!-- Repeat rows -->
      </div>
      <!-- Repeat for 3 columns: Zapier/Make, 2sync & Others, Synk -->
    </div>
  </div>
</section>
```

**CSS Classes**:
- `.comparison-section` - Section wrapper
- `.comparison-table` - Grid container (3 columns desktop, stacked mobile)
- `.comparison-column` - Individual column
- `.comparison-column.featured` - Synk column with highlight styling
- `.comparison-header` - Column header with tool name
- `.comparison-row` - Feature row
- `.row-label` - Feature name
- `.row-value` - Feature value

#### 2. Testimonial Component
```html
<section class="testimonials-section">
  <div class="container">
    <h2><!-- Section title --></h2>
    <div class="testimonials-grid">
      <div class="testimonial-card">
        <div class="testimonial-avatar"><!-- Initials --></div>
        <p class="testimonial-text"><!-- Quote --></p>
        <div class="testimonial-author">
          <strong><!-- Name --></strong>
          <span><!-- Title/Role --></span>
        </div>
      </div>
      <!-- Repeat for 2-3 testimonials -->
    </div>
  </div>
</section>
```

**CSS Classes**:
- `.testimonials-section` - Section wrapper
- `.testimonials-grid` - Grid container
- `.testimonial-card` - Individual testimonial card
- `.testimonial-avatar` - User avatar with initials
- `.testimonial-text` - Quote text
- `.testimonial-author` - Author info

#### 3. Video Placeholder Component
```html
<section class="video-section">
  <div class="container">
    <h2><!-- Section title --></h2>
    <div class="video-placeholder">
      <div class="video-icon"><!-- Play icon SVG --></div>
      <p><!-- Placeholder text --></p>
    </div>
  </div>
</section>
```

**CSS Classes**:
- `.video-section` - Section wrapper
- `.video-placeholder` - Placeholder container with border/background
- `.video-icon` - Play icon or video icon

#### 4. FAQ Component (Reuse from contact.html)
```html
<section class="faq-section">
  <div class="container">
    <div class="faq-container">
      <div class="faq-item">
        <div class="faq-question" onclick="toggleFAQ(this)">
          <!-- Question text -->
          <span class="faq-toggle">→</span>
        </div>
        <div class="faq-answer">
          <!-- Answer text -->
        </div>
      </div>
      <!-- Repeat for each FAQ -->
    </div>
  </div>
</section>
```

#### 5. Navigation Link Updates
**Pattern to replace across all pages**:
```html
<!-- OLD -->
<a href="about.html">How It Works</a>

<!-- NEW -->
<a href="why-synk.html">Why Synk?</a>
```

**Files to update**: `index.html`, `about.html`, `pricing.html`, `download.html`, `contact.html`, `login.html`, `signup.html`, `account.html`, `privacy.html`, `terms.html`

#### 6. Pricing Page Link Addition
Add to `pricing.html` after pricing cards or in FAQ section:
```html
<p class="comparison-link">
  Wondering how we compare? 
  <a href="why-synk.html">See how Synk stacks up against alternatives →</a>
</p>
```

### JavaScript Contracts

#### FAQ Toggle Function (add to why-synk.html inline script)
```javascript
function toggleFAQ(element) {
    const faqItem = element.closest('.faq-item');
    const isActive = faqItem.classList.contains('active');
    
    // Close all FAQ items
    document.querySelectorAll('.faq-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Open clicked item if it wasn't active
    if (!isActive) {
        faqItem.classList.add('active');
    }
}
```

### Content Contracts

#### Comparison Table Data
| Feature | Zapier/Make | 2sync & Others | Synk |
|---------|-------------|----------------|------|
| **Price** | $29.99+/month | $10-20/month | $14.99/month |
| **Setup Time** | 15-30 minutes (10+ steps) | 5-10 minutes | 2 minutes (3 steps) |
| **Focus** | 5,000+ apps (generalist) | Multiple integrations | One thing perfectly: Calendar ↔ Notion |
| **Learning Curve** | Complex (rules, filters, logic) | Moderate | None (it just works) |
| **Trial** | Credit card required | Often limited | 7-day full Pro trial, no credit card |
| **Support** | Generic, slow | Varies | Built by someone who uses it daily |

#### Testimonials Content (3 professional testimonials)
1. **Michael Chen**, Product Manager at TechCorp
   - "I was using Zapier for this and paying $30/month for one workflow. Synk does it better for half the price."

2. **Sarah Johnson**, Freelance Consultant
   - "Setup took 2 minutes. With Zapier it took me an hour to get it working. The time savings alone make it worth it."

3. **Alex Rodriguez**, Operations Lead
   - "Finally, a tool that does one thing exceptionally well. No configuration headaches, just reliable syncing every time."

#### FAQ Content
1. **Q**: How is this different from Zapier?  
   **A**: Zapier is a generalist tool built for 5,000+ integrations. Synk is a specialist—we do one thing perfectly: sync Google Calendar with Notion. This means simpler setup, better reliability, and a fraction of the cost for this specific use case.

2. **Q**: What if I need more integrations later?  
   **A**: We're focused on perfecting Calendar ↔ Notion sync first. If there's demand for additional integrations that complement this core workflow, we'll consider adding them based on user feedback. For complex multi-app workflows, tools like Zapier are better suited.

3. **Q**: Can I cancel anytime?  
   **A**: Absolutely. You can cancel your Pro subscription anytime, no questions asked. When you cancel, you'll still have access to manual sync mode forever.

## Delivery Phases

### Phase 1: Create why-synk.html Page
**Deliverable**: Fully functional why-synk.html with all sections

**Tasks**:
1. Create base HTML structure with header/footer matching existing pages
2. Add Supabase auth integration (CDN script + auth state handling)
3. Implement hero section with headline and subheadline
4. Build responsive comparison table section with 3 columns
5. Add pain points section (two subsections + Synk differentiation)
6. Create "Who It's For" section with two lists
7. Implement testimonials section with 3 cards
8. Add video placeholder section
9. Build FAQ section using contact.html pattern
10. Add CTA section with primary button and secondary options
11. Include money-back guarantee callout
12. Add page-specific inline styles
13. Add FAQ toggle JavaScript function
14. Configure SEO meta tags

**Verification**: 
- Open `why-synk.html` in browser
- Verify all sections render correctly
- Test responsive design at mobile (375px), tablet (768px), desktop (1440px) breakpoints
- Test FAQ accordion functionality
- Verify auth state handling (logged in/out)
- Check mobile menu toggle
- Validate HTML using W3C validator

### Phase 2: Update Navigation Across All Pages
**Deliverable**: All 10 HTML files updated with new navigation

**Tasks**:
1. Update navigation in `index.html`: Replace `<a href="about.html">How It Works</a>` with `<a href="why-synk.html">Why Synk?</a>`
2. Repeat for: `about.html`, `pricing.html`, `download.html`, `contact.html`, `login.html`, `signup.html`, `account.html`, `privacy.html`, `terms.html`
3. Verify `about.html` file remains accessible (no deletion, just nav removal)

**Verification**:
- Open each page in browser
- Click "Why Synk?" nav link, verify it navigates to why-synk.html
- Verify about.html is still accessible via direct URL
- Check mobile hamburger menu shows updated navigation

### Phase 3: Add Pricing Page Cross-Link
**Deliverable**: pricing.html includes link to why-synk.html

**Tasks**:
1. Identify appropriate location in pricing.html (after pricing cards or in FAQ section)
2. Add styled link/callout: "Wondering how we compare? See how Synk stacks up against alternatives →"
3. Link points to `why-synk.html`
4. Style consistent with existing pricing page design

**Verification**:
- Open pricing.html in browser
- Locate comparison link
- Click link, verify navigation to why-synk.html
- Verify styling matches page aesthetics

### Phase 4: Final Testing & Polish
**Deliverable**: Fully tested, production-ready feature

**Tasks**:
1. Cross-browser testing (Chrome, Firefox, Safari, Edge)
2. Mobile device testing (iOS Safari, Android Chrome)
3. Lighthouse audit (Performance, Accessibility, SEO scores)
4. Fix any accessibility issues (ARIA labels, keyboard navigation)
5. Verify all internal links work correctly
6. Ensure consistent design language across all sections
7. Proofread all copy for typos/grammar

**Verification**:
- Lighthouse score 90+ across all metrics
- No console errors on any page
- All links navigate correctly
- Mobile menu functions properly
- FAQ accordion works without JavaScript errors
- Auth state updates correctly
- Page loads in < 2 seconds on 3G connection

## Verification Strategy

### Automated Verification

#### 1. HTML Validation
```bash
# Use W3C HTML validator (requires curl and jq)
curl -H "Content-Type: text/html; charset=utf-8" \
     --data-binary @why-synk.html \
     https://validator.w3.org/nu/?out=json | jq '.messages'
```

Expected: No errors, warnings acceptable for inline styles

#### 2. Lighthouse Testing
Use Chrome DevTools Lighthouse or CLI:
```bash
# Requires lighthouse CLI: npm install -g @lhci/cli
lighthouse http://localhost:8080/why-synk.html --view
```

**Success Criteria**:
- Performance: 90+
- Accessibility: 95+
- Best Practices: 90+
- SEO: 95+

#### 3. Broken Link Check
```bash
# Check all internal links (requires muffet or similar tool)
# Manual verification acceptable for 10 pages
```

### Manual Verification Checklist

#### Visual Inspection
- [ ] Hero section headline and subheadline display correctly
- [ ] Comparison table shows 3 columns on desktop
- [ ] Comparison table stacks on mobile (< 768px)
- [ ] Synk column has featured/highlight styling
- [ ] All 6 comparison features (Price, Setup, Focus, Learning Curve, Trial, Support) visible
- [ ] Pain points section has clear visual hierarchy
- [ ] "Who It's For" lists are readable and properly styled
- [ ] Testimonials display in grid layout
- [ ] Testimonial avatars show initials
- [ ] Video placeholder has clear visual indicator
- [ ] FAQ items have arrow toggle icon
- [ ] CTA button is prominent and gradient-styled
- [ ] Money-back guarantee stands out
- [ ] Header and footer match other pages
- [ ] Dark theme and orange accents consistent

#### Interaction Testing
- [ ] Clicking FAQ question toggles answer visibility
- [ ] Only one FAQ open at a time
- [ ] FAQ arrow rotates on open/close
- [ ] CTA button navigates to signup.html
- [ ] All navigation links work
- [ ] Mobile menu hamburger opens/closes
- [ ] Hover effects on buttons and cards work
- [ ] Smooth scroll to anchor links (if any)

#### Responsive Testing
- [ ] Test at 375px (iPhone SE)
- [ ] Test at 768px (iPad)
- [ ] Test at 1440px (Desktop)
- [ ] Comparison table responsive at all breakpoints
- [ ] Testimonials stack appropriately on mobile
- [ ] Text remains readable at all sizes
- [ ] No horizontal scroll on mobile

#### Authentication Testing
- [ ] Page loads correctly when logged out
- [ ] Page loads correctly when logged in
- [ ] User dropdown appears when authenticated
- [ ] Auth buttons appear when not authenticated
- [ ] No JavaScript errors related to auth

#### Cross-Browser Testing
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Safari (iOS 14+)
- [ ] Mobile Chrome (Android)

### Helper Scripts

No complex helper scripts required. Use browser DevTools for verification:
- **Responsive Design Mode**: Test breakpoints
- **Console**: Check for JavaScript errors
- **Network Tab**: Verify fast load times
- **Lighthouse**: Automated scoring

### Sample Input Artifacts

**Not required** - All content is static and defined in spec.

### MCP Servers

**None required** - Static website with no external API dependencies beyond Supabase (already configured).

### Test Execution

1. **Start local server**:
   ```bash
   # Python 3
   python -m http.server 8080
   
   # OR Node.js http-server
   npx http-server -p 8080
   ```

2. **Navigate to**: `http://localhost:8080/why-synk.html`

3. **Run through manual checklist**

4. **Fix issues and re-test**

5. **Deploy to Netlify** (auto-deploy on git push to main)

### Success Metrics Post-Launch

- Page accessible at `/why-synk.html`
- No 404 errors on navigation
- Lighthouse scores meet targets
- No console errors
- All interactive elements functional
- Design matches existing site aesthetics
- Conversion tracking setup (future enhancement)
