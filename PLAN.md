# Plan: Contextual Home Experience + "This Week" Integration

## Vision

Rosie evolves from a baby tracker into a contextual parent companion. The app anticipates what you need instead of waiting for you to navigate to it. Three pillars:

1. **Contextual Home Surface** — replaces the default tab with an intelligent view that knows what you probably need right now
2. **Conversational Onboarding** — first interaction is a conversation, not a form. Rosie learns about your family through chat.
3. **External Context Layer** — starting with Apple HealthKit for parent sleep/wellness, designed to accept more data sources over time

## What We're Building (Phase 1)

Replace the current default tab (Timeline as a flat event log) with a **contextual home surface** that knows what the parent probably needs right now and surfaces one developmental insight from the "This Week" engine. "This Week" stays as the deep-dive destination.

## Architecture

### New Component: `RosieHome.tsx`

A new component that becomes the default view. It combines three layers:

**Layer 1 — Contextual Quick Actions (top)**
Uses baby's age, time of day, last logged events, and active timer to surface the 1-2 most likely actions:

- Computes `timeSinceLastFeed`, `timeSinceLastSleep`, `timeSinceLastDiaper` from `timeline` events
- Uses `developmentalInfo.feedingInfo.frequency` and `developmentalInfo.sleepInfo.wakeWindow` to know expected intervals
- Uses `timePeriod` (morning/afternoon/evening/night) for context
- Renders 1-2 prominent action buttons (e.g., "Start Feed — Right Side" if last was left, or "Log Nap" if wake window is approaching)
- If a timer is active, that becomes the primary display (already handled by the banner, so this layer defers)

Logic sketch:
```
if activeTimer → show timer status (already handled by banner)
else:
  compute: minutesSinceLastFeed, minutesSinceLastSleep, lastFeedSide
  get: expectedFeedInterval from feedingInfo, expectedWakeWindow from sleepInfo

  primary action = whichever is most "due" (closest to or past expected interval)
  secondary action = the next most likely

  night mode (10pm-6am): bias toward feed actions, minimal UI
  morning: show both feed + sleep options
  daytime: full context
```

**Layer 2 — One Insight from "This Week" (middle)**
A single card pulled from the developmental engine. Rotates based on time of day and what hasn't been shown:

- Sources: `getWeekIntro()` (leap/stage context), `wellnessContent` (parent support), `quickWins` (activities), `expertInsights` (research), `whatToExpect`, `commonConcerns`
- Selection logic: pick one based on time of day + a simple rotation so it feels fresh across visits
  - Morning: activity/quick win or "what to expect today"
  - Afternoon: developmental insight or milestone context
  - Evening: parent wellness ("you did great today") or expert reassurance
  - Night: minimal — short encouragement only
- Card has a "More about Week {n} →" link that switches to the Development tab

**Layer 3 — Recent Activity (bottom)**
Compact summary of today's events — not the full timeline, just the at-a-glance:
- Last feed (time ago + type + side if breast)
- Last sleep (time ago + duration)
- Last diaper (time ago + type)
- Today's totals: X feeds, Y hours sleep, Z diapers
- "See full timeline →" link that switches to Timeline tab

### New Module: `contextEngine.ts`

Pure functions (no React) that compute what to show:

```typescript
interface ContextualState {
  // Quick actions
  primaryAction: SuggestedAction;
  secondaryAction: SuggestedAction | null;

  // Insight
  insight: ContextualInsight;

  // Recent activity summary
  todaySummary: DaySummary;
}

interface SuggestedAction {
  type: 'feed' | 'sleep' | 'diaper';
  label: string;        // "Start Feed — Right Side"
  sublabel: string;     // "Last feed 2h 30m ago"
  feedType?: 'breast' | 'bottle' | 'solid';
  feedSide?: 'left' | 'right';
}

interface ContextualInsight {
  text: string;
  category: 'development' | 'wellness' | 'activity' | 'reassurance' | 'research';
  source?: string;      // "Week 6" or "Emily Oster, Cribsheet"
}

interface DaySummary {
  lastFeed: { timeAgo: string; detail: string } | null;
  lastSleep: { timeAgo: string; detail: string } | null;
  lastDiaper: { timeAgo: string; detail: string } | null;
  feedCount: number;
  totalSleepMinutes: number;
  diaperCount: number;
}

// Optional external context — designed for HealthKit, calendar, etc.
interface ExternalContext {
  parentSleep?: {
    totalHours: number;
    quality?: 'good' | 'fair' | 'poor';
    source: string; // 'healthkit' | 'manual'
  };
  // Future: calendar events, baby monitor data, etc.
}

function getContextualState(
  timeline: TimelineEvent[],
  developmentalInfo: DevelopmentalInfo,
  leapStatus: LeapStatus,
  wellnessContent: ParentWellnessContent | null,
  quickWins: QuickWin[],
  timePeriod: TimePeriod,
  lastFeedSide?: string,
  externalContext?: ExternalContext
): ContextualState
```

