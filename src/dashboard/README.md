# dashboard

React + Vite web app: the live 3D digital twin of the farm zone (react-three-fiber),
telemetry chart with the moisture threshold line, and the Dual-Demo controls
("Simulate heat stress event" / "Reset to healthy").

## Setup

```bash
cp .env.example .env
npm install
npm run dev
```

Runs on `http://localhost:5173` and expects the `mqtt-bridge` backend
(`../backend/mqtt-bridge`) running on `http://localhost:8080`.
