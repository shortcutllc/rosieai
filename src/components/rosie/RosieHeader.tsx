import React, { useState, useEffect, useCallback } from 'react';
import { BabyProfile, DevelopmentalInfo, WeatherData, UserSettings } from './types';

// Time period for ambient theming
export type TimePeriod = 'morning' | 'afternoon' | 'evening' | 'night';

// Get the current time period
export const getTimePeriod = (hour: number): TimePeriod => {
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 20) return 'evening';
  return 'night';
};

// Get greeting based on time of day
const getGreeting = (period: TimePeriod): string => {
  switch (period) {
    case 'morning': return 'Good morning';
    case 'afternoon': return 'Good afternoon';
    case 'evening': return 'Good evening';
    case 'night': return 'Good night';
  }
};

// Get supportive subtext based on time and context
const getSupportiveText = (period: TimePeriod, babyName: string): string => {
  switch (period) {
    case 'morning':
      return `Here's how ${babyName}'s day is starting`;
    case 'afternoon':
      return `Here's how ${babyName}'s day is going`;
    case 'evening':
      return `Winding down with ${babyName}`;
    case 'night':
      return `You're doing amazing`;
  }
};

interface RosieHeaderProps {
  baby: BabyProfile;
  developmentalInfo: DevelopmentalInfo;
  userSettings?: UserSettings;
  onTimePeriodChange?: (period: TimePeriod) => void;
  onWeatherChange?: (weather: WeatherData | null) => void;
  onProfileClick?: () => void;
}

export const RosieHeader: React.FC<RosieHeaderProps> = ({ baby, developmentalInfo, userSettings, onTimePeriodChange, onWeatherChange, onProfileClick }) => {
  const { ageDisplay, weekNumber, ageInDays } = developmentalInfo;
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
      const data = await response.json();
      setWeather(data);
      onWeatherChange?.(data);
    } catch (error) {
      console.error('Error fetching weather:', error);
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
    const interval = setInterval(updateTime, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [timePeriod, onTimePeriodChange]);

  // Notify parent of initial time period
  useEffect(() => {
    onTimePeriodChange?.(timePeriod);
  }, []);

  // Format time (e.g., "1:45 PM")
  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  // Format date (e.g., "Monday, January 20")
  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
  };

  // Format a friendly day display
  const getDayText = () => {
    if (ageInDays === 0) return 'Born today';
    if (ageInDays === 1) return 'Day 1';
    return `Day ${ageInDays}`;
  };

  const greeting = getGreeting(timePeriod);
  const supportiveText = getSupportiveText(timePeriod, baby.name);

  return (
    <header className={`rosie-header ${timePeriod}`}>
      <div className="rosie-header-content">
        {/* Profile Button - Top Right */}
        {onProfileClick && (
          <button
            className={`rosie-header-profile-btn ${baby.avatarType === 'image' && baby.avatarImage ? 'has-image' : ''}`}
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

        {/* Weather Display - Top Left */}
        {weather && !weatherError && (
          <div className="rosie-header-weather">
            <span className="rosie-weather-icon">{weather.icon}</span>
            <span className="rosie-weather-temp">{weather.temperature}°</span>
            <span className="rosie-weather-condition">{weather.condition}</span>
          </div>
        )}

        {/* Time & Date - Apple Lock Screen style */}
        <div className="rosie-header-datetime">
          <div className="rosie-header-time">{formatTime(currentTime)}</div>
          <div className="rosie-header-date">{formatDate(currentTime)}</div>
        </div>

        {/* Greeting & Welcome Message */}
        <div className="rosie-header-welcome">
          <h1 className="rosie-greeting">{greeting}</h1>
          <p className="rosie-welcome-text">{supportiveText}</p>
        </div>

        {/* Baby age info */}
        <div className="rosie-age">
          <div className="rosie-age-detail">
            <span>{getDayText()}</span>
            <span className="rosie-age-separator" />
            <span>Week {weekNumber}</span>
            <span className="rosie-age-separator" />
            <span>{ageDisplay}</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default RosieHeader;
