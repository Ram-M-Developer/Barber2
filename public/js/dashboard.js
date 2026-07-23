/**
 * BarberEase – Customer Dashboard client logic
 */

let services = [];
let chairs = [];
let activeSession = null;
let selectedChair = null;
let reservationTimer = null;
let reservationSeconds = 300; // 5 minutes

// Socket.IO Init
let socket = null;

function showToast(message, type = 'danger') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast align-items-center text-white bg-${type} border-0 show`;
  toast.setAttribute('role', 'alert');
  toast.setAttribute('aria-live', 'assertive');
  toast.setAttribute('aria-atomic', 'true');

  toast.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">
        <i class="fa-solid fa-circle-info me-2"></i> ${message}
      </div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
    </div>
  `;

  container.appendChild(toast);
  setTimeout(() => {
    toast.remove();
  }, 4000);
}

// Fetch general services
async function fetchServices() {
  try {
    const res = await fetch('/api/services');
    const data = await res.json();
    if (res.ok) {
      services = data.data;
      populateServiceDropdowns();
    }
  } catch (error) {
    console.error('Error fetching services:', error);
  }
}

// Populate service options in forms
function populateServiceDropdowns() {
  const bookingSelect = document.getElementById('booking-service');
  const queueSelect = document.getElementById('queue-service');

  const optionsHTML = services.map(s => `
    <option value="${s.id}" data-price="${s.price}" data-duration="${s.duration_minutes}">
      ${s.name} ($${parseFloat(s.price).toFixed(2)})
    </option>
  `).join('');

  if (bookingSelect) {
    bookingSelect.innerHTML = optionsHTML;
    calculateBookingSummary();
  }
  if (queueSelect) {
    queueSelect.innerHTML = optionsHTML;
  }
}

// Fetch all chairs and draw the grid
async function fetchChairs() {
  try {
    const res = await fetch('/api/chairs');
    const data = await res.json();
    if (res.ok) {
      chairs = data.data;
      renderChairsGrid();
      updateStats();
    }
  } catch (error) {
    console.error('Error fetching chairs:', error);
  }
}

// Update stats header counters
function updateStats() {
  let available = 0;
  let reserved = 0;
  let occupied = 0;

  chairs.forEach(c => {
    if (c.status === 'available') available++;
    else if (c.status === 'reserved') reserved++;
    else if (c.status === 'occupied') occupied++;
  });

  document.getElementById('chairs-available-count').textContent = available;
  document.getElementById('chairs-reserved-count').textContent = reserved;
  document.getElementById('chairs-occupied-count').textContent = occupied;

  // If no available chairs, show queue helper alert
  const queuePanel = document.getElementById('queue-alert-panel');
  if (queuePanel) {
    queuePanel.style.display = available === 0 ? 'block' : 'none';
  }
}

// Render Chair Map
function renderChairsGrid() {
  const grid = document.getElementById('live-chair-grid');
  if (!grid) return;

  grid.innerHTML = chairs.map(c => {
    let statusClass = 'chair-available';
    let icon = 'fa-couch';
    
    if (c.status === 'reserved') {
      statusClass = 'chair-reserved';
    } else if (c.status === 'occupied') {
      statusClass = 'chair-occupied';
      icon = 'fa-user-tie';
    } else if (c.status === 'maintenance') {
      statusClass = 'chair-maintenance';
      icon = 'fa-screwdriver-wrench';
    }

    const clickAttr = c.status === 'available' ? `onclick="selectChairToBook(${c.id}, ${c.chair_number})"` : '';

    return `
      <div class="chair-card ${statusClass}" ${clickAttr} title="${c.name || 'Chair ' + c.chair_number} (${c.status})">
        <i class="fa-solid ${icon}"></i>
        <div>Chair ${c.chair_number}</div>
      </div>
    `;
  }).join('');
}

