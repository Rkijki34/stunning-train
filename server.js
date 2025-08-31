require('dotenv').config();
const path = require('path');
const http = require('http');
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const mongoose = require('mongoose');
const morgan = require('morgan');
const expressLayouts = require('express-ejs-layouts');
const { Server } = require('socket.io');

const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/modern_forum';

// Connect MongoDB
mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => {
    console.error('Mongo connection error:', err);
    process.exit(1);
  });

// Views and static
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layout'); // views/layout.ejs
app.use('/public', express.static(path.join(__dirname, 'public')));

// Middleware
app.use(morgan('dev'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Session
const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || 'dev-secret',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: MONGO_URI,
    collectionName: 'sessions'
  }),
  cookie: {
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24 * 7
  }
});
app.use(sessionMiddleware);

// Locals
app.use((req, res, next) => {
  res.locals.currentUser = req.session.user || null;
  next();
});

// Routes
app.use('/', require('./routes/home'));
app.use('/', require('./routes/auth'));
app.use('/threads', require('./routes/threads'));

// 404
app.use((req, res) => {
  res.status(404).render('index', {
    threads: [],
    counts: {},
    errorMsg: 'Page not found'
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  try {
    res.status(500).render('index', {
      threads: [],
      counts: {},
      errorMsg: 'Internal server error'
    });
  } catch {
    res.status(500).send('Internal server error');
  }
});

// HTTP + Socket.IO
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// Optionally share session with Socket.IO:
// io.use((socket, next) => sessionMiddleware(socket.request, {}, next));

io.on('connection', (socket) => {
  socket.on('join-thread', (threadId) => {
    if (threadId) socket.join(`thread:${threadId}`);
  });
});

app.set('io', io);

server.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});