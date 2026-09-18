import cors from 'cors';
import express from 'express';
import http from 'node:http';
import { WebSocketServer } from 'ws';
import { extractWsToken, requireAuth, verifyToken } from './auth.js';
import { registerClient } from './broadcast.js';
import { config } from './config.js';
import { connectMqtt } from './mqttClient.js';
import { router } from './routes.js';
import { startSimulator } from './simulator.js';
import { startWeatherPolling } from './weather.js';

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api', requireAuth, router);

const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });

server.on('upgrade', (req, socket, head) => {
  if (req.url?.split('?')[0] !== '/ws') {
    socket.destroy();
    return;
  }

  const token = extractWsToken(req.url);
  verifyToken(token).then((ok) => {
    if (!ok) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit('connection', ws, req);
    });
  });
});

wss.on('connection', (ws) => registerClient(ws));

connectMqtt();
startWeatherPolling();

if (config.simulateOnBoot) {
  startSimulator();
}

server.listen(config.httpPort, () => {
  console.log(`[bridge] listening on http://localhost:${config.httpPort} (ws path /ws)`);
});