When `externalContext.parentSleep` is present and low (< 5 hours), the insight selection biases toward parent wellness content and the morning briefing adjusts tone: practical tips, lower expectations for the day, encouragement. This surfaces naturally through the insight card — no dedicated "your sleep" section. In chat, Rosie can reference it conversationally: "Rough night — 4 hours. Go easy on yourself today."

HealthKit integration is a Phase 2 build. The context engine accepts the data shape now so it's ready when that lands.

### Changes to `RosieAI.tsx`

- Add `'home'` to the tab type union: `'home' | 'timeline' | 'insights' | 'development' | 'chat'`
- Default `activeTab` to `'home'` instead of `'timeline'`
- Render `RosieHome` for the home tab
- Pass it: `timeline`, `developmentalInfo`, `timePeriod`, `lastFeedSide`, `activeTimer`, plus callbacks for `onAddEvent`, `onStartTimer`, `onTabChange` (to navigate to Timeline or Development)
- Quick log buttons still available on home tab (RosieQuickLog renders when `activeTab === 'home'` too)
- Add home tab to nav (first position), relabel tabs: **Home | Timeline | This Week | Ask Rosie**
- Drop Insights tab from nav (it can be accessed from Timeline or Home later — reduces tab count to 4 and removes the weakest standalone tab)

### Changes to Tab Bar

Current: `Timeline | Insights | This Week | Ask Rosie`
New: `Home | Timeline | This Week | Ask Rosie`

Insights content doesn't disappear — the daily summary on Home covers the quick-glance need, and we can link into a dedicated insights view from Timeline later. This keeps the tab bar to 4 items and makes room for Home without overcrowding.

### CSS

- New styles for the home surface in `rosie.css`
- Contextual action buttons: large, tappable, one-handed friendly
- Insight card: compact, warm, with subtle "More →" affordance
- Recent activity: minimal, scannable rows
- Night mode: reduced contrast, no bright elements, minimal content

## Implementation Order

1. **`contextEngine.ts`** — Pure logic, no UI. Compute suggested actions + select insight + build day summary.
2. **`RosieHome.tsx`** — New component consuming the context engine output.
3. **`RosieAI.tsx` changes** — Add home tab, make it default, wire props, adjust tab nav.
4. **CSS** — Styles for the new home surface.
5. **Polish** — Night mode behavior, transition animations, edge cases (no events yet, newborn first day).

## What Stays The Same

- "This Week" tab — untouched, stays as the deep dive
- Timeline tab — untouched, stays as the full event log
- Ask Rosie tab — untouched
- RosieQuickLog — untouched, still renders its FAB + modals
- All data structures, Supabase sync, localStorage — untouched
- RosieHeader — untouched

## Phase 2: Conversational Onboarding

Replace the current `RosieOnboarding.tsx` form with a chat-style flow. The first interaction with Rosie is a conversation.

### Flow

The onboarding conversation collects the same data the current form does (name, birth date) but through a conversational interface with inline structured inputs (date pickers, quick-reply buttons) embedded in the chat thread — RCS-style form fields inside messages.

**Critical constraint:** Sleep-deprived parents at 2am don't want 8 back-and-forth messages. The conversation should be 3-4 exchanges max, with a graceful fast path:

> "I'm Rosie. What's your baby's name?"
> *[text input]*
> "When was Oliver born?"
> *[inline date picker]*
> "Oliver is 3 weeks old — right in the newborn cocoon. I'll track his feeds, sleep, and diapers and keep you posted on what to expect each week. Ready to log your first feed?"
> *[Quick reply: "Start a feed" / "Just exploring"]*

That last exchange does double duty: logs the first event AND teaches the parent what Rosie does. No tutorial screen.

