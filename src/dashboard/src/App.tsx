import { useMemo, useState } from 'react';
import { ControlsPanel } from './components/ControlsPanel';
import { EventLog } from './components/EventLog';
import { FarmTwinScene } from './components/FarmTwinScene';
import { HistoryPanel } from './components/HistoryPanel';
import { LoginPage } from './components/LoginPage';
import { PriorityQueue } from './components/PriorityQueue';
import { TelemetryChart } from './components/TelemetryChart';
import { WeatherWidget } from './components/WeatherWidget';
import { ZoneStatusCard } from './components/ZoneStatusCard';
import { useAuth } from './hooks/useAuth';
import { useZoneFeed } from './hooks/useZoneFeed';

export default function App() {
  const { session, loading, accessToken, signIn, signOut } = useAuth();

  if (loading) return null;
  if (!session) return <LoginPage signIn={signIn} />;

  return <Dashboard accessToken={accessToken} onSignOut={signOut} />;
}

function Dashboard({ accessToken, onSignOut }: { accessToken: string | null; onSignOut: () => void }) {
  const { status, zones, history, events, weather } = useZoneFeed(accessToken);
  const [manualSelection, setManualSelection] = useState<string | null>(null);

  const topPriorityZoneId = useMemo(() => {
    const top = [...zones].sort((a, b) => a.priority_rank - b.priority_rank)[0];
    return top?.zone_id ?? null;
  }, [zones]);

  const selectedZoneId = manualSelection ?? topPriorityZoneId;
  const selectedZone = zones.find((z) => z.zone_id === selectedZoneId) ?? null;
  const selectedHistory = selectedZoneId ? history[selectedZoneId] ?? [] : [];

  // `zones` arrives sorted by priority (soonest-to-critical first), which is
  // exactly what the priority queue list should show — but the 3D twin needs
  // a fixed spatial layout. Re-sorting it by priority would make the boxes
  // swap positions on screen every time urgency changes, which reads as
  // random noise next to physical zone stakes on a table. Sort by zone_id
  // instead so each zone always renders in the same spot.
  const spatialZones = useMemo(
    () => [...zones].sort((a, b) => a.zone_id.localeCompare(b.zone_id)),
    [zones],
  );

  return (
    <div className="app">
      <header>
        <h1>Lowveld Grove — Digital Twin</h1>
        <div className="header-right">
          <WeatherWidget weather={weather} />
          <ZoneStatusCard zone={selectedZone} status={status} />
          <button className="sign-out-button" onClick={onSignOut}>
            Sign out
          </button>
        </div>
      </header>
      <main>
        <section className="twin-panel">
          <FarmTwinScene zones={spatialZones} selectedZoneId={selectedZoneId} onSelect={setManualSelection} />
        </section>
        <section className="side-panel">
          <h2>Priority queue — which side needs water first</h2>
          <PriorityQueue zones={zones} selectedZoneId={selectedZoneId} onSelect={setManualSelection} />

          <h2>{selectedZone?.label ?? 'Zone'} trend</h2>
          <TelemetryChart history={selectedHistory} />

          {selectedZone && <ControlsPanel zoneId={selectedZone.zone_id} zoneLabel={selectedZone.label} />}

          <HistoryPanel zoneId={selectedZoneId} zoneLabel={selectedZone?.label ?? 'Zone'} />

          <h2>Event log</h2>
          <EventLog events={events} />
        </section>
      </main>
    </div>
  );
}
