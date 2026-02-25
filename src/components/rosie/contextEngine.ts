/**
 * contextEngine.ts — Pure functions for the Home surface
 *
 * Computes action card data, insight selection, today's events,
 * and adjusted age calculations for RosieHome.tsx.
 * No React dependencies — just data in, data out.
 */

import { TimelineEvent, DevelopmentalInfo, WeatherData } from './types';
import { TimePeriod } from './RosieHeader';
import { getLeapStatus } from './leapData';
import { getParentWellnessForWeek, getQuickWinsForWeek, getInsightsForWeek } from './expertInsights';
import { isBadWeather, getTodaysActivities } from './dailyActivities';

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

// ─── Smart Prompt ────────────────────────────────────────────

export interface SmartPromptData {
  type: 'feed' | 'sleep' | 'diaper';
  title: string;
  subtitle: string;
  icon: string;
  iconColor: string;
  iconBg: string;
}

/**
 * Generate a contextual "smart prompt" suggestion based on timeline patterns.
 * Shows the most relevant next action (e.g., "Start Feed — Right Side").
 */
export function getSmartPromptData(
  timeline: TimelineEvent[],
  lastFeedSide?: string,
  babyName?: string
): SmartPromptData | null {
  const now = new Date();

  // Find last events of each type
  const lastFeed = timeline.find(e => e.type === 'feed');
  const lastSleep = timeline.find(e => e.type === 'sleep');
  const lastDiaper = timeline.find(e => e.type === 'diaper');

  // Calculate time since each
  const timeSinceFeed = lastFeed ? (now.getTime() - new Date(lastFeed.timestamp).getTime()) / 60000 : Infinity;
  const timeSinceSleep = lastSleep ? (now.getTime() - new Date(lastSleep.timestamp).getTime()) / 60000 : Infinity;
  const timeSinceDiaper = lastDiaper ? (now.getTime() - new Date(lastDiaper.timestamp).getTime()) / 60000 : Infinity;

  // No events at all — suggest first feed
  if (!lastFeed && !lastSleep && !lastDiaper) {
    return {
      type: 'feed',
      title: 'Log your first feed',
      subtitle: babyName ? `Track ${babyName}'s feeds, sleep, and diapers` : 'Start tracking to unlock smart insights',
      icon: '🍼',
      iconColor: '#FF9500',
      iconBg: 'linear-gradient(135deg, #FF9500, #FFAB40)',
    };
  }

  // Determine which action to suggest
  // Priority: longest time since last event, weighted by typical frequency
  const feedScore = timeSinceFeed / 120; // feeds every ~2h for newborns
  const sleepScore = timeSinceSleep / 180; // ~3h wake windows
  const diaperScore = timeSinceDiaper / 150; // ~2.5h between changes

  // Suggest feed
  if (feedScore >= sleepScore && feedScore >= diaperScore) {
    const feedAgo = lastFeed ? formatTimeAgoShort(lastFeed.timestamp) : '';
    const side = lastFeedSide || lastFeed?.feedLastSide || lastFeed?.feedSide;
    const nextSide = side === 'left' ? 'Right' : side === 'right' ? 'Left' : '';

    let title = 'Start Feed';
    if (nextSide && lastFeed?.feedType === 'breast') {
      title = `Start Feed — ${nextSide} Side`;
    }

    const parts: string[] = [];
    if (feedAgo) parts.push(`Last feed ${feedAgo} ago`);
    if (side && lastFeed?.feedType === 'breast') {
      parts.push(`${side.charAt(0).toUpperCase() + side.slice(1)} side was last`);
    }

    return {
      type: 'feed',
      title,
      subtitle: parts.join(' · ') || 'Time for a feed',
      icon: '🍼',
      iconColor: '#FF9500',
      iconBg: 'linear-gradient(135deg, #FF9500, #FFAB40)',
    };
  }

  // Suggest sleep
  if (sleepScore >= feedScore && sleepScore >= diaperScore) {
    const sleepAgo = lastSleep ? formatTimeAgoShort(lastSleep.timestamp) : '';
    return {
      type: 'sleep',
      title: 'Time for a nap?',
      subtitle: sleepAgo ? `Last sleep ended ${sleepAgo} ago` : 'Track a nap or night sleep',
      icon: '😴',
      iconColor: '#B57BEC',
      iconBg: 'linear-gradient(135deg, #B57BEC, #D4A5F5)',
    };
  }

  // Suggest diaper
  const diaperAgo = lastDiaper ? formatTimeAgoShort(lastDiaper.timestamp) : '';
  return {
    type: 'diaper',
    title: 'Diaper check',
    subtitle: diaperAgo ? `Last change ${diaperAgo} ago` : 'Log a diaper change',
    icon: '🧷',
    iconColor: '#34C759',
    iconBg: 'linear-gradient(135deg, #34C759, #6DD86D)',
  };
}

