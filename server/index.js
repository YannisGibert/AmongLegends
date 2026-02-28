require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const { attachSocketHandlers } = require('./src/socket/index');

const app = express();
const server = http.createServer(app);

const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';

const io = new Server(server, {
  cors: {
    origin: CLIENT_ORIGIN,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

app.use(cors({ origin: CLIENT_ORIGIN, credentials: true }));
app.use(express.json());

// Health check
app.get('/health', (_req, res) => res.json({ status: 'ok', env: NODE_ENV }));

attachSocketHandlers(io);

server.listen(PORT, () => {
  console.log(`[Server] Running on port ${PORT} (${NODE_ENV})`);
  if (NODE_ENV !== 'production') {
    console.log(`[Server] Client origin: ${CLIENT_ORIGIN}`);
  }
});
