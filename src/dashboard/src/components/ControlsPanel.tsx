import { API_URL } from '../lib/config';
import { supabase } from '../lib/supabase';

async function post(path: string, zoneId: string) {
  const { data } = await supabase.auth.getSession();
  await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${data.session?.access_token ?? ''}`,
    },
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