// ─── Proactive Alert ──────────────────────────────────────────

export interface ProactiveAlertData {
  title: string;
  text: string;
  icon: string;
  variant: 'purple' | 'orange' | 'green' | 'blue';
  source?: string;
  linkToDiscover?: boolean;
}

/**
 * Generate a proactive insight alert based on patterns or developmental info.
 * Returns null if there's nothing notable to surface.
 */
export function getProactiveAlert(
  timeline: TimelineEvent[],
  developmentalInfo: DevelopmentalInfo,
  babyName: string
): ProactiveAlertData | null {
  const todayEvents = timeline.filter(e => isToday(e.timestamp));
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayStr = yesterdayDate.toISOString().split('T')[0];
  const yesterdayEvents = timeline.filter(e => e.timestamp.startsWith(yesterdayStr));

  // Pattern: cluster feeding (more feeds today than yesterday)
  const todayFeeds = todayEvents.filter(e => e.type === 'feed').length;
  const yesterdayFeeds = yesterdayEvents.filter(e => e.type === 'feed').length;

  if (todayFeeds > 0 && yesterdayFeeds > 0 && todayFeeds >= yesterdayFeeds * 1.5 && todayFeeds >= 4) {
    return {
      title: 'Growth spurt likely',
      text: `${babyName}'s feeding frequency is up today compared to yesterday. This is common at ${developmentalInfo.weekNumber} weeks and usually lasts 2-3 days.`,
      icon: '💡',
      variant: 'purple',
    };
  }

  // Pattern: short naps
  const todayNaps = todayEvents.filter(e => e.type === 'sleep' && e.sleepType === 'nap');
  if (todayNaps.length >= 2) {
    const avgNap = todayNaps.reduce((sum, e) => sum + (e.sleepDuration || 0), 0) / todayNaps.length;
    if (avgNap > 0 && avgNap < 30) {
      return {
        title: 'Short nap day',
        text: `${babyName}'s naps are averaging ${Math.round(avgNap)} minutes today. Short naps are very normal — most babies don't consolidate naps until 5-6 months.`,
        icon: '💤',
        variant: 'blue',
      };
    }
  }

  // Developmental insight — leap-based
  const leapStatus = getLeapStatus(developmentalInfo.weekNumber);
  if (leapStatus.isInLeap && leapStatus.currentLeap) {
    const leap = leapStatus.currentLeap;
    return {
      title: `Leap ${leap.leapNumber}: ${leap.name}`,
      text: `${babyName} may be fussier than usual right now. This mental leap typically lasts ${leap.endWeek - leap.startWeek} weeks and ends with new skills.`,
      icon: '🧠',
      variant: 'purple',
    };
  }

  // Positive reinforcement — good feeding day
  if (todayFeeds >= 6) {
    return {
      title: 'Great feeding day',
      text: `${todayFeeds} feeds logged today — ${babyName} is eating well. You're doing amazing.`,
      icon: '⭐',
      variant: 'green',
    };
  }

  // Fallback: cycle through expert insights, wellness, and quick wins
  const today = new Date();
  const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000);
  const weekNumber = developmentalInfo.weekNumber;

  // Gather available content pools
  const expertInsightsList = getInsightsForWeek(weekNumber);
  const wellness = getParentWellnessForWeek(weekNumber);
  const quickWinsList = getQuickWinsForWeek(weekNumber);

  // Cycle through 3 content types based on day: expert insight → wellness → quick win
  const contentType = dayOfYear % 3;

  if (contentType === 0 && expertInsightsList.length > 0) {
    // Expert insight — research-backed guidance
    const idx = dayOfYear % expertInsightsList.length;
    const expert = expertInsightsList[idx];
    return {
      title: expert.topic,
      text: expert.insight,
      icon: expert.sourceType === 'aap' ? '📋' : expert.sourceType === 'research' ? '📚' : '👩‍⚕️',
      variant: 'purple',
      source: expert.source,
      linkToDiscover: true,
    };
  }

  if (contentType === 1 && wellness) {
    // Parent wellness — permission slip
    return {
      title: 'For you today',
      text: wellness.permissionSlip + ' ' + wellness.oneThingToday,
      icon: '💜',
      variant: 'purple',
      linkToDiscover: true,
    };
  }

  if (contentType === 2 && quickWinsList.length > 0) {
    // Quick win — actionable activity
    const idx = dayOfYear % quickWinsList.length;
    const win = quickWinsList[idx];
    return {
      title: `Quick win · ${win.duration}`,
      text: `${win.activity} — ${win.benefit}`,
      icon: '🎯',
      variant: 'green',
      linkToDiscover: true,
    };
  }

  // Final fallback: any expert insight available
  if (expertInsightsList.length > 0) {
    const idx = dayOfYear % expertInsightsList.length;
    const expert = expertInsightsList[idx];
    return {
      title: expert.topic,
      text: expert.insight,
      icon: '📚',
      variant: 'purple',
      source: expert.source,
      linkToDiscover: true,
    };
  }

  // Last resort: developmental whatToExpect
  if (developmentalInfo.whatToExpect.length > 0) {
    const dayIndex = (today.getFullYear() * 366 + today.getMonth() * 31 + today.getDate()) % developmentalInfo.whatToExpect.length;
    const insight = developmentalInfo.whatToExpect[dayIndex]
      .replace(/\byour baby\b/gi, babyName)
      .replace(/\bthe baby\b/gi, babyName)
      .replace(/\bbaby\b/gi, babyName);
    return {
      title: `Week ${weekNumber} development`,
      text: insight,
      icon: '🌱',
      variant: 'purple',
      linkToDiscover: true,
    };
  }

  return null;
}

