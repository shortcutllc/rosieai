import { Handler } from '@netlify/functions';
import Anthropic from '@anthropic-ai/sdk';

// Types from the frontend
interface BabyProfile {
  name: string;
  birthDate: string;
  gender?: 'boy' | 'girl' | 'other';
  birthWeight?: number; // in oz
  weightUnit?: string;
}

interface GrowthMeasurement {
  id: string;
  timestamp: string;
  measurementDate?: string;
  weight?: number;
  length?: number;
  headCircumference?: number;
  note?: string;
}

interface TimelineEvent {
  id: string;
  timestamp: string;
  type: 'feed' | 'sleep' | 'diaper' | 'note';
  startTime?: string;
  endTime?: string;
  feedType?: 'breast' | 'bottle' | 'solid';
  feedSide?: 'left' | 'right' | 'both';
  feedAmount?: number;
  feedDuration?: number;
  feedLeftDuration?: number;
  feedRightDuration?: number;
  sleepType?: 'nap' | 'night';
  sleepDuration?: number;
  sleepQuality?: 'good' | 'restless' | 'poor';
  diaperType?: 'wet' | 'dirty' | 'both';
  note?: string;
}

interface DevelopmentalInfo {
  ageInDays: number;
  ageInWeeks: number;
  ageInMonths: number;
  ageDisplay: string;
  weekNumber: number;
  milestones: string[];
  whatToExpect: string[];
  commonConcerns: string[];
  sleepInfo: {
    totalSleep: string;
    nightSleep: string;
    napCount: string;
    wakeWindow: string;
  };
  feedingInfo: {
    frequency: string;
    amount?: string;
    notes: string[];
  };
  upcomingChanges: string[];
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface WeatherData {
  temperature: number;
  condition: string;
  icon: string;
  humidity?: number;
  feelsLike?: number;
  high?: number;
  low?: number;
  location?: string;
}

interface ChatRequest {
  message: string;
  baby: BabyProfile;
  timeline: TimelineEvent[];
  developmentalInfo: DevelopmentalInfo;
  chatHistory: ChatMessage[];
  growthMeasurements?: GrowthMeasurement[];
  weather?: WeatherData;
}

// Helper to format duration
const formatDuration = (minutes: number): string => {
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hrs > 0) {
    return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
  }
  return `${mins}m`;
};

// Helper to format time ago
const formatTimeAgo = (timestamp: string): string => {
  const now = new Date();
  const time = new Date(timestamp);
  const diffMs = now.getTime() - time.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return time.toLocaleDateString();
};

// Build context from recent events
const buildRecentEventsContext = (timeline: TimelineEvent[]): string => {
  if (timeline.length === 0) return 'No events logged yet.';

  const last24h = timeline.filter(e => {
    const eventTime = new Date(e.timestamp).getTime();
    const now = Date.now();
    return now - eventTime < 24 * 60 * 60 * 1000;
  });

  const feeds = last24h.filter(e => e.type === 'feed');
  const sleeps = last24h.filter(e => e.type === 'sleep');
  const diapers = last24h.filter(e => e.type === 'diaper');

  const lines: string[] = ['## Recent Activity (last 24 hours)'];

  // Last feed
  const lastFeed = feeds[0];
  if (lastFeed) {
    let feedDesc = `Last feed: ${formatTimeAgo(lastFeed.timestamp)}`;
    if (lastFeed.feedType === 'breast') {
      feedDesc += ` (breastfeed${lastFeed.feedSide ? `, ${lastFeed.feedSide} side` : ''}${lastFeed.feedDuration ? `, ${lastFeed.feedDuration}min` : ''})`;
    } else if (lastFeed.feedType === 'bottle') {
      feedDesc += ` (bottle${lastFeed.feedAmount ? `, ${lastFeed.feedAmount}oz` : ''})`;
    } else if (lastFeed.feedType === 'solid') {
      feedDesc += ' (solid food)';
    }
    lines.push(feedDesc);
  }

  // Last sleep
  const lastSleep = sleeps[0];
  if (lastSleep) {
    let sleepDesc = `Last sleep: ${formatTimeAgo(lastSleep.timestamp)}`;
    sleepDesc += ` (${lastSleep.sleepType || 'nap'}${lastSleep.sleepDuration ? `, ${formatDuration(lastSleep.sleepDuration)}` : ''}${lastSleep.sleepQuality ? `, ${lastSleep.sleepQuality} quality` : ''})`;
    lines.push(sleepDesc);
  }

  // Last diaper
  const lastDiaper = diapers[0];
  if (lastDiaper) {
    lines.push(`Last diaper: ${formatTimeAgo(lastDiaper.timestamp)} (${lastDiaper.diaperType})`);
  }

  // Summary stats
  lines.push('');
  lines.push('### 24-hour summary:');
  lines.push(`- Feeds: ${feeds.length}`);
  const totalFeedMins = feeds.reduce((sum, f) => sum + (f.feedDuration || 0), 0);
  if (totalFeedMins > 0) lines.push(`- Total feeding time: ${formatDuration(totalFeedMins)}`);
  lines.push(`- Sleep sessions: ${sleeps.length}`);
  const totalSleepMins = sleeps.reduce((sum, s) => sum + (s.sleepDuration || 0), 0);
  if (totalSleepMins > 0) lines.push(`- Total sleep: ${formatDuration(totalSleepMins)}`);
  lines.push(`- Diapers: ${diapers.length} (${diapers.filter(d => d.diaperType === 'wet' || d.diaperType === 'both').length} wet, ${diapers.filter(d => d.diaperType === 'dirty' || d.diaperType === 'both').length} dirty)`);

  return lines.join('\n');
};

