/**
 * BarberEase – Async Wrapper Middleware
 * 
 * Wraps async route handlers to catch errors
 * and forward them to the global error handler.
 * Eliminates repetitive try-catch blocks in controllers.
 * 
 * Usage:
 *   router.get('/path', asyncWrapper(controller.method));
 */

function asyncWrapper(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = asyncWrapper;
