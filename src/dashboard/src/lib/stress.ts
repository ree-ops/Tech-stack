import type { StressCode } from './types';

export const STRESS_COLORS: Record<StressCode, string> = {
  OK: '#16a34a',
  WATCH: '#eab308',
  WARNING: '#f59e0b',
  CRITICAL: '#dc2626',
};

export function formatHoursToCritical(hours: number | null): string {
  if (hours === null) return 'no threat trend';
  if (hours <= 0) return 'already critical';
  if (hours < 1) return `${Math.round(hours * 60)} min to critical`;
  return `${hours.toFixed(1)} hrs to critical`;
}
