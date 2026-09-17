import { Router } from 'express';
import { getLatestZoneStatuses } from './broadcast.js';
import { resetToHealthy, triggerHeatStress } from './simulator.js';

export const router = Router();

router.get('/zones', (_req, res) => {
  res.json({ zones: getLatestZoneStatuses() });
});

router.post('/simulate/heat-stress', (req, res) => {
  triggerHeatStress(req.body?.zone_id);
  res.json({ ok: true });
});

router.post('/simulate/reset', (req, res) => {
  resetToHealthy(req.body?.zone_id);
  res.json({ ok: true });
});
