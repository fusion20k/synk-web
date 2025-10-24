// Auth.js - Login and Signup functionality
// Dragon's Breath Theme - Professional Authentication

const API_BASE_URL = 'https://synk-web.onrender.com';

// Helper function to show error messages
function showError(message) {
  const errorEl = document.getElementById('error-message');
  const successEl = document.getElementById('success-message');
  
  if (successEl) successEl.style.display = 'none';
  if (errorEl) {
    errorEl.textContent = message;
    errorEl.style.display = 'block';
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      errorEl.style.display = 'none';
    }, 5000);
  }
}

// Helper function to show success messages
function showSuccess(message) {
  const errorEl = document.getElementById('error-message');
  const successEl = document.getElementById('success-message');
  
  if (errorEl) errorEl.style.display = 'none';
  if (successEl) {
    successEl.textContent = message;
    successEl.style.display = 'block';
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      successEl.style.display = 'none';
    }, 5000);
  }
}

// Helper function to toggle button loading state
function setButtonLoading(button, isLoading) {
  const btnText = button.querySelector('.btn-text');
  const btnLoader = button.querySelector('.btn-loader');
  
  if (isLoading) {
    btnText.style.display = 'none';
    btnLoader.style.display = 'inline-flex';
    button.disabled = true;
  } else {
    btnText.style.display = 'inline';
    btnLoader.style.display = 'none';
    button.disabled = false;
  }
}

// Login Form Handler
const loginForm = document.getElementById('login-form');
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const loginBtn = document.getElementById('login-btn');
    
    // Validation
    if (!email || !password) {
      showError('Please enter both email and password');
      return;
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showError('Please enter a valid email address');
      return;
    }
    
    setButtonLoading(loginBtn, true);
    
    try {
      const response = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password })
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        // Store auth token
        localStorage.setItem('synk_auth_token', data.token);
        localStorage.setItem('synk_user_email', email);
        
        showSuccess('Login successful! Redirecting...');
        
        // Redirect to download page after 1 second
        setTimeout(() => {
          window.location.href = 'download.html';
        }, 1000);
      } else {
        // Handle specific error codes
        let errorMessage = 'Login failed. Please try again.';
        
        if (data.error === 'invalid_credentials') {
          errorMessage = 'Invalid email or password';
        } else if (data.error === 'missing_params') {
          errorMessage = 'Please enter both email and password';
        } else if (data.message) {
          errorMessage = data.message;
        }
        
        showError(errorMessage);
        setButtonLoading(loginBtn, false);
      }
    } catch (error) {
      console.error('Login error:', error);
      showError('Network error. Please check your connection and try again.');
      setButtonLoading(loginBtn, false);
    }
  });
}

// Signup Form Handler
const signupForm = document.getElementById('signup-form');
if (signupForm) {
  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    const termsAccepted = document.getElementById('terms').checked;
    const signupBtn = document.getElementById('signup-btn');
    
    // Validation
    if (!email || !password || !confirmPassword) {
      showError('Please fill in all fields');
      return;
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showError('Please enter a valid email address');
      return;
    }
    
    // Password validation
    if (password.length < 8) {
      showError('Password must be at least 8 characters long');
      return;
    }
    
    if (password !== confirmPassword) {
      showError('Passwords do not match');
      return;
    }
    
    if (!termsAccepted) {
      showError('Please accept the Terms of Service and Privacy Policy');
      return;
    }
    
    setButtonLoading(signupBtn, true);
    
    try {
      // IMPORTANT: Only send email and password - NO plan values
      const response = await fetch(`${API_BASE_URL}/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email, 
          password 
          // Explicitly NOT sending: plan, billing_period, is_trial
        })
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        // Store auth token
        localStorage.setItem('synk_auth_token', data.token);
        localStorage.setItem('synk_user_email', email);
        
        showSuccess('Account created successfully! Redirecting...');
        
        // Redirect to download page after 1.5 seconds
        setTimeout(() => {
          window.location.href = 'download.html';
        }, 1500);
      } else {
        // Handle specific error codes
        let errorMessage = 'Signup failed. Please try again.';
        
        if (data.error === 'user_exists') {
          errorMessage = 'An account with this email already exists. Please log in instead.';
        } else if (data.error === 'missing_params') {
          errorMessage = 'Please fill in all required fields';
        } else if (data.error === 'forbidden_plan_modification') {
          errorMessage = 'Invalid request. Please try again.';
        } else if (data.message) {
          errorMessage = data.message;
        }
        
        showError(errorMessage);
        setButtonLoading(signupBtn, false);
      }
    } catch (error) {
      console.error('Signup error:', error);
      showError('Network error. Please check your connection and try again.');
      setButtonLoading(signupBtn, false);
    }
  });
}

// Password strength indicator (optional enhancement)
const passwordInput = document.getElementById('password');
if (passwordInput && signupForm) {
  passwordInput.addEventListener('input', (e) => {
    const password = e.target.value;
    const hint = passwordInput.nextElementSibling;
    
    if (password.length === 0) {
      hint.textContent = 'At least 8 characters';
      hint.style.color = 'var(--text-muted)';
    } else if (password.length < 8) {
      hint.textContent = `${8 - password.length} more characters needed`;
      hint.style.color = '#ff6b6b';
    } else if (password.length >= 8 && password.length < 12) {
      hint.textContent = 'Good password strength';
      hint.style.color = '#ffa07a';
    } else {
      hint.textContent = 'Strong password!';
      hint.style.color = '#90ee90';
    }
  });
}

// Real-time password match validation
const confirmPasswordInput = document.getElementById('confirm-password');
if (confirmPasswordInput && signupForm) {
  confirmPasswordInput.addEventListener('input', (e) => {
    const password = document.getElementById('password').value;
    const confirmPassword = e.target.value;
    
    if (confirmPassword.length === 0) {
      confirmPasswordInput.style.borderColor = 'rgba(255, 255, 255, 0.1)';
    } else if (password === confirmPassword) {
      confirmPasswordInput.style.borderColor = '#90ee90';
    } else {
      confirmPasswordInput.style.borderColor = '#ff6b6b';
    }
  });
}

// Check if user is already logged in
function checkAuthStatus() {
  const token = localStorage.getItem('synk_auth_token');
  const currentPage = window.location.pathname.split('/').pop();
  
  // If on login/signup page and already logged in, redirect to download
  if (token && (currentPage === 'login.html' || currentPage === 'signup.html')) {
    window.location.href = 'download.html';
  }
}

// Run auth check on page load
checkAuthStatus();