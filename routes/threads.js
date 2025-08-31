const express = require('express');
const { body, validationResult } = require('express-validator');
const sanitizeHtml = require('sanitize-html');
const Thread = require('../models/Thread');
const Post = require('../models/Post');
const { requireLogin } = require('../middleware/auth');

const router = express.Router();

// New thread page
router.get('/new', requireLogin, (req, res) => {
  res.render('threads/new', { title: 'New Thread', errors: [], values: {} });
});

// Create thread
router.post(
  '/',
  requireLogin,
  body('title').trim().isLength({ min: 3, max: 200 }).withMessage('Title must be 3-200 chars'),
  body('tags').optional().trim().isLength({ max: 100 }).withMessage('Tags too long'),
  async (req, res) => {
    const errors = validationResult(req);
    const values = { title: req.body.title || '', tags: req.body.tags || '' };
    if (!errors.isEmpty()) {
      return res.status(400).render('threads/new', { title: 'New Thread', errors: errors.array(), values });
    }

    try {
      const tags = (req.body.tags || '')
        .split(',')
        .map(t => t.trim())
        .filter(Boolean)
        .slice(0, 5);

      const thread = await Thread.create({
        title: req.body.title.trim(),
        author: req.session.user.id,
        tags
      });

      const content = (req.body.content || '').trim();
      if (content) {
        const clean = sanitizeHtml(content, { allowedTags: [], allowedAttributes: {} });
        await Post.create({
          thread: thread._id,
          author: req.session.user.id,
          content: clean
        });
        await Thread.updateOne({ _id: thread._id }, { $set: { updatedAt: new Date() } });
      }

      res.redirect(`/threads/${thread._id}`);
    } catch (e) {
      console.error(e);
      res.status(500).render('threads/new', {
        title: 'New Thread',
        errors: [{ msg: 'Server error. Please try again.' }],
        values
      });
    }
  }
);

// Show a thread
router.get('/:id', async (req, res, next) => {
  try {
    const thread = await Thread.findById(req.params.id)
      .populate('author', 'username')
      .lean();

    if (!thread) return res.status(404).send('Thread not found');

    const posts = await Post.find({ thread: thread._id })
      .populate('author', 'username')
      .sort({ createdAt: 1 })
      .lean();

    res.render('threads/show', { title: thread.title, thread, posts });
  } catch (e) {
    next(e);
  }
});

// Reply to a thread
router.post(
  '/:id/posts',
  requireLogin,
  body('content').trim().isLength({ min: 1, max: 5000 }).withMessage('Post cannot be empty'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ ok: false, errors: errors.array() });
    }

    try {
      const thread = await Thread.findById(req.params.id);
      if (!thread) return res.status(404).json({ ok: false, message: 'Thread not found' });

      const clean = sanitizeHtml(req.body.content, { allowedTags: [], allowedAttributes: {} });

      const post = await Post.create({
        thread: thread._id,
        author: req.session.user.id,
        content: clean
      });

      await Thread.updateOne({ _id: thread._id }, { $set: { updatedAt: new Date() } });

      const io = req.app.get('io');
      const payload = {
        _id: String(post._id),
        threadId: String(thread._id),
        content: post.content,
        author: { username: req.session.user.username },
        createdAt: post.createdAt
      };

      io.to(`thread:${thread._id}`).emit('new-post', payload);

      res.json({ ok: true, post: payload });
    } catch (e) {
      console.error(e);
      res.status(500).json({ ok: false, message: 'Server error' });
    }
  }
);

module.exports = router;