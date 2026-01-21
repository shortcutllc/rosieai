import { Handler } from '@netlify/functions';

interface WeatherResponse {
  temperature: number;
  condition: string;
  icon: string;
  humidity: number;
  feelsLike: number;
  high: number;
  low: number;
  location: string;
}

// Map WMO weather codes to conditions and icons
// https://open-meteo.com/en/docs#weathervariables
const getWeatherInfo = (weatherCode: number, isDay: boolean): { condition: string; icon: string } => {
  // Clear
  if (weatherCode === 0) {
    return { condition: 'Clear', icon: isDay ? '☀️' : '🌙' };
  }
  // Mainly clear, partly cloudy
  if (weatherCode === 1 || weatherCode === 2) {
    return { condition: 'Partly Cloudy', icon: isDay ? '⛅' : '☁️' };
  }
  // Overcast
  if (weatherCode === 3) {
    return { condition: 'Cloudy', icon: '☁️' };
  }
  // Fog
  if (weatherCode === 45 || weatherCode === 48) {
    return { condition: 'Foggy', icon: '🌫️' };
  }
  // Drizzle
  if (weatherCode >= 51 && weatherCode <= 57) {
    return { condition: 'Drizzle', icon: '🌧️' };
  }
  // Rain
  if (weatherCode >= 61 && weatherCode <= 67) {
    return { condition: 'Rain', icon: '🌧️' };
  }
  // Snow
  if (weatherCode >= 71 && weatherCode <= 77) {
    return { condition: 'Snow', icon: '❄️' };
  }
  // Rain showers
  if (weatherCode >= 80 && weatherCode <= 82) {
    return { condition: 'Showers', icon: isDay ? '🌦️' : '🌧️' };
  }
  // Snow showers
  if (weatherCode === 85 || weatherCode === 86) {
    return { condition: 'Snow Showers', icon: '🌨️' };
  }
  // Thunderstorm
  if (weatherCode >= 95 && weatherCode <= 99) {
    return { condition: 'Thunderstorm', icon: '⛈️' };
  }

  return { condition: 'Unknown', icon: '🌡️' };
};

const handler: Handler = async (event) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
      },
      body: '',
    };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const location = event.queryStringParameters?.location || 'New York, NY';

    // Step 1: Geocode the location using Open-Meteo's geocoding API (free, no key)
    const geocodeUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1&language=en&format=json`;

    const geocodeResponse = await fetch(geocodeUrl);
    if (!geocodeResponse.ok) {
      throw new Error('Geocoding failed');
    }

    const geocodeData = await geocodeResponse.json();

    if (!geocodeData.results || geocodeData.results.length === 0) {
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Location not found' }),
      };
    }

    const { latitude, longitude, name, admin1, country } = geocodeData.results[0];
    const locationName = admin1 ? `${name}, ${admin1}` : `${name}, ${country}`;

    // Step 2: Get weather from Open-Meteo (free, no key)
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,is_day&daily=temperature_2m_max,temperature_2m_min&temperature_unit=fahrenheit&timezone=auto`;

    const weatherResponse = await fetch(weatherUrl);
    if (!weatherResponse.ok) {
      throw new Error('Weather API failed');
    }

    const weatherData = await weatherResponse.json();
    const current = weatherData.current;
    const daily = weatherData.daily;

    const isDay = current.is_day === 1;
    const { condition, icon } = getWeatherInfo(current.weather_code, isDay);

    const response: WeatherResponse = {
      temperature: Math.round(current.temperature_2m),
      condition,
      icon,
      humidity: current.relative_humidity_2m,
      feelsLike: Math.round(current.apparent_temperature),
      high: Math.round(daily.temperature_2m_max[0]),
      low: Math.round(daily.temperature_2m_min[0]),
      location: locationName,
    };

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=600', // Cache for 10 minutes
      },
      body: JSON.stringify(response),
    };
  } catch (error) {
    console.error('Error fetching weather:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'Failed to fetch weather',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
    };
  }
};

export { handler };