// Helper to format weight from oz to lbs/oz display
const formatWeight = (oz: number): string => {
  const lbs = Math.floor(oz / 16);
  const remainingOz = Math.round(oz % 16);
  if (lbs === 0) return `${remainingOz} oz`;
  if (remainingOz === 0) return `${lbs} lbs`;
  return `${lbs} lbs ${remainingOz} oz`;
};

// Build growth context from measurements
const buildGrowthContext = (baby: BabyProfile, measurements: GrowthMeasurement[]): string => {
  const lines: string[] = ['## Growth Information'];

  // Birth weight
  if (baby.birthWeight) {
    lines.push(`- **Birth weight:** ${formatWeight(baby.birthWeight)}`);
  }

  // Latest measurements
  if (measurements && measurements.length > 0) {
    const latest = measurements[0]; // Assuming sorted newest first
    lines.push('');
    lines.push('### Most Recent Measurements:');
    const measureDate = latest.measurementDate
      ? new Date(latest.measurementDate).toLocaleDateString()
      : new Date(latest.timestamp).toLocaleDateString();
    lines.push(`- **Date:** ${measureDate}`);
    if (latest.weight) {
      lines.push(`- **Weight:** ${formatWeight(latest.weight)}`);
    }
    if (latest.length) {
      lines.push(`- **Length:** ${latest.length} inches`);
    }
    if (latest.headCircumference) {
      lines.push(`- **Head circumference:** ${latest.headCircumference} inches`);
    }

    // Calculate weight gain if we have birth weight and current weight
    if (baby.birthWeight && latest.weight) {
      const gainOz = latest.weight - baby.birthWeight;
      lines.push(`- **Weight gain since birth:** ${formatWeight(Math.abs(gainOz))} ${gainOz >= 0 ? 'gained' : 'lost'}`);
    }

    // Show history summary if multiple measurements
    if (measurements.length > 1) {
      lines.push(`- **Total measurements recorded:** ${measurements.length}`);
    }
  }

  return lines.length > 1 ? lines.join('\n') : '';
};

// Build weather context
const buildWeatherContext = (weather?: WeatherData): string => {
  if (!weather) return '';

  const lines: string[] = ['## Current Weather'];
  lines.push(`- **Location:** ${weather.location || 'Unknown'}`);
  lines.push(`- **Temperature:** ${weather.temperature}°F (feels like ${weather.feelsLike || weather.temperature}°F)`);
  lines.push(`- **Conditions:** ${weather.condition}`);
  if (weather.high && weather.low) {
    lines.push(`- **High/Low:** ${weather.high}°F / ${weather.low}°F`);
  }

  return lines.join('\n');
};

