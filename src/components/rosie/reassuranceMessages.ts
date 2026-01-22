// Reassurance messages for different contexts
// These provide gentle affirmations that counter the anxiety-inducing nature of tracking apps

export interface ReassuranceMessage {
  message: string;
  context?: string; // Optional context for when to show
}

// Time-of-day based greetings
export const getTimeBasedReassurance = (hour: number, babyName: string): string => {
  if (hour >= 0 && hour < 6) {
    const nightMessages = [
      `You're awake. ${babyName} is lucky to have you.`,
      "Middle of the night parenting counts double.",
      "These quiet hours won't last forever. You're doing great.",
      `Every night feed is ${babyName} knowing they can count on you.`,
    ];
    return nightMessages[Math.floor(Math.random() * nightMessages.length)];
  } else if (hour >= 6 && hour < 12) {
    const morningMessages = [
      "You made it to morning. That's a win.",
      `Good morning. ${babyName} is happy to see you.`,
      "However last night went, today is a fresh start.",
      "Coffee first. Everything else second.",
    ];
    return morningMessages[Math.floor(Math.random() * morningMessages.length)];
  } else if (hour >= 12 && hour < 17) {
    const afternoonMessages = [
      "Halfway through the day. You're doing great.",
      "Afternoon stretch. Take a breath when you can.",
      `${babyName} doesn't need perfect. They just need you.`,
      "Whatever you're doing right now is enough.",
    ];
    return afternoonMessages[Math.floor(Math.random() * afternoonMessages.length)];
  } else {
    const eveningMessages = [
      "Almost bedtime. You've made it through another day.",
      "Evening routines don't have to be perfect to work.",
      `${babyName}'s day was good because you were in it.`,
      "Rest is coming. You've earned it.",
    ];
    return eveningMessages[Math.floor(Math.random() * eveningMessages.length)];
  }
};

// Empty state messages (when no events logged)
export const emptyStateMessages: ReassuranceMessage[] = [
  { message: "No events yet today. That's okay - log what matters to you." },
  { message: "Taking a moment? That's parenting too." },
  { message: "Not everything needs to be tracked. You know your baby." },
  { message: "Start when you're ready. There's no perfect time." },
];

export const getEmptyStateMessage = (babyName: string): string => {
  const messages = [
    `No events yet today. ${babyName} is still lucky to have you.`,
    "Taking a moment? That's parenting too.",
    "Not everything needs to be tracked. You know your baby.",
    "Start when you're ready. There's no perfect time.",
    `${babyName} doesn't care about the app. They just care about you.`,
  ];
  return messages[Math.floor(Math.random() * messages.length)];
};

// After logging event confirmations
export const getLogConfirmation = (eventType: 'feed' | 'sleep' | 'diaper' | 'note'): string => {
  const confirmations: Record<string, string[]> = {
    feed: [
      "Feed logged. Fed is best, however you're doing it.",
      "Another feed in the books.",
      "Logged. You're keeping them nourished.",
      "Feed tracked. You're doing great.",
    ],
    sleep: [
      "Sleep logged. Rest when you can too.",
      "Logged. Every bit of sleep counts.",
      "Sleep tracked. Hope you got some too.",
      "Another sleep session done.",
    ],
    diaper: [
      "Diaper logged. The glamorous side of parenting.",
      "Tracked. You're keeping them clean and comfy.",
      "Diaper change noted.",
      "Logged. One down, many to go.",
    ],
    note: [
      "Note saved.",
      "Got it. Thanks for sharing.",
      "Noted for later.",
    ],
  };

  const messages = confirmations[eventType] || ["Logged."];
  return messages[Math.floor(Math.random() * messages.length)];
};

// Contextual reassurance based on patterns
export const getPatternReassurance = (
  feedsToday: number,
  sleepMinutesToday: number,
  diapersToday: number,
  babyAgeWeeks: number
): string | null => {
  // Only show occasionally, not every time
  if (Math.random() > 0.3) return null;

  const messages: string[] = [];

  // Feed-related
  if (feedsToday >= 8 && babyAgeWeeks <= 8) {
    messages.push("Lots of feeds today - totally normal for this age. Cluster feeding is real.");
  } else if (feedsToday >= 6) {
    messages.push("Feeding on demand is feeding with love.");
  }

  // Sleep-related
  if (sleepMinutesToday < 120 && babyAgeWeeks <= 12) {
    messages.push("Short naps are developmentally normal. They'll consolidate eventually.");
  }

  // Diaper-related
  if (diapersToday >= 8) {
    messages.push("Lots of diapers means lots of healthy output. Well done.");
  }

  // General
  if (feedsToday > 0 && sleepMinutesToday > 0 && diapersToday > 0) {
    messages.push("Baby is fed, rested, and changed. You're nailing the basics.");
  }

  if (messages.length === 0) return null;
  return messages[Math.floor(Math.random() * messages.length)];
};