/**
 * Generate multiple proactive alerts for auto-flipping carousel.
 * Returns pattern alerts (if any) + all applicable content types.
 */
export function getProactiveAlerts(
  timeline: TimelineEvent[],
  developmentalInfo: DevelopmentalInfo,
  babyName: string,
  weather?: WeatherData | null
): ProactiveAlertData[] {
  const alerts: ProactiveAlertData[] = [];
  const todayEvents = timeline.filter(e => isToday(e.timestamp));
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayStr = yesterdayDate.toISOString().split('T')[0];
  const yesterdayEvents = timeline.filter(e => e.timestamp.startsWith(yesterdayStr));

  // Pattern-based alerts (add if detected, don't early-return)
  const todayFeeds = todayEvents.filter(e => e.type === 'feed').length;
  const yesterdayFeeds = yesterdayEvents.filter(e => e.type === 'feed').length;

  if (todayFeeds > 0 && yesterdayFeeds > 0 && todayFeeds >= yesterdayFeeds * 1.5 && todayFeeds >= 4) {
    alerts.push({
      title: 'Growth spurt likely',
      text: `${babyName}'s feeding frequency is up today compared to yesterday. This is common at ${developmentalInfo.weekNumber} weeks and usually lasts 2-3 days.`,
      icon: '💡',
      variant: 'purple',
    });
  }

  const todayNaps = todayEvents.filter(e => e.type === 'sleep' && e.sleepType === 'nap');
  if (todayNaps.length >= 2) {
    const avgNap = todayNaps.reduce((sum, e) => sum + (e.sleepDuration || 0), 0) / todayNaps.length;
    if (avgNap > 0 && avgNap < 30) {
      alerts.push({
        title: 'Short nap day',
        text: `${babyName}'s naps are averaging ${Math.round(avgNap)} minutes today. Short naps are very normal — most babies don't consolidate naps until 5-6 months.`,
        icon: '💤',
        variant: 'blue',
      });
    }
  }

  const leapStatus = getLeapStatus(developmentalInfo.weekNumber);
  if (leapStatus.isInLeap && leapStatus.currentLeap) {
    const leap = leapStatus.currentLeap;
    alerts.push({
      title: `Leap ${leap.leapNumber}: ${leap.name}`,
      text: `${babyName} may be fussier than usual right now. This mental leap typically lasts ${leap.endWeek - leap.startWeek} weeks and ends with new skills.`,
      icon: '🧠',
      variant: 'purple',
    });
  }

  // Cabin fever detection — bad weather alert with indoor activity suggestions
  if (weather && isBadWeather(weather)) {
    const condition = weather.condition;
    const temp = weather.temperature;
    let cabinIcon = '🌧️';
    let cabinTitle = 'Rainy day vibes';
    let cabinText = `It's rainy outside — perfect excuse to stay cozy. Here are some indoor ideas for ${babyName}.`;

    if (condition === 'Snow' || condition === 'Snow Showers') {
      cabinIcon = '❄️';
      cabinTitle = 'Snow day!';
      cabinText = `It's snowy outside — great day to stay warm and play inside with ${babyName}.`;
    } else if (condition === 'Thunderstorm') {
      cabinIcon = '⛈️';
      cabinTitle = 'Stormy out there';
      cabinText = `Thunderstorms today — a cozy indoor day with ${babyName}. Check today's plan for ideas.`;
    } else if (temp < 32) {
      cabinIcon = '🥶';
      cabinTitle = 'Brrr — stay warm';
      cabinText = `It's ${Math.round(temp)}°F outside — way too cold. Bundle up inside and try some sensory play with ${babyName}.`;
    } else if (temp > 95) {
      cabinIcon = '🥵';
      cabinTitle = 'Too hot outside';
      cabinText = `It's ${Math.round(temp)}°F — stay cool inside with ${babyName}. Water play in the bath is a great option.`;
    }

    // Get an indoor activity suggestion
    const indoorActivities = getTodaysActivities(developmentalInfo.weekNumber, [], 1, weather);
    if (indoorActivities.length > 0) {
      cabinText += ` Try: ${indoorActivities[0].title} (${indoorActivities[0].duration}).`;
    }

    alerts.push({
      title: cabinTitle,
      text: cabinText,
      icon: cabinIcon,
      variant: 'blue',
    });
  }

  if (todayFeeds >= 6) {
    alerts.push({
      title: 'Great feeding day',
      text: `${todayFeeds} feeds logged today — ${babyName} is eating well. You're doing amazing.`,
      icon: '⭐',
      variant: 'green',
    });
  }

  // Content pool: add all three types (not just one based on day)
  const today = new Date();
  const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000);
  const weekNumber = developmentalInfo.weekNumber;

  const expertInsightsList = getInsightsForWeek(weekNumber);
  const wellness = getParentWellnessForWeek(weekNumber);
  const quickWinsList = getQuickWinsForWeek(weekNumber);

  if (expertInsightsList.length > 0) {
    const idx = dayOfYear % expertInsightsList.length;
    const expert = expertInsightsList[idx];
    alerts.push({
      title: expert.topic,
      text: expert.insight,
      icon: expert.sourceType === 'aap' ? '📋' : expert.sourceType === 'research' ? '📚' : '👩‍⚕️',
      variant: 'purple',
      source: expert.source,
      linkToDiscover: true,
    });
  }

  if (wellness) {
    alerts.push({
      title: 'For you today',
      text: wellness.permissionSlip + ' ' + wellness.oneThingToday,
      icon: '💜',
      variant: 'purple',
      linkToDiscover: true,
    });
  }

  if (quickWinsList.length > 0) {
    const idx = dayOfYear % quickWinsList.length;
    const win = quickWinsList[idx];
    alerts.push({
      title: `Quick win · ${win.duration}`,
      text: `${win.activity} — ${win.benefit}`,
      icon: '🎯',
      variant: 'green',
      linkToDiscover: true,
    });
  }

  // If nothing at all, try developmental whatToExpect
  if (alerts.length === 0 && developmentalInfo.whatToExpect.length > 0) {
    const dayIndex = (today.getFullYear() * 366 + today.getMonth() * 31 + today.getDate()) % developmentalInfo.whatToExpect.length;
    const insight = developmentalInfo.whatToExpect[dayIndex]
      .replace(/\byour baby\b/gi, babyName)
      .replace(/\bthe baby\b/gi, babyName)
      .replace(/\bbaby\b/gi, babyName);
    alerts.push({
      title: `Week ${weekNumber} development`,
      text: insight,
      icon: '🌱',
      variant: 'purple',
      linkToDiscover: true,
    });
  }

  return alerts;
}

