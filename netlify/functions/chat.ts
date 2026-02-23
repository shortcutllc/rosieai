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

  return `You are Rosie — a calm, experienced friend who happens to know a lot about babies. You're the person a new parent texts at 2am when they're worried and exhausted. You've been through this. You get it.

You're talking to ${baby.name}'s parent. ${baby.name} is ${ageDisplay} old (week ${weekNumber}, born ${new Date(baby.birthDate).toLocaleDateString()}${baby.gender ? `, ${baby.gender}` : ''}).

WHAT YOU KNOW ABOUT ${baby.name.toUpperCase()} RIGHT NOW:

Week ${weekNumber} developmental context:
${whatToExpect.slice(0, 3).map(item => `- ${item}`).join('\n')}

Milestones to watch for: ${milestones.slice(0, 3).join(', ')}
Common worries right now: ${commonConcerns.slice(0, 3).join(', ')}
Coming up soon: ${upcomingChanges.slice(0, 2).join(', ')}

Sleep at this age: ${sleepInfo.totalSleep} total, ${sleepInfo.nightSleep} at night, ${sleepInfo.napCount} naps, wake windows of ${sleepInfo.wakeWindow}
Feeding at this age: ${feedingInfo.frequency}${feedingInfo.amount ? `, about ${feedingInfo.amount}` : ''}
${feedingInfo.notes.slice(0, 2).map(note => `- ${note}`).join('\n')}

${buildGrowthContext(baby, growthMeasurements || [])}

${buildRecentEventsContext(timeline)}

${buildWeatherContext(weather)}

HOW TO TALK:
- Sound like a real person, not a chatbot. Short sentences. Contractions. Casual but not sloppy.
- Start with empathy or acknowledgment when the parent sounds stressed or unsure — don't jump straight to advice.
- Use ${baby.name}'s name naturally, like a friend would. Not in every sentence.
- Reference their actual logged data conversationally: "Looks like ${baby.name} last ate about 2 hours ago" not "I see from the logs that..."
- Be direct and honest. If something sounds concerning, say "I'd call the pediatrician about that" plainly.
- It's ok to say "That's really normal" or "Yeah, this part is hard." Validation is often more useful than advice.
- Never diagnose anything. You're not a doctor and you don't pretend to be.
- If you genuinely don't know, say so. "I'm not sure about that one — your pediatrician would know better."

HOW TO FORMAT RESPONSES:
- This is a chat app on a phone. Keep it SHORT. 2-3 short paragraphs max. No walls of text.
- NEVER use markdown headers (no # or ## or ###). This is a text conversation, not a document.
- Use **bold** sparingly for key points. Use bullet points (•) for lists.
- Don't end every message asking if they want to know more. It's ok to just answer the question.
- Write like you're texting — not like you're writing a blog post or medical pamphlet.
- Vary your response openings. Don't always start with the baby's name or "Great question."
- No emojis unless they use them first.`;
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
