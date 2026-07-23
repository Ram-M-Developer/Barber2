/**
 * BarberEase – Token Number Generator
 * 
 * Generates sequential token numbers per day.
 * Format: T001, T002, ... T999
 * 
 * Queries the Token table to find the last issued
 * token for today, then increments by 1.
 */

const { Op } = require('sequelize');

/**
 * Generate the next token number for today.
 * 
 * @param {Model} TokenModel - The Sequelize Token model
 * @returns {Promise<string>} Token number string (e.g., "T001")
 */
async function generateTokenNumber(TokenModel) {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  // Find the last token issued today
  const lastToken = await TokenModel.findOne({
    where: {
      token_date: today
    },
    order: [['id', 'DESC']]
  });

  let nextNumber = 1;

  if (lastToken && lastToken.token_number) {
    // Extract the number from the token string (e.g., "T012" → 12)
    const match = lastToken.token_number.match(/T(\d+)/);
    if (match) {
      nextNumber = parseInt(match[1], 10) + 1;
    }
  }

  // Format with leading zeros: T001, T012, T123
  const tokenNumber = `T${String(nextNumber).padStart(3, '0')}`;

  return tokenNumber;
}

/**
 * Generate available time slots for a given date.
 * 
 * Operating hours:
 *   Mon-Fri: 09:00 AM – 08:00 PM
 *   Saturday: 08:00 AM – 09:00 PM
 *   Sunday:   10:00 AM – 06:00 PM
 * 
 * Slots are generated in 30-minute intervals.
 * 
 * @param {string} dateStr - Date string in YYYY-MM-DD format
 * @returns {string[]} Array of time slot strings
 */
function generateTimeSlots(dateStr) {
  const date = new Date(dateStr + 'T00:00:00');
  const dayOfWeek = date.getDay(); // 0=Sun, 6=Sat

  let startHour, endHour;

  if (dayOfWeek === 0) {
    // Sunday
    startHour = 10;
    endHour = 18; // 6 PM
  } else if (dayOfWeek === 6) {
    // Saturday
    startHour = 8;
    endHour = 21; // 9 PM
  } else {
    // Mon-Fri
    startHour = 9;
    endHour = 20; // 8 PM
  }

  const slots = [];
  for (let hour = startHour; hour < endHour; hour++) {
    for (let min = 0; min < 60; min += 30) {
      const h = hour % 12 || 12;
      const period = hour < 12 ? 'AM' : 'PM';
      const m = String(min).padStart(2, '0');
      slots.push(`${h}:${m} ${period}`);
    }
  }

  return slots;
}

/**
 * Calculate estimated wait time based on queue
 * position and average service duration.
 * 
 * @param {number} position - Queue position (1-based)
 * @param {number} avgDuration - Average service duration in minutes
 * @returns {number} Estimated wait in minutes
 */
function calculateEstimatedWait(position, avgDuration = 30) {
  return Math.max(0, (position - 1) * avgDuration);
}

/**
 * Format a Date object to a human-readable string.
 * 
 * @param {Date} date
 * @returns {string} e.g., "Jul 23, 2026 at 2:30 PM"
 */
function formatDateTime(date) {
  if (!date) return 'N/A';
  return new Date(date).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

/**
 * Get today's date as YYYY-MM-DD string.
 * @returns {string}
 */
function getTodayDate() {
  return new Date().toISOString().split('T')[0];
}

module.exports = {
  generateTokenNumber,
  generateTimeSlots,
  calculateEstimatedWait,
  formatDateTime,
  getTodayDate
};
