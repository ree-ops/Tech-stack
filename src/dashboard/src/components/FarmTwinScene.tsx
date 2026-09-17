import { OrbitControls, Text } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { STRESS_COLORS } from '../lib/stress';
import type { ZoneStatus } from '../lib/types';

interface Props {
  zones: ZoneStatus[];
  selectedZoneId: string | null;
  onSelect: (zoneId: string) => void;
}

function ShadeCloth({ deployed }: { deployed: boolean }) {
  return (
    <mesh position={[0, deployed ? 1.05 : 1.5, 0]} rotation={[deployed ? -0.15 : -1.5, 0, 0]}>
      <planeGeometry args={[1.1, 1.1]} />
      <meshStandardMaterial color="#1f2937" opacity={0.85} transparent side={2} />
    </mesh>
  );
}

function PumpIndicator({ active }: { active: boolean }) {
  return (
    <mesh position={[0.75, -0.15, 0.6]}>
      <cylinderGeometry args={[0.12, 0.12, 0.35, 12]} />
      <meshStandardMaterial
        color={active ? '#38bdf8' : '#334155'}
        emissive={active ? '#0ea5e9' : '#000000'}
        emissiveIntensity={active ? 0.8 : 0}
      />
    </mesh>
  );
}

function ZonePlot({ zone, x, selected, onSelect }: { zone: ZoneStatus; x: number; selected: boolean; onSelect: () => void }) {
  const color = STRESS_COLORS[zone.stress_code];

  return (
    <group position={[x, 0, 0]}>
      <mesh
        position={[0, 0.4, 0]}
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
      >
        <boxGeometry args={[0.9, 0.9, 0.9]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {selected && (
        <mesh position={[0, -0.51, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.68, 0.8, 32]} />
          <meshBasicMaterial color="#e8a33d" />
        </mesh>
      )}
      <ShadeCloth deployed={zone.actuator_on} />
      <PumpIndicator active={zone.pump_on} />
      <Text position={[0, -0.75, 0.6]} fontSize={0.16} color="#e5e7eb" anchorX="center">
        {zone.label}
      </Text>
    </group>
  );
}

export function FarmTwinScene({ zones, selectedZoneId, onSelect }: Props) {
  const spacing = 2.1;
  const offset = ((zones.length - 1) * spacing) / 2;

  return (
    <Canvas camera={{ position: [0, 4, 7], fov: 45 }}>
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 8, 5]} intensity={0.8} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
        <planeGeometry args={[spacing * zones.length + 2, 4]} />
        <meshStandardMaterial color="#3f3a2e" />
      </mesh>
      {zones.map((zone, i) => (
        <ZonePlot
          key={zone.zone_id}
          zone={zone}
          x={i * spacing - offset}
          selected={zone.zone_id === selectedZoneId}
          onSelect={() => onSelect(zone.zone_id)}
        />
      ))}
      <OrbitControls enablePan={false} minDistance={4} maxDistance={14} />
    </Canvas>
  );
}