// Chat prompt suggestions based on context
export interface ChatPrompt {
  question: string;
  context: string;
  trigger: 'sleep_issue' | 'feeding_question' | 'developmental' | 'general' | 'leap';
}

export const getChatPrompts = (
  babyAgeWeeks: number,
  recentSleepQuality?: string,
  isInLeap?: boolean,
  leapNumber?: number
): ChatPrompt[] => {
  const prompts: ChatPrompt[] = [];

  // Leap-related prompts
  if (isInLeap && leapNumber) {
    prompts.push({
      question: `Why is ${leapNumber === 4 ? 'the 4-month regression' : `Leap ${leapNumber}`} so hard?`,
      context: 'Your baby is in a developmental leap',
      trigger: 'leap',
    });
    prompts.push({
      question: 'How long will this fussy phase last?',
      context: 'Leaps are temporary',
      trigger: 'leap',
    });
  }

  // Sleep-related prompts
  if (recentSleepQuality === 'poor' || recentSleepQuality === 'okay') {
    prompts.push({
      question: 'Why is my baby sleeping poorly?',
      context: 'Based on recent sleep logs',
      trigger: 'sleep_issue',
    });
  }

  // Age-specific prompts
  if (babyAgeWeeks >= 14 && babyAgeWeeks <= 20) {
    prompts.push({
      question: 'Is this the 4-month sleep regression?',
      context: 'Common around this age',
      trigger: 'developmental',
    });
  }

  if (babyAgeWeeks >= 16 && babyAgeWeeks <= 26) {
    prompts.push({
      question: 'When should we start solids?',
      context: 'Typical timing for this age',
      trigger: 'feeding_question',
    });
  }

  if (babyAgeWeeks >= 20 && babyAgeWeeks <= 30) {
    prompts.push({
      question: 'Is separation anxiety normal?',
      context: 'Common around 6-8 months',
      trigger: 'developmental',
    });
  }

  // General prompts as fallback
  prompts.push({
    question: 'What should I expect this week?',
    context: 'Developmental guidance',
    trigger: 'general',
  });

  prompts.push({
    question: 'Am I doing this right?',
    context: 'We all ask this',
    trigger: 'general',
  });

  return prompts.slice(0, 3); // Return max 3 prompts
};

// "What's Normal" context for stats
export interface NormalRange {
  label: string;
  range: string;
  note?: string;
}

export const getNormalRangesForAge = (babyAgeWeeks: number): {
  feeds: NormalRange;
  sleep: NormalRange;
  diapers: NormalRange;
} => {
  if (babyAgeWeeks <= 2) {
    return {
      feeds: { label: 'Feeds/day', range: '8-12', note: 'Frequent feeding is normal' },
      sleep: { label: 'Total sleep', range: '16-17 hrs', note: 'In short bursts' },
      diapers: { label: 'Diapers/day', range: '8-12', note: '6+ wet is healthy' },
    };
  } else if (babyAgeWeeks <= 8) {
    return {
      feeds: { label: 'Feeds/day', range: '8-10', note: 'Still frequent' },
      sleep: { label: 'Total sleep', range: '15-16 hrs', note: 'Day/night emerging' },
      diapers: { label: 'Diapers/day', range: '6-10', note: '6+ wet is healthy' },
    };
  } else if (babyAgeWeeks <= 16) {
    return {
      feeds: { label: 'Feeds/day', range: '6-8', note: 'May cluster feed' },
      sleep: { label: 'Total sleep', range: '14-15 hrs', note: '3-4 naps typical' },
      diapers: { label: 'Diapers/day', range: '6-8', note: 'Output may vary' },
    };
  } else if (babyAgeWeeks <= 26) {
    return {
      feeds: { label: 'Feeds/day', range: '5-7', note: 'Plus solids if started' },
      sleep: { label: 'Total sleep', range: '14 hrs', note: '2-3 naps typical' },
      diapers: { label: 'Diapers/day', range: '5-7', note: 'Changes with solids' },
    };
  } else if (babyAgeWeeks <= 52) {
    return {
      feeds: { label: 'Feeds/day', range: '4-6', note: 'Milk + solids' },
      sleep: { label: 'Total sleep', range: '13-14 hrs', note: '2 naps typical' },
      diapers: { label: 'Diapers/day', range: '4-6', note: 'Varies with diet' },
    };
  } else {
    return {
      feeds: { label: 'Meals/day', range: '3 + snacks', note: 'Milk decreasing' },
      sleep: { label: 'Total sleep', range: '12-14 hrs', note: '1-2 naps' },
      diapers: { label: 'Diapers/day', range: '4-6', note: 'Normal variation' },
    };
  }
};
