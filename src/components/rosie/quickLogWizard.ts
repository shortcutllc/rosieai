/**
 * Quick Log Wizard — Chat-native conversational logging
 *
 * Pure functions: no React, no state. Defines step sequences for each
 * event type with conditional branching based on previous answers.
 */

import type { WizardStep, QuickLogEventType, TimelineEvent } from './types';

// ── Initial steps for each event type ──

export function getWizardSteps(eventType: QuickLogEventType): WizardStep[] {
  switch (eventType) {
    case 'feed':
      return [
        {
          question: "Let's log a feed! Breast or bottle?",
          options: [
            { label: 'Breast', value: 'breast' },
            { label: 'Bottle', value: 'bottle' },
            { label: 'Solid food', value: 'solid' },
          ],
          field: 'feedType',
        },
      ];
    case 'sleep':
      return [
        {
          question: "Let's log some sleep! Nap or bedtime?",
          options: [
            { label: 'Nap', value: 'nap' },
            { label: 'Bedtime', value: 'night' },
          ],
          field: 'sleepType',
        },
      ];
    case 'diaper':
      return [
        {
          question: "Diaper check! What type?",
          options: [
            { label: 'Wet', value: 'wet' },
            { label: 'Dirty', value: 'dirty' },
            { label: 'Both', value: 'both' },
          ],
          field: 'diaperType',
        },
      ];
  }
}

// ── Conditional next steps based on answers so far ──

const WHEN_STEP: WizardStep = {
  question: 'When was this?',
  options: [
    { label: 'Just now', value: 'now' },
    { label: '15 min ago', value: '15' },
    { label: '30 min ago', value: '30' },
    { label: '1 hour ago', value: '60' },
  ],
  field: 'eventTime',
};

export function getNextSteps(
  eventType: QuickLogEventType,
  answers: Record<string, string>,
  currentField: string
): WizardStep[] {
  if (eventType === 'feed') {
    if (currentField === 'feedType') {
      if (answers.feedType === 'bottle') {
        return [
          {
            question: 'How many ounces?',
            options: [
              { label: '2oz', value: '2' },
              { label: '3oz', value: '3' },
              { label: '4oz', value: '4' },
              { label: '5oz', value: '5' },
              { label: '6oz', value: '6' },
              { label: '7oz', value: '7' },
              { label: '8oz', value: '8' },
            ],
            field: 'feedAmount',
          },
          WHEN_STEP,
        ];
      } else if (answers.feedType === 'breast') {
        return [
          {
            question: 'Which side?',
            options: [
              { label: 'Left', value: 'left' },
              { label: 'Right', value: 'right' },
              { label: 'Both', value: 'both' },
            ],
            field: 'feedSide',
          },
          {
            question: 'About how long?',
            options: [
              { label: '5 min', value: '5' },
              { label: '10 min', value: '10' },
              { label: '15 min', value: '15' },
              { label: '20 min', value: '20' },
              { label: '30 min', value: '30' },
            ],
            field: 'feedDuration',
          },
          WHEN_STEP,
        ];
      } else {
        // Solid food
        return [WHEN_STEP];
      }
    }
    // After intermediate feed steps, serve the remaining queued steps
    // The wizard controller handles step sequencing via remainingSteps
  }

  if (eventType === 'sleep') {
    if (currentField === 'sleepType') {
      return [
        {
          question: 'How long did they sleep?',
          options: [
            { label: '20 min', value: '20' },
            { label: '30 min', value: '30' },
            { label: '45 min', value: '45' },
            { label: '1 hour', value: '60' },
            { label: '1.5 hours', value: '90' },
            { label: '2 hours', value: '120' },
          ],
          field: 'sleepDuration',
        },
        WHEN_STEP,
      ];
    }
  }

  if (eventType === 'diaper') {
    if (currentField === 'diaperType') {
      return [WHEN_STEP];
    }
  }

  return []; // No more steps
}

// ── Convert wizard answers to a TimelineEvent shape ──

