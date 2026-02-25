import { Handler } from '@netlify/functions';
import Anthropic from '@anthropic-ai/sdk';

// Strip lone surrogates that produce invalid JSON (causes Anthropic API 400/500 errors)
const sanitizeString = (str: string): string =>
  str.replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, '');

// Types from the frontend
interface CatchUpData {
  feedingMethod?: 'breast' | 'bottle' | 'both' | 'pumping';
  solidFoods?: boolean;
  sleepBaseline?: {
    napsPerDay?: number;
    bedtime?: string;
    nightWakings?: number;
    sleepMethod?: 'contact' | 'crib' | 'cosleep' | 'bassinet';
  };
  milestonesChecked?: string[];
  concerns?: string[];
  parentConcernText?: string;
  completedTopics?: string[];
  completedAt?: string;
}

interface MilestoneRecord {
  milestoneId: string;
  status: 'done' | 'emerging' | 'next';
  notedAt?: string;
}

interface BabyProfile {
  name: string;
  birthDate: string;
  dueDate?: string;
  gender?: 'boy' | 'girl' | 'other';
  birthWeight?: number; // in oz
  weightUnit?: string;
  catchUpData?: CatchUpData;
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
  milestoneRecords?: MilestoneRecord[];
  parentName?: string;
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

// Build catch-up quiz context
const buildCatchUpContext = (catchUpData?: CatchUpData): string => {
  if (!catchUpData) return '';

  const lines: string[] = ['## What the Parent Has Told You'];

  if (catchUpData.feedingMethod) {
    const methodLabels: Record<string, string> = {
      breast: 'breastfeeding',
      bottle: 'bottle feeding (formula)',
      both: 'combination of breast and bottle',
      pumping: 'pumping/expressed milk',
    };
    lines.push(`- **Feeding:** ${methodLabels[catchUpData.feedingMethod] || catchUpData.feedingMethod}`);
    if (catchUpData.solidFoods) {
      lines.push(`- **Solid foods:** Started`);
    }
  }

  if (catchUpData.sleepBaseline) {
    const sleep = catchUpData.sleepBaseline;
    const parts: string[] = [];
    if (sleep.napsPerDay !== undefined) parts.push(`${sleep.napsPerDay} naps/day`);
    if (sleep.bedtime) parts.push(`bedtime around ${sleep.bedtime}`);
    if (sleep.nightWakings !== undefined) parts.push(`${sleep.nightWakings} night waking${sleep.nightWakings !== 1 ? 's' : ''}`);
    if (sleep.sleepMethod) {
      const methodLabels: Record<string, string> = {
        contact: 'contact napping',
        crib: 'crib/bassinet sleep',
        cosleep: 'co-sleeping',
        bassinet: 'bassinet sleep',
      };
      parts.push(methodLabels[sleep.sleepMethod] || sleep.sleepMethod);
    }
    if (parts.length > 0) {
      lines.push(`- **Sleep:** ${parts.join(', ')}`);
    }
  }

  if (catchUpData.concerns && catchUpData.concerns.length > 0) {
    lines.push(`- **Parent's concerns:** ${catchUpData.concerns.join(', ')}`);
  }
  if (catchUpData.parentConcernText) {
    lines.push(`- **In their words:** "${catchUpData.parentConcernText}"`);
  }

  return lines.length > 1 ? lines.join('\n') : '';
};

// Build milestone progress context
const buildMilestoneContext = (milestoneRecords?: MilestoneRecord[]): string => {
  if (!milestoneRecords || milestoneRecords.length === 0) return '';

  const done = milestoneRecords.filter(m => m.status === 'done');
  const emerging = milestoneRecords.filter(m => m.status === 'emerging');

  const lines: string[] = ['## Milestone Progress'];

  if (done.length > 0) {
    // Show readable milestone IDs (convert snake_case to words)
    const readableIds = done.map(m =>
      m.milestoneId.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    );
    lines.push(`- **Completed (${done.length}):** ${readableIds.slice(0, 8).join(', ')}${done.length > 8 ? '...' : ''}`);
  }

  if (emerging.length > 0) {
    const readableIds = emerging.map(m =>
      m.milestoneId.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    );
    lines.push(`- **Emerging (${emerging.length}):** ${readableIds.join(', ')}`);
  }

  return lines.join('\n');
};

// Calculate adjusted age display for premature babies
const getAdjustedAgeContext = (baby: BabyProfile): string => {
  if (!baby.dueDate) return '';

  const birth = new Date(baby.birthDate);
  const due = new Date(baby.dueDate);
  const earlyMs = due.getTime() - birth.getTime();
  const earlyDays = Math.floor(earlyMs / (1000 * 60 * 60 * 24));

  // Only relevant if born more than 3 weeks early
  if (earlyDays <= 21) return '';

  const weeksEarly = Math.floor(earlyDays / 7);
  const now = new Date();
  const adjustedDays = Math.max(0, Math.floor((now.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24)) - earlyDays);
  const adjustedWeeks = Math.floor(adjustedDays / 7);

  return `\n**IMPORTANT — ${baby.name} was born ${weeksEarly} weeks early.** Adjusted age is ${adjustedWeeks} weeks. Use adjusted age for developmental expectations, milestones, and feeding/sleep guidance. This is critical — don't hold a preemie to full-term timelines.`;
};

// Build the system prompt with all context
const buildSystemPrompt = (baby: BabyProfile, developmentalInfo: DevelopmentalInfo, timeline: TimelineEvent[], growthMeasurements?: GrowthMeasurement[], weather?: WeatherData, milestoneRecords?: MilestoneRecord[], parentName?: string): string => {
  const { ageDisplay, weekNumber, sleepInfo, feedingInfo, whatToExpect, milestones, commonConcerns, upcomingChanges } = developmentalInfo;

  const parentRef = parentName ? `${parentName} (${baby.name}'s parent)` : `${baby.name}'s parent`;

  return `You are RosieAI — a calm, experienced friend who happens to know a lot about babies. You're the person a new parent texts at 2am when they're worried and exhausted. You've been through this. You get it.

You're talking to ${parentRef}. ${baby.name} is ${ageDisplay} old (week ${weekNumber}, born ${new Date(baby.birthDate).toLocaleDateString()}${baby.gender ? `, ${baby.gender}` : ''}).${getAdjustedAgeContext(baby)}

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

${buildCatchUpContext(baby.catchUpData)}

${buildMilestoneContext(milestoneRecords)}

HOW TO TALK:
- Sound like a real person, not a chatbot. Short sentences. Contractions. Casual but not sloppy.
- Start with empathy or acknowledgment when the parent sounds stressed or unsure — don't jump straight to advice.
- Use ${baby.name}'s name naturally, like a friend would. Not in every sentence.${parentName ? `\n- You can call the parent "${parentName}" occasionally — like a friend would. Don't overdo it.` : ''}
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
- No emojis unless they use them first.

LOGGING EVENTS:
When a parent tells you about a feed, sleep, or diaper change they just did or are doing, use the log_event tool to record it. Don't ask "would you like me to log that?" — just log it. After logging, confirm naturally what you recorded: "Got it — logged a 15-minute feed on the left side." If details are missing, make reasonable assumptions based on their patterns and the time of day. Examples of things to log: "just fed on the left, 15 min", "she napped for 40 minutes", "dirty diaper", "bottle at 2pm, 4oz". Examples of things NOT to log: "he's been fussy today", "when should I introduce solids?", general questions or concerns.`;
};

// Tool definition for event logging via conversation
const LOG_EVENT_TOOL: Anthropic.Tool = {
  name: 'log_event',
  description: 'Log a baby care event (feed, sleep, or diaper change) to the timeline when the parent describes an activity they did or are doing. Only call this when the parent clearly describes a loggable event — not for questions, concerns, or general conversation.',
  input_schema: {
    type: 'object' as const,
    properties: {
      type: {
        type: 'string',
        enum: ['feed', 'sleep', 'diaper'],
        description: 'The type of event to log',
      },
      feedType: {
        type: 'string',
        enum: ['breast', 'bottle', 'solid'],
        description: 'Type of feed. Only for feed events. Default to breast if not specified.',
      },
      feedSide: {
        type: 'string',
        enum: ['left', 'right', 'both'],
        description: 'Breast side. Only for breastfeeds.',
      },
      feedAmount: {
        type: 'number',
        description: 'Bottle amount in oz. Only for bottle feeds.',
      },
      feedDuration: {
        type: 'number',
        description: 'Feed duration in minutes.',
      },
      sleepType: {
        type: 'string',
        enum: ['nap', 'night'],
        description: 'Type of sleep. Default to nap during day hours, night during evening/night.',
      },
      sleepDuration: {
        type: 'number',
        description: 'Sleep duration in minutes.',
      },
      diaperType: {
        type: 'string',
        enum: ['wet', 'dirty', 'both'],
        description: 'Diaper type.',
      },
      note: {
        type: 'string',
        description: 'Optional note about the event.',
      },
      eventTime: {
        type: 'string',
        description: 'When the event occurred, in HH:MM 24-hour format (e.g., "14:00" for 2pm). If not specified, assume now.',
      },
    },
    required: ['type'],
  },
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

    const { message, baby, timeline, developmentalInfo, chatHistory, growthMeasurements, weather, milestoneRecords, parentName } = JSON.parse(event.body || '{}') as ChatRequest;

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

    const systemPrompt = sanitizeString(buildSystemPrompt(baby, developmentalInfo, timeline, growthMeasurements, weather, milestoneRecords, parentName));

    // Sanitize all messages to strip lone surrogates from user/timeline data
    const sanitizedMessages = messages.map(m => ({ ...m, content: typeof m.content === 'string' ? sanitizeString(m.content) : m.content }));

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      messages: sanitizedMessages,
      tools: [LOG_EVENT_TOOL],
    });

    // Check if Claude wants to use the log_event tool
    const toolUseBlock = response.content.find(
      (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use'
    );

    // Also check for multiple tool uses (e.g., "fed and changed a diaper")
    const allToolUses = response.content.filter(
      (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use'
    );

    if (toolUseBlock && allToolUses.length > 0) {
      // Claude wants to log event(s) — process tool use and get conversational response
      const events: Record<string, unknown>[] = [];

      // Build tool results for all tool uses
      const toolResults: Anthropic.ToolResultBlockParam[] = allToolUses.map(tu => {
        const input = tu.input as Record<string, unknown>;
        events.push(input);
        return {
          type: 'tool_result' as const,
          tool_use_id: tu.id,
          content: `Event logged successfully: ${input.type}${input.feedType ? ` (${input.feedType})` : ''}${input.feedSide ? `, ${input.feedSide} side` : ''}${input.feedDuration ? `, ${input.feedDuration}min` : ''}${input.feedAmount ? `, ${input.feedAmount}oz` : ''}${input.sleepType ? ` (${input.sleepType})` : ''}${input.sleepDuration ? `, ${input.sleepDuration}min` : ''}${input.diaperType ? ` (${input.diaperType})` : ''}`,
        };
      });

      // Second call: get conversational response after tool use
      const followUp = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: systemPrompt,
        messages: [
          ...messages,
          { role: 'assistant' as const, content: response.content },
          { role: 'user' as const, content: toolResults },
        ],
        tools: [LOG_EVENT_TOOL],
      });

      const assistantMessage = followUp.content.find(
        (block): block is Anthropic.TextBlock => block.type === 'text'
      )?.text || 'Logged!';

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          message: assistantMessage,
          events: events,
        }),
      };
    }

    // No tool use — regular conversational response
    const assistantMessage = response.content.find(
      (block): block is Anthropic.TextBlock => block.type === 'text'
    )?.text || 'I apologize, but I was unable to generate a response.';

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
