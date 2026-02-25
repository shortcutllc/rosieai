/**
 * analyticsEngine.ts — Multi-day analytics and pattern detection
 *
 * Provides aggregated stats, weekly summaries, personalized baselines,
 * correlation insights, and "Is This Normal?" FAQ generation.
 * Pure functions — no React dependencies.
 */

import { TimelineEvent, DevelopmentalInfo } from './types';
import { getLeapStatus } from './leapData';

// ─── Types ──────────────────────────────────────────────────

export interface DailyStats {
  date: string; // YYYY-MM-DD
  feedCount: number;
  sleepMinutes: number;
  napCount: number;
  napMinutes: number;
  nightSleepMinutes: number;
  diaperCount: number;
  wetDiapers: number;
  dirtyDiapers: number;
  breastFeedCount: number;
  bottleFeedCount: number;
}

export interface WeeklySummary {
  thisWeek: {
    feeds: number;       // daily average
    sleepHours: number;  // daily average
    diapers: number;     // daily average
  };
  lastWeek: {
    feeds: number;       // daily average
    sleepHours: number;  // daily average
    diapers: number;     // daily average
  } | null;
  trends: {
    feeds: number; // percentage change, e.g. +15 or -10
    sleep: number;
    diapers: number;
  } | null;
  highlights: string[];
  hasEnoughData: boolean;
  activeDays: number; // how many days had logged data this week
}

export interface BaselineData {
  metric: string;
  label: string;
  icon: string;
  personalValue: number;
  personalLabel: string;
  populationMin: number;
  populationMax: number;
  populationLabel: string;
  unit: string;
  status: 'low' | 'normal' | 'high';
}

export interface CorrelationInsight {
  id: string;
  title: string;
  text: string;
  icon: string;
  confidence: 'high' | 'medium' | 'low';
  type: 'feed-sleep' | 'nap-pattern' | 'growth-spurt' | 'sleep-consolidation' | 'leap-impact';
}

export interface IsThisNormalQuestion {
  id: string;
  question: string;
  answerPreview: string;
  fullAnswer: string;
  icon: string;
  chatMessage: string; // pre-filled message for Ask Rosie
}

// ─── Core: Day Stats ────────────────────────────────────────

function getDateString(timestamp: string): string {
  return timestamp.split('T')[0];
}

