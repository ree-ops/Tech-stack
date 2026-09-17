import cors from 'cors';
import express from 'express';
import http from 'node:http';
import { WebSocketServer } from 'ws';
import { registerClient } from './broadcast.js';
import { config } from './config.js';
import { connectMqtt } from './mqttClient.js';
import { router } from './routes.js';
import { startSimulator } from './simulator.js';

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api', router);

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws) => registerClient(ws));

connectMqtt();

if (config.simulateOnBoot) {
  startSimulator();
}

server.listen(config.httpPort, () => {
  console.log(`[bridge] listening on http://localhost:${config.httpPort} (ws path /ws)`);
});
