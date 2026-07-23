/**
 * BarberEase – Queue Controller
 */

const queueService = require('../services/queue.service');

/** POST /api/queue – Join the queue */
async function joinQueue(req, res) {
  const entry = await queueService.addToQueue(req.user.id, req.body.service_id);

  const io = req.app.get('io');
  if (io) io.emit('queue-update', { message: 'New customer in queue' });

  res.status(201).json({ success: true, message: 'Added to queue', data: entry });
}

/** GET /api/queue – Get active queue */
async function getActiveQueue(req, res) {
  const queue = await queueService.getActiveQueue();
  res.json({ success: true, data: queue });
}

/** GET /api/queue/my-status – Get customer's queue status */
async function getMyStatus(req, res) {
  const entry = await queueService.getCustomerQueueStatus(req.user.id);
  res.json({ success: true, data: entry });
}

/** GET /api/queue/stats – Get queue statistics */
async function getStats(req, res) {
  const stats = await queueService.getQueueStats();
  res.json({ success: true, data: stats });
}

/** POST /api/queue/call-next – Call next customer (admin) */
async function callNext(req, res) {
  const result = await queueService.callNextCustomer();

  const io = req.app.get('io');
  if (io) {
    io.emit('queue-update', { message: 'Next customer called' });
    io.emit('chair-update', { message: 'Chair assigned from queue' });
    io.emit('appointment-update', { message: 'Queue appointment created' });
  }

  res.json({ success: true, message: 'Next customer called', data: result });
}

/** PUT /api/queue/:id/cancel – Cancel queue entry */
async function cancel(req, res) {
  const customerId = req.user.type === 'customer' ? req.user.id : null;
  const entry = await queueService.cancelQueueEntry(req.params.id, customerId);

  const io = req.app.get('io');
  if (io) io.emit('queue-update', { message: 'Queue entry cancelled' });

  res.json({ success: true, message: 'Queue entry cancelled', data: entry });
}

module.exports = { joinQueue, getActiveQueue, getMyStatus, getStats, callNext, cancel };