export function getDayStats(timeline: TimelineEvent[], date: string): DailyStats {
  const dayEvents = timeline.filter(e => getDateString(e.timestamp) === date);

  const stats: DailyStats = {
    date,
    feedCount: 0,
    sleepMinutes: 0,
    napCount: 0,
    napMinutes: 0,
    nightSleepMinutes: 0,
    diaperCount: 0,
    wetDiapers: 0,
    dirtyDiapers: 0,
    breastFeedCount: 0,
    bottleFeedCount: 0,
  };

  for (const event of dayEvents) {
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
          stats.napMinutes += event.sleepDuration || 0;
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

export function getMultiDayStats(timeline: TimelineEvent[], days: number): DailyStats[] {
  const result: DailyStats[] = [];
  const now = new Date();

  for (let i = 0; i < days; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    result.push(getDayStats(timeline, dateStr));
  }

  return result;
}

// ─── Weekly Summary ─────────────────────────────────────────

export function getWeeklySummary(
  timeline: TimelineEvent[],
  birthDate: string,
  babyName: string,
  developmentalInfo: DevelopmentalInfo
): WeeklySummary | null {
  if (timeline.length === 0) return null;

  const allDays = getMultiDayStats(timeline, 14);
  const thisWeekDays = allDays.slice(0, 7);
  const lastWeekDays = allDays.slice(7, 14);

  // Average stats across active days (days with at least one logged event)
  const avgStats = (days: DailyStats[]) => {
    const active = days.filter(d => d.feedCount > 0 || d.sleepMinutes > 0 || d.diaperCount > 0);
    const count = active.length || 1; // avoid div by zero
    return {
      feeds: Math.round(active.reduce((s, d) => s + d.feedCount, 0) / count * 10) / 10,
      sleepHours: Math.round(active.reduce((s, d) => s + d.sleepMinutes, 0) / count / 60 * 10) / 10,
      diapers: Math.round(active.reduce((s, d) => s + d.diaperCount, 0) / count * 10) / 10,
    };
  };

  const activeDays = thisWeekDays.filter(d => d.feedCount > 0 || d.sleepMinutes > 0 || d.diaperCount > 0).length;
  const thisWeek = avgStats(thisWeekDays);
  const hasLastWeek = lastWeekDays.some(d => d.feedCount > 0 || d.sleepMinutes > 0 || d.diaperCount > 0);
  const lastWeek = hasLastWeek ? avgStats(lastWeekDays) : null;

  const pctChange = (curr: number, prev: number): number => {
    if (prev === 0) return curr > 0 ? 100 : 0;
    return Math.round(((curr - prev) / prev) * 100);
  };

  const trends = lastWeek ? {
    feeds: pctChange(thisWeek.feeds, lastWeek.feeds),
    sleep: pctChange(thisWeek.sleepHours, lastWeek.sleepHours),
    diapers: pctChange(thisWeek.diapers, lastWeek.diapers),
  } : null;

  // Generate highlight bullets
  const highlights: string[] = [];

  if (trends) {
    if (trends.feeds > 20) {
      highlights.push(`Feeds up ${trends.feeds}% — possible growth spurt`);
    } else if (trends.feeds < -20 && thisWeek.feeds > 0) {
      highlights.push(`Feeding frequency down — could be getting more efficient`);
    }

    if (trends.sleep > 15) {
      highlights.push(`Sleeping more this week — great for development`);
    } else if (trends.sleep < -15 && thisWeek.sleepHours > 0) {
      highlights.push(`Sleep dipped — may be a leap or regression`);
    }
  }

  // Milestone-based highlights
  const leapStatus = getLeapStatus(developmentalInfo.weekNumber);
  if (leapStatus.isInLeap && leapStatus.currentLeap) {
    highlights.push(`In Leap ${leapStatus.currentLeap.leapNumber} — fussiness is normal`);
  }

  // Nap pattern insight
  const totalNaps = thisWeekDays.reduce((s, d) => s + d.napCount, 0);
  const totalNapMins = thisWeekDays.reduce((s, d) => s + d.napMinutes, 0);
  if (totalNaps >= 3) {
    const avgNapMins = Math.round(totalNapMins / totalNaps);
    if (avgNapMins < 30) {
      highlights.push(`Short naps averaging ${avgNapMins}min — totally normal`);
    } else if (avgNapMins > 90) {
      highlights.push(`Long naps averaging ${avgNapMins}min — great sleep consolidation`);
    }
  }

  return {
    thisWeek,
    lastWeek,
    trends,
    highlights: highlights.slice(0, 3), // max 3
    hasEnoughData: thisWeek.feeds > 0 || thisWeek.sleepHours > 0,
    activeDays,
  };
}

// ─── Personalized Baselines ─────────────────────────────────

// Population ranges by age (based on AAP/WHO guidelines)
function getPopulationRanges(ageInDays: number) {
  if (ageInDays < 14) return { feeds: [8, 12], sleep: [14, 17], diapers: [8, 12], napLen: [15, 60] };
  if (ageInDays < 60) return { feeds: [7, 10], sleep: [14, 17], diapers: [6, 10], napLen: [20, 120] };
  if (ageInDays < 120) return { feeds: [6, 8], sleep: [12, 16], diapers: [5, 8], napLen: [30, 120] };
  if (ageInDays < 180) return { feeds: [5, 7], sleep: [12, 15], diapers: [4, 7], napLen: [30, 120] };
  if (ageInDays < 270) return { feeds: [4, 6], sleep: [12, 15], diapers: [4, 6], napLen: [30, 90] };
  return { feeds: [3, 5], sleep: [11, 14], diapers: [4, 6], napLen: [30, 90] };
}

export function getPersonalizedBaselines(
  timeline: TimelineEvent[],
  birthDate: string,
  babyName: string
): BaselineData[] {
  const days = getMultiDayStats(timeline, 7);
  const activeDays = days.filter(d => d.feedCount > 0 || d.sleepMinutes > 0 || d.diaperCount > 0);

  if (activeDays.length < 3) return []; // need 3+ days of data

  const birth = new Date(birthDate);
  const ageInDays = Math.floor((Date.now() - birth.getTime()) / (1000 * 60 * 60 * 24));
  const ranges = getPopulationRanges(ageInDays);

  const avgFeeds = Math.round(activeDays.reduce((s, d) => s + d.feedCount, 0) / activeDays.length * 10) / 10;
  const avgSleepHrs = Math.round(activeDays.reduce((s, d) => s + d.sleepMinutes, 0) / activeDays.length / 60 * 10) / 10;
  const avgDiapers = Math.round(activeDays.reduce((s, d) => s + d.diaperCount, 0) / activeDays.length * 10) / 10;

  // Average nap length
  const totalNaps = activeDays.reduce((s, d) => s + d.napCount, 0);
  const totalNapMins = activeDays.reduce((s, d) => s + d.napMinutes, 0);
  const avgNapLen = totalNaps > 0 ? Math.round(totalNapMins / totalNaps) : 0;

  const getStatus = (val: number, min: number, max: number): 'low' | 'normal' | 'high' => {
    if (val < min * 0.8) return 'low';
    if (val > max * 1.2) return 'high';
    return 'normal';
  };

  const baselines: BaselineData[] = [
    {
      metric: 'feeds',
      label: 'Feeds / day',
      icon: '🍼',
      personalValue: avgFeeds,
      personalLabel: `${avgFeeds}`,
      populationMin: ranges.feeds[0],
      populationMax: ranges.feeds[1],
      populationLabel: `${ranges.feeds[0]}–${ranges.feeds[1]}`,
      unit: 'feeds',
      status: getStatus(avgFeeds, ranges.feeds[0], ranges.feeds[1]),
    },
    {
      metric: 'sleep',
      label: 'Sleep / day',
      icon: '💤',
      personalValue: avgSleepHrs,
      personalLabel: `${avgSleepHrs}h`,
      populationMin: ranges.sleep[0],
      populationMax: ranges.sleep[1],
      populationLabel: `${ranges.sleep[0]}–${ranges.sleep[1]}h`,
      unit: 'hours',
      status: getStatus(avgSleepHrs, ranges.sleep[0], ranges.sleep[1]),
    },
    {
      metric: 'diapers',
      label: 'Diapers / day',
      icon: '🧷',
      personalValue: avgDiapers,
      personalLabel: `${avgDiapers}`,
      populationMin: ranges.diapers[0],
      populationMax: ranges.diapers[1],
      populationLabel: `${ranges.diapers[0]}–${ranges.diapers[1]}`,
      unit: 'diapers',
      status: getStatus(avgDiapers, ranges.diapers[0], ranges.diapers[1]),
    },
  ];

  // Only include nap length if we have nap data
  if (totalNaps >= 3) {
    baselines.push({
      metric: 'napLength',
      label: 'Avg nap',
      icon: '😴',
      personalValue: avgNapLen,
      personalLabel: `${avgNapLen}min`,
      populationMin: ranges.napLen[0],
      populationMax: ranges.napLen[1],
      populationLabel: `${ranges.napLen[0]}–${ranges.napLen[1]}min`,
      unit: 'min',
      status: getStatus(avgNapLen, ranges.napLen[0], ranges.napLen[1]),
    });
  }

  return baselines;
}

// ─── Correlation Engine ─────────────────────────────────────

export function getCorrelationInsights(
  timeline: TimelineEvent[],
  developmentalInfo: DevelopmentalInfo,
  babyName: string
): CorrelationInsight[] {
  const insights: CorrelationInsight[] = [];
  const days = getMultiDayStats(timeline, 14);
  const activeDays = days.filter(d => d.feedCount > 0 || d.sleepMinutes > 0);

  if (activeDays.length < 5) return []; // need 5+ days

  // 1. Feed ↔ Sleep correlation
  const daysWithBothData = activeDays.filter(d => d.feedCount > 0 && d.sleepMinutes > 0);
  if (daysWithBothData.length >= 5) {
    const avgFeeds = daysWithBothData.reduce((s, d) => s + d.feedCount, 0) / daysWithBothData.length;
    const highFeedDays = daysWithBothData.filter(d => d.feedCount >= avgFeeds * 1.2);
    const lowFeedDays = daysWithBothData.filter(d => d.feedCount < avgFeeds * 0.8);

    if (highFeedDays.length >= 2 && lowFeedDays.length >= 2) {
      const highFeedSleep = highFeedDays.reduce((s, d) => s + d.sleepMinutes, 0) / highFeedDays.length;
      const lowFeedSleep = lowFeedDays.reduce((s, d) => s + d.sleepMinutes, 0) / lowFeedDays.length;

      if (highFeedSleep > lowFeedSleep * 1.1) {
        const pct = Math.round(((highFeedSleep - lowFeedSleep) / lowFeedSleep) * 100);
        insights.push({
          id: 'feed-sleep-positive',
          title: 'More feeds = better sleep',
          text: `${babyName} slept ${pct}% longer on days with more feeds. Full tummies help!`,
          icon: '📊',
          confidence: daysWithBothData.length >= 10 ? 'high' : 'medium',
          type: 'feed-sleep',
        });
      } else if (lowFeedSleep > highFeedSleep * 1.1) {
        insights.push({
          id: 'feed-sleep-negative',
          title: 'Feed-sleep pattern',
          text: `${babyName} tends to sleep longer on lighter feeding days. Every baby is different.`,
          icon: '📊',
          confidence: 'medium',
          type: 'feed-sleep',
        });
      }
    }
  }

  // 2. Growth spurt detection (feeding frequency spike)
  const recentWeek = days.slice(0, 7);
  const priorWeek = days.slice(7, 14);
  const recentFeeds = recentWeek.reduce((s, d) => s + d.feedCount, 0);
  const priorFeeds = priorWeek.reduce((s, d) => s + d.feedCount, 0);

  if (priorFeeds > 0 && recentFeeds > priorFeeds * 1.3) {
    const pct = Math.round(((recentFeeds - priorFeeds) / priorFeeds) * 100);
    insights.push({
      id: 'growth-spurt',
      title: 'Possible growth spurt',
      text: `Feeding frequency up ${pct}% this week. Growth spurts usually last 2-3 days.`,
      icon: '📈',
      confidence: pct >= 40 ? 'high' : 'medium',
      type: 'growth-spurt',
    });
  }

  // 3. Sleep consolidation trend
  const recentNaps = recentWeek.reduce((s, d) => s + d.napCount, 0);
  const priorNaps = priorWeek.reduce((s, d) => s + d.napCount, 0);
  const recentNapMins = recentWeek.reduce((s, d) => s + d.napMinutes, 0);
  const priorNapMins = priorWeek.reduce((s, d) => s + d.napMinutes, 0);

  if (priorNaps > 0 && recentNaps > 0 && recentNaps < priorNaps && recentNapMins >= priorNapMins * 0.9) {
    insights.push({
      id: 'sleep-consolidation',
      title: 'Naps are consolidating',
      text: `${babyName} is taking fewer but longer naps. This is a great developmental sign!`,
      icon: '🌙',
      confidence: 'medium',
      type: 'sleep-consolidation',
    });
  }

  // 4. Leap impact on sleep
  const leapStatus = getLeapStatus(developmentalInfo.weekNumber);
  if (leapStatus.isInLeap && leapStatus.currentLeap) {
    const recentSleep = recentWeek.reduce((s, d) => s + d.sleepMinutes, 0);
    const priorSleep = priorWeek.reduce((s, d) => s + d.sleepMinutes, 0);

    if (priorSleep > 0 && recentSleep < priorSleep * 0.85) {
      insights.push({
        id: 'leap-sleep-impact',
        title: `Leap ${leapStatus.currentLeap.leapNumber} affecting sleep`,
        text: `Sleep is down during this leap. This is temporary — ${babyName} is building new neural connections.`,
        icon: '🧠',
        confidence: 'high',
        type: 'leap-impact',
      });
    }
  }

  // 5. Nap pattern insight
  if (activeDays.length >= 7) {
    const napDurations: number[] = [];
    for (const day of activeDays) {
      if (day.napCount > 0 && day.napMinutes > 0) {
        napDurations.push(day.napMinutes / day.napCount);
      }
    }
    if (napDurations.length >= 5) {
      const avg = napDurations.reduce((s, d) => s + d, 0) / napDurations.length;
      const variance = napDurations.reduce((s, d) => s + Math.pow(d - avg, 2), 0) / napDurations.length;
      const stdDev = Math.sqrt(variance);

      if (stdDev < 10 && avg > 20) {
        insights.push({
          id: 'consistent-naps',
          title: 'Consistent nap pattern',
          text: `${babyName}'s naps are very consistent at ~${Math.round(avg)} minutes. A predictable pattern is forming!`,
          icon: '✨',
          confidence: 'high',
          type: 'nap-pattern',
        });
      }
    }
  }

  return insights.slice(0, 4); // max 4 insights
}

// ─── "Is This Normal?" ─────────────────────────────────────

export function getIsThisNormalQuestions(
  timeline: TimelineEvent[],
  birthDate: string,
  babyName: string,
  developmentalInfo: DevelopmentalInfo
): IsThisNormalQuestion[] {
  const questions: IsThisNormalQuestion[] = [];
  const days = getMultiDayStats(timeline, 7);
  const activeDays = days.filter(d => d.feedCount > 0 || d.sleepMinutes > 0 || d.diaperCount > 0);

  if (activeDays.length < 2) return [];

  const birth = new Date(birthDate);
  const ageInDays = Math.floor((Date.now() - birth.getTime()) / (1000 * 60 * 60 * 24));
  const ageInMonths = Math.floor(ageInDays / 30.44);
  const ranges = getPopulationRanges(ageInDays);

  const avgFeeds = Math.round(activeDays.reduce((s, d) => s + d.feedCount, 0) / activeDays.length * 10) / 10;
  const avgSleepHrs = Math.round(activeDays.reduce((s, d) => s + d.sleepMinutes, 0) / activeDays.length / 60 * 10) / 10;
  const avgDiapers = Math.round(activeDays.reduce((s, d) => s + d.diaperCount, 0) / activeDays.length * 10) / 10;

  // 1. Feeding frequency
  const feedInRange = avgFeeds >= ranges.feeds[0] && avgFeeds <= ranges.feeds[1];
  questions.push({
    id: 'itn-feeds',
    question: `Is ${Math.round(avgFeeds)} feeds a day normal at ${ageInMonths} months?`,
    answerPreview: feedInRange
      ? `Yes! ${babyName} is right in the typical range.`
      : avgFeeds < ranges.feeds[0]
        ? `A bit below typical, but every baby is different.`
        : `On the higher end — could be a growth spurt.`,
    fullAnswer: feedInRange
      ? `${babyName} averages ${avgFeeds} feeds/day, which is right in the typical range of ${ranges.feeds[0]}–${ranges.feeds[1]} for this age. You're doing great.`
      : avgFeeds < ranges.feeds[0]
        ? `${babyName} averages ${avgFeeds} feeds/day. Typical range is ${ranges.feeds[0]}–${ranges.feeds[1]}, but every baby has their own rhythm. If ${babyName} is gaining weight and having enough wet diapers, this is likely fine.`
        : `${babyName} averages ${avgFeeds} feeds/day, above the typical ${ranges.feeds[0]}–${ranges.feeds[1]}. This is common during growth spurts or developmental leaps. If it persists, ask your pediatrician at the next visit.`,
    icon: '🍼',
    chatMessage: `Is ${Math.round(avgFeeds)} feeds a day normal for ${babyName} at ${ageInMonths} months?`,
  });

  // 2. Sleep amount
  const sleepInRange = avgSleepHrs >= ranges.sleep[0] && avgSleepHrs <= ranges.sleep[1];
  questions.push({
    id: 'itn-sleep',
    question: `Is ${avgSleepHrs} hours of sleep enough?`,
    answerPreview: sleepInRange
      ? `Right on track for ${ageInMonths} months.`
      : avgSleepHrs < ranges.sleep[0]
        ? `Below typical — but sleep varies a lot at this age.`
        : `More than average — ${babyName}'s a great sleeper!`,
    fullAnswer: sleepInRange
      ? `${babyName} is getting about ${avgSleepHrs} hours of sleep per day, which falls in the typical range of ${ranges.sleep[0]}–${ranges.sleep[1]} hours. Nice work on those routines.`
      : avgSleepHrs < ranges.sleep[0]
        ? `${babyName} is getting ${avgSleepHrs} hours. Typical for this age is ${ranges.sleep[0]}–${ranges.sleep[1]} hours, but there's huge individual variation. If ${babyName} seems well-rested, it's likely fine.`
        : `${babyName} is getting ${avgSleepHrs} hours — a bit above the ${ranges.sleep[0]}–${ranges.sleep[1]} hour range. Some babies simply love their sleep!`,
    icon: '💤',
    chatMessage: `Is ${avgSleepHrs} hours of sleep enough for ${babyName} at ${ageInMonths} months?`,
  });

  // 3. Diaper count
  const diapersInRange = avgDiapers >= ranges.diapers[0] && avgDiapers <= ranges.diapers[1];
  questions.push({
    id: 'itn-diapers',
    question: `Are ${Math.round(avgDiapers)} diapers a day normal?`,
    answerPreview: diapersInRange
      ? `Perfectly normal for this age.`
      : `A bit ${avgDiapers < ranges.diapers[0] ? 'low' : 'high'}, but likely fine.`,
    fullAnswer: diapersInRange
      ? `${babyName} is going through about ${avgDiapers} diapers/day. The typical range is ${ranges.diapers[0]}–${ranges.diapers[1]} at this age — right on track.`
      : `${babyName} averages ${avgDiapers} diapers/day (typical: ${ranges.diapers[0]}–${ranges.diapers[1]}). ${avgDiapers < ranges.diapers[0] ? 'Fewer diapers can happen — monitor hydration.' : 'Extra diapers just mean good hydration!'}`,
    icon: '🧷',
    chatMessage: `Are ${Math.round(avgDiapers)} diapers a day normal for ${babyName} at ${ageInMonths} months?`,
  });

  // 4. Nap-specific question (if we have nap data)
  const totalNaps = activeDays.reduce((s, d) => s + d.napCount, 0);
  const totalNapMins = activeDays.reduce((s, d) => s + d.napMinutes, 0);
  if (totalNaps >= 3) {
    const avgNapMins = Math.round(totalNapMins / totalNaps);
    const avgNapsPerDay = Math.round(totalNaps / activeDays.length * 10) / 10;

    if (avgNapMins < 35) {
      questions.push({
        id: 'itn-short-naps',
        question: `Why are ${babyName}'s naps so short?`,
        answerPreview: `${avgNapMins}-min naps are completely normal.`,
        fullAnswer: `${babyName}'s naps average ${avgNapMins} minutes. Short naps (under 45 min) are very common and developmentally normal until 5-6 months when naps start to consolidate. You're not doing anything wrong.`,
        icon: '😴',
        chatMessage: `Why are ${babyName}'s naps only ${avgNapMins} minutes? Is that normal at ${ageInMonths} months?`,
      });
    } else {
      questions.push({
        id: 'itn-nap-count',
        question: `Is ${avgNapsPerDay} naps a day the right amount?`,
        answerPreview: `Yes — nap count varies by age and baby.`,
        fullAnswer: `${babyName} takes about ${avgNapsPerDay} naps/day averaging ${avgNapMins} minutes each. At ${ageInMonths} months, this is a healthy pattern. Nap count naturally decreases as babies get older.`,
        icon: '😴',
        chatMessage: `Is ${avgNapsPerDay} naps a day the right amount for ${babyName} at ${ageInMonths} months?`,
      });
    }
  }

  // 5. Leap-specific question
  const leapStatus = getLeapStatus(developmentalInfo.weekNumber);
  if (leapStatus.isInLeap && leapStatus.currentLeap) {
    questions.push({
      id: 'itn-leap-fussy',
      question: `Why is ${babyName} so fussy lately?`,
      answerPreview: `Leap ${leapStatus.currentLeap.leapNumber} — it's developmental, not something you did.`,
      fullAnswer: `${babyName} is going through Leap ${leapStatus.currentLeap.leapNumber} (${leapStatus.currentLeap.name}). Extra fussiness, clinginess, and sleep disruption are completely normal during mental leaps. This phase typically lasts ${leapStatus.currentLeap.endWeek - leapStatus.currentLeap.startWeek} weeks.`,
      icon: '🧠',
      chatMessage: `Why is ${babyName} being so fussy? Is it related to Leap ${leapStatus.currentLeap.leapNumber}?`,
    });
  }

  return questions.slice(0, 5);
}
