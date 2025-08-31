const express = require('express');
const Thread = require('../models/Thread');
const Post = require('../models/Post');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const threads = await Thread.find({})
      .populate('author', 'username')
      .sort({ updatedAt: -1 })
      .limit(20)
      .lean();

    const ids = threads.map(t => t._id);
    const countsAgg = await Post.aggregate([
      { $match: { thread: { $in: ids } } },
      { $group: { _id: '$thread', count: { $sum: 1 } } }
    ]);

    const counts = {};
    countsAgg.forEach(c => { counts[String(c._id)] = c.count; });

    res.render('index', { title: 'Home', threads, counts, errorMsg: null });
  } catch (err) {
    next(err);
  }
});

module.exports = router;