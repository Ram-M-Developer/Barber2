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

let activeQueue = [];

// Fetch all chairs and waiting queue, then render 2 main service stations
async function fetchChairs() {
  try {
    const token = localStorage.getItem('barber_token');
    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

    const [chairsRes, queueRes] = await Promise.all([
      fetch('/api/chairs'),
      fetch('/api/queue', { headers }).catch(() => ({ ok: false }))
    ]);

    const chairsData = await chairsRes.json();
    if (chairsRes.ok && chairsData.data) {
      // Filter strictly to the 2 main service chairs (Chairs 1 & 2)
      chairs = chairsData.data
        .filter(c => c.is_active !== false)
        .slice(0, 2);
    }

    if (queueRes.ok) {
      const queueData = await queueRes.json();
      activeQueue = queueData.data || [];
    }

    renderChairsGrid();
    updateStats();
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

  const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  setEl('chairs-available-count', available);
  setEl('chairs-reserved-count', reserved);
  setEl('chairs-occupied-count', occupied);

  // If no available chairs, show queue helper alert
  const queuePanel = document.getElementById('queue-alert-panel');
  if (queuePanel) {
    queuePanel.style.display = available === 0 ? 'block' : 'none';
  }
}

// Render 2 Main Service Stations (no per-chair waiting seats — queue is global token-based)
function renderChairsGrid() {
  const grid = document.getElementById('live-chair-grid');
  if (!grid) return;

  // Ensure exactly 2 main service chairs
  let mainChairs = chairs.slice(0, 2);
  if (mainChairs.length === 0) {
    grid.innerHTML = '<div class="text-center text-muted small py-4 w-100">Loading service stations…</div>';
    return;
  }

  // Global waiting queue count (not per-chair)
  const globalWaiting = activeQueue.filter(q => q.status === 'waiting' || q.status === 'called').length;

  grid.innerHTML = mainChairs.map((c, idx) => {
    const chairNum = c.chair_number || (idx + 1);
    let statusClass = 'chair-available';
    let statusLabel = 'Available';
    let statusBadgeStyle = 'background:rgba(5,150,105,0.12);color:#059669;border:1px solid rgba(5,150,105,0.3);font-weight:700;';

    if (c.status === 'reserved') {
      statusClass = 'chair-reserved';
      statusLabel = 'On Hold';
      statusBadgeStyle = 'background:rgba(217,119,6,0.12);color:#d97706;border:1px solid rgba(217,119,6,0.3);font-weight:700;';
    } else if (c.status === 'occupied') {
      statusClass = 'chair-occupied';
      statusLabel = 'In Service';
      statusBadgeStyle = 'background:#f1f5f9;color:#64748b;border:1px solid #e2e8f0;font-weight:700;';
    }

    const mainBtn = `
      <div class="d-flex gap-2 w-100 mt-2">
        <button type="button" class="btn btn-primary btn-sm flex-fill main-chair-action-btn" onclick="event.stopPropagation(); selectChairToBook(${c.id}, ${chairNum})">
          <i class="fa-solid fa-calendar-check me-1"></i>Select &amp; Book Station ${chairNum}
        </button>
      </div>
    `;

    const statusText = c.status === 'available' ? 'Available for Booking' : (c.status === 'reserved' ? 'Reservation Hold Active' : 'Station In Service');
    const statusColor = c.status === 'available' ? '#059669' : (c.status === 'reserved' ? '#d97706' : '#64748b');

    return `
      <div class="service-station-card">
        <div class="station-header">
          <div class="station-title">
            <i class="fa-solid fa-scissors" style="color:var(--be-primary)"></i>
            Main Service Station ${chairNum}
          </div>
          <span class="badge station-badge" style="${statusBadgeStyle}">${statusLabel}</span>
        </div>

        <!-- Main Service Chair -->
        <div class="main-chair-hero ${statusClass}" onclick="selectChairToBook(${c.id}, ${chairNum})">
          <div class="main-chair-icon">
            <i class="fa-solid fa-chair"></i>
          </div>
          <div class="main-chair-name">Main Service Chair ${chairNum}</div>
          <div class="main-chair-status-text" style="color: ${statusColor}">
            ${statusText}
          </div>
          ${mainBtn}
        </div>
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
      const q = queueData.data;
      const st = (q.status || '').toLowerCase();
      // Only active queue entries belong in an active session
      if (['waiting', 'called', 'serving', 'seated'].includes(st)) {
        activeSession = { type: 'queue', data: q };
      } else {
        activeSession = null;
      }
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

function dismissSessionAndGetNext(id) {
  if (id) sessionStorage.setItem('dismissed_queue_' + id, 'true');
  if (window._mySessionDismissTimer) {
    clearTimeout(window._mySessionDismissTimer);
    window._mySessionDismissTimer = null;
  }
  activeSession = null;
  renderSessionPanel();
  if (typeof openQueueModal === 'function') openQueueModal();
}
window.dismissSessionAndGetNext = dismissSessionAndGetNext;

// Render User's Active token / position details on the Right Panel
function renderSessionPanel() {
  const panel = document.getElementById('session-panel');
  if (!panel) return;

  if (!activeSession) {
    panel.innerHTML = `
      <div class="py-5 text-muted">
        <i class="fa-regular fa-calendar-check display-3 text-secondary mb-3"></i>
        <p class="fw-bold text-dark">No Active Bookings</p>
        <p class="small text-muted">Select an available station chair to book your slot, or join a waiting lounge.</p>
      </div>
    `;
    return;
  }

  if (activeSession.type === 'appointment') {
    const appt = activeSession.data;
    panel.innerHTML = `
      <div class="token-display py-4 shadow-sm mb-3">
        <span class="badge mb-2" style="background:rgba(37,99,235,0.12);color:#2563eb;border:1px solid rgba(37,99,235,0.3)">Station Appointment</span>
        <div class="token-number" style="color:var(--be-primary)">${appt.token_number}</div>
        <div class="token-label">Confirmed Token Code</div>
      </div>
      
      <div class="text-start p-3 rounded mb-3 small" style="background:#f8fafc;border:1px solid var(--be-border)">
        <div class="mb-1"><strong>Status:</strong> <span class="badge" style="background:rgba(5,150,105,0.12);color:#059669;border:1px solid rgba(5,150,105,0.3)">${appt.status.toUpperCase()}</span></div>
        <div class="mb-1"><strong>Chair:</strong> Main Service Chair ${appt.chair_id || '1'}</div>
        <div class="mb-1"><strong>Service:</strong> ${appt.service?.name || 'Grooming service'}</div>
        <div class="mb-1"><strong>Date:</strong> ${appt.appointment_date}</div>
        <div><strong>Time Slot:</strong> ${appt.time_slot}</div>
      </div>

      <button class="btn btn-outline-secondary w-100 fw-bold btn-sm" onclick="cancelActiveAppointment(${appt.id})">
        <i class="fa-solid fa-calendar-xmark me-2"></i>Cancel Appointment
      </button>
    `;
  } else if (activeSession.type === 'queue') {
    const q = activeSession.data;
    const st = (q.status || '').toLowerCase();

    // If completed / served, show completed card with "Get Next Token" button and auto-clear timer
    if (st === 'completed' || st === 'served') {
      panel.innerHTML = `
        <div class="token-display py-4 shadow-sm mb-3">
          <span class="badge mb-2" style="background:rgba(5,150,105,0.12);color:#059669;border:1px solid rgba(5,150,105,0.3)">Service Completed</span>
          <div class="token-number" style="color:#059669">${q.token_number}</div>
          <div class="token-label text-success fw-bold">✓ Successfully Served</div>
        </div>

        <div class="text-start p-3 rounded mb-3 small" style="background:#f8fafc;border:1px solid var(--be-border)">
          <div><strong>Status:</strong> <span class="badge bg-success text-white">SERVED</span></div>
          <div class="mt-1"><strong>Service:</strong> ${q.service?.name || 'Grooming service'}</div>
        </div>

        <button class="btn btn-primary w-100 fw-bold btn-sm shadow-sm" onclick="dismissSessionAndGetNext(${q.id})">
          <i class="fa-solid fa-ticket me-2"></i>Get Next Token
        </button>
      `;

      if (!window._mySessionDismissTimer) {
        window._mySessionDismissTimer = setTimeout(() => {
          window._mySessionDismissTimer = null;
          dismissSessionAndGetNext(q.id);
        }, 4000);
      }
      return;
    }

    panel.innerHTML = `
      <div class="token-display py-4 shadow-sm mb-3">
        <span class="badge mb-2" style="background:rgba(37,99,235,0.12);color:#2563eb;border:1px solid rgba(37,99,235,0.3)">Waiting Lounge Token</span>
        <div class="token-number" style="color:var(--be-primary)">${q.token_number}</div>
        <div class="token-label">Digital Queue Token</div>
      </div>

      <div class="row g-2 mb-3 text-center">
        <div class="col-6">
          <div class="p-2 rounded" style="background:#f8fafc;border:1px solid var(--be-border)">
            <div class="fw-bold text-dark fs-4">${q.position}</div>
            <small class="text-muted">Queue Position</small>
          </div>
        </div>
        <div class="col-6">
          <div class="p-2 rounded" style="background:#f8fafc;border:1px solid var(--be-border)">
            <div class="fw-bold text-primary fs-4">${q.estimated_wait_minutes}m</div>
            <small class="text-muted">Estimated Wait</small>
          </div>
        </div>
      </div>

      <div class="text-start p-3 rounded mb-3 small" style="background:#f8fafc;border:1px solid var(--be-border)">
        <div><strong>Status:</strong> <span class="badge" style="background:rgba(37,99,235,0.12);color:#2563eb;border:1px solid rgba(37,99,235,0.3)">${q.status.toUpperCase()}</span></div>
        <div class="mt-1"><strong>Service:</strong> ${q.service?.name || 'Grooming service'}</div>
      </div>

      <button class="btn btn-outline-secondary w-100 fw-bold btn-sm" onclick="cancelQueueEntry(${q.id})">
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
    document.getElementById('booking-chair-name').value = `Main Service Chair ${selectedChair.chair_number || chairNum}`;
    const titleEl = document.getElementById('booking-chair-name-title');
    if (titleEl) titleEl.textContent = `Main Service Chair ${selectedChair.chair_number || chairNum}`;
    
    // Set default date as today
    document.getElementById('booking-date').value = new Date().toISOString().split('T')[0];
    handleDateChange(); // Load time slots specifically for this selected chair

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

// Start timer function (with SVG countdown ring)
function startReservationTimer() {
  clearInterval(reservationTimer);
  reservationSeconds = 300;
  const TOTAL = 300;
  const CIRCUMFERENCE = 213.6; // 2π × 34

  const display = document.getElementById('timer-display');
  const circle = document.getElementById('countdown-circle');

  reservationTimer = setInterval(() => {
    const minutes = Math.floor(reservationSeconds / 60);
    let seconds = reservationSeconds % 60;
    seconds = seconds < 10 ? '0' + seconds : seconds;

    if (display) display.textContent = `${minutes}:${seconds}`;

    // Update SVG ring
    if (circle) {
      const progress = reservationSeconds / TOTAL;
      const offset = CIRCUMFERENCE * (1 - progress);
      circle.style.strokeDashoffset = offset;
      // Color shifts smoothly in sapphire/electric blue palette
      if (progress > 0.5) circle.style.stroke = '#38bdf8';
      else if (progress > 0.2) circle.style.stroke = '#3b82f6';
      else circle.style.stroke = '#1d4ed8';
    }

    if (--reservationSeconds < 0) {
      clearInterval(reservationTimer);
      showToast('⏰ Chair hold expired! The seat has been released.', 'warning');
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
  const name = selectedOption.textContent.split('(')[0].trim();

  const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  setEl('summary-duration', `${duration} min`);
  setEl('summary-price', `$${parseFloat(price).toFixed(2)}`);
  setEl('summary-service-name', name);

  // Update datetime summary
  const dateVal = document.getElementById('booking-date')?.value;
  const timeVal = document.getElementById('booking-time')?.value;
  if (dateVal && timeVal) setEl('summary-datetime', `${dateVal} ${timeVal}`);

  // Reload slots based on service duration
  handleDateChange();
}

// Load dynamic time-slot chips when date changes (strictly for selected chair)
async function handleDateChange() {
  const dateEl = document.getElementById('booking-date');
  const slotsGrid = document.getElementById('time-slots-grid');
  const hiddenInput = document.getElementById('booking-time');
  const dayLabel = document.getElementById('slot-day-label');
  const chairId = document.getElementById('booking-chair-id')?.value;

  if (!slotsGrid) return;

  // User requirement: time slots are strictly chair-driven!
  if (!chairId) {
    slotsGrid.innerHTML = '<span class="text-warning small"><i class="fa-solid fa-hand me-1"></i>Please select Main Service Chair 1 or Chair 2 first to view available time slots.</span>';
    return;
  }

  if (!dateEl || !dateEl.value) {
    slotsGrid.innerHTML = '<span class="text-muted small">Select a date to view available time slots for this chair…</span>';
    return;
  }
  const dateVal = dateEl.value;
  const slots = getSlotsByDate(dateVal);

  // Mark peak hours (11am-2pm)
  const PEAK_START = 11, PEAK_END = 14;

  // Fetch booked slots strictly for this selected chair and date
  let bookedSlots = [];
  try {
    const token = localStorage.getItem('barber_token');
    const res = await fetch(`/api/appointments/slots?chairId=${chairId}&date=${dateVal}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) {
      const d = await res.json();
      bookedSlots = d.data?.bookedSlots || [];
    }
  } catch (e) {
    console.warn('Could not fetch booked slots:', e);
  }

  // Day label
  const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const d = new Date(dateVal + 'T00:00:00');
  if (dayLabel) dayLabel.textContent = dayNames[d.getDay()];

  // Get selected service duration to verify that consecutive slots are available
  const serviceSelect = document.getElementById('booking-service');
  const selectedOpt = serviceSelect?.options[serviceSelect.selectedIndex];
  const reqDuration = parseInt(selectedOpt?.getAttribute('data-duration') || '30', 10);

  function timeStrToMin(timeStr) {
    if (!timeStr) return -1;
    const isPM = /PM/i.test(timeStr);
    const clean = timeStr.replace(/AM|PM/i, '').trim();
    const parts = clean.split(':');
    let h = parseInt(parts[0], 10);
    const m = parts.length > 1 ? parseInt(parts[1], 10) : 0;
    if (isPM && h !== 12) h += 12;
    else if (!isPM && h === 12) h = 0;
    return h * 60 + m;
  }

  const bookedMinList = bookedSlots.map(timeStrToMin).filter(m => m >= 0);

  // Build chip HTML
  slotsGrid.innerHTML = slots.map(s => {
    const slotMin = timeStrToMin(s);
    let isBooked = bookedSlots.includes(s);
    let reason = "Already booked on this chair";

    // If slot itself isn't booked, check if booking this service [slotMin, slotMin + reqDuration) overlaps with any booked 30-min slot [b, b + 30)
    if (!isBooked && reqDuration > 30) {
      const slotEndMin = slotMin + reqDuration;
      for (const b of bookedMinList) {
        if (Math.max(slotMin, b) < Math.min(slotEndMin, b + 30)) {
          isBooked = true;
          reason = `Conflicts with existing booking (needs ${reqDuration} min)`;
          break;
        }
      }
    }

    const hMatch = s.match(/^(\d+)/);
    const displayH = hMatch ? parseInt(hMatch[1]) : 0;
    const isPM = s.includes('PM');
    const hour24 = isPM && displayH !== 12 ? displayH + 12 : (!isPM && displayH === 12 ? 0 : displayH);
    const isPeak = hour24 >= PEAK_START && hour24 < PEAK_END;
    const cls = ['time-slot-chip', isBooked ? 'disabled' : '', isPeak && !isBooked ? 'peak' : ''].filter(Boolean).join(' ');
    return `<div class="${cls}" data-val="${s}"
      ${isBooked ? `title="${reason}"` : `onclick="selectTimeSlot(this, '${s}')"`}>${s}</div>`;
  }).join('');

  // Auto-select first available
  const firstAvail = slotsGrid.querySelector('.time-slot-chip:not(.disabled)');
  if (firstAvail) {
    selectTimeSlot(firstAvail, firstAvail.dataset.val);
  } else {
    if (hiddenInput) hiddenInput.value = '';
    const setEl = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
    setEl('summary-datetime', `${dateVal} · No free slots on this chair`);
  }
}

function selectTimeSlot(el, val) {
  document.querySelectorAll('.time-slot-chip').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
  const hiddenInput = document.getElementById('booking-time');
  if (hiddenInput) hiddenInput.value = val;

  // Update summary datetime
  const dateVal = document.getElementById('booking-date')?.value;
  const setEl = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
  if (dateVal) setEl('summary-datetime', `${dateVal} · ${val}`);
}

function getSlotsByDate(dateStr) {
  const date = new Date(dateStr + 'T00:00:00');
  const day = date.getDay();
  let start = 9, end = 20;
  if (day === 0) { start = 10; end = 18; }
  else if (day === 6) { start = 8; end = 21; }

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

// openQueueModalForChair kept for backward compat — now just opens the global modal
function openQueueModalForChair(chairId, chairNum) {
  openQueueModal();
}
window.openQueueModalForChair = openQueueModalForChair;
window.openQueueModal = openQueueModal;

// Submit queue joining (token-based, no chair preference)
async function confirmJoinQueue(event) {
  event.preventDefault();
  const token = localStorage.getItem('barber_token');
  if (!token) return;

  const serviceId = document.getElementById('queue-service').value;
  if (!serviceId) { showToast('Please select a service.', 'warning'); return; }

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

    showToast(`🎟️ Joined Queue! Your token is ${data.data?.token_number || ''}`, 'success');
    
    const modal = bootstrap.Modal.getInstance(document.getElementById('queueModal'));
    if (modal) modal.hide();

    fetchChairs();
    fetchUserSession();
    if (typeof window.fetchWaitingList === 'function') window.fetchWaitingList();

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
      if (typeof window.fetchWaitingList === 'function') window.fetchWaitingList();
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
  if (activeSession && activeSession.type === 'queue') {
    const st = (activeSession.data?.status || '').toLowerCase();
    if (st === 'completed' || st === 'served' || st === 'cancelled') {
      sessionStorage.setItem('dismissed_queue_' + queueId, 'true');
      activeSession = null;
      renderSessionPanel();
      if (typeof window.fetchWaitingList === 'function') window.fetchWaitingList();
      return;
    }
  }

  if (!confirm('Are you sure you want to leave the waiting queue?')) return;
  const token = localStorage.getItem('barber_token');

  try {
    const res = await fetch(`/api/queue/${queueId}/cancel`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (res.ok) {
      sessionStorage.setItem('dismissed_queue_' + queueId, 'true');
      showToast('Successfully left the waiting queue.', 'success');
      activeSession = null;
      fetchChairs();
      fetchUserSession();
      if (typeof window.fetchWaitingList === 'function') window.fetchWaitingList();
    } else {
      const data = await res.json();
      throw new Error(data.message);
    }
  } catch (error) {
    // If backend reports it is already completed, dismiss it gracefully
    if (error.message && (error.message.includes('completed') || error.message.includes('cancelled'))) {
      sessionStorage.setItem('dismissed_queue_' + queueId, 'true');
      activeSession = null;
      renderSessionPanel();
      if (typeof window.fetchWaitingList === 'function') window.fetchWaitingList();
    } else {
      showToast(error.message, 'danger');
    }
  }
}

// WebSocket indicator helpers
function setWsConnected(connected) {
  const indicators = [
    { dot: 'ws-dot', label: 'ws-label' },
    { dot: 'chair-ws-dot', label: 'chair-ws-label' }
  ];
  indicators.forEach(({ dot, label }) => {
    const dotEl = document.getElementById(dot);
    const lblEl = document.getElementById(label);
    if (dotEl) { dotEl.classList.toggle('connected', connected); dotEl.classList.toggle('disconnected', !connected); }
    if (lblEl) lblEl.textContent = connected ? 'Live' : 'Offline';
  });
}

// Socket listener configuration
function setupSockets() {
  try {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    socket = new WebSocket(`${protocol}//${window.location.host}/ws`);

    socket.onopen = () => {
      console.log('WebSocket connected.');
      setWsConnected(true);
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.event === 'chair-update') {
          fetchChairs();
          if (typeof window.fetchWaitingList === 'function') window.fetchWaitingList();
          showToast('🪑 Chair status updated!', 'info');
        } else if (data.event === 'queue-update') {
          fetchChairs();
          fetchUserSession();
          if (typeof window.fetchWaitingList === 'function') window.fetchWaitingList();
          showToast('🎟️ Queue updated — checking your position…', 'warning');
        } else if (data.event === 'appointment-update') {
          fetchChairs();
          fetchUserSession();
          if (typeof window.fetchWaitingList === 'function') window.fetchWaitingList();
        } else if (data.event === 'your-turn') {
          showToast('🎉 It\'s your turn! Please proceed to your assigned chair.', 'success');
          fetchChairs();
          fetchUserSession();
          if (typeof window.fetchWaitingList === 'function') window.fetchWaitingList();
        }
      } catch (e) {
        console.error('Socket parse error:', e);
      }
    };

    socket.onerror = () => setWsConnected(false);

    socket.onclose = () => {
      console.warn('WebSocket closed. Polling fallback active.');
      setWsConnected(false);
      startAjaxPolling();
    };

  } catch (err) {
    console.warn('WebSocket init failed, polling fallback.', err);
    setWsConnected(false);
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
