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

// Map OpenWeatherMap condition codes to simple icons
const getWeatherIcon = (iconCode: string, condition: string): string => {
  // OpenWeatherMap icon codes: https://openweathermap.org/weather-conditions
  const code = iconCode.substring(0, 2);
  const isDay = iconCode.endsWith('d');

  switch (code) {
    case '01': return isDay ? '☀️' : '🌙'; // clear
    case '02': return isDay ? '⛅' : '☁️'; // few clouds
    case '03': return '☁️'; // scattered clouds
    case '04': return '☁️'; // broken clouds
    case '09': return '🌧️'; // shower rain
    case '10': return isDay ? '🌦️' : '🌧️'; // rain
    case '11': return '⛈️'; // thunderstorm
    case '13': return '❄️'; // snow
    case '50': return '🌫️'; // mist/fog
    default: return '🌡️';
  }
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
    const apiKey = process.env.OPENWEATHER_API_KEY;

    if (!apiKey) {
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Weather API key not configured' }),
      };
    }

    const location = event.queryStringParameters?.location || 'New York, NY';
    const units = event.queryStringParameters?.units || 'imperial'; // imperial for Fahrenheit

    // Get current weather
    const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(location)}&units=${units}&appid=${apiKey}`;

    const weatherResponse = await fetch(weatherUrl);

    if (!weatherResponse.ok) {
      const errorData = await weatherResponse.json().catch(() => ({}));
      console.error('Weather API error:', errorData);

      if (weatherResponse.status === 404) {
        return {
          statusCode: 404,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Location not found' }),
        };
      }

      throw new Error('Failed to fetch weather data');
    }

    const data = await weatherResponse.json();

    const response: WeatherResponse = {
      temperature: Math.round(data.main.temp),
      condition: data.weather[0].main,
      icon: getWeatherIcon(data.weather[0].icon, data.weather[0].main),
      humidity: data.main.humidity,
      feelsLike: Math.round(data.main.feels_like),
      high: Math.round(data.main.temp_max),
      low: Math.round(data.main.temp_min),
      location: `${data.name}${data.sys.country ? `, ${data.sys.country}` : ''}`,
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
