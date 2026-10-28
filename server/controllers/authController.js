const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const generateToken = (user) => jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'campusbid-secret', { expiresIn: '7d' });

const register = async (req, res, next) => {
  try {
    const { name, email, password, studentId, college, role } = req.body;
    if (!name || !email || !password || !college) {
      return res.status(400).json({ message: 'Name, email, password, and college are required' });
    }
    if (!['buyer', 'seller'].includes(role)) {
      return res.status(400).json({ message: 'Choose buyer or seller as your account role' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) return res.status(409).json({ message: 'An account already exists with this email' });

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      passwordHash: await bcrypt.hash(password, 10),
      role,
      studentId: studentId || '',
      college,
      avatar: ''
    });

    const token = generateToken(user);
    res.status(201).json({ token, user: user.toPublicJSON() });
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password are required' });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(401).json({ message: 'Invalid email or password' });

    const isValid = await user.comparePassword(password);
    if (!isValid) return res.status(401).json({ message: 'Invalid email or password' });

    const token = generateToken(user);
    res.json({ token, user: user.toPublicJSON() });
  } catch (error) {
    next(error);
  }
};

const getCurrentUser = async (req, res) => {
  res.json({ user: req.user.toPublicJSON() });
};

module.exports = { register, login, getCurrentUser };
