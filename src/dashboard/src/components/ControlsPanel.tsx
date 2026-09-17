import { API_URL } from '../lib/config';

async function post(path: string, zoneId: string) {
  await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ zone_id: zoneId }),
  });
}

export function ControlsPanel({ zoneId, zoneLabel }: { zoneId: string; zoneLabel: string }) {
  return (
    <div className="controls-panel">
      <button onClick={() => post('/simulate/heat-stress', zoneId)}>
        Simulate heat stress — {zoneLabel}
      </button>
      <button onClick={() => post('/simulate/reset', zoneId)}>Reset to healthy</button>
    </div>
  );
}