// ─── Smart Defaults ─────────────────────────────────────────

export interface SmartDefaults {
  feed: {
    feedType: 'breast' | 'bottle' | 'solid';
    feedSide?: 'left' | 'right';
    feedAmount?: number;
    feedDuration?: number;
    confidence: number;
  };
  sleep: {
    sleepType: 'nap' | 'night';
    sleepDuration?: number;
    confidence: number;
  };
  diaper: {
    diaperType: 'wet' | 'dirty' | 'both';
    confidence: number;
  };
  hasEnoughData: boolean;
}

/**
 * Compute smart defaults for quick log modals based on the baby's historical patterns.
 * Only returns `hasEnoughData: true` after 7+ days with 3+ events/day.
 */
export function getSmartDefaults(
  timeline: TimelineEvent[],
  lastFeedSide?: string
): SmartDefaults {
  // Data sufficiency: count distinct days with 3+ events
  const dayCountMap = new Map<string, number>();
  for (const event of timeline) {
    const day = event.timestamp.split('T')[0];
    dayCountMap.set(day, (dayCountMap.get(day) || 0) + 1);
  }
  const activeDays = Array.from(dayCountMap.values()).filter(c => c >= 3).length;
  const hasEnoughData = activeDays >= 7;

  // Get events from the last 14 days
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 14);
  const recentEvents = timeline.filter(e => new Date(e.timestamp) >= cutoff);

  // --- Feed defaults ---
  const recentFeeds = recentEvents.filter(e => e.type === 'feed');
  const feedTypeCounts: Record<string, number> = { breast: 0, bottle: 0, solid: 0 };
  const feedDurations: number[] = [];
  const bottleAmounts: number[] = [];

  for (const feed of recentFeeds) {
    if (feed.feedType) feedTypeCounts[feed.feedType]++;
    if (feed.feedDuration && feed.feedDuration > 0) feedDurations.push(feed.feedDuration);
    if (feed.feedType === 'bottle' && feed.feedAmount && feed.feedAmount > 0) {
      bottleAmounts.push(feed.feedAmount);
    }
  }

  const totalFeeds = recentFeeds.length;
  const topFeedType = (Object.entries(feedTypeCounts) as [string, number][])
    .sort((a, b) => b[1] - a[1])[0];
  const feedType = (topFeedType?.[0] || 'breast') as 'breast' | 'bottle' | 'solid';
  const feedConfidence = totalFeeds > 0 ? topFeedType[1] / totalFeeds : 0;

  // Alternate side based on lastFeedSide
  const feedSide = feedType === 'breast'
    ? (lastFeedSide === 'left' ? 'right' : lastFeedSide === 'right' ? 'left' : undefined)
    : undefined;

  // Median helper
  const median = (arr: number[]): number | undefined => {
    if (arr.length === 0) return undefined;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
  };

  const feedDuration = feedType === 'breast' ? median(feedDurations) : undefined;
  const feedAmount = feedType === 'bottle' ? median(bottleAmounts) : undefined;

  // --- Sleep defaults ---
  const recentSleeps = recentEvents.filter(e => e.type === 'sleep');
  const hour = new Date().getHours();
  const sleepType: 'nap' | 'night' = (hour >= 19 || hour < 6) ? 'night' : 'nap';

  // Median duration for the matching sleep type
  const matchingSleepDurations = recentSleeps
    .filter(e => e.sleepType === sleepType && e.sleepDuration && e.sleepDuration > 0)
    .map(e => e.sleepDuration!);
  const sleepDuration = median(matchingSleepDurations);

  // Confidence: how consistent is the time-of-day pattern
  const matchingTypeCount = recentSleeps.filter(e => e.sleepType === sleepType).length;
  const sleepConfidence = recentSleeps.length > 0 ? matchingTypeCount / recentSleeps.length : 0;

  // --- Diaper defaults ---
  const recentDiapers = recentEvents.filter(e => e.type === 'diaper');
  const diaperTypeCounts: Record<string, number> = { wet: 0, dirty: 0, both: 0 };
  for (const d of recentDiapers) {
    if (d.diaperType) diaperTypeCounts[d.diaperType]++;
  }
  const totalDiapers = recentDiapers.length;
  const topDiaperType = (Object.entries(diaperTypeCounts) as [string, number][])
    .sort((a, b) => b[1] - a[1])[0];
  const diaperType = (topDiaperType?.[0] || 'wet') as 'wet' | 'dirty' | 'both';
  const diaperConfidence = totalDiapers > 0 ? topDiaperType[1] / totalDiapers : 0;

  return {
    feed: { feedType, feedSide, feedAmount, feedDuration, confidence: feedConfidence },
    sleep: { sleepType, sleepDuration, confidence: sleepConfidence },
    diaper: { diaperType, confidence: diaperConfidence },
    hasEnoughData,
  };
}

