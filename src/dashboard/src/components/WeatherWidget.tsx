import type { WeatherSnapshot } from '../lib/types';

export function WeatherWidget({ weather }: { weather: WeatherSnapshot | null }) {
  if (!weather) {
    return <div className="weather-widget weather-widget-empty">Loading weather…</div>;
  }

  return (
    <div className={`weather-widget ${weather.rain_expected ? 'weather-rain' : ''}`}>
      <span className="weather-temp">{weather.temp_c}°C</span>
      <span className="weather-condition">{weather.condition}</span>
      <span className="weather-humidity" title="Ambient humidity — low humidity speeds up how fast soil dries out">
        💧 {weather.humidity_pct}%
      </span>
      {weather.rain_expected ? (
        <span className="weather-rain-badge" title="Simulated irrigation is deferred while rain is expected">
          🌧 Rain expected ({weather.rain_probability_pct}%) — pump deferred
        </span>
      ) : (
        <span className="weather-rain-badge weather-rain-badge-clear">No rain expected</span>
      )}
    </div>
  );
}
