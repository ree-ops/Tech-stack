export interface ZoneConfig {
  zone_id: string;
  label: string;
}

// Orchard sections ("sides") the priority queue ranks against each other.
// zone_id "04" is the one wired to the real ESP32 in the build plan; the
// others stay simulator-driven so the demo always has multiple sections to
// prioritize between, even with only one physical rig.
export const ZONES: ZoneConfig[] = [
  { zone_id: '01', label: 'North block' },
  { zone_id: '02', label: 'East block' },
  { zone_id: '03', label: 'South block' },
  { zone_id: '04', label: 'West block' },
];
