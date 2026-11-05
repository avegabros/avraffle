import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { Server as SocketIOServer } from 'socket.io';

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  });

  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  // Realtime Stage Room
  io.on('connection', (socket) => {
    console.log(`⚡ Client connected: ${socket.id}`);

    // Join stage room
    socket.on('join:stage', () => {
      socket.join('room:stage');
      console.log(`📺 Socket ${socket.id} joined room:stage`);
    });

    // Remote triggers spin
    socket.on('remote:trigger-spin', (payload) => {
      console.log('🎰 Remote triggered spin:', payload);
      // Broadcast to stage
      io.to('room:stage').emit('stage:start-spin', payload);
    });

    // Remote selects prize
    socket.on('remote:select-prize', (payload) => {
      console.log('🎁 Remote selected prize:', payload);
      io.to('room:stage').emit('stage:prize-changed', payload);
    });

    // Remote confirms win or requests respin
    socket.on('remote:respin', () => {
      io.to('room:stage').emit('stage:respin');
    });

    socket.on('disconnect', () => {
      console.log(`🔌 Client disconnected: ${socket.id}`);
    });
  });

  httpServer.listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`);
  });
});
