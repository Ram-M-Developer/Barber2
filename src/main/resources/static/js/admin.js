/**
 * BarberEase – Admin Dashboard client logic
 */

let activeTab = 'overview';
let adminSocket = null;

// Show Toast Alerts
function showAdminToast(message, type = 'danger') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast align-items-center text-white bg-${type} border-0 show`;
  toast.setAttribute('role', 'alert');

  toast.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">
        <i class="fa-solid fa-circle-info me-2"></i> ${message}
      </div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
    </div>
  `;

  container.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

// Section Tab Switcher
function switchTab(tabName) {
  activeTab = tabName;
  
  // Hide all sections
  document.querySelectorAll('.tab-section').forEach(s => s.classList.add('d-none'));
  
  // Show target section
  const target = document.getElementById(`sec-${tabName}`);
  if (target) target.classList.remove('d-none');

  // Active navigation link
  document.querySelectorAll('.admin-sidebar .nav-link').forEach(link => {
    link.classList.remove('active');
  });

  // Highlight active link
  event.currentTarget.classList.add('active');

  // Change Header Title
  const titleMap = {
    overview: 'Overview Dashboard',
    appointments: 'Active Appointments',
    queue: 'Queue Control Center',
    chairs: 'Barber Chairs Stations',
    services: 'Grooming Services Catalog',
    customers: 'Customer Accounts Log',
    reports: 'Business Performance Reports'
  };
  document.getElementById('admin-section-title').textContent = titleMap[tabName] || 'Dashboard';

  // Load section specific data
  loadTabContent();
}

// Master loader for selected tab content
function loadTabContent() {
  switch (activeTab) {
    case 'overview':
      fetchDashboardStats();
      fetchOverviewChairs();
      fetchOverviewQueue();
      break;
    case 'appointments':
      fetchAppointmentsList();
      break;
    case 'queue':
      fetchQueueList();
      break;
    case 'chairs':
      fetchChairsList();
      break;
    case 'services':
      fetchServicesList();
      break;
    case 'customers':
      fetchCustomersList();
      break;
  }
}