// Fetch current logged in customer's token & sessions
async function fetchUserSession() {
  const token = localStorage.getItem('barber_token');
  if (!token) return;

  fetchWalletBalance();

  try {
    // 1. Check direct appointments first
    const apptsRes = await fetch('/api/appointments/my', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const apptsData = await apptsRes.json();

    let activeAppt = null;
    if (apptsRes.ok && apptsData.data) {
      // Find today's uncompleted/active appointments
      const todayStr = new Date().toISOString().split('T')[0];
      activeAppt = apptsData.data.find(a => 
        ['pending', 'confirmed', 'in_progress'].includes(a.status) && a.appointment_date === todayStr
      );
    }

    if (activeAppt) {
      activeSession = { type: 'appointment', data: activeAppt };
      renderSessionPanel();
      return;
    }

    // 2. Check Queue if no appointment
    const queueRes = await fetch('/api/queue/my-status', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const queueData = await queueRes.json();

    if (queueRes.ok && queueData.data) {
      activeSession = { type: 'queue', data: queueData.data };
      renderSessionPanel();
      return;
    }

    // No active session
    activeSession = null;
    renderSessionPanel();

  } catch (error) {
    console.error('Error fetching user session:', error);
  }
}

// Render User's Active token / position details on the Right Panel
function renderSessionPanel() {
  const panel = document.getElementById('session-panel');
  if (!panel) return;

  if (!activeSession) {
    panel.innerHTML = `
      <div class="py-5 text-muted">
        <i class="fa-regular fa-calendar-check display-3 text-secondary mb-3"></i>
        <p class="fw-bold">No Active Bookings</p>
        <p class="small text-white-50">Select an available chair (🟢) to book, or join the queue if fully booked.</p>
      </div>
    `;
    return;
  }

  if (activeSession.type === 'appointment') {
    const appt = activeSession.data;
    panel.innerHTML = `
      <div class="token-display py-4 shadow-sm mb-3">
        <span class="badge bg-danger mb-2">Reserved Chair Appointment</span>
        <div class="token-number">${appt.token_number}</div>
        <div class="token-label">Digital Token Code</div>
      </div>
      
      <div class="text-start p-3 bg-secondary bg-opacity-25 rounded mb-3 small">
        <div class="mb-1"><strong>Status:</strong> <span class="badge bg-success">${appt.status.toUpperCase()}</span></div>
        <div class="mb-1"><strong>Chair:</strong> Chair ${appt.chair_id || 'Assigned'}</div>
        <div class="mb-1"><strong>Service:</strong> ${appt.service?.name || 'Grooming service'}</div>
        <div class="mb-1"><strong>Date:</strong> ${appt.appointment_date}</div>
        <div><strong>Time Slot:</strong> ${appt.time_slot}</div>
      </div>

      <button class="btn btn-outline-danger w-100 fw-bold btn-sm" onclick="cancelActiveAppointment(${appt.id})">
        <i class="fa-solid fa-calendar-xmark me-2"></i>Cancel Appointment
      </button>
    `;
  } else if (activeSession.type === 'queue') {
    const q = activeSession.data;
    panel.innerHTML = `
      <div class="token-display py-4 shadow-sm mb-3">
        <span class="badge bg-warning text-dark mb-2">Digital Waiting Queue</span>
        <div class="token-number">${q.token_number}</div>
        <div class="token-label">Digital Queue Token</div>
      </div>

      <div class="row g-2 mb-3 text-center">
        <div class="col-6">
          <div class="p-2 bg-dark rounded border border-secondary">
            <div class="fw-bold text-danger fs-4">${q.position}</div>
            <small class="text-muted">Queue Position</small>
          </div>
        </div>
        <div class="col-6">
          <div class="p-2 bg-dark rounded border border-secondary">
            <div class="fw-bold text-warning fs-4">${q.estimated_wait_minutes}m</div>
            <small class="text-muted">Estimated Wait</small>
          </div>
        </div>
      </div>

      <div class="text-start p-3 bg-secondary bg-opacity-25 rounded mb-3 small">
        <div><strong>Status:</strong> <span class="badge bg-warning text-dark">${q.status.toUpperCase()}</span></div>
        <div><strong>Service:</strong> ${q.service?.name || 'Grooming service'}</div>
      </div>

      <button class="btn btn-outline-danger w-100 fw-bold btn-sm" onclick="cancelQueueEntry(${q.id})">
        <i class="fa-solid fa-circle-xmark me-2"></i>Leave Waiting Queue
      </button>
    `;
  }
}

// User selects a chair to book (triggers reservation)
async function selectChairToBook(chairId, chairNum) {
  const token = localStorage.getItem('barber_token');
  if (!token) return;

  try {
    const res = await fetch(`/api/chairs/${chairId}/reserve`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || 'Failed to hold chair reservation.');
    }

    selectedChair = data.data;

    // Show modal and start 5 minute countdown
    document.getElementById('booking-chair-id').value = selectedChair.id;
    document.getElementById('booking-chair-name').value = `Chair ${selectedChair.chair_number}`;
    
    // Set default date as today
    document.getElementById('booking-date').value = new Date().toISOString().split('T')[0];
    handleDateChange(); // Load time slots

    // Start timer
    startReservationTimer();

    const myModal = new bootstrap.Modal(document.getElementById('bookingModal'));
    myModal.show();

    // Listen to modal close to release chair if not submitted
    document.getElementById('bookingModal').addEventListener('hidden.bs.modal', releaseChairOnClose);

  } catch (error) {
    showToast(error.message, 'danger');
  }
}

// Release reserved chair if modal was closed without confirming
async function releaseChairOnClose() {
  clearInterval(reservationTimer);
  if (selectedChair) {
    const token = localStorage.getItem('barber_token');
    try {
      // Releasing chair sets status back to 'available'
      await fetch(`/api/chairs/${selectedChair.id}/release`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: 'available' })
      });
      selectedChair = null;
      fetchChairs();
    } catch (e) {
      console.error(e);
    }
  }
}

