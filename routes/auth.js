const express = require('express');
const router = express.Router();
const passport = require('passport');
const User = require('../models/User');

// ──── Middleware ────
function ensureGuest(req, res, next) {
  if (req.isAuthenticated()) return res.redirect('/dashboard');
  next();
}

function ensureAuth(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.redirect('/login');
}

// ──── Pages ────
router.get('/', (req, res) => {
  res.render('index');
});

router.get('/login', ensureGuest, (req, res) => {
  res.render('login', {
    error: req.flash('error'),
    success: req.flash('success')
  });
});

router.get('/signup', ensureGuest, (req, res) => {
  res.render('signup', { error: req.flash('error') });
});

router.get('/dashboard', ensureAuth, (req, res) => {
  res.render('dashboard', { user: req.user });
});

// ──── Local Auth - Login with username + password ────
router.post('/login', ensureGuest, passport.authenticate('local', {
  successRedirect: '/dashboard',
  failureRedirect: '/login',
  failureFlash: true
}));

// ──── Signup with all fields ────
router.post('/signup', ensureGuest, async (req, res) => {
  try {
    const { name, username, email, phone, password, confirmPassword } = req.body;

    if (!name || !username || !email || !phone || !password) {
      req.flash('error', 'Please fill in all fields.');
      return res.redirect('/signup');
    }

    // Username validation - only letters, numbers, underscore
    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    if (!usernameRegex.test(username)) {
      req.flash('error', 'Username can only have letters, numbers, and underscores.');
      return res.redirect('/signup');
    }

    if (password.length < 6) {
      req.flash('error', 'Password must be at least 6 characters.');
      return res.redirect('/signup');
    }

    if (password !== confirmPassword) {
      req.flash('error', 'Passwords do not match.');
      return res.redirect('/signup');
    }

    // Check if email already exists
    const existingEmail = await User.findOne({ email: email.toLowerCase() });
    if (existingEmail) {
      req.flash('error', 'Email already registered.');
      return res.redirect('/signup');
    }

    // Check if username already exists
    const existingUsername = await User.findOne({ username: username.toLowerCase() });
    if (existingUsername) {
      req.flash('error', 'Username already taken. Please choose another.');
      return res.redirect('/signup');
    }

    await User.create({ name, username: username.toLowerCase(), email, phone, password });
    req.flash('success', 'Account created! Please log in.');
    res.redirect('/login');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Something went wrong. Try again.');
    res.redirect('/signup');
  }
});

// ──── Google Auth ────
router.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get('/auth/google/callback',
  passport.authenticate('google', {
    successRedirect: '/dashboard',
    failureRedirect: '/login',
    failureFlash: true
  })
);

// ──── Logout ────
router.get('/logout', (req, res, next) => {
  req.logout(err => {
    if (err) return next(err);
    res.redirect('/login');
  });
});

module.exports = router;