// Fetch dashboard stats counters
async function fetchDashboardStats() {
  const token = localStorage.getItem('barber_token');
  try {
    const res = await fetch('/api/reports/dashboard-stats', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (res.ok) {
      document.getElementById('stat-today-bookings').textContent = data.data.todayAppointments;
      document.getElementById('stat-today-completed').textContent = data.data.todayCompleted;
      document.getElementById('stat-queue-waiting').textContent = data.data.queueWaiting;
      document.getElementById('stat-total-revenue').textContent = `$${parseFloat(data.data.totalRevenue).toFixed(2)}`;
    }
  } catch (err) {
    console.error(err);
  }
}

// Render chairs on Overview section
async function fetchOverviewChairs() {
  try {
    const res = await fetch('/api/chairs');
    const data = await res.json();
    if (res.ok) {
      const grid = document.getElementById('overview-chair-grid');
      if (grid) {
        grid.innerHTML = data.data.map(c => {
          let statusClass = 'chair-available';
          let icon = 'fa-couch';
          if (c.status === 'reserved') statusClass = 'chair-reserved';
          else if (c.status === 'occupied') {
            statusClass = 'chair-occupied';
            icon = 'fa-user-tie';
          } else if (c.status === 'maintenance') {
            statusClass = 'chair-maintenance';
            icon = 'fa-screwdriver-wrench';
          }
          return `
            <div class="chair-card ${statusClass}" title="${c.name} (${c.status})">
              <i class="fa-solid ${icon}"></i>
              <div>Chair ${c.chair_number}</div>
            </div>
          `;
        }).join('');
      }
    }
  } catch (err) {
    console.error(err);
  }
}

// Render small queue snapshot in overview
async function fetchOverviewQueue() {
  try {
    const res = await fetch('/api/queue');
    const data = await res.json();
    if (res.ok) {
      const container = document.getElementById('overview-queue-summary');
      if (!container) return;

      const waiting = data.data.filter(q => q.status === 'waiting');

      if (waiting.length === 0) {
        container.innerHTML = `<div class="text-center py-4 text-muted"><p>No customers currently waiting in the digital queue.</p></div>`;
        return;
      }

      container.innerHTML = `
        <ul class="list-group list-group-flush bg-transparent">
          ${waiting.slice(0, 5).map(w => `
            <li class="list-group-item bg-transparent text-white border-secondary d-flex justify-content-between align-items-center">
              <div>
                <strong>${w.token_number}</strong> — ${w.customer?.name}
                <div class="small text-white-50">${w.service?.name}</div>
              </div>
              <span class="badge bg-danger rounded-pill">Pos #${w.position}</span>
            </li>
          `).join('')}
        </ul>
      `;
    }
  } catch (err) {
    console.error(err);
  }
}

// Fetch Active Appointments List
async function fetchAppointmentsList() {
  const token = localStorage.getItem('barber_token');
  try {
    const res = await fetch('/api/appointments', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (res.ok) {
      const tbody = document.getElementById('tbl-appointments-body');
      if (!tbody) return;

      if (data.data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted">No appointments found for today.</td></tr>`;
        return;
      }

      tbody.innerHTML = data.data.map(a => {
        let statusBadge = `<span class="badge bg-secondary">${a.status.toUpperCase()}</span>`;
        if (a.status === 'confirmed') statusBadge = `<span class="badge bg-primary">CONFIRMED</span>`;
        else if (a.status === 'in_progress') statusBadge = `<span class="badge bg-warning text-dark">IN PROGRESS</span>`;
        else if (a.status === 'completed') statusBadge = `<span class="badge bg-success">COMPLETED</span>`;
        else if (a.status === 'cancelled') statusBadge = `<span class="badge bg-danger">CANCELLED</span>`;

        let actionBtns = '';
        if (a.status === 'confirmed') {
          actionBtns = `
            <button class="btn btn-warning btn-sm text-dark fw-bold me-1" onclick="startAppointment(${a.id})">Start</button>
            <button class="btn btn-outline-danger btn-sm" onclick="cancelAppointment(${a.id})">Cancel</button>
          `;
        } else if (a.status === 'in_progress') {
          actionBtns = `
            <button class="btn btn-success btn-sm fw-bold me-1" onclick="completeAppointment(${a.id})">Complete</button>
          `;
        }

        return `
          <tr>
            <td><strong>${a.token_number}</strong></td>
            <td>${a.customer?.name}</td>
            <td>${a.service?.name}</td>
            <td>${a.chair_id ? 'Chair ' + a.chair_id : 'Not Assigned'}</td>
            <td>${a.time_slot}</td>
            <td>${statusBadge}</td>
            <td>${actionBtns || '<span class="opacity-50 small">-</span>'}</td>
          </tr>
        `;
      }).join('');
    }
  } catch (err) {
    console.error(err);
  }
}

// Global queue state for filtering
let currentQueueFilter = 'all';
let allQueueEntries = [];

// Filter queue table
function filterQueueTable(filter) {
  currentQueueFilter = filter;
  document.querySelectorAll('.queue-filter-btn').forEach(btn => {
    if (btn.getAttribute('data-filter') === filter) {
      btn.classList.add('active', 'btn-light');
      btn.classList.remove('btn-outline-warning', 'btn-outline-info', 'btn-outline-primary', 'btn-outline-success');
    } else {
      btn.classList.remove('active', 'btn-light');
    }
  });
  renderQueueTableRows();
}
window.filterQueueTable = filterQueueTable;

// Fetch Full Queue List with all statuses
async function fetchQueueList() {
  const token = localStorage.getItem('barber_token');
  try {
    const res = await fetch('/api/queue?all=true', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (res.ok) {
      allQueueEntries = data.data || [];

      // Update KPI counters
      const waiting = allQueueEntries.filter(q => q.status === 'waiting');
      const called = allQueueEntries.filter(q => q.status === 'called');
      const serving = allQueueEntries.filter(q => q.status === 'serving');
      const completed = allQueueEntries.filter(q => q.status === 'completed');

      const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
      setEl('kpi-queue-waiting', waiting.length);
      setEl('kpi-queue-called', called.length);
      setEl('kpi-queue-seated', serving.length);
      setEl('kpi-queue-served', completed.length);

      setEl('q-cnt-all', allQueueEntries.length);
      setEl('q-cnt-waiting', waiting.length);
      setEl('q-cnt-called', called.length);
      setEl('q-cnt-serving', serving.length);
      setEl('q-cnt-completed', completed.length);

      renderQueueTableRows();
    }
  } catch (err) {
    console.error('Error fetching queue list:', err);
  }
}
window.fetchQueueList = fetchQueueList;

function renderQueueTableRows() {
  const tbody = document.getElementById('tbl-queue-body');
  if (!tbody) return;

  let filtered = allQueueEntries;
  if (currentQueueFilter !== 'all') {
    filtered = allQueueEntries.filter(q => q.status === currentQueueFilter);
  }

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted">
      <i class="fa-solid fa-inbox fa-2x d-block mb-2 text-secondary"></i>No tokens in "${currentQueueFilter}" status.
    </td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(q => {
    const st = (q.status || 'waiting').toLowerCase();

    // Status badge
    let statusBadge = '';
    if (st === 'waiting') {
      statusBadge = `<span class="badge bg-warning text-dark"><i class="fa-solid fa-clock me-1"></i>Waiting</span>`;
    } else if (st === 'called') {
      statusBadge = `<span class="badge bg-info text-dark"><i class="fa-solid fa-volume-high me-1"></i>Called</span>`;
    } else if (st === 'serving') {
      statusBadge = `<span class="badge bg-primary"><i class="fa-solid fa-scissors me-1"></i>Seated</span>`;
    } else if (st === 'completed') {
      statusBadge = `<span class="badge bg-success"><i class="fa-solid fa-check me-1"></i>Served</span>`;
    } else {
      statusBadge = `<span class="badge bg-secondary">${st.toUpperCase()}</span>`;
    }

    // Chair station display
    const chairDisplay = q.chair
      ? `<span class="badge bg-dark border border-primary text-info"><i class="fa-solid fa-chair me-1"></i>Station ${q.chair.chair_number}</span>`
      : `<span class="text-muted small">— Unassigned</span>`;

    // Wait / Time info
    let waitInfo = '';
    if (st === 'waiting') {
      waitInfo = q.estimated_wait_minutes > 0 ? `~${q.estimated_wait_minutes} min` : 'Next up';
    } else if (st === 'called') {
      waitInfo = '<span class="text-warning small fw-bold">Ready for chair</span>';
    } else if (st === 'serving') {
      waitInfo = '<span class="text-primary small fw-bold">In progress ✂️</span>';
    } else if (st === 'completed') {
      waitInfo = '<span class="text-success small fw-bold">Completed ✓</span>';
    }

    // Action buttons based on lifecycle state
    let actionButtons = '';
    if (st === 'waiting') {
      actionButtons = `
        <button class="btn btn-warning btn-sm fw-bold me-1" onclick="callQueueCustomer(${q.id})" title="Call to free station">
          <i class="fa-solid fa-volume-high me-1"></i>Call
        </button>
        <button class="btn btn-outline-danger btn-sm" onclick="cancelQueueEntry(${q.id})" title="Remove from queue">
          <i class="fa-solid fa-trash"></i>
        </button>`;
    } else if (st === 'called') {
      actionButtons = `
        <button class="btn btn-primary btn-sm fw-bold me-1" onclick="seatQueueCustomer(${q.id})" title="Seat customer at chair">
          <i class="fa-solid fa-chair me-1"></i>Seat
        </button>
        <button class="btn btn-outline-danger btn-sm" onclick="cancelQueueEntry(${q.id})" title="Cancel">
          <i class="fa-solid fa-xmark"></i>
        </button>`;
    } else if (st === 'serving') {
      actionButtons = `
        <button class="btn btn-success btn-sm fw-bold" onclick="completeQueueCustomer(${q.id})" title="Mark service finished and free chair">
          <i class="fa-solid fa-circle-check me-1"></i>Complete
        </button>`;
    } else if (st === 'completed') {
      actionButtons = `<span class="text-success small fw-bold"><i class="fa-solid fa-circle-check me-1"></i>Served</span>`;
    }

    return `
      <tr>
        <td>
          <div class="d-flex align-items-center gap-1">
            <span class="badge bg-secondary" style="font-size:0.7rem">#${q.position}</span>
            <strong class="text-white">${q.token_number}</strong>
          </div>
        </td>
        <td>
          <div class="fw-bold text-light">${q.customer?.name || 'Customer'}</div>
          <div class="text-muted small">${q.customer?.phone || ''}</div>
        </td>
        <td>
          <div class="text-light">${q.service?.name || 'Grooming'}</div>
          <div class="text-muted small">${q.service?.duration_minutes ? q.service.duration_minutes + ' min' : ''}</div>
        </td>
        <td>${chairDisplay}</td>
        <td>${waitInfo}</td>
        <td>${statusBadge}</td>
        <td>${actionButtons}</td>
      </tr>`;
  }).join('');
}

// ── Queue Lifecycle API Calls ──

// 1. Call next waiting customer (global)
async function callNextQueue() {
  const token = localStorage.getItem('barber_token');
  try {
    const res = await fetch('/api/queue/call-next', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (res.ok) {
      showAdminToast(`📢 Called ${data.data.queueEntry.token_number} to Chair ${data.data.chair.chair_number}!`, 'success');
      fetchQueueList();
    } else {
      throw new Error(data.message);
    }
  } catch (err) {
    showAdminToast(err.message, 'danger');
  }
}
window.callNextQueue = callNextQueue;

// 2. Call specific customer
async function callQueueCustomer(id) {
  const token = localStorage.getItem('barber_token');
  try {
    const res = await fetch(`/api/queue/${id}/call`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (res.ok) {
      showAdminToast(`📢 Called ${data.data.queueEntry.token_number} to Chair ${data.data.chair?.chair_number || '1'}!`, 'success');
      fetchQueueList();
    } else {
      throw new Error(data.message);
    }
  } catch (err) {
    showAdminToast(err.message, 'danger');
  }
}
window.callQueueCustomer = callQueueCustomer;

// 3. Seat customer & start service
async function seatQueueCustomer(id) {
  const token = localStorage.getItem('barber_token');
  try {
    const res = await fetch(`/api/queue/${id}/seat`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (res.ok) {
      showAdminToast(`✂️ Customer seated at Chair ${data.data.chair?.chair_number || '1'}. Service started!`, 'success');
      fetchQueueList();
    } else {
      throw new Error(data.message);
    }
  } catch (err) {
    showAdminToast(err.message, 'danger');
  }
}
window.seatQueueCustomer = seatQueueCustomer;

// 4. Complete customer service
async function completeQueueCustomer(id) {
  const token = localStorage.getItem('barber_token');
  try {
    const res = await fetch(`/api/queue/${id}/complete`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (res.ok) {
      showAdminToast('✅ Service completed! Chair freed.', 'success');
      fetchQueueList();
    } else {
      throw new Error(data.message);
    }
  } catch (err) {
    showAdminToast(err.message, 'danger');
  }
}
window.completeQueueCustomer = completeQueueCustomer;

// Start appointment
async function startAppointment(id) {
  const token = localStorage.getItem('barber_token');
  try {
    const res = await fetch(`/api/appointments/${id}/start`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      showAdminToast('Appointment started successfully.', 'success');
      loadTabContent();
    } else {
      showAdminToast(data.message || 'Failed to start appointment', 'danger');
    }
  } catch (err) {
    showAdminToast(err.message || 'Error starting appointment', 'danger');
    console.error(err);
  }
}

// Complete appointment
async function completeAppointment(id) {
  const token = localStorage.getItem('barber_token');
  try {
    const res = await fetch(`/api/appointments/${id}/complete`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      showAdminToast('Appointment completed. Chair is now available.', 'success');
      loadTabContent();
    } else {
      showAdminToast(data.message || 'Failed to complete appointment', 'danger');
    }
  } catch (err) {
    showAdminToast(err.message || 'Error completing appointment', 'danger');
    console.error(err);
  }
}

// Cancel appointment
async function cancelAppointment(id) {
  if (!confirm('Are you sure you want to cancel this appointment?')) return;
  const token = localStorage.getItem('barber_token');
  try {
    const res = await fetch(`/api/appointments/${id}/cancel`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      showAdminToast('Appointment cancelled.', 'warning');
      loadTabContent();
    } else {
      showAdminToast(data.message || 'Failed to cancel appointment', 'danger');
    }
  } catch (err) {
    showAdminToast(err.message || 'Error cancelling appointment', 'danger');
    console.error(err);
  }
}

// Cancel queue entry
async function cancelQueueEntry(id) {
  if (!confirm('Are you sure you want to remove this customer from queue?')) return;
  const token = localStorage.getItem('barber_token');
  try {
    const res = await fetch(`/api/queue/${id}/cancel`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) {
      showAdminToast('Queue entry removed.', 'warning');
      loadTabContent();
    }
  } catch (err) {
    console.error(err);
  }
}

// Fetch and draw Chair Management Table
async function fetchChairsList() {
  const token = localStorage.getItem('barber_token');
  try {
    const res = await fetch('/api/chairs', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (res.ok) {
      const tbody = document.getElementById('tbl-chairs-body');
      if (!tbody) return;

      tbody.innerHTML = data.data.map(c => {
        let statusBadge = `<span class="badge bg-success">AVAILABLE</span>`;
        if (c.status === 'reserved') statusBadge = `<span class="badge bg-warning text-dark">RESERVED</span>`;
        else if (c.status === 'occupied') statusBadge = `<span class="badge bg-secondary">OCCUPIED</span>`;
        else if (c.status === 'maintenance') statusBadge = `<span class="badge bg-danger">MAINTENANCE</span>`;

        let actionBtns = '';
        if (c.status === 'occupied' || (c.customer_name && c.customer_name !== '---')) {
          actionBtns = `
            <button class="btn btn-danger btn-sm px-2 fw-bold" onclick="completeSeatServiceAdmin(${c.id})">
              <i class="fa-solid fa-circle-check me-1"></i>Complete Service
            </button>
          `;
        } else if (c.status === 'available') {
          actionBtns = `<button class="btn btn-outline-danger btn-sm px-2" onclick="setChairStatus(${c.id}, 'maintenance')">Set Maintenance</button>`;
        } else if (c.status === 'maintenance') {
          actionBtns = `<button class="btn btn-outline-success btn-sm px-2" onclick="setChairStatus(${c.id}, 'available')">Make Available</button>`;
        } else {
          actionBtns = `<span class="text-muted small">Station active</span>`;
        }

        const custDisplay = c.customer_name && c.customer_name !== '---' 
          ? c.customer_name 
          : (c.reservedByCustomer?.name || '<span class="text-white-50">-</span>');

        return `
          <tr>
            <td><strong>#${c.chair_number}</strong></td>
            <td>${c.name}</td>
            <td>${statusBadge}</td>
            <td>${custDisplay}</td>
            <td>${actionBtns}</td>
          </tr>
        `;
      }).join('');
    }
  } catch (err) {
    console.error(err);
  }
}

// Complete seat service (Admin action) - frees seat & automatically seats top waiting customer
async function completeSeatServiceAdmin(chairId) {
  if (!confirm(`Complete service for Chair ${chairId}? This will free the chair and automatically seat the first waiting customer from the FIFO queue.`)) {
    return;
  }
  const token = localStorage.getItem('barber_admin_token') || localStorage.getItem('barber_token');
  try {
    const res = await fetch(`/api/chairs/${chairId}/complete-service`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (res.ok) {
      showAdminToast(data.message || 'Service completed and next customer seated!', 'success');
      loadTabContent();
    } else {
      showAdminToast(data.message || 'Failed to complete service', 'danger');
    }
  } catch (err) {
    showAdminToast(err.message, 'danger');
    console.error(err);
  }
}
window.completeSeatServiceAdmin = completeSeatServiceAdmin;

// Set chair status (available / maintenance)
async function setChairStatus(chairId, status) {
  const token = localStorage.getItem('barber_token');
  try {
    const res = await fetch(`/api/chairs/${chairId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ status })
    });
    if (res.ok) {
      showAdminToast('Chair status updated.', 'success');
      fetchChairsList();
    }
  } catch (err) {
    console.error(err);
  }
}

// Add New Chair Station Form Submission
async function handleCreateChair(event) {
  event.preventDefault();
  const token = localStorage.getItem('barber_token');
  const chair_number = document.getElementById('chair-number').value;
  const name = document.getElementById('chair-name').value;

  try {
    const res = await fetch('/api/chairs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ chair_number, name })
    });

    const data = await res.json();
    if (res.ok) {
      showAdminToast('Chair added successfully!', 'success');
      document.getElementById('chair-number').value = '';
      document.getElementById('chair-name').value = '';
      fetchChairsList();
    } else {
      throw new Error(data.message);
    }
  } catch (err) {
    showAdminToast(err.message, 'danger');
  }
}

// Fetch Services Management Tab
async function fetchServicesList() {
  const token = localStorage.getItem('barber_token');
  try {
    const res = await fetch('/api/services/admin/all', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (res.ok) {
      const tbody = document.getElementById('tbl-services-body');
      if (!tbody) return;

      tbody.innerHTML = data.data.map(s => {
        const activeBadge = s.is_active 
          ? `<span class="badge bg-success">ACTIVE</span>` 
          : `<span class="badge bg-secondary">DEACTIVATED</span>`;

        const deleteBtn = s.is_active
          ? `<button class="btn btn-outline-danger btn-sm px-2 me-1" onclick="deleteService(${s.id})">Deactivate</button>`
          : '';

        return `
          <tr>
            <td><strong>${s.name}</strong></td>
            <td>${s.category}</td>
            <td>${s.duration_minutes} min</td>
            <td>$${parseFloat(s.price).toFixed(2)}</td>
            <td>${activeBadge}</td>
            <td>
              <button class="btn btn-outline-light btn-sm px-2 me-1" onclick="openEditServiceModal(${JSON.stringify(s).replace(/"/g, '&quot;')})">Edit</button>
              ${deleteBtn}
            </td>
          </tr>
        `;
      }).join('');
    }
  } catch (err) {
    console.error(err);
  }
}

// Add Service modal launcher
function openAddServiceModal() {
  document.getElementById('service-form-id').value = '';
  document.getElementById('service-name').value = '';
  document.getElementById('service-duration').value = '30';
  document.getElementById('service-price').value = '25.00';
  document.getElementById('service-category').value = 'haircut';
  document.getElementById('service-desc').value = '';
  document.getElementById('serviceModalLabel').textContent = 'Add New Grooming Service';

  const modal = new bootstrap.Modal(document.getElementById('serviceModal'));
  modal.show();
}

// Edit Service modal launcher
function openEditServiceModal(serviceObj) {
  document.getElementById('service-form-id').value = serviceObj.id;
  document.getElementById('service-name').value = serviceObj.name;
  document.getElementById('service-duration').value = serviceObj.duration_minutes;
  document.getElementById('service-price').value = serviceObj.price;
  document.getElementById('service-category').value = serviceObj.category || 'haircut';
  document.getElementById('service-desc').value = serviceObj.description || '';
  document.getElementById('serviceModalLabel').textContent = 'Edit Grooming Service';

  const modal = new bootstrap.Modal(document.getElementById('serviceModal'));
  modal.show();
}

// Save Service Form submit (Create/Update)
async function handleSaveService(event) {
  event.preventDefault();
  const token = localStorage.getItem('barber_token');

  const id = document.getElementById('service-form-id').value;
  const name = document.getElementById('service-name').value;
  const duration_minutes = document.getElementById('service-duration').value;
  const price = document.getElementById('service-price').value;
  const category = document.getElementById('service-category').value;
  const description = document.getElementById('service-desc').value;

  const url = id ? `/api/services/${id}` : '/api/services';
  const method = id ? 'PUT' : 'POST';

  try {
    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ name, duration_minutes, price, category, description })
    });

    if (res.ok) {
      showAdminToast('Service saved successfully!', 'success');
      const modal = bootstrap.Modal.getInstance(document.getElementById('serviceModal'));
      if (modal) modal.hide();
      fetchServicesList();
    } else {
      const data = await res.json();
      throw new Error(data.message);
    }
  } catch (err) {
    showAdminToast(err.message, 'danger');
  }
}

// Deactivate service
async function deleteService(id) {
  if (!confirm('Are you sure you want to deactivate this service?')) return;
  const token = localStorage.getItem('barber_token');
  try {
    const res = await fetch(`/api/services/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) {
      showAdminToast('Service deactivated.', 'warning');
      fetchServicesList();
    }
  } catch (err) {
    console.error(err);
  }
}

// Fetch Customer Account logs
async function fetchCustomersList() {
  const token = localStorage.getItem('barber_token');
  try {
    const res = await fetch('/api/customers', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (res.ok) {
      const tbody = document.getElementById('tbl-customers-body');
      if (!tbody) return;

      tbody.innerHTML = data.data.map(c => {
        const statusBadge = c.is_active 
          ? `<span class="badge bg-success">ACTIVE</span>` 
          : `<span class="badge bg-danger">SUSPENDED</span>`;

        return `
          <tr>
            <td><strong>${c.name}</strong></td>
            <td>${c.email}</td>
            <td>${c.phone}</td>
            <td>${c.gender || 'N/A'}</td>
            <td>${statusBadge}</td>
            <td>
              <button class="btn btn-sm ${c.is_active ? 'btn-outline-danger' : 'btn-outline-success'}" onclick="toggleCustomer(${c.id})">
                ${c.is_active ? 'Suspend' : 'Activate'}
              </button>
            </td>
          </tr>
        `;
      }).join('');
    }
  } catch (err) {
    console.error(err);
  }
}

// Toggle customer status
async function toggleCustomer(id) {
  const token = localStorage.getItem('barber_token');
  try {
    const res = await fetch(`/api/customers/${id}/toggle`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) {
      showAdminToast('Customer account status updated.', 'success');
      fetchCustomersList();
    }
  } catch (err) {
    console.error(err);
  }
}

// ================= REPORT FETCHING FUNCTIONS =================

// Daily Report
async function fetchDailyReport() {
  const token = localStorage.getItem('barber_token');
  document.getElementById('report-window-title').textContent = 'Daily Sales & Appointments Report';
  
  // Set filter control
  const filterDiv = document.getElementById('report-filter-controls');
  const today = new Date().toISOString().split('T')[0];
  filterDiv.innerHTML = `
    <input type="date" class="form-control form-control-sm text-white bg-dark border-secondary" id="report-date-val" value="${today}" onchange="triggerDailyFetch()">
  `;

  triggerDailyFetch();
}

async function triggerDailyFetch() {
  const token = localStorage.getItem('barber_token');
  const dateVal = document.getElementById('report-date-val').value;
  const container = document.getElementById('report-window-body');

  try {
    const res = await fetch(`/api/reports/daily?date=${dateVal}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (res.ok) {
      const r = data.data;
      container.innerHTML = `
        <div class="row g-3 mb-4 text-center">
          <div class="col-md-3">
            <div class="p-2 bg-dark rounded border border-secondary">
              <div class="fs-4 fw-bold text-white">${r.total}</div>
              <small class="text-muted">Total Appointments</small>
            </div>
          </div>
          <div class="col-md-3">
            <div class="p-2 bg-dark rounded border border-secondary">
              <div class="fs-4 fw-bold text-success">${r.completed}</div>
              <small class="text-muted">Completed</small>
            </div>
          </div>
          <div class="col-md-3">
            <div class="p-2 bg-dark rounded border border-secondary">
              <div class="fs-4 fw-bold text-danger">${r.cancelled}</div>
              <small class="text-muted">Cancelled</small>
            </div>
          </div>
          <div class="col-md-3">
            <div class="p-2 bg-dark rounded border border-secondary">
              <div class="fs-4 fw-bold text-info">$${r.revenue.toFixed(2)}</div>
              <small class="text-muted">Estimated Revenue</small>
            </div>
          </div>
        </div>

        <h6 class="fw-bold mb-3">Appointments Ledger (${dateVal})</h6>
        <div class="table-responsive">
          <table class="table table-dark table-striped table-hover small">
            <thead>
              <tr>
                <th>Token</th>
                <th>Customer</th>
                <th>Service</th>
                <th>Time Slot</th>
                <th>Price</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${r.appointments.map(a => `
                <tr>
                  <td>${a.token_number}</td>
                  <td>${a.customer?.name}</td>
                  <td>${a.service?.name}</td>
                  <td>${a.time_slot}</td>
                  <td>$${parseFloat(a.service?.price || 0).toFixed(2)}</td>
                  <td><span class="badge ${a.status === 'completed' ? 'bg-success' : a.status === 'cancelled' ? 'bg-danger' : 'bg-primary'}">${a.status.toUpperCase()}</span></td>
                </tr>
              `).join('') || '<tr><td colspan="6" class="text-center py-3 text-muted">No appointments on this date.</td></tr>'}
            </tbody>
          </table>
        </div>
      `;
    }
  } catch (err) {
    console.error(err);
  }
}

// Monthly Report
async function fetchMonthlyReport() {
  const token = localStorage.getItem('barber_token');
  document.getElementById('report-window-title').textContent = 'Monthly Performance Summary';

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  document.getElementById('report-filter-controls').innerHTML = `
    <div class="d-flex gap-2">
      <input type="number" class="form-control form-control-sm text-white bg-dark border-secondary" id="report-year-val" value="${currentYear}" style="width: 80px;">
      <select class="form-select form-select-sm text-white bg-dark border-secondary" id="report-month-val">
        ${Array.from({ length: 12 }, (_, i) => `
          <option value="${i+1}" ${i+1 === currentMonth ? 'selected' : ''}>${new Date(0, i).toLocaleString('en-US', { month: 'long' })}</option>
        `).join('')}
      </select>
      <button class="btn btn-danger btn-sm" onclick="triggerMonthlyFetch()">Generate</button>
    </div>
  `;

  triggerMonthlyFetch();
}

async function triggerMonthlyFetch() {
  const token = localStorage.getItem('barber_token');
  const year = document.getElementById('report-year-val').value;
  const month = document.getElementById('report-month-val').value;
  const container = document.getElementById('report-window-body');

  try {
    const res = await fetch(`/api/reports/monthly?year=${year}&month=${month}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (res.ok) {
      const r = data.data;
      container.innerHTML = `
        <div class="row g-3 mb-4 text-center">
          <div class="col-md-3">
            <div class="p-2 bg-dark rounded border border-secondary">
              <div class="fs-3 fw-bold text-white">${r.total}</div>
              <small class="text-muted">Total Bookings</small>
            </div>
          </div>
          <div class="col-md-3">
            <div class="p-2 bg-dark rounded border border-secondary">
              <div class="fs-3 fw-bold text-success">${r.completed}</div>
              <small class="text-muted">Completed Cuts</small>
            </div>
          </div>
          <div class="col-md-3">
            <div class="p-2 bg-dark rounded border border-secondary">
              <div class="fs-3 fw-bold text-danger">${r.cancelled}</div>
              <small class="text-muted">Cancelled</small>
            </div>
          </div>
          <div class="col-md-3">
            <div class="p-2 bg-dark rounded border border-secondary">
              <div class="fs-3 fw-bold text-info">$${r.revenue.toFixed(2)}</div>
              <small class="text-muted">Total Monthly Income</small>
            </div>
          </div>
        </div>
      `;
    }
  } catch (err) {
    console.error(err);
  }
}

// Chairs Utilization Report
async function fetchChairsUtilization() {
  const token = localStorage.getItem('barber_token');
  document.getElementById('report-window-title').textContent = 'Barber Chairs Stations Utilization Log';
  document.getElementById('report-filter-controls').innerHTML = '';

  const container = document.getElementById('report-window-body');

  try {
    const res = await fetch('/api/reports/chairs', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (res.ok) {
      container.innerHTML = `
        <div class="table-responsive">
          <table class="table table-dark table-striped table-hover align-middle">
            <thead>
              <tr>
                <th>Station</th>
                <th>Name</th>
                <th>Current Status</th>
                <th>Total Bookings Handled</th>
                <th>Successfully Completed</th>
              </tr>
            </thead>
            <tbody>
              ${data.data.map(c => `
                <tr>
                  <td><strong>#${c.chair_number}</strong></td>
                  <td>${c.name}</td>
                  <td><span class="badge ${c.status === 'available' ? 'bg-success' : 'bg-secondary'}">${c.status.toUpperCase()}</span></td>
                  <td>${c.total_appointments} times</td>
                  <td>${c.completed_appointments} complete</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    }
  } catch (err) {
    console.error(err);
  }
}

// Peak Hours Report
async function fetchPeakHoursReport() {
  const token = localStorage.getItem('barber_token');
  document.getElementById('report-window-title').textContent = 'Peak Booking Hour Traffic Analysis';
  document.getElementById('report-filter-controls').innerHTML = '';

  const container = document.getElementById('report-window-body');

  try {
    const res = await fetch('/api/reports/peak-hours', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (res.ok) {
      container.innerHTML = `
        <div class="table-responsive">
          <table class="table table-dark table-striped table-hover align-middle">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Time Slot</th>
                <th>Appointment Bookings Count</th>
              </tr>
            </thead>
            <tbody>
              ${data.data.map((r, i) => `
                <tr>
                  <td><span class="badge bg-danger">#${i+1}</span></td>
                  <td><strong>${r.time_slot}</strong></td>
                  <td>${r.count} reservations</td>
                </tr>
              `).join('') || '<tr><td colspan="3" class="text-center text-muted">No appointments records found.</td></tr>'}
            </tbody>
          </table>
        </div>
      `;
    }
  } catch (err) {
    console.error(err);
  }
}

// Setup Admin Sockets
function setupAdminSockets() {
  try {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    adminSocket = new WebSocket(`${protocol}//${window.location.host}/ws`);

    adminSocket.onopen = () => {
      console.log('Admin Socket connected.');
    };

    adminSocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('🔄 WebSocket Admin: received event', data);
        if (data.event === 'chair-update' || data.event === 'queue-update' || data.event === 'appointment-update') {
          console.log(`🔄 Sockets Admin: ${data.event} received.`);
          loadTabContent();
        }
      } catch (e) {
        console.error('Error parsing socket event data:', e);
      }
    };

    adminSocket.onerror = (err) => {
      console.warn('Admin socket error:', err);
    };

    adminSocket.onclose = () => {
      console.warn('Admin socket connection closed. Polling instead.');
      setInterval(loadTabContent, 5000);
    };

  } catch (err) {
    console.warn('Admin socket failure, polling instead.', err);
    setInterval(loadTabContent, 5000);
  }
}

// Initialize Admin Page Data
document.addEventListener('DOMContentLoaded', () => {
  const user = JSON.parse(localStorage.getItem('barber_user'));
  if (user) {
    document.getElementById('admin-user-display').textContent = user.full_name || user.username;
  }

  loadTabContent();
  setupAdminSockets();
});
