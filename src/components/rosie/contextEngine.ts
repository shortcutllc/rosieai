/**
 * contextEngine.ts — Pure functions for the Home surface
 *
 * Computes action card data, insight selection, and today's events
 * for RosieHome.tsx. No React dependencies — just data in, data out.
 */

import { TimelineEvent, DevelopmentalInfo } from './types';
import { TimePeriod } from './RosieHeader';
import { getLeapStatus } from './leapData';
import { getParentWellnessForWeek, getQuickWinsForWeek, getInsightsForWeek } from './expertInsights';

// ─── Interfaces ──────────────────────────────────────────────

export interface ActionCardData {
  type: 'feed' | 'sleep' | 'diaper';
  icon: string;
  label: string;
  timeAgo: string;
  detail: string;
  actionLabel: string;
  color: string;
  gradientFrom: string;
  gradientTo: string;
  actionBg: string;
}

export interface InsightCardData {
  category: string;
  weekLabel: string;
  text: string;
  icon: string;
}

export interface CompactEvent {
  id: string;
  type: 'feed' | 'sleep' | 'diaper' | 'note';
  title: string;
  detail: string;
  time: string;
  icon: string;
  iconBg: string;
  accentColor: string;
}

// ─── Constants ───────────────────────────────────────────────

const TYPE_COLORS = {
  feed: { color: '#FF9500', gradientFrom: '#FF9500', gradientTo: '#FFB340', actionBg: '#FF9500', iconBg: '#FFF8F0' },
  sleep: { color: '#B57BEC', gradientFrom: '#B57BEC', gradientTo: '#D4A5F5', actionBg: '#B57BEC', iconBg: '#FAF5FF' },
  diaper: { color: '#34C759', gradientFrom: '#6DD86D', gradientTo: '#8FE88F', actionBg: '#34C759', iconBg: '#EEFBEE' },
  note: { color: '#007AFF', gradientFrom: '#007AFF', gradientTo: '#4DA3FF', actionBg: '#007AFF', iconBg: '#F0F5FF' },
} as const;

const TYPE_ICONS = {
  feed: '🍼',
  sleep: '💤',
  diaper: '🧷',
  note: '📝',
} as const;

// ─── Time Formatting ─────────────────────────────────────────

/**
 * Format a timestamp as "1h 24m" or "47m" or "< 1m"
 */
