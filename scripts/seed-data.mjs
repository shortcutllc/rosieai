/**
 * Seed script: generates realistic baby tracking data from birth to today,
 * including timeline events and growth measurements.
 * Run with: ROSIE_ACCESS_TOKEN=xxx ROSIE_REFRESH_TOKEN=xxx node scripts/seed-data.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

const supabase = createClient(
  'https://lpgamnbjkeigacvwbcwn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxwZ2FtbmJqa2VpZ2FjdndiY3duIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5NjAyMTQsImV4cCI6MjA4NDUzNjIxNH0.W8zDPKciIMZHLCXSpdA0uc-c5SyOVAhhUJupOER0E_k'
);

// Will be set after auth
let USER_ID = '';
let BABY_ID = '';
const BIRTH_DATE = '2025-11-20';
const BABY_NAME = 'Rosie';

// --- Helpers ---

function jitter(base, range) {
  return base + (Math.random() - 0.5) * 2 * range;
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function addMinutes(date, mins) {
  return new Date(date.getTime() + mins * 60000);
}

// --- Age-based patterns ---
// Returns feeding/sleep parameters based on age in weeks
function getPatterns(ageWeeks) {
  if (ageWeeks <= 2) {
    return {
      feedsPerDay: 10, feedIntervalMin: 120, feedJitter: 30,
      feedDurationMin: 18, feedDurationJitter: 8,
      napsPerDay: 5, napDurationMin: 40, napDurationJitter: 25,
      nightSleepHours: 8, nightWakings: 3,
      diapersPerDay: 10, wetRatio: 0.5, dirtyRatio: 0.25, bothRatio: 0.25,
      bottleChance: 0.05, solidChance: 0,
    };
  }
  if (ageWeeks <= 4) {
    return {
      feedsPerDay: 9, feedIntervalMin: 140, feedJitter: 30,
      feedDurationMin: 16, feedDurationJitter: 6,
      napsPerDay: 4, napDurationMin: 50, napDurationJitter: 25,
      nightSleepHours: 8.5, nightWakings: 2,
      diapersPerDay: 9, wetRatio: 0.5, dirtyRatio: 0.2, bothRatio: 0.3,
      bottleChance: 0.1, solidChance: 0,
    };
  }
  if (ageWeeks <= 8) {
    return {
      feedsPerDay: 8, feedIntervalMin: 150, feedJitter: 30,
      feedDurationMin: 14, feedDurationJitter: 5,
      napsPerDay: 4, napDurationMin: 55, napDurationJitter: 25,
      nightSleepHours: 9, nightWakings: 2,
      diapersPerDay: 8, wetRatio: 0.55, dirtyRatio: 0.15, bothRatio: 0.3,
      bottleChance: 0.15, solidChance: 0,
    };
  }
  if (ageWeeks <= 13) {
    // 8-13 weeks
    return {
      feedsPerDay: 7, feedIntervalMin: 165, feedJitter: 30,
      feedDurationMin: 12, feedDurationJitter: 4,
      napsPerDay: 3, napDurationMin: 65, napDurationJitter: 30,
      nightSleepHours: 9.5, nightWakings: 1,
      diapersPerDay: 7, wetRatio: 0.55, dirtyRatio: 0.15, bothRatio: 0.3,
      bottleChance: 0.2, solidChance: 0,
    };
  }
  if (ageWeeks <= 17) {
    // 14-17 weeks (4 months — possible sleep regression)
    return {
      feedsPerDay: 6, feedIntervalMin: 180, feedJitter: 30,
      feedDurationMin: 11, feedDurationJitter: 4,
      napsPerDay: 3, napDurationMin: 60, napDurationJitter: 25,
      nightSleepHours: 10, nightWakings: 2, // regression can cause more wakings
      diapersPerDay: 7, wetRatio: 0.55, dirtyRatio: 0.15, bothRatio: 0.3,
      bottleChance: 0.25, solidChance: 0,
    };
  }
  if (ageWeeks <= 21) {
    // 18-21 weeks (4-5 months)
    return {
      feedsPerDay: 6, feedIntervalMin: 190, feedJitter: 30,
      feedDurationMin: 10, feedDurationJitter: 3,
      napsPerDay: 3, napDurationMin: 70, napDurationJitter: 25,
      nightSleepHours: 10.5, nightWakings: 1,
      diapersPerDay: 6, wetRatio: 0.55, dirtyRatio: 0.15, bothRatio: 0.3,
      bottleChance: 0.25, solidChance: 0,
    };
  }
  // 22+ weeks (5-6 months — starting solids territory)
  return {
    feedsPerDay: 5, feedIntervalMin: 210, feedJitter: 30,
    feedDurationMin: 10, feedDurationJitter: 3,
    napsPerDay: 3, napDurationMin: 75, napDurationJitter: 30,
    nightSleepHours: 11, nightWakings: 1,
    diapersPerDay: 6, wetRatio: 0.5, dirtyRatio: 0.2, bothRatio: 0.3,
    bottleChance: 0.3, solidChance: 0.1,
  };
}

// --- Event generators ---

function generateFeedEvent(time, lastSide, patterns) {
  const isBottle = Math.random() < patterns.bottleChance;
  const duration = Math.max(5, Math.round(jitter(patterns.feedDurationMin, patterns.feedDurationJitter)));
  const endTime = addMinutes(time, duration);

  if (isBottle) {
    const amount = Math.round(jitter(3.5, 1.5) * 10) / 10; // 2-5 oz
    return {
      event: {
        id: randomUUID(),
        type: 'feed',
        timestamp: time.toISOString(),
        startTime: time.toISOString(),
        endTime: endTime.toISOString(),
        feedType: 'bottle',
        feedAmount: Math.max(1, Math.min(6, amount)),
        feedDuration: duration,
      },
      nextSide: lastSide, // bottle doesn't change side tracking
    };
  }

  // Breast feed
  const side = lastSide === 'left' ? 'right' : 'left';
  const leftDur = side === 'left' ? Math.round(duration * 0.6) : Math.round(duration * 0.4);
  const rightDur = duration - leftDur;

  return {
    event: {
      id: randomUUID(),
      type: 'feed',
      timestamp: time.toISOString(),
      startTime: time.toISOString(),
      endTime: endTime.toISOString(),
      feedType: 'breast',
      feedSide: side,
      feedLastSide: side === 'left' ? (rightDur > 0 ? 'right' : 'left') : (leftDur > 0 ? 'left' : 'right'),
      feedDuration: duration,
      feedLeftDuration: leftDur,
      feedRightDuration: rightDur,
    },
    nextSide: side,
  };
}

function generateSleepEvent(time, type, durationMin) {
  const endTime = addMinutes(time, durationMin);
  return {
    id: randomUUID(),
    type: 'sleep',
    timestamp: time.toISOString(),
    startTime: time.toISOString(),
    endTime: endTime.toISOString(),
    sleepType: type,
    sleepDuration: durationMin,
    sleepQuality: pick(['good', 'good', 'good', 'restless', 'restless', 'poor']),
  };
}

function generateDiaperEvent(time, patterns) {
  const roll = Math.random();
  let diaperType;
  if (roll < patterns.wetRatio) diaperType = 'wet';
  else if (roll < patterns.wetRatio + patterns.dirtyRatio) diaperType = 'dirty';
  else diaperType = 'both';

  return {
    id: randomUUID(),
    type: 'diaper',
    timestamp: time.toISOString(),
    diaperType,
  };
}

// --- Growth measurements (CDC 50th percentile for girls) ---

function generateGrowthMeasurements(birthDateStr) {
  const birth = new Date(birthDateStr + 'T10:00:00');
  const now = new Date();
  // Checkpoints: birth, 2 weeks, 1 month, 2 months, 3 months, 4 months
  const checkpoints = [
    { ageDays: 0,   label: 'Birth',        weightLb: 7.5,  lengthIn: 19.5, headIn: 13.5 },
    { ageDays: 14,  label: '2-week visit',  weightLb: 8.2,  lengthIn: 20.1, headIn: 14.0 },
    { ageDays: 30,  label: '1-month visit', weightLb: 9.4,  lengthIn: 21.0, headIn: 14.5 },
    { ageDays: 60,  label: '2-month visit', weightLb: 11.2, lengthIn: 22.5, headIn: 15.2 },
    { ageDays: 90,  label: '3-month visit', weightLb: 12.8, lengthIn: 23.8, headIn: 15.8 },
    { ageDays: 120, label: '4-month visit', weightLb: 14.1, lengthIn: 24.8, headIn: 16.2 },
  ];

  const measurements = [];
  for (const cp of checkpoints) {
    const date = new Date(birth.getTime() + cp.ageDays * 86400000);
    if (date > now) break; // don't generate future measurements

    // Convert lb to oz for storage, add slight jitter
    const weightOz = Math.round((cp.weightLb + jitter(0, 0.3)) * 16 * 10) / 10;
    const lengthIn = Math.round((cp.lengthIn + jitter(0, 0.2)) * 10) / 10;
    const headIn = Math.round((cp.headIn + jitter(0, 0.15)) * 10) / 10;

    measurements.push({
      id: randomUUID(),
      user_id: USER_ID,
      baby_id: BABY_ID,
      measurement_date: date.toISOString().split('T')[0],
      weight: weightOz,
      length: lengthIn,
      head_circumference: headIn,
      note: cp.label,
    });
  }
  return measurements;
}

// --- Main generation ---

function generateDayEvents(date, ageWeeks) {
  const patterns = getPatterns(ageWeeks);
  const events = [];
  let lastSide = pick(['left', 'right']);

  // Night sleep: starts around 7-8pm the evening before, ends 5:30-7am
  const nightStart = new Date(date);
  nightStart.setDate(nightStart.getDate() - 1);
  nightStart.setHours(Math.round(jitter(19.5, 0.75)), Math.round(Math.random() * 59), 0, 0);

  const nightEnd = new Date(date);
  nightEnd.setHours(Math.round(jitter(6, 0.5)), Math.round(Math.random() * 59), 0, 0);

  const nightDuration = Math.round((nightEnd - nightStart) / 60000);
  events.push(generateSleepEvent(nightStart, 'night', nightDuration));

  // Night wakings for feeds
  if (patterns.nightWakings > 0) {
    const nightSpan = nightEnd - nightStart;
    for (let i = 0; i < patterns.nightWakings; i++) {
      const wakeOffset = nightSpan * ((i + 1) / (patterns.nightWakings + 1));
      const wakeTime = new Date(nightStart.getTime() + wakeOffset + jitter(0, 30 * 60000));
      // Quick night feed
      const { event, nextSide } = generateFeedEvent(wakeTime, lastSide, {
        ...patterns,
        feedDurationMin: 10,
        feedDurationJitter: 3,
        bottleChance: patterns.bottleChance * 1.5,
      });
      events.push(event);
      lastSide = nextSide;
      // Diaper sometimes with night feed
      if (Math.random() < 0.4) {
        events.push(generateDiaperEvent(addMinutes(wakeTime, jitter(5, 3)), patterns));
      }
    }
  }

  // Daytime: first feed after waking
  let cursor = addMinutes(nightEnd, jitter(15, 10));

  // Morning diaper
  events.push(generateDiaperEvent(addMinutes(nightEnd, jitter(5, 3)), patterns));

  // Generate daytime feeds + naps + diapers
  const dayFeeds = patterns.feedsPerDay - patterns.nightWakings;
  const bedtime = new Date(date);
  bedtime.setHours(19, 30, 0, 0);

  let napCount = 0;
  for (let i = 0; i < dayFeeds && cursor < bedtime; i++) {
    // Feed
    const { event: feedEvent, nextSide } = generateFeedEvent(cursor, lastSide, patterns);
    events.push(feedEvent);
    lastSide = nextSide;

    const feedEnd = new Date(feedEvent.endTime);

    // Diaper after ~60% of feeds
    if (Math.random() < 0.6) {
      events.push(generateDiaperEvent(addMinutes(feedEnd, jitter(10, 5)), patterns));
    }

    // Nap after some feeds (spread through the day)
    if (napCount < patterns.napsPerDay && Math.random() < (patterns.napsPerDay / dayFeeds) * 1.1) {
      const napStart = addMinutes(feedEnd, jitter(30, 15));
      const napDuration = Math.max(15, Math.round(jitter(patterns.napDurationMin, patterns.napDurationJitter)));

      if (napStart < bedtime) {
        events.push(generateSleepEvent(napStart, 'nap', napDuration));
        napCount++;
        cursor = addMinutes(napStart, napDuration + jitter(20, 10));
      } else {
        cursor = addMinutes(feedEnd, jitter(patterns.feedIntervalMin, patterns.feedJitter));
      }
    } else {
      cursor = addMinutes(cursor, jitter(patterns.feedIntervalMin, patterns.feedJitter));
    }
  }

  // Extra diapers to hit daily target
  const diaperCount = events.filter(e => e.type === 'diaper').length;
  const extraDiapers = Math.max(0, patterns.diapersPerDay - diaperCount);
  for (let i = 0; i < extraDiapers; i++) {
    const randomHour = 7 + Math.random() * 12;
    const dTime = new Date(date);
    dTime.setHours(Math.floor(randomHour), Math.round(Math.random() * 59), 0, 0);
    events.push(generateDiaperEvent(dTime, patterns));
  }

  // Occasional note (~20% of days)
  if (Math.random() < 0.2) {
    const notes = [
      'Seemed extra fussy today',
      'Great day! Lots of smiles',
      'First time rolling to side',
      'Cluster feeding this evening',
      'Slept through the night!',
      'Doctor visit - all good',
      'Started tracking hands with eyes',
      'Loves the mobile above the crib',
      'Bath time was fun today',
      'Grandma visited today',
      'Tried tummy time for 5 min',
      'Cooing and making sounds',
      'Seems to be teething already?',
      'Growth spurt - extra hungry',
    ];
    const noteTime = new Date(date);
    noteTime.setHours(Math.round(jitter(14, 4)), Math.round(Math.random() * 59), 0, 0);
    events.push({
      id: randomUUID(),
      type: 'note',
      timestamp: noteTime.toISOString(),
      note: pick(notes),
    });
  }

  return events;
}

// --- Convert to DB rows ---

function toRow(event) {
  const { id, type, timestamp, ...data } = event;
  return {
    id,
    user_id: USER_ID,
    baby_id: BABY_ID,
    type,
    timestamp,
    data,
  };
}

// --- Main ---

async function main() {
  console.log('Seeding data for baby:', BABY_NAME);
  console.log('Birth date:', BIRTH_DATE);
  console.log('User ID:', USER_ID);
  console.log('Baby ID: (will be looked up)');

  // Restore session from existing token
  const { data: sessionData, error: authError } = await supabase.auth.setSession({
    access_token: process.env.ROSIE_ACCESS_TOKEN,
    refresh_token: process.env.ROSIE_REFRESH_TOKEN,
  });

  if (authError || !sessionData.session) {
    console.error('Auth failed:', authError?.message || 'No session');
    process.exit(1);
  }

  USER_ID = sessionData.session.user.id;
  console.log('Authenticated as:', USER_ID);

  // 0. Look up baby ID
  const { data: babiesData, error: babiesError } = await supabase
    .from('rosie_babies')
    .select('id, name')
    .eq('user_id', USER_ID);

  if (babiesError || !babiesData?.length) {
    console.error('No babies found for user:', babiesError?.message || 'empty');
    process.exit(1);
  }

  BABY_ID = babiesData[0].id;
  console.log('Found baby:', babiesData[0].name, '(' + BABY_ID + ')');

  // 1. Update baby birth date
  const { error: updateError } = await supabase
    .from('rosie_babies')
    .update({ birth_date: BIRTH_DATE })
    .eq('id', BABY_ID);

  if (updateError) {
    console.error('Failed to update birth date:', updateError.message);
  } else {
    console.log('Updated birth date to', BIRTH_DATE);
  }

  // 2. Delete existing events and growth measurements
  const { error: deleteError } = await supabase
    .from('rosie_events')
    .delete()
    .eq('user_id', USER_ID)
    .eq('baby_id', BABY_ID);

  if (deleteError) {
    console.error('Failed to delete existing events:', deleteError.message);
  } else {
    console.log('Cleared existing events');
  }

  const { error: deleteGrowthError } = await supabase
    .from('rosie_growth_measurements')
    .delete()
    .eq('user_id', USER_ID)
    .eq('baby_id', BABY_ID);

  if (deleteGrowthError) {
    console.error('Failed to delete existing growth measurements:', deleteGrowthError.message);
  } else {
    console.log('Cleared existing growth measurements');
  }

  // 3. Generate events for each day from birth to today
  const birthDate = new Date(BIRTH_DATE + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let allEvents = [];
  let day = new Date(birthDate);

  while (day <= today) {
    const ageMs = day - birthDate;
    const ageWeeks = Math.floor(ageMs / (7 * 24 * 60 * 60 * 1000));
    const dayEvents = generateDayEvents(new Date(day), ageWeeks);
    allEvents.push(...dayEvents);
    day.setDate(day.getDate() + 1);
  }

  // Filter out any events in the future
  const now = new Date();
  allEvents = allEvents.filter(e => new Date(e.timestamp) <= now);

  console.log(`Generated ${allEvents.length} events over ${Math.round((today - birthDate) / 86400000)} days`);

  // 4. Insert in batches of 500
  const rows = allEvents.map(toRow);
  const batchSize = 500;

  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const { error: insertError } = await supabase
      .from('rosie_events')
      .insert(batch);

    if (insertError) {
      console.error(`Batch ${Math.floor(i / batchSize) + 1} failed:`, insertError.message);
    } else {
      console.log(`Inserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(rows.length / batchSize)} (${batch.length} events)`);
    }
  }

  // 5. Generate and insert growth measurements
  const growthMeasurements = generateGrowthMeasurements(BIRTH_DATE);
  if (growthMeasurements.length > 0) {
    const { error: growthError } = await supabase
      .from('rosie_growth_measurements')
      .insert(growthMeasurements);

    if (growthError) {
      console.error('Failed to insert growth measurements:', growthError.message);
    } else {
      console.log(`Inserted ${growthMeasurements.length} growth measurements`);
    }
  }

  // Summary
  const feeds = allEvents.filter(e => e.type === 'feed').length;
  const sleeps = allEvents.filter(e => e.type === 'sleep').length;
  const diapers = allEvents.filter(e => e.type === 'diaper').length;
  const notes = allEvents.filter(e => e.type === 'note').length;

  console.log('\nDone! Summary:');
  console.log(`  Feeds: ${feeds}`);
  console.log(`  Sleeps: ${sleeps}`);
  console.log(`  Diapers: ${diapers}`);
  console.log(`  Notes: ${notes}`);
  console.log(`  Total: ${allEvents.length}`);
  console.log(`  Growth measurements: ${growthMeasurements.length}`);

  process.exit(0);
}

main();
