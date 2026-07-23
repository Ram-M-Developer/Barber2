/**
 * BarberEase – JWT Authentication Middleware
 * 
 * Verifies the JWT token from the Authorization header.
 * If valid, attaches the decoded user payload to req.user.
 * If invalid or missing, returns 401 Unauthorized.
 * 
 * Expected header format:
 *   Authorization: Bearer <jwt_token>
 */

const jwt = require('jsonwebtoken');
const config = require('../config/app');

function authenticate(req, res, next) {
  // Extract token from Authorization header
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. No token provided.'
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    // Verify and decode the token
    const decoded = jwt.verify(token, config.jwt.secret);

    // Attach user info to the request object
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      type: decoded.type // 'customer' or 'admin'
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired. Please login again.'
      });
    }

    return res.status(401).json({
      success: false,
      message: 'Invalid token. Please login again.'
    });
  }
}

module.exports = authenticate;
