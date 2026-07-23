/**
 * BarberEase – Role Guard Middleware
 * 
 * Restricts route access based on user role/type.
 * Must be used AFTER the auth middleware so that
 * req.user is already populated.
 * 
 * Usage:
 *   router.get('/admin-only', authenticate, roleGuard('admin'), handler);
 *   router.get('/customer-only', authenticate, roleGuard('customer'), handler);
 *   router.get('/both', authenticate, roleGuard('admin', 'customer'), handler);
 */

function roleGuard(...allowedTypes) {
  return (req, res, next) => {
    // Ensure user is authenticated
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.'
      });
    }

    // Check if user type is in the allowed list
    if (!allowedTypes.includes(req.user.type)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Insufficient permissions.'
      });
    }

    next();
  };
}

module.exports = roleGuard;