export function wizardAnswersToEvent(
  eventType: QuickLogEventType,
  answers: Record<string, string>
): Partial<TimelineEvent> {
  // Compute timestamp based on "when" answer
  const now = new Date();
  if (answers.eventTime && answers.eventTime !== 'now') {
    now.setMinutes(now.getMinutes() - parseInt(answers.eventTime));
  }

  const base: Partial<TimelineEvent> = {
    type: eventType,
    timestamp: now.toISOString(),
  };

  if (eventType === 'feed') {
    base.feedType = (answers.feedType as 'breast' | 'bottle' | 'solid') || 'bottle';
    if (answers.feedSide) base.feedSide = answers.feedSide as 'left' | 'right' | 'both';
    if (answers.feedAmount) base.feedAmount = parseInt(answers.feedAmount);
    if (answers.feedDuration) base.feedDuration = parseInt(answers.feedDuration);
    if (answers.feedSide && answers.feedSide !== 'both') {
      base.feedLastSide = answers.feedSide as 'left' | 'right';
    }
  } else if (eventType === 'sleep') {
    base.sleepType = (answers.sleepType as 'nap' | 'night') || 'nap';
    if (answers.sleepDuration) base.sleepDuration = parseInt(answers.sleepDuration);
  } else if (eventType === 'diaper') {
    base.diaperType = (answers.diaperType as 'wet' | 'dirty' | 'both') || 'wet';
  }

  return base;
}

// ── Friendly confirmation message ──

export function getWizardConfirmation(
  eventType: QuickLogEventType,
  answers: Record<string, string>
): string {
  const now = new Date();
  if (answers.eventTime && answers.eventTime !== 'now') {
    now.setMinutes(now.getMinutes() - parseInt(answers.eventTime));
  }
  const time = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  if (eventType === 'feed') {
    if (answers.feedType === 'bottle') {
      return `Got it — ${answers.feedAmount || ''}oz bottle at ${time}`;
    } else if (answers.feedType === 'breast') {
      return `Got it — ${answers.feedDuration || ''}min breastfeed (${answers.feedSide || 'both'} side) at ${time}`;
    } else {
      return `Got it — solid food at ${time}`;
    }
  } else if (eventType === 'sleep') {
    const durMin = parseInt(answers.sleepDuration || '0');
    const durStr = durMin >= 60
      ? `${Math.floor(durMin / 60)}h${durMin % 60 > 0 ? ` ${durMin % 60}min` : ''}`
      : `${durMin}min`;
    return `Got it — ${answers.sleepType || 'nap'}, ${durStr} at ${time}`;
  } else {
    const typeLabel = answers.diaperType === 'both' ? 'wet + dirty'
      : answers.diaperType === 'dirty' ? 'dirty' : 'wet';
    return `Got it — ${typeLabel} diaper at ${time}`;
  }
}

// ── Summary for event confirmation card ──

export function getWizardEventSummary(
  eventType: QuickLogEventType,
  answers: Record<string, string>
): string {
  const now = new Date();
  if (answers.eventTime && answers.eventTime !== 'now') {
    now.setMinutes(now.getMinutes() - parseInt(answers.eventTime));
  }
  const time = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  if (eventType === 'feed') {
    if (answers.feedType === 'bottle') {
      return `Bottle feed, ${answers.feedAmount || '?'}oz at ${time}`;
    } else if (answers.feedType === 'breast') {
      return `Breastfeed, ${answers.feedDuration || '?'}min (${answers.feedSide || 'both'}) at ${time}`;
    } else {
      return `Solid food at ${time}`;
    }
  } else if (eventType === 'sleep') {
    const durMin = parseInt(answers.sleepDuration || '0');
    const durStr = durMin >= 60
      ? `${Math.floor(durMin / 60)}h${durMin % 60 > 0 ? ` ${durMin % 60}min` : ''}`
      : `${durMin}min`;
    return `${answers.sleepType === 'night' ? 'Night sleep' : 'Nap'}, ${durStr} at ${time}`;
  } else {
    const typeLabel = answers.diaperType === 'both' ? 'Wet + dirty'
      : answers.diaperType === 'dirty' ? 'Dirty' : 'Wet';
    return `${typeLabel} diaper at ${time}`;
  }
}
