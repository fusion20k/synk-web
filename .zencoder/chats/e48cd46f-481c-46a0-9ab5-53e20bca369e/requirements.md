# Feature Specification: Why Synk? Comparison Landing Page

## User Stories

### User Story 1 - Visitor Compares Synk to Alternatives

**Acceptance Scenarios**:

1. **Given** a visitor is considering automation tools, **When** they navigate to "Why Synk?" page, **Then** they see a clear headline emphasizing Synk's focus and value proposition
2. **Given** a visitor wants to compare features, **When** they view the comparison table, **Then** they see Synk vs Zapier/Make vs Other sync tools with pricing, setup time, focus, learning curve, trial, and support clearly laid out
3. **Given** a visitor is scrolling through the page, **When** they reach the pain points section, **Then** they understand specific problems with alternative solutions and how Synk solves them
4. **Given** a visitor wants to know if Synk is right for them, **When** they view the "Who It's For" section, **Then** they see clear use cases for ideal users and honest exclusions for non-ideal users

### User Story 2 - Visitor Evaluates Trust and Social Proof

**Acceptance Scenarios**:

1. **Given** a visitor needs validation, **When** they view the social proof section, **Then** they see professional, realistic testimonials from users highlighting key benefits
2. **Given** a visitor is uncertain about committing, **When** they read the money-back guarantee, **Then** they feel confident about trying Synk risk-free
3. **Given** a visitor wants to see Synk in action, **When** they find the video placeholder section, **Then** they know a setup demonstration will be available

### User Story 3 - Visitor Takes Action

**Acceptance Scenarios**:

1. **Given** a visitor is convinced to try Synk, **When** they view the CTA section, **Then** they see a prominent "Start Free Trial" button with clear trial benefits (7 days, no credit card, full Pro features)
2. **Given** a visitor has questions, **When** they scroll to the FAQ section, **Then** they find answers to common questions comparing Synk to Zapier and addressing concerns
3. **Given** a visitor clicks the CTA button, **When** they are redirected, **Then** they go to the signup page to start their free trial

### User Story 4 - Navigation Integration

**Acceptance Scenarios**:

1. **Given** a visitor is on any page of the website, **When** they view the main navigation, **Then** they see "Why Synk?" in place of "How It Works"
2. **Given** a visitor is on the pricing page, **When** they look for alternative comparisons, **Then** they see a link to the "Why Synk?" page
3. **Given** the about.html page still exists, **When** a visitor navigates directly to it or from internal links, **Then** it remains accessible but is not in the main navigation

---

## Requirements

### Content Requirements

#### 1. Hero Section
- **Headline**: "Sync Google Calendar to Notion. Simple. Affordable. Made for this one job."
- **Subheadline**: "Tired of overpriced, overcomplicated automation tools? Meet Synk."
- Visual hierarchy with gradient text treatments consistent with existing site design

#### 2. Comparison Table
Must include the following comparison points across three columns:
- **Zapier/Make**: $29.99+/month, 15-30 min setup (10+ steps), 5,000+ apps (generalist), Complex learning curve, Credit card required trial, Generic/slow support
- **2sync & Others**: $10-20/month, 5-10 min setup, Multiple integrations, Moderate learning curve, Often limited trial, Varies support
- **Synk**: $14.99/month (from pricing.html), 2 min setup (3 steps), One thing perfectly: Calendar ↔ Notion, No learning curve (it just works), 7-day full Pro trial no credit card, Built by someone who uses it daily

#### 3. Pain Points Section
Two subsections:
- **If you're using Zapier/Make**: Paying for 4,999 unused apps, complex setup requiring technical knowledge, difficult debugging
- **If you're using other sync tools**: Trying to do too much, still complicated setup, faceless support

**Synk's differentiation**:
- Does one thing perfectly
- No configuration hell (connect → set rules → done)
- Built by someone who needed this (relatable founder story)