**If the parent picks "Just exploring"**, they land on the home surface with contextual actions ready. Everything else Rosie learns over time through usage.

### Technical Approach

Two options:
1. **Repurpose `RosieChat.tsx` with a scripted mode** — add a `mode: 'onboarding' | 'freeform'` prop. Onboarding mode drives a scripted conversation tree with inline form elements. Same chat UI, different brain.
2. **Dedicated lightweight conversational UI** — simpler, no dependency on the full chat component.

Option 1 is better long-term — the chat component gains inline structured inputs (date pickers, quick replies) that are useful for freeform chat too ("When did the feed start?" → inline time picker).

### Inline Structured Inputs

These render inside chat bubbles as interactive elements:
- **Quick reply buttons**: Tappable options below a message (like RCS suggested replies)
- **Date picker**: Inline calendar/date selector
- **Time picker**: Scroll wheel or input for time
- **Toggle/choice cards**: Visual selection (e.g., breast/bottle/solid with icons)

These same components will be reusable when Rosie's freeform chat asks structured questions.

## Phase 3: External Context (HealthKit)

Apple HealthKit integration for parent sleep data. Surfaces through:
- **Morning insight card on home**: "You got 4 hours last night. Take it easy today."
- **Chat**: Rosie references it conversationally when relevant, or parent can ask "how am I doing?"
- **Insight selection bias**: Low sleep → wellness/encouragement content prioritized over activity suggestions

HealthKit is read-only, on-device, no OAuth. Requires native bridge (Capacitor/React Native) or PWA with HealthKit web API (limited). Architecture decision deferred to Phase 3 scoping.

Future external sources (calendar, baby monitors) plug into the same `ExternalContext` interface in the context engine.

## Competitive Landscape (Key Takeaways)

**Market signal:** a16z published a formal investment thesis on AI-powered parenting (Nov 2024), actively looking for more deals. Magnify Ventures ($52M, Melinda French Gates) deploying into same space. Market projected $35B by 2034.

**Nobody owns tracking + conversational AI + developmental guidance combined.** The market splits into:
- Trackers (Huckleberry, Bambii) — dashboard-first, AI bolted on
- Chatbots (Good Inside $276/yr, ParentData, YOYA) — advice only, no tracking, no awareness of your baby's actual data
- Family logistics (Milo, Ario) — calendar/scheduling, not baby-specific
- Hardware (Nanit $50M raise, Owlet, Cradlewise) — expensive, device-locked

**Joy ($24M Series A, Nov 2025)** is closest competitor — AI chat + human coaches + building a tracker (still beta). Differentiates on human coaches, which limits margin scalability.

**Milo (YC W22, $30M raised)** — SMS-first family AI. Interesting patterns:
- "Forward and forget" — one input (screenshot a flyer, forward an email), multiple outputs (calendar event + todo + reminder). Rosie equivalent: one logged feed generates insight about feeding patterns, growth spurt detection, side tracking.
- Daily rundown is the killer feature — morning SMS summarizing the day. Rosie's contextual home surface is a richer version of this.
- Two-layer architecture: deterministic logic for things that need to be exact (scheduling), AI for parsing messy inputs. Our context engine should follow same principle — math for "which action is due," AI for the conversational layer.
- Cautionary lesson: SMS-only caps the experience. Can't show charts, progress bars, interactive timers. $40/month with no free tier, 4 employees, still on waitlist after 3+ years. Thoughtful product, limited growth.

**Wide-open gaps Rosie targets:**
- HealthKit integration for parent wellness — zero competitors doing this
- Local-first privacy architecture — every competitor is cloud-dependent, Rosie already has this
- Hardware-free developmental intelligence — Nanit building it behind $299 camera paywall
- Affordable price point — Good Inside $276/yr, Joy $144/yr, Milo $480/yr

## Edge Cases

- **First visit, no events logged**: Show a welcome state with first suggested action based on age ("Newborns feed every 2-3 hours. Ready to log your first feed?")
- **Timer active**: Banner handles this already. Home layer just shows recent context below it.
- **Baby older than 52 weeks**: `developmentalInfo` clamps to week 52. Insight still works from that data.
- **Conversational onboarding interrupted**: If parent closes mid-conversation, persist what we have. Name only? Fine — prompt for birth date on next open. Birth date only? Also fine — we can derive the week and start showing contextual content immediately.