// Build the system prompt with all context
const buildSystemPrompt = (baby: BabyProfile, developmentalInfo: DevelopmentalInfo, timeline: TimelineEvent[], growthMeasurements?: GrowthMeasurement[], weather?: WeatherData): string => {
  const { ageDisplay, weekNumber, sleepInfo, feedingInfo, whatToExpect, milestones, commonConcerns, upcomingChanges } = developmentalInfo;

  return `You are Rosie, a warm, knowledgeable, and supportive AI assistant for new parents. You provide evidence-based guidance on infant care, development, sleep, and feeding.

## About the Baby
- **Name:** ${baby.name}
- **Age:** ${ageDisplay} (Week ${weekNumber})
- **Birth Date:** ${new Date(baby.birthDate).toLocaleDateString()}
${baby.gender ? `- **Gender:** ${baby.gender}` : ''}

## Developmental Stage (Week ${weekNumber})
### What's typical at this age:
${whatToExpect.map(item => `- ${item}`).join('\n')}

### Expected milestones:
${milestones.map(item => `- ${item}`).join('\n')}

### Common concerns at this age:
${commonConcerns.map(item => `- ${item}`).join('\n')}

### Upcoming changes:
${upcomingChanges.map(item => `- ${item}`).join('\n')}

## Sleep Guidelines for Week ${weekNumber}
- Total sleep: ${sleepInfo.totalSleep}
- Night sleep: ${sleepInfo.nightSleep}
- Naps: ${sleepInfo.napCount}
- Wake windows: ${sleepInfo.wakeWindow}

## Feeding Guidelines for Week ${weekNumber}
- Frequency: ${feedingInfo.frequency}
${feedingInfo.amount ? `- Amount: ${feedingInfo.amount}` : ''}
${feedingInfo.notes.map(note => `- ${note}`).join('\n')}

${buildGrowthContext(baby, growthMeasurements || [])}

${buildRecentEventsContext(timeline)}

${buildWeatherContext(weather)}

## Your Personality & Approach
- Be warm, empathetic, and reassuring - new parenthood is hard
- Use the baby's name (${baby.name}) naturally in responses
- Reference their actual logged data when relevant (e.g., "I see ${baby.name} last fed 2 hours ago...")
- Acknowledge parents' feelings and validate their concerns
- Provide specific, actionable advice tailored to the baby's age
- Be honest when something warrants a call to the pediatrician
- Never diagnose medical conditions - guide them to seek professional help when appropriate
- Keep responses focused and scannable (use bullet points, bold for key points)
- If you don't know something, say so rather than making things up

## Response Format
- Use markdown formatting (bold, bullets, etc.) for readability
- Keep responses concise but thorough (2-4 paragraphs typically)
- End with a follow-up question or offer to elaborate when appropriate
- If the parent seems stressed, acknowledge their feelings first before giving advice`;
};

const handler: Handler = async (event) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'API key not configured' }),
      };
    }

    const { message, baby, timeline, developmentalInfo, chatHistory, growthMeasurements, weather } = JSON.parse(event.body || '{}') as ChatRequest;

    if (!message || !baby || !developmentalInfo) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Missing required fields' }),
      };
    }

    const anthropic = new Anthropic({ apiKey });

    // Build conversation history for Claude
    const messages: { role: 'user' | 'assistant'; content: string }[] = [];

    // Add recent chat history (last 10 messages for context)
    const recentHistory = chatHistory.slice(-10);
    for (const msg of recentHistory) {
      messages.push({
        role: msg.role,
        content: msg.content,
      });
    }

    // Add the new user message
    messages.push({
      role: 'user',
      content: message,
    });

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: buildSystemPrompt(baby, developmentalInfo, timeline, growthMeasurements, weather),
      messages,
    });

    const assistantMessage = response.content[0].type === 'text'
      ? response.content[0].text
      : 'I apologize, but I was unable to generate a response.';

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ message: assistantMessage }),
    };
  } catch (error) {
    console.error('Error calling Claude API:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'Failed to generate response',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
    };
  }
};

export { handler };
