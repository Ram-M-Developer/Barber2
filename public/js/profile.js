/**
 * BarberEase – Client-Side Profile Logic
 */

// Show alert messages
function showProfileAlert(message, type = 'danger') {
  const container = document.getElementById('alert-container');
  if (!container) return;

  container.innerHTML = `
    <div class="alert alert-${type} alert-dismissible fade show" role="alert">
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    </div>
  `;
}

// Fetch Profile Data on Page Load
async function fetchProfile() {
  const token = localStorage.getItem('barber_token');
  if (!token) return;

  try {
    const res = await fetch('/api/customers/profile', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || 'Failed to fetch profile details.');
    }

    const customer = data.data;

    // Fill form elements
    document.getElementById('profile-name').value = customer.name;
    document.getElementById('profile-email').value = customer.email;
    document.getElementById('profile-phone').value = customer.phone;
    document.getElementById('profile-gender').value = customer.gender || 'male';
    document.getElementById('profile-address').value = customer.address || '';

  } catch (error) {
    showProfileAlert(error.message, 'danger');
  }
}

// Handle Update Profile Form Submit
async function handleUpdateProfile(event) {
  event.preventDefault();

  const token = localStorage.getItem('barber_token');
  if (!token) return;

  const name = document.getElementById('profile-name').value;
  const phone = document.getElementById('profile-phone').value;
  const gender = document.getElementById('profile-gender').value;
  const address = document.getElementById('profile-address').value;

  showProfileAlert('Saving profile changes...', 'info');

  try {
    const res = await fetch('/api/customers/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ name, phone, gender, address })
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || 'Failed to update profile.');
    }

    // Update user details in localStorage
    localStorage.setItem('barber_user', JSON.stringify(data.data));

    showProfileAlert('Profile updated successfully!', 'success');

  } catch (error) {
    showProfileAlert(error.message, 'danger');
  }
}

// Handle Change Password Form Submit
async function handleChangePassword(event) {
  event.preventDefault();

  const token = localStorage.getItem('barber_token');
  if (!token) return;

  const currentPassword = document.getElementById('current-password').value;
  const newPassword = document.getElementById('new-password').value;
  const confirmPassword = document.getElementById('confirm-password').value;

  if (newPassword !== confirmPassword) {
    showProfileAlert('New passwords do not match!', 'danger');
    return;
  }

  showProfileAlert('Updating password...', 'info');

  try {
    const res = await fetch('/api/customers/profile/password', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ currentPassword, newPassword })
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || 'Failed to update password.');
    }

    // Reset password fields
    document.getElementById('current-password').value = '';
    document.getElementById('new-password').value = '';
    document.getElementById('confirm-password').value = '';

    showProfileAlert('Password updated successfully!', 'success');

  } catch (error) {
    showProfileAlert(error.message, 'danger');
  }
}

// Initialize profile page fetch
document.addEventListener('DOMContentLoaded', fetchProfile);