export function formatTimeAgoShort(timestamp: string): string {
  const now = new Date();
  const then = new Date(timestamp);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return '< 1m';
  if (diffMins < 60) return `${diffMins}m`;

  const hours = Math.floor(diffMins / 60);
  const mins = diffMins % 60;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

/**
 * Format a time as "2:34 PM"
 */
function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

// ─── Action Cards ────────────────────────────────────────────

function buildFeedDetail(event: TimelineEvent): string {
  const parts: string[] = [];
  if (event.feedType === 'breast') {
    parts.push('Breast');
    if (event.feedLastSide || event.feedSide) {
      parts.push(event.feedLastSide || event.feedSide || '');
    }
  } else if (event.feedType === 'bottle') {
    parts.push('Bottle');
    if (event.feedAmount) parts.push(`${event.feedAmount}oz`);
  } else if (event.feedType === 'solid') {
    parts.push('Solid');
  }
  return parts.join(', ') || 'Feed';
}

function buildSleepDetail(event: TimelineEvent): string {
  const parts: string[] = [];
  if (event.sleepType) {
    parts.push(event.sleepType === 'nap' ? 'Nap' : 'Night');
  }
  if (event.sleepDuration) {
    const h = Math.floor(event.sleepDuration / 60);
    const m = event.sleepDuration % 60;
    if (h > 0 && m > 0) parts.push(`${h}h ${m}m`);
    else if (h > 0) parts.push(`${h}h`);
    else parts.push(`${m}m`);
  }
  return parts.join(', ') || 'Sleep';
}

function buildDiaperDetail(event: TimelineEvent): string {
  if (event.diaperType === 'both') return 'Wet + dirty';
  if (event.diaperType === 'wet') return 'Wet';
  if (event.diaperType === 'dirty') return 'Dirty';
  return 'Diaper';
}

export function getActionCards(
  timeline: TimelineEvent[],
  lastFeedSide?: string
): ActionCardData[] {
  const lastFeed = timeline.find(e => e.type === 'feed');
  const lastSleep = timeline.find(e => e.type === 'sleep');
  const lastDiaper = timeline.find(e => e.type === 'diaper');

  return [
    {
      type: 'feed',
      icon: TYPE_ICONS.feed,
      label: 'LAST FEED',
      timeAgo: lastFeed ? formatTimeAgoShort(lastFeed.timestamp) : '--',
      detail: lastFeed ? buildFeedDetail(lastFeed) : 'No feeds yet',
      actionLabel: '+ Feed',
      ...TYPE_COLORS.feed,
    },
    {
      type: 'sleep',
      icon: TYPE_ICONS.sleep,
      label: 'LAST SLEEP',
      timeAgo: lastSleep ? formatTimeAgoShort(lastSleep.timestamp) : '--',
      detail: lastSleep ? buildSleepDetail(lastSleep) : 'No sleep yet',
      actionLabel: '+ Sleep',
      ...TYPE_COLORS.sleep,
    },
    {
      type: 'diaper',
      icon: TYPE_ICONS.diaper,
      label: 'LAST DIAPER',
      timeAgo: lastDiaper ? formatTimeAgoShort(lastDiaper.timestamp) : '--',
      detail: lastDiaper ? buildDiaperDetail(lastDiaper) : 'No diapers yet',
      actionLabel: '+ Diaper',
      ...TYPE_COLORS.diaper,
    },
  ];
}

// ─── Insight Card ────────────────────────────────────────────

export function getInsightForHome(
  developmentalInfo: DevelopmentalInfo,
  timePeriod: TimePeriod,
  babyName: string
): InsightCardData {
  const { weekNumber, whatToExpect, milestones, commonConcerns, upcomingChanges } = developmentalInfo;

  // Build a pool of possible insights, tagged by category
  const pool: { text: string; category: string; icon: string }[] = [];

  whatToExpect.forEach(text => pool.push({ text, category: 'Development', icon: '🌱' }));
  milestones.forEach(text => pool.push({ text, category: 'Milestone', icon: '⭐' }));
  upcomingChanges.forEach(text => pool.push({ text, category: 'Coming Up', icon: '🔮' }));
  commonConcerns.forEach(text => pool.push({ text, category: 'Good to Know', icon: '💡' }));

  if (pool.length === 0) {
    return {
      category: 'Development',
      weekLabel: `Week ${weekNumber}`,
      text: `${babyName} is growing every day. Every baby develops at their own pace.`,
      icon: '🌱',
    };
  }

  // Deterministic rotation: pick based on date + time period
  // Same insight shows for a given time period on a given day
  const today = new Date();
  const dayHash = today.getFullYear() * 1000 + today.getMonth() * 32 + today.getDate();
  const periodOffset = timePeriod === 'morning' ? 0 : timePeriod === 'afternoon' ? 1 : timePeriod === 'evening' ? 2 : 3;
  const index = (dayHash + periodOffset) % pool.length;

  const selected = pool[index];

  // Personalize: replace "baby" or "your baby" with baby's name
  let personalizedText = selected.text
    .replace(/\byour baby\b/gi, babyName)
    .replace(/\bthe baby\b/gi, babyName)
    .replace(/\bbaby\b/gi, babyName);

  return {
    category: selected.category,
    weekLabel: `Week ${weekNumber}`,
    text: personalizedText,
    icon: selected.icon,
  };
}

// Get carousel insights — one from each "This Week" section
export function getInsightsForCarousel(
  developmentalInfo: DevelopmentalInfo,
  babyName: string,
  _maxItems: number = 6
): InsightCardData[] {
  const { weekNumber, milestones, sleepInfo, feedingInfo } = developmentalInfo;
  const cards: InsightCardData[] = [];

  const personalize = (text: string) =>
    text
      .replace(/\byour baby\b/gi, babyName)
      .replace(/\bthe baby\b/gi, babyName)
      .replace(/\bbaby\b/gi, babyName);

  // 1. Leap / Development status
  const leapStatus = getLeapStatus(weekNumber);
  if (leapStatus.isInLeap && leapStatus.currentLeap) {
    const leap = leapStatus.currentLeap;
    const sign = leap.signsOfLeap?.[0];
    cards.push({
      category: `Leap ${leap.leapNumber}`,
      weekLabel: `Week ${weekNumber}`,
      text: sign
        ? `${leap.name}: ${personalize(sign)}`
        : leap.name,
      icon: '🧠',
    });
  } else if (leapStatus.isSunnyPeriod) {
    cards.push({
      category: 'Sunny Period',
      weekLabel: `Week ${weekNumber}`,
      text: `${babyName} is in a sunny period — enjoy the extra smiles and calm!`,
      icon: '☀️',
    });
  }

  // 2. Milestone
  if (milestones.length > 0) {
    cards.push({
      category: 'Milestone',
      weekLabel: `Week ${weekNumber}`,
      text: personalize(milestones[0]),
      icon: '⭐',
    });
  }

  // 3. Quick Win activity
  const quickWins = getQuickWinsForWeek(weekNumber);
  if (quickWins.length > 0) {
    const win = quickWins[0];
    cards.push({
      category: 'Quick Win',
      weekLabel: `Week ${weekNumber}`,
      text: `${win.activity} (${win.duration}) — ${win.benefit}`,
      icon: '🎯',
    });
  }

  // 4. For You — parent wellness
  const wellness = getParentWellnessForWeek(weekNumber);
  if (wellness) {
    cards.push({
      category: 'For You',
      weekLabel: `Week ${weekNumber}`,
      text: wellness.permissionSlip,
      icon: '💚',
    });
  }

  // 5. Sleep snapshot
  if (sleepInfo) {
    cards.push({
      category: 'Sleep',
      weekLabel: `Week ${weekNumber}`,
      text: `Total sleep: ${sleepInfo.totalSleep} · ${sleepInfo.napCount} · Wake window: ${sleepInfo.wakeWindow}`,
      icon: '💤',
    });
  }

  // 6. Expert insight
  const expertInsights = getInsightsForWeek(weekNumber);
  if (expertInsights.length > 0) {
    const insight = expertInsights[0];
    // Truncate long insights for the card
    const shortInsight = insight.insight.length > 100
      ? insight.insight.substring(0, 97) + '...'
      : insight.insight;
    cards.push({
      category: insight.topic,
      weekLabel: `Week ${weekNumber}`,
      text: `${shortInsight} — ${insight.source}`,
      icon: '📚',
    });
  }

  // Fallback
  if (cards.length === 0) {
    cards.push({
      category: 'Development',
      weekLabel: `Week ${weekNumber}`,
      text: `${babyName} is growing every day. Every baby develops at their own pace.`,
      icon: '🌱',
    });
  }

  return cards;
}

// ─── Today's Events ──────────────────────────────────────────

function isToday(dateStr: string): boolean {
  const date = new Date(dateStr);
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

function buildEventTitle(event: TimelineEvent): string {
  switch (event.type) {
    case 'feed': {
      const typeLabel = event.feedType === 'breast' ? 'Breastfeed' :
                        event.feedType === 'bottle' ? 'Bottle' :
                        event.feedType === 'solid' ? 'Solid food' : 'Feed';
      if (event.feedDuration) {
        return `${typeLabel} · ${event.feedDuration}min`;
      }
      if (event.feedAmount) {
        return `${typeLabel} · ${event.feedAmount}oz`;
      }
      return typeLabel;
    }
    case 'sleep': {
      const sleepLabel = event.sleepType === 'nap' ? 'Nap' : 'Night sleep';
      if (event.sleepDuration) {
        const h = Math.floor(event.sleepDuration / 60);
        const m = event.sleepDuration % 60;
        const durStr = h > 0 ? `${h}h ${m}m` : `${m}m`;
        return `${sleepLabel} · ${durStr}`;
      }
      return sleepLabel;
    }
    case 'diaper': {
      if (event.diaperType === 'both') return 'Wet + dirty diaper';
      if (event.diaperType === 'wet') return 'Wet diaper';
      if (event.diaperType === 'dirty') return 'Dirty diaper';
      return 'Diaper';
    }
    case 'note':
      return 'Note';
    default:
      return '';
  }
}

function buildEventDetail(event: TimelineEvent): string {
  switch (event.type) {
    case 'feed':
      if (event.feedType === 'breast' && (event.feedLastSide || event.feedSide)) {
        return `${(event.feedLastSide || event.feedSide || '').charAt(0).toUpperCase() + (event.feedLastSide || event.feedSide || '').slice(1)} side`;
      }
      return '';
    case 'sleep':
      return event.sleepQuality ? `Quality: ${event.sleepQuality}` : '';
    case 'diaper':
      return '';
    case 'note':
      return event.note || '';
    default:
      return '';
  }
}

export function getTodayEvents(
  timeline: TimelineEvent[],
  limit: number = 5
): CompactEvent[] {
  return timeline
    .filter(e => isToday(e.timestamp))
    .slice(0, limit)
    .map(event => ({
      id: event.id,
      type: event.type,
      title: buildEventTitle(event),
      detail: buildEventDetail(event),
      time: formatTime(event.timestamp),
      icon: TYPE_ICONS[event.type],
      iconBg: TYPE_COLORS[event.type].iconBg,
      accentColor: TYPE_COLORS[event.type].color,
    }));
}

// ─── Today's Stats ──────────────────────────────────────────

export interface TodayStats {
  feedCount: number;
  sleepMinutes: number;
  diaperCount: number;
  breastFeedCount: number;
  bottleFeedCount: number;
  napCount: number;
  nightSleepMinutes: number;
  wetDiapers: number;
  dirtyDiapers: number;
}

export function getTodayStats(timeline: TimelineEvent[]): TodayStats {
  const todayEvents = timeline.filter(e => isToday(e.timestamp));

  const stats: TodayStats = {
    feedCount: 0,
    sleepMinutes: 0,
    diaperCount: 0,
    breastFeedCount: 0,
    bottleFeedCount: 0,
    napCount: 0,
    nightSleepMinutes: 0,
    wetDiapers: 0,
    dirtyDiapers: 0,
  };

  for (const event of todayEvents) {
    switch (event.type) {
      case 'feed':
        stats.feedCount++;
        if (event.feedType === 'breast') stats.breastFeedCount++;
        else if (event.feedType === 'bottle') stats.bottleFeedCount++;
        break;
      case 'sleep':
        stats.sleepMinutes += event.sleepDuration || 0;
        if (event.sleepType === 'nap') {
          stats.napCount++;
        } else {
          stats.nightSleepMinutes += event.sleepDuration || 0;
        }
        break;
      case 'diaper':
        stats.diaperCount++;
        if (event.diaperType === 'wet') stats.wetDiapers++;
        else if (event.diaperType === 'dirty') stats.dirtyDiapers++;
        else if (event.diaperType === 'both') {
          stats.wetDiapers++;
          stats.dirtyDiapers++;
        }
        break;
    }
  }

  return stats;
}

export function getExpectedValues(birthDateString: string): { feeds: number; sleepMinutes: number; diapers: number } {
  const birth = new Date(birthDateString);
  const now = new Date();
  const ageInDays = Math.floor((now.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24));

  if (ageInDays < 14) return { feeds: 10, sleepMinutes: 960, diapers: 10 };
  if (ageInDays < 60) return { feeds: 8, sleepMinutes: 900, diapers: 8 };
  if (ageInDays < 120) return { feeds: 7, sleepMinutes: 840, diapers: 7 };
  return { feeds: 6, sleepMinutes: 780, diapers: 6 };
}