// Start timer function
function startReservationTimer() {
  clearInterval(reservationTimer);
  reservationSeconds = 300;
  
  const display = document.getElementById('timer-display');

  reservationTimer = setInterval(() => {
    const minutes = Math.floor(reservationSeconds / 60);
    let seconds = reservationSeconds % 60;
    seconds = seconds < 10 ? '0' + seconds : seconds;

    display.textContent = `${minutes}:${seconds}`;

    if (--reservationSeconds < 0) {
      clearInterval(reservationTimer);
      showToast('Chair reservation expired! Release to available pool.', 'warning');
      const modal = bootstrap.Modal.getInstance(document.getElementById('bookingModal'));
      if (modal) modal.hide();
    }
  }, 1000);
}

// Calculate duration & price live summary inside booking form
function calculateBookingSummary() {
  const select = document.getElementById('booking-service');
  const selectedOption = select.options[select.selectedIndex];
  if (!selectedOption) return;

  const duration = selectedOption.getAttribute('data-duration');
  const price = selectedOption.getAttribute('data-price');

  document.getElementById('summary-duration').textContent = `${duration} min`;
  document.getElementById('summary-price').textContent = `$${parseFloat(price).toFixed(2)}`;
}

// Load dynamic slots when date changes
async function handleDateChange() {
  const dateVal = document.getElementById('booking-date').value;
  const timeSelect = document.getElementById('booking-time');
  if (!dateVal) return;

  // Operating Hours dynamic generation
  const slots = getSlotsByDate(dateVal);
  timeSelect.innerHTML = slots.map(s => `<option value="${s}">${s}</option>`).join('');
}

function getSlotsByDate(dateStr) {
  const date = new Date(dateStr + 'T00:00:00');
  const day = date.getDay(); // 0=Sun, 6=Sat
  let start = 9, end = 20; // Default Weekday 9 AM - 8 PM

  if (day === 0) { // Sunday 10 AM - 6 PM
    start = 10; end = 18;
  } else if (day === 6) { // Saturday 8 AM - 9 PM
    start = 8; end = 21;
  }

  const list = [];
  for (let h = start; h < end; h++) {
    for (let m = 0; m < 60; m += 30) {
      const displayHour = h % 12 || 12;
      const period = h < 12 ? 'AM' : 'PM';
      const displayMin = String(m).padStart(2, '0');
      list.push(`${displayHour}:${displayMin} ${period}`);
    }
  }
  return list;
}

// Confirm booking submit
async function confirmBooking(event) {
  event.preventDefault();
  const token = localStorage.getItem('barber_token');
  if (!token || !selectedChair) return;

  const chairId = document.getElementById('booking-chair-id').value;
  const serviceId = document.getElementById('booking-service').value;
  const dateVal = document.getElementById('booking-date').value;
  const timeSlot = document.getElementById('booking-time').value;
  const paymentMethod = document.getElementById('payment-method').value;
  const paymentKey = document.getElementById('payment-key').value;

  // Validate Hardcoded Passkey for Gateway
  if (paymentKey !== 'pass123') {
    showToast('❌ Payment Rejected! Invalid transaction key. Enter "pass123" to authorize pay.', 'danger');
    return;
  }

  try {
    const res = await fetch('/api/appointments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        chair_id: chairId,
        service_id: serviceId,
        appointment_date: dateVal,
        time_slot: timeSlot,
        payment_method: paymentMethod,
        notes: `Paid via ${paymentMethod.toUpperCase()}`
      })
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || 'Failed to confirm appointment.');
    }

    showToast(`🎉 Booking Confirmed! $${parseFloat(data.data.service.price).toFixed(2)} has been paid from your wallet.`, 'success');

    // Clean timer listeners & close modal
    clearInterval(reservationTimer);
    selectedChair = null; // Clear so release listener doesn't trigger API

    const modal = bootstrap.Modal.getInstance(document.getElementById('bookingModal'));
    if (modal) modal.hide();

    // Refresh dashboard stats
    fetchChairs();
    fetchUserSession();

  } catch (error) {
    showToast(error.message, 'danger');
  }
}

