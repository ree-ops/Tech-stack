import { useMemo, useState } from 'react';
import { ControlsPanel } from './components/ControlsPanel';
import { EventLog } from './components/EventLog';
import { FarmTwinScene } from './components/FarmTwinScene';
import { PriorityQueue } from './components/PriorityQueue';
import { TelemetryChart } from './components/TelemetryChart';
import { ZoneStatusCard } from './components/ZoneStatusCard';
import { useZoneFeed } from './hooks/useZoneFeed';

export default function App() {
  const { status, zones, history, events } = useZoneFeed();
  const [manualSelection, setManualSelection] = useState<string | null>(null);

  const topPriorityZoneId = useMemo(() => {
    const top = [...zones].sort((a, b) => a.priority_rank - b.priority_rank)[0];
    return top?.zone_id ?? null;
  }, [zones]);

  const selectedZoneId = manualSelection ?? topPriorityZoneId;
  const selectedZone = zones.find((z) => z.zone_id === selectedZoneId) ?? null;
  const selectedHistory = selectedZoneId ? history[selectedZoneId] ?? [] : [];

  return (
    <div className="app">
      <header>
        <h1>Lowveld Grove — Digital Twin</h1>
        <ZoneStatusCard zone={selectedZone} status={status} />
      </header>
      <main>
        <section className="twin-panel">
          <FarmTwinScene zones={zones} selectedZoneId={selectedZoneId} onSelect={setManualSelection} />
        </section>
        <section className="side-panel">
          <h2>Priority queue — which side needs water first</h2>
          <PriorityQueue zones={zones} selectedZoneId={selectedZoneId} onSelect={setManualSelection} />

          <h2>{selectedZone?.label ?? 'Zone'} trend</h2>
          <TelemetryChart history={selectedHistory} />

          {selectedZone && <ControlsPanel zoneId={selectedZone.zone_id} zoneLabel={selectedZone.label} />}

          <h2>Event log</h2>
          <EventLog events={events} />
        </section>
      </main>
    </div>
  );
}