// ─── Adjusted Age (for premature babies) ─────────────────────

export interface AgeInfo {
  // Chronological age (from birth date)
  chronologicalDays: number;
  chronologicalWeeks: number;
  chronologicalMonths: number;
  // Adjusted/corrected age (from due date, if premature)
  adjustedDays: number;
  adjustedWeeks: number;
  adjustedMonths: number;
  // Premature info
  isPremature: boolean;
  weeksEarly: number; // 0 if not premature
  // Display strings
  ageDisplay: string; // "3 months" or "3 months (adjusted: 2 months)"
  adjustedAgeDisplay: string; // "2 months" or same as ageDisplay if not premature
}

/**
 * Calculate both chronological and adjusted age for a baby.
 *
 * AAP guidelines: Use adjusted/corrected age for developmental
 * milestones until 24 months (corrected). A baby born at 35 weeks
 * (5 weeks early) who is chronologically 3 months old would be
 * developmentally at ~2 months adjusted age.
 *
 * Full term = 40 weeks gestation.
 * Premature = born before 37 weeks.
 */
export function calculateAge(birthDate: string, dueDate?: string): AgeInfo {
  const now = new Date();
  const birth = new Date(birthDate);

  // Chronological age
  const chronologicalMs = now.getTime() - birth.getTime();
  const chronologicalDays = Math.max(0, Math.floor(chronologicalMs / (1000 * 60 * 60 * 24)));
  const chronologicalWeeks = Math.floor(chronologicalDays / 7);
  const chronologicalMonths = Math.floor(chronologicalDays / 30.44); // average days per month

  // Calculate prematurity adjustment
  let weeksEarly = 0;
  let adjustedDays = chronologicalDays;

  if (dueDate) {
    const due = new Date(dueDate);
    const earlyMs = due.getTime() - birth.getTime();
    const earlyDays = Math.floor(earlyMs / (1000 * 60 * 60 * 24));

    // Only adjust if born more than 3 weeks early (clinically significant)
    // and born before due date (not late)
    if (earlyDays > 21) {
      weeksEarly = Math.floor(earlyDays / 7);
      adjustedDays = Math.max(0, chronologicalDays - earlyDays);
    }
  }

  const isPremature = weeksEarly > 0;
  const adjustedWeeks = Math.floor(adjustedDays / 7);
  const adjustedMonths = Math.floor(adjustedDays / 30.44);

  // Display strings
  const formatAge = (days: number): string => {
    const months = Math.floor(days / 30.44);
    const weeks = Math.floor(days / 7);

    if (days < 14) return `${days} days`;
    if (weeks < 9) return `${weeks} weeks`;
    return `${months} month${months !== 1 ? 's' : ''}`;
  };

  const chronologicalDisplay = formatAge(chronologicalDays);
  const adjustedAgeDisplay = formatAge(adjustedDays);

  const ageDisplay = isPremature
    ? `${chronologicalDisplay} (adjusted: ${adjustedAgeDisplay})`
    : chronologicalDisplay;

  return {
    chronologicalDays,
    chronologicalWeeks,
    chronologicalMonths,
    adjustedDays,
    adjustedWeeks,
    adjustedMonths,
    isPremature,
    weeksEarly,
    ageDisplay,
    adjustedAgeDisplay,
  };
}