// Open queue joining modal
function openQueueModal() {
  const myModal = new bootstrap.Modal(document.getElementById('queueModal'));
  myModal.show();
}

// Submit queue joining
async function confirmJoinQueue(event) {
  event.preventDefault();
  const token = localStorage.getItem('barber_token');
  if (!token) return;

  const serviceId = document.getElementById('queue-service').value;

  try {
    const res = await fetch('/api/queue/join', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ service_id: serviceId })
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || 'Failed to join queue.');
    }

    showToast('Joined Queue successfully!', 'success');
    
    const modal = bootstrap.Modal.getInstance(document.getElementById('queueModal'));
    if (modal) modal.hide();

    fetchChairs();
    fetchUserSession();

  } catch (error) {
    showToast(error.message, 'danger');
  }
}

// Cancel booking
async function cancelActiveAppointment(apptId) {
  if (!confirm('Are you sure you want to cancel this appointment? This will release your chair.')) return;
  const token = localStorage.getItem('barber_token');

  try {
    const res = await fetch(`/api/appointments/${apptId}/cancel`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (res.ok) {
      showToast('Appointment cancelled successfully.', 'success');
      fetchChairs();
      fetchUserSession();
    } else {
      const data = await res.json();
      throw new Error(data.message);
    }
  } catch (error) {
    showToast(error.message, 'danger');
  }
}

// Cancel queue
async function cancelQueueEntry(queueId) {
  if (!confirm('Are you sure you want to leave the waiting queue?')) return;
  const token = localStorage.getItem('barber_token');

  try {
    const res = await fetch(`/api/queue/${queueId}/cancel`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (res.ok) {
      showToast('Successfully left the waiting queue.', 'success');
      fetchChairs();
      fetchUserSession();
    } else {
      const data = await res.json();
      throw new Error(data.message);
    }
  } catch (error) {
    showToast(error.message, 'danger');
  }
}

// Socket listener configuration (Phase 6 Real-time updates)
function setupSockets() {
  try {
    socket = io();

    socket.on('connect', () => {
      console.log('Socket.IO connected to server.');
      socket.emit('join-room', 'customer');
    });

    // Real-time broadcasts triggers
    socket.on('chair-update', () => {
      console.log('🔄 Sockets: Chair update event received. Re-fetching...');
      fetchChairs();
    });

    socket.on('queue-update', () => {
      console.log('🔄 Sockets: Queue update event received. Re-fetching...');
      fetchChairs();
      fetchUserSession();
    });

    socket.on('appointment-update', () => {
      console.log('🔄 Sockets: Appointment event received. Re-fetching...');
      fetchChairs();
      fetchUserSession();
    });

  } catch (err) {
    console.warn('Socket.IO init failed, falling back to 5-sec AJAX polling.', err);
    startAjaxPolling();
  }
}

// AJAX Polling fallback (5 seconds)
function startAjaxPolling() {
  setInterval(() => {
    console.log('Polling AJAX data fallback...');
    fetchChairs();
    fetchUserSession();
  }, 5000);
}

// Initialize Page Data
document.addEventListener('DOMContentLoaded', () => {
  const user = JSON.parse(localStorage.getItem('barber_user'));
  if (user) {
    document.getElementById('cust-welcome-name').textContent = user.name;
  }

  fetchServices();
  fetchChairs();
  fetchUserSession();
  setupSockets();
});

// Fetch wallet balance
async function fetchWalletBalance() {
  const token = localStorage.getItem('barber_token');
  if (!token) return;

  try {
    const res = await fetch('/api/customers/profile', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (res.ok) {
      document.getElementById('customer-wallet-balance').textContent = parseFloat(data.data.wallet_balance).toFixed(2);
    }
  } catch (err) {
    console.error('Error fetching wallet balance:', err);
  }
}

// Open Top Up Modal
function openTopUpModal() {
  document.getElementById('topup-amount').value = '20';
  const modal = new bootstrap.Modal(document.getElementById('topupModal'));
  modal.show();
}

// Confirm Top Up
async function confirmTopUp(event) {
  event.preventDefault();
  const token = localStorage.getItem('barber_token');
  if (!token) return;

  const amount = document.getElementById('topup-amount').value;

  try {
    const res = await fetch('/api/customers/profile/wallet', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ amount })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to top up wallet.');

    showToast(data.message, 'success');
    
    const modal = bootstrap.Modal.getInstance(document.getElementById('topupModal'));
    if (modal) modal.hide();

    fetchWalletBalance();

  } catch (err) {
    showToast(err.message, 'danger');
  }
}
