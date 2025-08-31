const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');

const router = express.Router();

router.get('/register', (req, res) => {
  res.render('auth/register', { title: 'Register', errors: [], values: {} });
});

router.post(
  '/register',
  body('username')
    .trim()
    .isLength({ min: 3, max: 32 }).withMessage('Username must be 3-32 chars')
    .matches(/^[a-zA-Z0-9_]+$/).withMessage('Only letters, numbers, underscore'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 chars'),
  async (req, res) => {
    const errors = validationResult(req);
    const values = { username: req.body.username || '' };

    if (!errors.isEmpty()) {
      return res.status(400).render('auth/register', { title: 'Register', errors: errors.array(), values });
    }

    try {
      const existing = await User.findOne({ username: req.body.username.trim() });
      if (existing) {
        return res.status(400).render('auth/register', {
          title: 'Register',
          errors: [{ msg: 'Username already taken' }],
          values
        });
      }

      const passwordHash = await bcrypt.hash(req.body.password, 12);
      const user = await User.create({ username: req.body.username.trim(), passwordHash });

      req.session.user = { id: user._id, username: user.username };
      res.redirect('/');
    } catch (e) {
      console.error(e);
      res.status(500).render('auth/register', {
        title: 'Register',
        errors: [{ msg: 'Server error. Please try again.' }],
        values
      });
    }
  }
);

router.get('/login', (req, res) => {
  res.render('auth/login', { title: 'Login', errors: [], values: {}, nextUrl: req.query.next || '/' });
});

router.post(
  '/login',
  body('username').trim().notEmpty().withMessage('Username is required'),
  body('password').notEmpty().withMessage('Password is required'),
  async (req, res) => {
    const errors = validationResult(req);
    const values = { username: req.body.username || '' };
    const nextUrl = req.body.next || '/';

    if (!errors.isEmpty()) {
      return res.status(400).render('auth/login', { title: 'Login', errors: errors.array(), values, nextUrl });
    }

    try {
      const user = await User.findOne({ username: req.body.username.trim() });
      if (!user) {
        return res.status(400).render('auth/login', {
          title: 'Login',
          errors: [{ msg: 'Invalid username or password' }],
          values,
          nextUrl
        });
      }

      const ok = await bcrypt.compare(req.body.password, user.passwordHash);
      if (!ok) {
        return res.status(400).render('auth/login', {
          title: 'Login',
          errors: [{ msg: 'Invalid username or password' }],
          values,
          nextUrl
        });
      }

      req.session.user = { id: user._id, username: user.username };
      res.redirect(nextUrl || '/');
    } catch (e) {
      console.error(e);
      res.status(500).render('auth/login', {
        title: 'Login',
        errors: [{ msg: 'Server error. Please try again.' }],
        values,
        nextUrl
      });
    }
  }
);

router.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.redirect('/');
  });
});

module.exports = router;