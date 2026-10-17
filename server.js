const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  // Same-origin by default; avoid reflecting arbitrary origins in production.
  maxHttpBufferSize: 1e6,
  pingTimeout: 20000,
  pingInterval: 25000
});
const PORT = process.env.PORT || 3000;

app.disable('x-powered-by');
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Permissions-Policy', 'camera=(self), microphone=(self), display-capture=(self)');
  next();
});
app.use(express.static(path.join(__dirname, 'public'), { etag: true, maxAge: '1h' }));
app.get('/health', (_req, res) => res.json({ ok: true, app: 'RuangKita' }));

// In-memory room membership and chat: data resets when the server restarts.
const rooms = new Map();
function cleanRoom(value) {
  return String(value || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 48) || 'ruang-umum';
}

io.on('connection', (socket) => {
  socket.on('join-room', ({ room: requestedRoom, name: requestedName } = {}) => {
    // A socket may belong to only one room at a time.
    if (socket.data.room) return;
    const room = cleanRoom(requestedRoom);
    const name = String(requestedName || '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 40);
    if (!name || !requestedRoom || String(requestedRoom).length > 64) {
      socket.emit('room-error', 'Nama dan ID ruang tidak valid.');
      return;
    }
    const members = rooms.get(room) || new Map();
    if (members.size >= 8) {
      socket.emit('room-error', 'Ruang ini sudah mencapai batas 8 peserta untuk menjaga kualitas koneksi.');
      return;
    }
    const peers = [...members.entries()].map(([id, person]) => ({ id, name: person.name }));
    socket.data.room = room;
    socket.data.name = name;
    members.set(socket.id, { name });
    rooms.set(room, members);
    socket.join(room);
    socket.emit('room-joined', { room, selfId: socket.id, peers });
    socket.to(room).emit('peer-joined', { id: socket.id, name });
    socket.to(room).emit('system-message', { text: `${name} bergabung ke ruang rapat.`, at: Date.now() });
  });

  for (const event of ['offer', 'answer', 'ice-candidate']) {
    socket.on(event, ({ to, ...payload } = {}) => {
        if (!to || !socket.data.room || to === socket.id) return;
      const room = rooms.get(socket.data.room);
      if (!room || !room.has(to)) return;
      // Only relay SDP/ICE signaling to a peer currently in the same room.
      if (event === 'offer' || event === 'answer') {
        if (!payload.description || typeof payload.description.type !== 'string' || typeof payload.description.sdp !== 'string' || payload.description.sdp.length > 200000) return;
      } else if (!payload.candidate || typeof payload.candidate !== 'object') return;
      io.to(to).emit(event, { from: socket.id, ...payload });
    });
  }

  socket.on('chat-message', ({ text } = {}) => {
    const room = socket.data.room;
    if (!room || typeof text !== 'string' || text.length > 5000) return;
    const message = text.trim().slice(0, 1500);
    if (!message) return;
    io.to(room).emit('chat-message', {
      id: socket.id,
      name: socket.data.name || 'Peserta',
      text: message,
      at: Date.now()
    });
  });

  socket.on('disconnect', () => {
    const room = socket.data.room;
    if (!room) return;
    const members = rooms.get(room);
    if (members) {
      const person = members.get(socket.id);
      members.delete(socket.id);
      socket.to(room).emit('peer-left', { id: socket.id, name: person?.name || 'Peserta' });
      if (person) socket.to(room).emit('system-message', { text: `${person.name} keluar dari ruang rapat.`, at: Date.now() });
      if (members.size === 0) rooms.delete(room);
    }
  });
});

server.listen(PORT, '0.0.0.0', () => console.log(`RuangKita listening on ${PORT}`));
