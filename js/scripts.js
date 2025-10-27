// Synk Website JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // Auth State Management
    initAuthState();
    
    // Header scroll effect
    const header = document.querySelector('header');
    let lastScrollY = window.scrollY;

    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
        lastScrollY = window.scrollY;
    });

    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // Mobile menu toggle
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    const nav = document.querySelector('nav');
    
    function closeMobileMenu() {
        if (nav) {
            nav.classList.remove('mobile-open');
            if (mobileMenuToggle) {
                mobileMenuToggle.classList.remove('active');
            }
        }
    }
    
    if (mobileMenuToggle) {
        mobileMenuToggle.addEventListener('click', () => {
            nav.classList.toggle('mobile-open');
            mobileMenuToggle.classList.toggle('active');
        });
    }
    
    // Close mobile menu when clicking nav links
    if (nav) {
        nav.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', closeMobileMenu);
        });
    }
    
    // Close mobile menu when clicking elsewhere (but preserve dropdown behavior)
    document.addEventListener('click', (e) => {
        if (mobileMenuToggle && !mobileMenuToggle.contains(e.target) && nav && !nav.contains(e.target)) {
            closeMobileMenu();
        }
    });

    // Intersection Observer for animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('fade-in-up');
            }
        });
    }, observerOptions);

    // Observe elements for animation
    document.querySelectorAll('.feature-card, .step, .about-content').forEach(el => {
        observer.observe(el);
    });

    // Contact form handling
    const contactForm = document.getElementById('contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Get form data
            const formData = new FormData(this);
            const name = formData.get('name');
            const email = formData.get('email');
            const message = formData.get('message');
            
            // Basic validation
            if (!name || !email || !message) {
                showNotification('Please fill in all fields.', 'error');
                return;
            }
            
            if (!isValidEmail(email)) {
                showNotification('Please enter a valid email address.', 'error');
                return;
            }
            
            // Simulate form submission
            const submitButton = this.querySelector('.submit-button');
            const originalText = submitButton.textContent;
            submitButton.textContent = 'Sending...';
            submitButton.disabled = true;
            
            setTimeout(() => {
                showNotification('Thank you for your message! We\'ll get back to you soon.', 'success');
                this.reset();
                submitButton.textContent = originalText;
                submitButton.disabled = false;
            }, 2000);
        });
    }

    // Email validation helper
    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // Notification system
    function showNotification(message, type = 'info') {
        // Remove existing notifications
        const existingNotification = document.querySelector('.notification');
        if (existingNotification) {
            existingNotification.remove();
        }

        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-message">${message}</span>
                <button class="notification-close">&times;</button>
            </div>
        `;

        // Add styles with Dragon's Breath theme
        const bgColor = type === 'success' 
            ? 'linear-gradient(135deg, rgba(255, 69, 0, 0.95), rgba(220, 20, 60, 0.95))' 
            : type === 'error' 
            ? 'linear-gradient(135deg, rgba(220, 20, 60, 0.95), rgba(139, 0, 0, 0.95))' 
            : 'linear-gradient(135deg, rgba(255, 101, 0, 0.95), rgba(255, 69, 0, 0.95))';
        
        notification.style.cssText = `
            position: fixed;
            top: 100px;
            right: 20px;
            background: ${bgColor};
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 69, 0, 0.2);
            z-index: 10000;
            transform: translateX(400px);
            transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            max-width: 400px;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.1);
        `;

        // Add to page
        document.body.appendChild(notification);

        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);

        // Close button functionality
        const closeButton = notification.querySelector('.notification-close');
        closeButton.addEventListener('click', () => {
            notification.style.transform = 'translateX(400px)';
            setTimeout(() => notification.remove(), 300);
        });

        // Auto remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.transform = 'translateX(400px)';
                setTimeout(() => notification.remove(), 300);
            }
        }, 5000);
    }

    // Add loading states to buttons
    document.querySelectorAll('.cta-button, .btn-secondary').forEach(button => {
        button.addEventListener('click', function(e) {
            if (this.href && this.href.includes('#')) {
                return; // Don't add loading state for anchor links
            }
            
            this.style.position = 'relative';
            this.style.overflow = 'hidden';
            
            // Add ripple effect
            const ripple = document.createElement('span');
            ripple.style.cssText = `
                position: absolute;
                border-radius: 50%;
                background: rgba(255,255,255,0.3);
                transform: scale(0);
                animation: ripple 0.6s linear;
                pointer-events: none;
            `;
            
            const rect = this.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            ripple.style.width = ripple.style.height = size + 'px';
            ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
            ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
            
            this.appendChild(ripple);
            
            setTimeout(() => ripple.remove(), 600);
        });
    });

    // Add ripple animation CSS
    const style = document.createElement('style');
    style.textContent = `
        @keyframes ripple {
            to {
                transform: scale(4);
                opacity: 0;
            }
        }
        
        .notification-content {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 1rem;
        }
        
        .notification-close {
            background: none;
            border: none;
            color: white;
            font-size: 1.5rem;
            cursor: pointer;
            padding: 0;
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            transition: background-color 0.2s;
        }
        
        .notification-close:hover {
            background-color: rgba(255,255,255,0.2);
        }
        
        /* Mobile menu styles */
        @media (max-width: 768px) {
            nav {
                position: fixed;
                top: 80px;
                left: 0;
                right: 0;
                background: rgba(18, 17, 17, 0.98);
                backdrop-filter: blur(20px);
                padding: 2rem;
                transform: translateY(-100%);
                transition: transform 0.3s ease;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            }
            
            nav.mobile-open {
                display: flex;
                flex-direction: column;
                gap: 1.5rem;
                transform: translateY(0);
            }
            
            .mobile-menu-toggle.active span:nth-child(1) {
                transform: rotate(45deg) translate(6px, 6px);
            }
            
            .mobile-menu-toggle.active span:nth-child(2) {
                opacity: 0;
            }
            
            .mobile-menu-toggle.active span:nth-child(3) {
                transform: rotate(-45deg) translate(6px, -6px);
            }
        }
    `;
    document.head.appendChild(style);

    // Parallax effect for hero section
    const hero = document.querySelector('.hero');
    if (hero) {
        window.addEventListener('scroll', () => {
            const scrolled = window.pageYOffset;
            const rate = scrolled * -0.5;
            hero.style.transform = `translateY(${rate}px)`;
        });
    }

    // Add hover effects to feature cards
    document.querySelectorAll('.feature-card').forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-10px) scale(1.02)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0) scale(1)';
        });
    });

    // Typing effect for hero title (optional enhancement)
    const heroTitle = document.querySelector('.hero h1');
    if (heroTitle && heroTitle.dataset.typewriter) {
        const text = heroTitle.textContent;
        heroTitle.textContent = '';
        let i = 0;
        
        function typeWriter() {
            if (i < text.length) {
                heroTitle.textContent += text.charAt(i);
                i++;
                setTimeout(typeWriter, 100);
            }
        }
        
        // Start typing effect after a delay
        setTimeout(typeWriter, 1000);
    }
});

// Utility function to detect if user prefers reduced motion
function prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// Disable animations if user prefers reduced motion
if (prefersReducedMotion()) {
    const style = document.createElement('style');
    style.textContent = `
        *, *::before, *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
        }
    `;
    document.head.appendChild(style);
}

// ============================================
// AUTH STATE MANAGEMENT
// ============================================

const BACKEND_URL = 'https://synk-web.onrender.com';

function initAuthState() {
    const authButtons = document.getElementById('auth-buttons');
    const userDropdown = document.getElementById('user-dropdown');
    const userAvatar = document.getElementById('user-avatar');
    const userEmailEl = document.getElementById('user-email');
    const logoutBtn = document.getElementById('logout-btn');
    
    if (!authButtons || !userDropdown) return;
    
    // Check if user is logged in
    const token = localStorage.getItem('synk_auth_token');
    const userEmail = localStorage.getItem('synk_user_email');
    
    if (token && userEmail) {
        // User is logged in - show logged in state immediately
        showLoggedInState(userEmail);
        
        // Optionally verify token with backend
        if (window.location.hostname !== 'localhost') {
            fetchUserData(token).catch(() => {
                // Token invalid - show logged out state
                localStorage.removeItem('synk_auth_token');
                localStorage.removeItem('synk_user_email');
                showLoggedOutState();
            });
        }
    } else {
        // User is logged out
        showLoggedOutState();
    }
    
    // User avatar click handler - toggle dropdown
    if (userAvatar) {
        userAvatar.addEventListener('click', (e) => {
            e.stopPropagation();
            userDropdown.classList.toggle('open');
        });
        
        // Mobile touch handler
        userAvatar.addEventListener('touchstart', (e) => {
            e.stopPropagation();
        });
    }
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (userDropdown && !userDropdown.contains(e.target) && userAvatar && e.target !== userAvatar) {
            userDropdown.classList.remove('open');
        }
    });
    
    // Close dropdown when pressing Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && userDropdown) {
            userDropdown.classList.remove('open');
        }
    });
    
    // Logout button handler
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            handleLogout();
        });
    }
}

function showLoggedInState(email) {
    const authButtons = document.getElementById('auth-buttons');
    const userDropdown = document.getElementById('user-dropdown');
    const userAvatar = document.getElementById('user-avatar');
    const userEmailEl = document.getElementById('user-email');
    
    if (authButtons) authButtons.style.display = 'none';
    if (userDropdown) userDropdown.classList.add('active');
    
    if (userEmailEl) userEmailEl.textContent = email;
    
    // Set avatar initial (first letter of email)
    if (userAvatar && email) {
        userAvatar.textContent = email.charAt(0).toUpperCase();
    }
}

function showLoggedOutState() {
    const authButtons = document.getElementById('auth-buttons');
    const userDropdown = document.getElementById('user-dropdown');
    
    if (authButtons) authButtons.style.display = 'flex';
    if (userDropdown) {
        userDropdown.classList.remove('active');
        userDropdown.classList.remove('open');
    }
}

async function fetchUserData(token) {
    try {
        const response = await fetch(`${BACKEND_URL}/me`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch user data');
        }
        
        return await response.json();
    } catch (error) {
        console.error('Error fetching user data:', error);
        return null;
    }
}

function handleLogout() {
    // Remove auth tokens and user data
    localStorage.removeItem('synk_auth_token');
    localStorage.removeItem('synk_user_email');
    
    // Show logged out state
    showLoggedOutState();
    
    // Show notification
    showNotification('You have been logged out successfully', 'success');
    
    // Redirect to home page after a short delay
    setTimeout(() => {
        window.location.href = 'index.html';
    }, 1000);
}

// Helper function for notifications (if not already defined)
function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }

    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <span class="notification-message">${message}</span>
            <button class="notification-close">&times;</button>
        </div>
    `;

    // Add styles with Dragon's Breath theme
    const bgColor = type === 'success' 
        ? 'linear-gradient(135deg, rgba(255, 69, 0, 0.95), rgba(220, 20, 60, 0.95))' 
        : type === 'error' 
        ? 'linear-gradient(135deg, rgba(220, 20, 60, 0.95), rgba(139, 0, 0, 0.95))' 
        : 'linear-gradient(135deg, rgba(255, 101, 0, 0.95), rgba(255, 69, 0, 0.95))';
    
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        background: ${bgColor};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 69, 0, 0.2);
        z-index: 10000;
        transform: translateX(400px);
        transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        max-width: 400px;
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.1);
    `;

    // Add to page
    document.body.appendChild(notification);

    // Animate in
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);

    // Close button functionality
    const closeButton = notification.querySelector('.notification-close');
    closeButton.addEventListener('click', () => {
        notification.style.transform = 'translateX(400px)';
        setTimeout(() => notification.remove(), 300);
    });

    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.transform = 'translateX(400px)';
            setTimeout(() => notification.remove(), 300);
        }
    }, 5000);
}