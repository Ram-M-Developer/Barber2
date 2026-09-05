/**
 * BarberEase – Client-Side Auth Logic
 */

// Helper to show alert messages in auth card
function showAlert(message, type = 'danger') {
  const container = document.getElementById('alert-container');
  if (!container) return;

  container.innerHTML = `
    <div class="alert alert-${type} alert-dismissible fade show" role="alert">
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    </div>
  `;
}

// Handle Customer Login Form Submit
async function handleLogin(event) {
  event.preventDefault();
  
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  
  showAlert('Signing in...', 'info');

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || 'Login failed. Please check credentials.');
    }

    // Save token and user details to localStorage
    localStorage.setItem('barber_token', data.data.token);
    localStorage.setItem('barber_user', JSON.stringify(data.data.customer));
    localStorage.setItem('barber_user_type', 'customer');

    showAlert('Login successful! Redirecting...', 'success');
    
    // Redirect to customer dashboard
    setTimeout(() => {
      window.location.href = '/customer/dashboard.html';
    }, 1000);

  } catch (error) {
    showAlert(error.message, 'danger');
  }
}

// Handle Customer Registration Form Submit
async function handleRegister(event) {
  event.preventDefault();

  const name = document.getElementById('name').value;
  const email = document.getElementById('email').value;
  const phone = document.getElementById('phone').value;
  const gender = document.getElementById('gender').value;
  const password = document.getElementById('password').value;
  const address = document.getElementById('address').value;

  showAlert('Creating account...', 'info');

  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, phone, gender, password, address })
    });

    const data = await res.json();

    if (!res.ok) {
      // Check for express-validator field level errors
      if (data.errors && data.errors.length > 0) {
        throw new Error(data.errors.map(err => err.message).join('<br>'));
      }
      throw new Error(data.message || 'Registration failed.');
    }

    // Auto log in after register by saving credentials
    localStorage.setItem('barber_token', data.data.token);
    localStorage.setItem('barber_user', JSON.stringify(data.data.customer));
    localStorage.setItem('barber_user_type', 'customer');

    showAlert('Registration successful! Redirecting to dashboard...', 'success');

    setTimeout(() => {
      window.location.href = '/customer/dashboard.html';
    }, 1500);

  } catch (error) {
    showAlert(error.message, 'danger');
  }
}

// Handle Admin Login Form Submit
async function handleAdminLogin(event) {
  event.preventDefault();

  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;

  showAlert('Verifying admin privileges...', 'info');

  try {
    const res = await fetch('/api/auth/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || 'Authentication failed. Please check credentials.');
    }

    // Save token and admin details to localStorage
    localStorage.setItem('barber_token', data.data.token);
    localStorage.setItem('barber_user', JSON.stringify(data.data.admin));
    localStorage.setItem('barber_user_type', 'admin');

    showAlert('Authentication successful! Opening dashboard...', 'success');

    setTimeout(() => {
      window.location.href = '/admin/dashboard.html';
    }, 1000);

  } catch (error) {
    showAlert(error.message, 'danger');
  }
}

// Show alert message for password reset placeholder flow
function showForgotPasswordAlert() {
  showAlert('Please contact your barber shop admin to reset your password.', 'info');
}

// Global Auth Check for Protected Pages
function checkAuth(expectedType) {
  const token = localStorage.getItem('barber_token');
  const userType = localStorage.getItem('barber_user_type');

  if (!token || userType !== expectedType) {
    // Clear corrupted credentials
    localStorage.removeItem('barber_token');
    localStorage.removeItem('barber_user');
    localStorage.removeItem('barber_user_type');
    
    // Redirect to appropriate login
    if (expectedType === 'admin') {
      window.location.href = '/auth/admin-login.html';
    } else {
      window.location.href = '/auth/login.html';
    }
  }
}

// Handle Logout
function handleLogout() {
  localStorage.removeItem('barber_token');
  localStorage.removeItem('barber_user');
  localStorage.removeItem('barber_user_type');
  window.location.href = '/';
}
