const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const generateToken = require('../utils/generateToken');

// @desc    Register a new user (Admin or HR only in real-world)
// @route   POST /api/auth/register
// @access  Public (For setup, later make it Private/Admin)
const registerUser = asyncHandler(async (req, res) => {
  console.log('Registration request body:', req.body); // Debug log
  
  const { firstName, lastName, email, password, role } = req.body;

  // Basic validation for login form fields
  if (!firstName || !lastName || !email || !password) {
    res.status(400);
    throw new Error('Please fill in all fields');
  }

  // Check if user already exists
  const userExists = await User.findOne({ email });
  if (userExists) {
    res.status(400);
    throw new Error('User already exists');
  }

  // Generate a unique employee ID
  const employeeCount = await User.countDocuments();
  const employeeID = `EMP${String(employeeCount + 1).padStart(3, '0')}`;

  // Hash password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  // Create user with minimal required data, placeholders for required fields
  const user = await User.create({
    email,
    password: hashedPassword,
    role: role || 'employee',
    personalInfo: {
      firstName,
      lastName,
      location: 'Not specified' // Placeholder for required field
    },
    workInfo: {
      employeeID,
      department: 'Not assigned', // Placeholder for required field
      skills: ['To be updated'], // Placeholder for required field
      experienceLevel: 'junior' // Default value
    }
  });

  if (user) {
    res.status(201).json({
      success: true,
      user: {
        _id: user._id,
        email: user.email,
        firstName: user.personalInfo.firstName,
        lastName: user.personalInfo.lastName,
        employeeID: user.workInfo.employeeID,
        role: user.role,
        token: generateToken(user._id)
      }
    });
  } else {
    res.status(400);
    throw new Error('Invalid user data');
  }
});

// @desc    Login a user
// @route   POST /api/auth/login
// @access  Public
const loginUser = asyncHandler(async (req, res) => {
  const { name, password } = req.body; // Login form sends 'name' field

  if (!name || !password) {
    res.status(400);
    throw new Error('Please provide name and password');
  }

  // Find user by email or first name (since login form uses 'name')
  const user = await User.findOne({
    $or: [
      { email: name },
      { 'personalInfo.firstName': name }
    ]
  }).select('+password');

  if (user && (await bcrypt.compare(password, user.password))) {
    res.json({
      success: true,
      user: {
        _id: user._id,
        email: user.email,
        firstName: user.personalInfo.firstName,
        lastName: user.personalInfo.lastName,
        employeeID: user.workInfo.employeeID,
        role: user.role,
        token: generateToken(user._id)
      }
    });
  } else {
    res.status(401);
    throw new Error('Invalid credentials');
  }
});

// @desc    Get current logged in user data
// @route   GET /api/auth/me
// @access  Private
const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  res.status(200).json({
    success: true,
    data: user // Return full user object for profile page
  });
});

// @desc    Update user profile
// @route   PUT /api/auth/update-profile
// @access  Private
const updateProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  // Extract updateable fields from request body
  const { personalInfo, workInfo } = req.body;
  
  // Update personal information (excluding sensitive fields)
  if (personalInfo) {
    if (personalInfo.firstName) user.personalInfo.firstName = personalInfo.firstName;
    if (personalInfo.lastName) user.personalInfo.lastName = personalInfo.lastName;
    if (personalInfo.phoneNumber !== undefined) user.personalInfo.phoneNumber = personalInfo.phoneNumber;
    if (personalInfo.dateOfBirth !== undefined) user.personalInfo.dateOfBirth = personalInfo.dateOfBirth;
    if (personalInfo.address !== undefined) user.personalInfo.address = personalInfo.address;
    if (personalInfo.location) user.personalInfo.location = personalInfo.location;
  }
  
  // Update work information (excluding sensitive fields like employeeID, department, salary)
  if (workInfo) {
    if (workInfo.title !== undefined) user.workInfo.title = workInfo.title;
    if (workInfo.experienceLevel) user.workInfo.experienceLevel = workInfo.experienceLevel;
    if (workInfo.capacityHours !== undefined) user.workInfo.capacityHours = workInfo.capacityHours;
    if (workInfo.skills) user.workInfo.skills = workInfo.skills;
  }

  const updatedUser = await user.save();

  res.json({
    success: true,
    message: 'Profile updated successfully',
    data: updatedUser
  });
});

// @desc    Change user password
// @route   PUT /api/auth/change-password
// @access  Private
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  
  // Validation
  if (!currentPassword || !newPassword) {
    res.status(400);
    throw new Error('Please provide current password and new password');
  }
  
  if (newPassword.length < 6) {
    res.status(400);
    throw new Error('New password must be at least 6 characters long');
  }

  // Get user with password field
  const user = await User.findById(req.user.id).select('+password');
  
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  // Check current password
  const isCurrentPasswordCorrect = await bcrypt.compare(currentPassword, user.password);
  
  if (!isCurrentPasswordCorrect) {
    res.status(400);
    throw new Error('Current password is incorrect');
  }

  // Hash new password
  const salt = await bcrypt.genSalt(10);
  const hashedNewPassword = await bcrypt.hash(newPassword, salt);

  // Update password
  user.password = hashedNewPassword;
  await user.save();

  res.json({
    success: true,
    message: 'Password changed successfully'
  });
});

module.exports = {
  registerUser,
  loginUser,
  getMe,
  updateProfile,
  changePassword,
};