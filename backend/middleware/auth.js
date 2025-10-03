const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const User = require('../models/User');

const protect = asyncHandler(async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      console.log('🔐 Token received:', token ? 'Present' : 'Missing');
      console.log('🔐 JWT_SECRET configured:', !!process.env.JWT_SECRET);
      
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('🔐 Token decoded successfully, user ID:', decoded.id);
      
      req.user = await User.findById(decoded.id).select('-password');
      
      if (!req.user) {
        console.error('🚨 User not found in database:', decoded.id);
        res.status(401);
        throw new Error('Not authorized, user not found');
      }
      
      console.log('🔐 User authenticated:', req.user.name);
      next();
      return; // Important: exit here on success
    } catch (error) {
      console.error('🚨 Token verification failed:', error.message);
      res.status(401);
      throw new Error('Not authorized, token failed');
    }
  }

  // Only check for missing token if we didn't have authorization header
  if (!token) {
    console.error('🚨 No authorization token provided');
    res.status(401);
    throw new Error('Not authorized, no token');
  }
});

// Role-based authorization middleware
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      res.status(403);
      throw new Error('Not authorized for this action');
    }
    next();
  };
};

module.exports = { protect, authorize };