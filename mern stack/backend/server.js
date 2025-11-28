require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const session = require('express-session');

const server = express();

const corsConfig = {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
server.use(cors(corsConfig));

server.use(express.json({ limit: '10mb' }));
server.use(express.urlencoded({ extended: false }));

const sessionConfig = {
  secret: process.env.SESSION_SECRET || 'dev-secret-change-in-prod',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24,
    sameSite: 'lax'
  },
  name: 'formbuilder.session'
};
server.use(session(sessionConfig));

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Database connection established');
  } catch (error) {
    console.error('Database connection failed:', error.message);
    process.exit(1);
  }
};
connectDB();

server.use('/api/auth', require('./routes/auth'));
server.use('/api/forms', require('./routes/forms'));
server.use('/api/responses', require('./routes/responses'));
server.use('/api/webhooks', require('./routes/webhooks'));

server.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

server.use((error, req, res, next) => {
  console.error('Server Error:', error);
  const statusCode = error.statusCode || 500;
  res.status(statusCode).json({ 
    success: false,
    message: error.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
});

const port = process.env.PORT || 5000;
server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
