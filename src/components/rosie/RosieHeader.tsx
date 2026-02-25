import React, { useState, useEffect, useCallback } from 'react';
import { BabyProfile, DevelopmentalInfo, WeatherData, UserSettings } from './types';

// Time period for ambient theming
export type TimePeriod = 'morning' | 'afternoon' | 'evening' | 'night';

// Get the current time period
export const getTimePeriod = (hour: number): TimePeriod => {
  return 'afternoon'; // TODO: restore time-based logic below
  // if (hour >= 5 && hour < 12) return 'morning';
  // if (hour >= 12 && hour < 17) return 'afternoon';
  // if (hour >= 17 && hour < 20) return 'evening';
  // return 'night';
};

// Get greeting based on time of day, with optional parent name personalization
export const getGreeting = (period: TimePeriod, parentName?: string | null): string => {
  const name = parentName?.trim();

  // Without a name, return simple greeting
  if (!name) {
    switch (period) {
      case 'morning': return 'Good morning';
      case 'afternoon': return 'Good afternoon';
      case 'evening': return 'Good evening';
      case 'night': return 'Good night';
    }
  }

  // Deterministic rotation based on date so greeting stays consistent per day
  const now = new Date();
  const dayHash = now.getFullYear() * 1000 + now.getMonth() * 32 + now.getDate();

  const pools: Record<TimePeriod, string[]> = {
    morning: [
      `Good morning, ${name}`,
      `Morning, ${name}`,
      `Hey ${name}, good morning`,
      `Rise and shine, ${name}`,
      `Hope you slept well, ${name}`,
    ],
    afternoon: [
      `Good afternoon, ${name}`,
      `How's your afternoon, ${name}?`,
      `Afternoon, ${name}`,
      `Hey ${name}`,
      `Hope your day's going well, ${name}`,
    ],
    evening: [
      `Good evening, ${name}`,
      `Evening, ${name}`,
      `Hope tonight is easy, ${name}`,
      `Winding down, ${name}?`,
      `You're doing great, ${name}`,
    ],
    night: [
      `Hope you're getting rest, ${name}`,
      `Night, ${name}`,
      `You're a rockstar, ${name}`,
      `Hang in there, ${name}`,
      `Late night? You've got this, ${name}`,
    ],
  };

  const pool = pools[period];
  return pool[dayHash % pool.length];
};

interface RosieHeaderProps {
  baby: BabyProfile;
  developmentalInfo: DevelopmentalInfo;
  userSettings?: UserSettings;
  onTimePeriodChange?: (period: TimePeriod) => void;
  onWeatherChange?: (weather: WeatherData | null) => void;
  onProfileClick?: () => void;
}

export const RosieHeader: React.FC<RosieHeaderProps> = ({ baby, userSettings, onTimePeriodChange, onWeatherChange, onProfileClick }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [timePeriod, setTimePeriod] = useState<TimePeriod>(() => getTimePeriod(new Date().getHours()));
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState(false);

  // Fetch weather data
  const fetchWeather = useCallback(async (location: string) => {
    if (!location) return;

    setWeatherLoading(true);
    setWeatherError(false);

    try {
      const response = await fetch(`/api/weather?location=${encodeURIComponent(location)}`);
      if (!response.ok) {
        throw new Error('Failed to fetch weather');
      }
      // Verify we got JSON (not an HTML error page from dev server)
      const contentType = response.headers.get('content-type');
      if (!contentType?.includes('application/json')) {
        throw new Error('Weather API unavailable');
      }
      const data = await response.json();
      setWeather(data);
      onWeatherChange?.(data);
    } catch {
      setWeatherError(true);
      onWeatherChange?.(null);
    } finally {
      setWeatherLoading(false);
    }
  }, [onWeatherChange]);

  // Fetch weather when location changes
  useEffect(() => {
    if (userSettings?.location) {
      fetchWeather(userSettings.location);

      // Refresh weather every 10 minutes
      const interval = setInterval(() => {
        fetchWeather(userSettings.location!);
      }, 10 * 60 * 1000);

      return () => clearInterval(interval);
    }
  }, [userSettings?.location, fetchWeather]);

  // Update time every minute
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now);
      const newPeriod = getTimePeriod(now.getHours());
      if (newPeriod !== timePeriod) {
        setTimePeriod(newPeriod);
        onTimePeriodChange?.(newPeriod);
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, [timePeriod, onTimePeriodChange]);

  // Notify parent of initial time period
  useEffect(() => {
    onTimePeriodChange?.(timePeriod);
  }, []);

  // Get current day name for the weather pill
  const dayName = currentTime.toLocaleDateString('en-US', { weekday: 'long' });

  return (
    <header className={`rosie-header-minimal ${timePeriod}`}>
      {/* Weather pill — left */}
      {weather && !weatherError ? (
        <div className="rosie-header-weather-pill">
          <span className="rosie-weather-pill-icon">{weather.icon}</span>
          <span className="rosie-weather-pill-text">
            {weather.temperature}° · {dayName}
          </span>
        </div>
      ) : (
        <div className="rosie-header-weather-pill">
          <span className="rosie-weather-pill-text">{dayName}</span>
        </div>
      )}

      {/* Profile avatar — right */}
      {onProfileClick && (
        <button
          className={`rosie-header-avatar ${baby.avatarType === 'image' && baby.avatarImage ? 'has-image' : ''}`}
          onClick={onProfileClick}
          aria-label="Open profile"
        >
          {baby.avatarType === 'image' && baby.avatarImage ? (
            <img src={baby.avatarImage} alt={`${baby.name}'s photo`} />
          ) : (
            baby.avatarEmoji || '👶'
          )}
        </button>
      )}
    </header>
  );
};

export default RosieHeader;