#### 4. Who It's For Section
**Perfect for**:
- Notion power users who live in their workspace
- Busy professionals without time for complex setups
- Small teams needing reliability without enterprise pricing
- Anyone tired of manually copying calendar events

**Not for**:
- People needing 100+ app integrations (use Zapier)
- Enterprises with massive budgets (use enterprise solutions)
- People who enjoy manual data entry (humorous exclusion)

#### 5. Social Proof Section
Professional, realistic testimonials that highlight:
- Cost savings vs Zapier
- Setup time comparison
- Reliability and ease of use

Example themes:
- "I was using Zapier for this and paying $30/month for one workflow. Synk does it better for half the price."
- "Setup took 2 minutes. With Zapier it took me an hour to get it working."

#### 6. CTA Section
- **Main headline**: "Try Synk free for 7 days"
- **Trust signals**: No credit card required, Full Pro features during trial, Cancel anytime
- **Primary CTA button**: "Start Free Trial" → links to signup.html
- **Secondary options**: "Watch a 60-second setup video" (placeholder for future video), "Compare feature-by-feature" (anchor link to comparison table)

#### 7. FAQ Section
Minimum questions to answer:
- **"How is this different from Zapier?"** → Specialized vs generalized approach
- **"What if I need more integrations later?"** → User-driven roadmap
- **"Can I cancel anytime?"** → Yes, keep manual sync forever

#### 8. Money-Back Guarantee
"Not satisfied? Email me within 30 days for a full refund. No questions asked."
- Builds trust through personal commitment
- Clear, simple language

#### 9. Video Placeholder Section
- Placeholder for 60-second setup demonstration
- Description: "How to set up Synk in under 2 minutes"
- Shows: Opening Synk → Connecting Google Calendar (30s) → Connecting Notion (20s) → Showing event sync (10s)

### Technical Requirements

#### 1. Page Structure
- Filename: `why-synk.html`
- Follows existing site structure and design patterns
- Responsive design (mobile, tablet, desktop)
- Consistent header/footer with all other pages
- Dark theme with orange accent colors matching brand

#### 2. Navigation Updates
- Replace "How It Works" with "Why Synk?" in main navigation across all pages:
  - index.html
  - about.html (keep file but remove from nav)
  - pricing.html
  - download.html
  - contact.html
  - login.html
  - signup.html
  - account.html
  - privacy.html
  - terms.html
- Add link from pricing.html to why-synk.html under "Compared to alternatives"

#### 3. Styling
- Use existing CSS from styles.css
- Implement comparison table with responsive design
- Card-based layout for testimonials
- Accordion-style FAQ matching contact.html pattern
- Consistent button styles with hover effects
- Gradient backgrounds and animations where appropriate

#### 4. Authentication Integration
- Include Supabase auth integration consistent with other pages
- Show appropriate auth state (logged in/logged out)
- Dynamic header with user dropdown when authenticated

#### 5. Performance
- Optimize images if any are added
- Fast page load times
- Smooth animations and transitions
- Mobile-optimized touch interactions

#### 6. SEO & Meta
- Page title: "Why Synk? - Better Than Zapier for Notion & Google Calendar Sync"
- Meta description highlighting competitive advantages
- Semantic HTML structure
- Proper heading hierarchy

---

## Success Criteria

1. **Conversion Focused**: Page drives visitors to start free trial with clear value proposition
2. **Competitive Differentiation**: Visitors clearly understand how Synk differs from Zapier, Make, and other sync tools
3. **Trust Building**: Social proof, money-back guarantee, and transparent comparison build confidence
4. **Responsive Design**: Perfect experience across all devices
5. **Navigation Integration**: Seamlessly integrated into site navigation, accessible from pricing page
6. **Professional Appearance**: Testimonials and content appear authentic and high-quality
7. **Clear Target Audience**: Visitors can self-identify whether Synk is right for them
8. **Fast Loading**: Page loads quickly without performance issues
9. **Actionable CTAs**: Multiple clear paths to signup throughout the page
10. **FAQ Coverage**: Addresses primary objections and questions about switching from competitors
