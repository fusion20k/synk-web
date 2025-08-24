# Synk Website

A modern, professional website for Synk - the service that seamlessly connects Notion and Google Calendar with real-time synchronization.

## Features

- **Modern Design**: Dark theme with professional gradients and animations
- **Responsive**: Optimized for desktop, tablet, and mobile devices
- **Interactive**: Smooth animations, hover effects, and form validation
- **SEO Optimized**: Proper meta tags, semantic HTML, and structured content
- **Fast Loading**: Optimized CSS and JavaScript with efficient asset loading

## Pages

- **Homepage** (`index.html`) - Hero section, features, and call-to-action
- **How It Works** (`about.html`) - Detailed process and use cases
- **Contact** (`contact.html`) - Contact form and FAQ
- **Privacy Policy** (`privacy.html`) - Comprehensive privacy information
- **Terms of Service** (`terms.html`) - Complete terms and conditions

## Technology Stack

- **HTML5** - Semantic markup with accessibility features
- **CSS3** - Modern styling with CSS Grid, Flexbox, and animations
- **Vanilla JavaScript** - Interactive features without external dependencies
- **Netlify** - Deployment platform with optimized configuration

## File Structure

```
web/
├── index.html              # Homepage
├── about.html              # How It Works page
├── contact.html            # Contact page
├── privacy.html            # Privacy Policy
├── terms.html              # Terms of Service
├── css/
│   └── styles.css          # Main stylesheet
├── js/
│   └── scripts.js          # Interactive functionality
├── assets/
│   └── icons/
│       └── favicon.ico     # Site favicon
├── netlify.toml            # Netlify configuration
└── README.md               # This file
```

## Design System

### Colors
- **Background**: `#121111` (Dark grey/black)
- **Primary Text**: `#FFFFFF` (White)
- **Secondary Text**: `#B0B0B0` (Light grey)
- **Accent Blue**: `#5C6BC0`
- **Accent Purple**: `#7E57C2`
- **Accent Teal**: `#00BFA5`

### Typography
- **Font Family**: Inter (Google Fonts)
- **Headings**: 600-700 weight
- **Body Text**: 400-500 weight
- **Responsive scaling**: Fluid typography with clamp()

### Components
- **Buttons**: Gradient backgrounds with hover animations
- **Cards**: Subtle shadows with hover transforms
- **Forms**: Clean inputs with focus states
- **Navigation**: Responsive with mobile hamburger menu

## Deployment

This website is configured for Netlify deployment:

1. Connect your repository to Netlify
2. Set build directory to `web`
3. Deploy automatically on push to main branch

The `netlify.toml` file includes:
- Security headers
- Asset caching
- 404 redirects
- Environment configuration

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Performance

- **Lighthouse Score**: 95+ (Performance, Accessibility, Best Practices, SEO)
- **First Contentful Paint**: < 1.5s
- **Largest Contentful Paint**: < 2.5s
- **Cumulative Layout Shift**: < 0.1

## Accessibility

- WCAG 2.1 AA compliant
- Semantic HTML structure
- Proper ARIA labels
- Keyboard navigation support
- Screen reader optimized
- High contrast ratios

## Contact

For questions about the website or Synk service:
- Email: support@synk.app
- Website: [Contact Form](contact.html)

---

© 2025 Synk. All rights reserved.