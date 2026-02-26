# Rosie AI — Product Strategy

## The Thesis

Every baby tracker turns parents into data entry clerks. They open the app 10-15 times a day to log feeds, sleep, and diapers — tapping through forms, selecting options, setting times. Within 2-3 weeks, most parents abandon the app or feel enslaved by it. The data they do collect sits in dashboards they never analyze.

**Rosie inverts this.** The AI does the thinking. The parent does the living.

Rosie is the only product that combines real-time baby tracking, conversational AI that knows your specific baby's data, location-aware contextual intelligence, and developmental guidance — all without hardware, accessible from any device, designed to require less effort over time, not more.

---

## Strategic Moat: The Five Pillars

### 1. Effortless Input (The Anti-Tracking Tracker)

The fundamental UX problem: logging is a tax on parents who are already exhausted. Every competitor treats input as a form. Rosie treats input as a conversation.

**Today (Web):**
- Conversational logging: "Just text Rosie" — type "fed at 3, left side, fussy" and Rosie parses it into a structured event with Claude, responds with context, and logs it. The logging IS the conversation.
- Smart defaults: After 1 week of data, quick log buttons pre-fill the most likely event (breast/left in the morning, bottle in the afternoon). One tap confirms instead of six fields.
- Context-aware suggestions: "It's been 3 hours since Oliver's last feed. Ready to log one?" appears as a gentle prompt, not a notification.

**Near-term (Progressive Web App):**
- Voice input: Hold one button, speak. "Just finished feeding, right side, 15 minutes." Browser speech-to-text API parses it. Zero forms.
- Photo logging: Snap a diaper photo — Rosie identifies wet/dirty/both. Photo of a bottle — reads the ounce markings.
- Quick-reply logging from chat: Rosie asks "Just finished a feed?" — parent taps "Yes" — Rosie infers time (now), type (breast, based on pattern), side (right, based on last). One interaction.

**Future (Native App):**
- Siri/shortcut integration: "Hey Siri, tell Rosie we just fed on the left." Logged without opening the app.
- Passive detection: Phone stationary in feeding position for 15 minutes → "Looks like you just finished a feed — want me to log it?" Motion, sound, and location sensors infer events.
- Apple Watch: Tap complication → confirm pre-filled event → done. 2 seconds.
- Lock screen widget: Live Activity showing current state ("Last feed 2h ago — due soon") with one-tap log.

**The principle:** Logging effort should decrease over time. Week 1 requires manual input. Week 3, Rosie predicts 80% of events correctly and just needs confirmation. Month 3, Rosie knows your patterns so well that it can log events with a single tap or voice confirmation.

**Why this is a moat:** The more data Rosie collects, the less effort future logging requires. Switching to a competitor means starting over with dumb forms. After 3 months, the effort gap between Rosie and any other app is enormous.

---

### 2. Location-Aware Contextual Intelligence

No baby app factors in where you are and what it's like outside. Rosie already has the weather API and user location. This unlocks three capabilities no competitor offers:

**A. Environmental Context → Mood Prediction**
- Harsh winter, stuck inside all day → Rosie detects the "Groundhog Day" pattern and intervenes: "You've been home all day and it's 28°F out. Here are some indoor activities for Oliver's age, or there's a warm-up happening tomorrow — want me to find something nearby?"
- Heat wave, poor air quality → "AQI is elevated today. Good day to stay in. Here's a sensory play idea that works in the living room."
- Beautiful spring day → "It's 68° and sunny — perfect for a stroller walk. Oliver is at the age where outdoor visual stimulation helps with tracking and focus."
- Rainy streak → Day 3 of rain detected → "Cabin fever is real. Here's a music class at the YMCA just a 10-minute walk from you — they have a covered entrance."

**B. Hyperlocal Activity Discovery**
- Age-appropriate classes, events, and activities within 1-5 mile radius
- Sources: Google Places API, Yelp, local library calendars, YMCA/community center schedules, Meetup groups
- Filtered by baby's developmental stage: "Music & Movement (0-12mo) at Little Steps Studio — 0.8 miles, next class Thursday 10am"
- Walking vs. driving radius options: "Quick walk" (< 1 mile) vs "Quick drive" (< 5 miles)
- Seasonal awareness: indoor options in winter, outdoor in summer, rainy day backups
- "Other parents near you" — anonymous aggregate: "12 Rosie families within 3 miles have babies Oliver's age" (future, privacy-first)

**C. Daily Planning with Location Context**
- Morning briefing includes weather + activity suggestion + developmental focus: "Today: 45°F and cloudy. Oliver's working on grasping this week. There's an open play session at the community center at 10am (1.2 miles), or try the reaching-for-toys activity at home."
- Afternoon suggestion if no outing logged: "Looks like you've been home today. A 15-minute walk — even bundled up — gives Oliver fresh visual stimulation and gives you a reset."

**Why this is a moat:** Building a location-aware recommendation engine with developmental stage filtering is genuinely hard. No baby app has attempted it. Once a parent relies on Rosie to plan their day with contextual awareness, switching means going back to manually Googling "baby classes near me."

---

### 3. Proactive Developmental Intelligence

Parents' biggest anxiety is milestones — "Is my baby on track?" Every app shows a static checklist that creates more anxiety than it resolves. Rosie flips this from a scary checklist into a proactive daily plan.

**A. Anticipatory Guidance Engine**
Tell parents what's coming BEFORE they need to Google it:
- "Oliver turns 4 months next week. Three things commonly change: sleep patterns shift (the famous 4-month regression), he'll start reaching for objects, and he may show interest in watching you eat. I'll watch for signs of each."
- "Based on Oliver's feeding pattern this week (intervals shortening, longer sessions), he may be starting a growth spurt. This typically lasts 2-3 days. His appetite will return to normal."
- "In about 2 weeks, stranger anxiety often kicks in. Totally normal — it means Oliver is developing healthy attachment. Heads up for when grandma visits."

**B. Daily Activity Planning**
Instead of milestone checklists, Rosie plans the day:
- Morning: "3 things to do with Oliver today" — tied to his current developmental stage and what he's working on
- Activities matched to his tracked data: "Oliver's been practicing head control well (you logged tummy time 4 times this week). Today, try propping him on a Boppy during tummy time to build upper body strength."
- Difficulty progression: Rosie increases activity complexity as the baby masters each skill
- Time-aware: "It's almost nap time — save the active play for after. Here's a quiet book activity instead."

**C. Personalized Milestone Tracking**
- Track precursor skills, not arbitrary deadlines: head control → supported sitting → independent sitting → pulling to stand
- Skill tree visualization: completed skills, emerging skills, next expected skills
- Celebrate progress: "Oliver just rolled from back to tummy for the first time! That's a huge motor milestone. Most babies do this between 4-6 months — he's right in the sweet spot at 5 months."
- "Is This Normal?" instant reassurance: "Oliver hasn't rolled yet at 5 months. 40% of babies roll between 5-7 months. He's showing strong head control and reaching, which are the precursor skills. No concern here."

**D. Cross-Variable Correlation Engine**
Connect the dots across data streams that no app currently does:

| Pattern Detected | Insight |
|---|---|
| Feed frequency up 20% over 2 days | "Increased appetite often precedes a growth spurt — expect this for 2-3 days" |
| Night wakings increase after 2+ weeks of good sleep | "This aligns with Developmental Leap 4 — fussiness peaks now and eases in 1-2 weeks" |
| Daytime nap time decreasing | "Oliver is consolidating sleep — less daytime = more nighttime. This is progress." |
| 3+ fussy notes in one day + age alignment | "Today was hard. Babies at 19 weeks are entering a developmental leap. This is temporary." |
| Feed duration decreasing while frequency stable | "Oliver is becoming more efficient at feeding — shorter sessions are a skill, not a problem." |

**Why this is a moat:** Personalized correlations require weeks of data. After 2+ months, Rosie's predictions for YOUR baby are significantly better than any app starting from scratch. The switching cost is losing all that learned intelligence.

---

### 4. Emotional Intelligence & Parent Wellness

Every parenting app focuses on the baby. Rosie is the first to systematically care for the parent.

**A. Detect Burnout from Usage Patterns**
Signals Rosie can detect from data already being collected:
- Logging fatigue: entries becoming sparser, shorter, less detailed
- Time-of-day shifts: increasing late-night activity
- Sentiment drift in chat: questions shifting from curious to anxious to nihilistic
- Long gaps followed by burst logging (overwhelmed, playing catch-up)
- Repeated "is this normal?" questions (escalating anxiety)

Response style — NOT clinical, but friend checking in:
> "Hey — I noticed things have been quieter the last few days. Oliver's doing great based on what you've logged. How are YOU doing? Seriously. It's okay to not be okay at 12 weeks."

**B. Proactive Wellness Check-ins**
- After a rough night (3+ night feeds logged): "That was a tough night. You're running on fumes. Today's priority: survive. Everything else can wait."
- After a big milestone: "Oliver's been through a lot this week. But so have you. The sleep deprivation around regressions is real."
- The 3-day rule: If no parent-focused notes for 3 days, gentle prompt: "You've been so focused on Oliver. What about you?"
- Comparison antidote: If parent asks lots of "is my baby behind?" questions, proactively address comparison anxiety

**C. The 3am Companion**
The loneliest moment in new parenthood is 3am — baby feeding, partner sleeping, world asleep. Rosie is designed for this moment:
- Night mode: reduced contrast, minimal UI, warm tone
- Ultra-short responses: 2-3 sentences max
- Validation first, information second: "You're up again. This is the hardest part, and you're doing it. Oliver is lucky to have you."
- Practical when needed: "If the fever goes above 100.4°F, that's a doctor call. At 99.8, you're in the watch zone."
- Historical context: "Oliver had a similar fussy episode 2 weeks ago. It lasted about 3 hours and resolved on its own."

**Why this is a moat:** An AI that notices the PARENT is struggling and responds with genuine, contextual compassion earns a level of trust that no feature set can match. After months of these interactions, the relationship feels personal and irreplaceable.

---

### 5. The Data Flywheel

The core loop that creates compounding value:

```
More data logged → Better personalization → More valuable insights →
More engagement → More data logged → Less effort to log → ...
```

**Timeline:**
- **Day 1-2:** Basic tracker with good design. Rosie is a slightly better Huckleberry.
- **Week 2:** Pattern baselines established. Rosie starts saying "Oliver usually..." — it knows HIS patterns. Smart defaults reduce logging effort by 30%.
- **Month 2:** Correlation engine kicks in. Non-obvious connections surface. Logging effort down 50% (predictions + one-tap confirms).
- **Month 4:** Predictive confidence is high. Rosie anticipates nap times, feeding needs, fussy periods. Logging is nearly passive.
- **Month 6:** Rosie has seen Oliver through growth spurts, sleep regressions, and developmental leaps. It remembers what worked each time.
- **Month 12:** The complete narrative of Oliver's first year — every milestone, every hard night, every breakthrough. Emotional artifact + irreplaceable intelligence.

**Second baby advantage:** "When Oliver was this age, he went through the same thing. Here's what worked for your family." Cross-sibling pattern matching is impossible without historical data.

**Why this is a moat:** Every day of data makes the next day's predictions better. After 3+ months, the switching cost is both functional (losing predictions) and emotional (losing the narrative). This is the Strava model applied to parenting.

---

## Onboarding & Personalization Architecture

### The Core Principle

**Get parents to value in under 60 seconds. Deepen personalization over time.**

The birth date is the single most powerful data point. From it, Rosie derives the baby's exact age in days/weeks/months, developmental stage, expected milestones, typical sleep patterns, feeding norms, and growth expectations. Everything else makes the experience better, but the birth date makes it *work*.

### Onboarding: The Minimum Viable Profile

These are the only questions that block the parent from entering the app. Total time: under 60 seconds.

| # | Field | Why It's Essential |
|---|-------|--------------------|
| 1 | **Parent name** | Personalized greeting, conversational tone ("Morning, Sarah!") |
| 2 | **Baby name** | Used in every insight, prompt, and response |
| 3 | **Birth date** | THE key input — drives all age-based intelligence |
| 4 | **Due date** *(if born early)* | Enables adjusted/corrected age for premature babies |

That's it. No feeding method, no birth weight, no health questions at onboarding. Get them into the app.

**Why due date matters:** A baby born 8 weeks early at 6 months chronological is developmentally at 4 months. Every recommendation shifts — milestones, sleep, feeding, growth charts. The AAP recommends using corrected age until 24 months. Wonder Weeks uses ONLY the due date for their developmental leap calculations.

### The Quick Catch-Up Quiz (Non-Blocking)

After onboarding, the home screen shows a "Quick Catch-Up" card. This is NOT blocking — parents can log events, chat with Rosie, and use the app fully without it. Questions adapt to the baby's age (computed from birth date).

**4 topics, ~2 minutes total:**

1. **Feeding** — breast/bottle/combo/pumping, and solids status if 4+ months. This is the #2 branching variable after age — changes supplement guidance, feed frequency expectations, night waking patterns, and smart prompt suggestions.

2. **Sleep** — naps/day, bedtime, night wakings, how baby falls asleep. Sleep is the #1 parent concern. Knowing the baseline lets Rosie detect regressions and give meaningful (not generic) guidance.

3. **Milestones** — age-appropriate checkboxes of what baby's currently doing. Pre-fills the milestone skill tree so the Daily Plan and guidance are immediately relevant.

4. **What's on your mind?** — free text. Goes directly into Claude's system prompt as a parent concern. If a parent types "she won't stop waking up at night," Rosie proactively references this in insights and suggestions. This is gold.

### How Rosie AI Uses This Data: Claude IS the Rules Engine

**We do NOT need to code hundreds of if/then scenarios.**

A pure rules-based system would need **400-700 hand-coded rules** to cover feeding × sleep × milestones × health × age combinations for 0-12 months. Each rule needs expert-reviewed content. Every new variable (reflux, tongue tie, twins) creates a combinatorial explosion.

Claude handles this naturally through structured context injection. Given:

> "Lily is 6 months old, on a combination of bottles and solids, waking 3x at night, parent is concerned about night waking, it's 3am and 28°F outside."

Claude generates a response that's warm, specific to Lily, addresses the night waking concern, acknowledges the 3am timing, and doesn't suggest outdoor activities. No rules needed.

### The Hybrid Architecture

| Layer | What It Does | Examples |
|-------|-------------|----------|
| **Client rules** (~20-30 simple rules) | Time-sensitive UI decisions | Wake window timers, feed interval display, night mode trigger (10pm-6am), which log buttons to show by age (add "Solids" at 4+ months) |
| **Claude (system prompt)** | All guidance, insights, personalization | Chat responses, home insights, daily plan activities, milestone commentary, trend analysis, proactive alerts |
| **Caching layer** | Cost + latency optimization | Home insight cached per session, weekly guidance cached, chat is real-time |

### Cost Estimate

| Interaction Type | Frequency | Cost/Call | Monthly Cost (per user) |
|-----------------|-----------|-----------|------------------------|
| Chat messages | 5-10/day | ~$0.01 | $1.50-3.00 |
| Home insight | 1/day (cached) | ~$0.01 | $0.30 |
| Weekly guidance | 1/week | ~$0.02 | $0.08 |
| **Total** | | | **~$2-4/month/user** |

Sustainable for a $5-8/month subscription. With Anthropic's prompt caching (stable system prompt cached across calls), cost drops further.

### Key Research Findings

**What top baby apps collect at onboarding:**
- Apps praised for best UX (Baby Tracker by Nighp, Nara Baby) collect the LEAST during onboarding
- Wonder Weeks needs only a due date — that's their single input
- Huckleberry collects feeding method only after 3+ days of usage, not at sign-up

**Biggest branching variables in baby guidance (research-backed hierarchy):**
1. **Age** — almost every recommendation changes by age
2. **Gestational age / prematurity** — creates a parallel developmental timeline
3. **Feeding method** — determines supplements, frequency, troubleshooting path
4. **Birth weight** — especially for low birth weight infants
5. **Health conditions** — GERD, allergies, tongue tie (collected progressively, not at onboarding)
6. **Family allergy history** — changes solid food introduction approach
7. **Parent experience level** — can be inferred from usage patterns, not asked

**The moat:** No baby app currently uses an LLM this deeply for personalization. Most use pre-authored, age-gated content. Rosie synthesizes age + feeding + health + patterns + concerns + weather + time into genuinely personalized guidance. That's the differentiator.

---

## Competitive Landscape

### The Market Map

| Category | Key Players | Their Strength | Their Weakness |
|---|---|---|---|
| **Pure Trackers** | Huckleberry ($16M raised), Baby Daybook, BabyConnect, Baby Tracker (Amila) | Great logging UX, SweetSpot nap predictions | No AI, no developmental context, dashboards nobody analyzes |
| **Developmental Content** | Wonder Weeks, BabySparks, Ovia | Rich educational content, activity libraries | No tracking, no personalization, generic |
| **AI Chatbots** | Good Inside ($10.5M), ParentData, YOYA | Expert-backed AI advice | No tracking data — don't know YOUR baby |
| **Smart Hardware** | Nanit ($158M), Owlet (public, $375M mkt cap), Cradlewise | Automated sleep tracking, health monitoring | $300-2000 hardware, locked ecosystems |
| **AI-First Platforms** | Joy ($24M), Milo ($30M) | Combining AI + guidance | Joy tracker still beta; Milo is SMS-only, $40/mo, no baby-specific tracking |

### Rosie's Unique Position

Rosie is the **only product** that combines:
1. Real daily tracking (feeds, sleep, diapers, growth)
2. AI chat powered by a frontier model that knows your baby's actual data
3. Location-aware contextual intelligence (weather, activities, daily planning)
4. Proactive developmental guidance (not reactive checklists)
5. Parent wellness detection and emotional support
6. Web-first (no app store dependency, works on any device)
7. No hardware required
8. Designed to reduce logging effort over time (anti-tracking tracker)

No competitor does more than 2 of these today.

### Biggest Competitive Risks

1. **Joy** merging $24M funding + AI expertise + Heba Care acquisition into a polished tracker + AI product
2. **Nanit** adding AI chat to its 1M-family hardware ecosystem
3. **Huckleberry** bolting on AI chat to its already-beloved tracking platform (they have the data and user base)

### Pricing Strategy

The market sweet spot is $40-80/year for software-only. Parents resist >$100/yr without human experts.

**Rosie's approach:**
- **Free tier:** Full tracking + limited AI chat (X messages/day) + basic developmental content
- **Premium ($5-8/mo, $50-70/yr):** Unlimited AI chat + proactive insights + correlation engine + activity discovery + caregiver sharing + pediatrician export
- **Undercuts:** Good Inside ($276/yr), Joy ($144/yr), Huckleberry Premium ($120/yr), Milo ($480/yr)
- **Matches:** Baby Daybook ($30 lifetime), Huckleberry Plus ($59/yr)

---

## Feature Roadmap

### Phase 1: Foundation (Current → Next 3 months)
*Make tracking effortless and the home screen intelligent*

- [x] Core tracking (feeds, sleep, diapers, growth)
- [x] AI chat with baby context (Ask Rosie)
- [x] This Week developmental content
- [x] Onboarding redesign (progressive disclosure)
- [x] **Contextual Home surface** — intelligent home tab with smart prompt, proactive alerts, compact stats, daily plan, catch-up quiz
- [x] **Smart defaults** (pre-fill quick log based on patterns after 1 week of data)
- [x] **Conversational logging** (type natural language in chat → structured event)
- [x] **Voice input** (browser speech-to-text for hands-free logging)
- [x] **Wireframe alignment** — home feed, Discover tab, onboarding flow, and modal components matched to wireframe designs (section order, spacing, gradients, card sizes, typography, night mode)
- [ ] **Caregiver sharing** (invite partner/grandparent, real-time sync, handoff briefings)
- [ ] **Pediatrician export** (formatted PDF: growth charts, feeding averages, sleep patterns, milestones)

### Phase 2: Intelligence (Months 3-6)
*Turn data into proactive, personalized insights*

- [x] **Anticipatory Guidance Engine** — Wonder Weeks leap predictions (current/upcoming/sunny periods with progress %), "Coming Up" section in Discover, leap browser with all 10 leaps detail views, expert insights per age stage (`leapData.ts`, `expertInsights.ts`)
- [x] **Cross-variable correlation engine** — feed↔sleep correlation, growth spurt detection, sleep consolidation trend, leap impact analysis, nap pattern consistency (`analyticsEngine.ts → getCorrelationInsights()`, unified "Patterns" feature — compact preview on Home + full view on Discover)
- [x] **Personalized baselines** — baby's actual averages vs AAP/WHO population ranges shown as range bars with personal marker (feeds/day, sleep/day, diapers/day, avg nap length) (`analyticsEngine.ts → getPersonalizedBaselines()`, Discover tab)
- [x] **Daily activity plan** — 3 age-appropriate activities per day with checkable items, deterministic daily rotation (`dailyActivities.ts`)
- [x] **"Is This Normal?" reassurance** — personalized FAQ cards on Home tab using baby's actual data vs population ranges, tappable to pre-fill Ask Rosie chat (`analyticsEngine.ts → getIsThisNormalQuestions()`, Home tab section + chat wiring)
- [x] **Pattern alerts** — proactive alert engine detecting cluster feeding, short naps, developmental leaps (`contextEngine.ts → getProactiveAlert()`)
- [x] **Weekly summary** — daily averages (feeds/day, sleep hrs/day, diapers/day) with % trend arrows vs last week, unified "Patterns" card on Home with "See all →" to Discover, highlight bullets (growth spurt, leap status, nap consolidation) (`analyticsEngine.ts → getWeeklySummary()`)
- [x] **Parent wellness detection** — "For You" wellness card in Discover tab with permission slip + "one thing today" (`expertInsights.ts`)
- [x] **Expert Insights system** — 48 research-backed insights across 8 age stages, carousel on Home + Discover, full browser modal with collapsible groups (`expertInsights.ts`, `RosieInsightsBrowser.tsx`)
- [x] **Milestone browser with persistence** — full milestone browser modal with Supabase storage, check-off functionality, age-grouped display, progress tracking (`RosieMilestoneBrowser.tsx`, `supabaseMilestones.ts`)

### Phase 3: Location Intelligence (Months 6-9)
*Make Rosie location-aware and activity-aware*

- [x] **Weather-aware daily briefing** — weather-aware activity suggestion in Discover tab (indoor/outdoor, condition-specific, with placeholder when no location)
- [x] **Weather-aware daily planning** — activities tagged indoor/outdoor/either, getTodaysActivities() filters by weather (bad weather → indoor only, good weather → boost outdoor), weather label on daily plan card
- [x] **Cabin fever detection** — proactive alert in Home carousel when weather is bad (rain/snow/cold/heat) with tailored messages + indoor activity suggestion from dailyActivities
- [ ] **Hyperlocal activity discovery** (age-appropriate classes, events within 1-5 miles — requires external API, deferred)
- [x] **Seasonal awareness** — 10 seasonal expert insights (winter/spring/summer/fall) mixed into Home carousel + seasonal context block injected into Claude system prompt with season-specific guidance
- [ ] **Walking vs driving radius** (quick walk < 1mi, quick drive < 5mi — deferred, requires external API)
- [x] **Chat greeting on login** — personalized time-aware + weather-aware greeting on new sessions (>30 min gap), quick action buttons (Quick log, How's baby?, Activity ideas), session tracking in localStorage

### Phase 4: Predictive Intelligence (Months 9-12)
*Rosie gets genuinely predictive*

- [ ] **Nap time prediction** (beyond wake windows — uses feeding pattern, activity, developmental stage, weather)
- [ ] **Growth trajectory projection** (fit curve from 3+ data points, predict next measurement)
- [ ] **Developmental readiness signals** (precursor skill tracking → "Oliver is close to sitting independently")
- [ ] **Sleep regression prediction** (developmental stage + historical pattern → "expect disruption in ~2 weeks")
- [ ] **Feeding optimization** (supply patterns, cluster feeding prediction, efficiency trends)
- [x] **Milestone skill tree** — visual tree in Discover tab: done (green) → emerging (yellow) → next (gray) with connectors (`milestoneData.ts → getMilestonesForAge()`)
- [ ] **"Baby Data Wrapped"** (monthly milestone summaries with shareable cards — virality engine)

### Phase 5: Native App (Months 12-18)
*Platform expansion for passive intelligence*

- [ ] **Native iOS/Android app** (React Native or Capacitor wrapper)
- [ ] **Siri/Google Assistant integration** ("Hey Siri, tell Rosie we just fed on the left")
- [ ] **Apple Watch complication** (one-tap logging, current state at a glance)
- [ ] **Lock screen Live Activity** (last feed time, next expected, one-tap log)
- [ ] **Apple HealthKit** (parent sleep data → morning briefing, wellness insights)
- [ ] **Push notifications** (proactive insights, gentle reminders — not nagging)
- [ ] **Passive event detection** (motion/sound/location inference → confirm-to-log)
- [ ] **Photo-based logging** (diaper photo → type detection, bottle photo → ounce reading)
- [ ] **Cry analysis** (record 10 seconds → pattern matching: hunger vs pain vs fussiness)

### Future Vision (18+ months)
- [ ] Partner wellness monitoring (both parents' engagement patterns)
- [ ] Second baby comparison mode (cross-sibling pattern matching)
- [ ] Community intelligence (anonymized aggregate: "70% of babies Oliver's age nearby are going through this")
- [ ] Pediatrician integration (share Rosie data before appointments, prep questions)
- [ ] Video milestone assessment (upload clip → AI identifies motor milestones)
- [ ] Multi-language support
- [ ] Cultural adaptation (non-Western caregiving, diverse family structures)

### Next Up

Current priorities — the remaining unchecked Phase 1 + early Phase 3 items:

**Phase 1 (remaining):**
1. **Caregiver sharing** — Invite partner/grandparent with real-time sync and handoff briefings. Data structure exists (`CaregiverNote` in types.ts) but no sharing UI or multi-user access.
2. **Pediatrician export** — Formatted PDF with growth charts, feeding averages, sleep patterns, milestones.

**Phase 3 (next):**
3. **Cabin fever detection** — Stuck inside 2+ days → proactive intervention with indoor activity suggestions.
4. **Hyperlocal activity discovery** — Age-appropriate classes/events within 1-5 miles (requires external API integration).
5. **Daily planning with location context** — Morning plan: weather + activity + developmental focus.
6. **Chat greeting on login** — Rosie greets user in chat with quick action buttons (quick log, analyze data, ask a question).

#### Recently Completed
- ~~Quick log overhaul~~ — Wizard flow restructured: "Start a feed" (timer) vs "Log a past feed" (manual) with clear start-time semantics, breast timer combines side + start ("Start left"/"Start right"), bottle timer with review screen, sleep follows same start/past pattern, "Custom" option on all duration/time/amount steps with text input parsing, ring timer visual fixes (SVG overflow, own background layer, feed-orange color palette)
- ~~Phase 2 complete~~ — All Phase 2 Intelligence features shipped: correlation engine, personalized baselines, "Is This Normal?" reassurance, weekly summary, pattern alerts, daily activity plan, parent wellness, expert insights, milestone browser
- ~~Patterns refactor~~ — Weekly totals → daily averages, unified "Patterns" card on Home (averages + correlation previews + "See all →" to Discover), retitled "Patterns & Connections" → "Patterns"
- ~~Wireframe alignment~~ — All 10 wireframe sections (0-10) implemented: empty state, mid-year join, home tab, discover tab, chat, night mode, onboarding, weekly summary, baselines, correlations, "Is This Normal?"
- ~~Anticipatory Guidance Engine~~ — Wonder Weeks leap browser (all 10 leaps with detail views), leap predictions, "Coming Up" section, expert insights per age stage
- ~~Expert Insights system~~ — 48 research-backed insights across 8 stages, carousel on Home + Discover, browser modal with collapsible groups
- ~~Milestone browser~~ — Full browser modal with Supabase persistence, check-off functionality, age-grouped display
- ~~Smart defaults~~ — `getSmartDefaults()` in `contextEngine.ts`, applied in `RosieQuickLog.tsx` after 7+ days of data
- ~~Conversational logging~~ — Claude `tool_use` in `chat.ts`, inline confirmation card with 30s undo in `RosieChat.tsx`
- ~~Voice input~~ — `useSpeechRecognition.ts` hook, mic button in chat input (iMessage-style toggle)

---

## Home Tab Redesign — Implementation Details

The contextual home surface was implemented in 5 phases. Each phase left a working, shippable app. Wireframe reference: `docs/wireframe-home-redesign.html`.

### Phase 1: Tab Bar + Compact Stats + Mini Quick Log ✅
Replaced the visual structure of the home tab — new tab icons, compact stat cards instead of rings, inline log buttons.

**What was built:**
- Tab bar: 🏠 Home | 📅 Timeline | 🧭 Discover (emoji + text, purple gradient active state)
- Compact stats: 3 white cards in a row (value + label + "of ~X typical") replacing SVG rings
- Mini quick log: row of 3 bordered buttons (Feed 🍼, Sleep 😴, Diaper 🧷)
- `contextEngine.ts` — `getSmartPromptData()`, `getExpectedValues()`, `getTodayEvents()`, `getTodayStats()`

### Phase 2: Smart Prompt + Proactive Alert + Lighter Timeline ✅
Added AI-powered contextual suggestion card and insight alerts. Made today's events lighter.

**What was built:**
- Smart prompt: orange gradient card — "Start Feed — Right Side" with contextual detail
- Proactive alert: purple/orange/green cards for growth spurts, sleep regressions, developmental leaps
- `contextEngine.ts` — `getProactiveAlert(timeline, babyAge, developmentalInfo)` detecting cluster feeding, short naps, leaps
- Lightweight timeline events with 3px accent bar + icon

### Phase 3: Daily Plan Card ✅
Added activity plan card showing 3 age-appropriate daily activities with checkable items.

**What was built:**
- "3 activities for [Baby] · Week X" card with purple gradient header
- 3 checkable activity items from `dailyActivities.ts → getTodaysActivities()`
- Deterministic daily rotation (same activities all day, different tomorrow) with category diversity
- Checkbox toggle with green check + strikethrough (local state)

### Phase 4: Quick Catch-Up Quiz ✅
Added post-onboarding progressive data collection on the home feed.

**What was built:**
- Catch-up card with purple gradient header + progress bar
- 4 topics: Feeding, Sleep, Milestones, Concerns — each with colored dot status
- Bottom-sheet quiz modals for each topic
- Data persists to `rosie_babies.catch_up_data` JSONB via `updateCatchUpData()`
- Card auto-hides when all 4 topics complete

### Phase 5: Discover Tab + Empty State + Floating Pill ✅
Rebuilt Discover tab, added first-time empty state, polished floating pill.

**What was built:**
- `RosieDiscover.tsx` (renamed from RosieDevelopment.tsx) — milestone skill tree, weather-aware suggestion, "For You" wellness, Quick Wins
- Skill tree: done (green) → emerging (yellow) → next (gray) with connectors
- Weather-aware suggestion card (condition-specific indoor/outdoor tips, location placeholder)
- Empty state welcome card for first-time users (💜 + 3 log buttons + hint text)
- First-log celebration micro-moment (🎉 "First feed logged!")
- Floating pill: purple gradient bg with white text, cycling 4 suggestions (12s CSS animation)
- Comprehensive night mode CSS for all new components

### Key Files
| File | Role |
|------|------|
| `RosieHome.tsx` | Home tab: smart prompt, alerts, stats, log buttons, today events, daily plan, catch-up quiz, empty state, first-log celebration |
| `RosieDiscover.tsx` | Discover tab: leap cards, milestone skill tree, weather suggestion, wellness, quick wins, "what's typical" |
| `RosieAI.tsx` | Orchestrator: tab routing, data loading, floating pill with cycling suggestions |
| `contextEngine.ts` | Smart prompt scoring, proactive alert detection, today stats/events |
| `dailyActivities.ts` | Age-appropriate activities with deterministic daily rotation |
| `milestoneData.ts` | Milestone definitions, `getMilestonesForAge()`, `getMilestonesForCatchUp()` |
| `expertInsights.ts` | Weekly expert insights, parent wellness content, quick wins |
| `rosie.css` | All styles including night mode for every new component |

---

## Design Philosophy

### The Rosie Feeling

Every interaction with Rosie should communicate: **"You are doing a good job, and your baby is okay."**

Not because everything is always objectively fine — sometimes the baby is sick and needs a doctor. But because the emotional baseline of new parenthood is chronic self-doubt, and the most therapeutic intervention is consistent, personalized reassurance from a source that knows your specific situation.

### Design Principles

1. **Less effort over time, not more.** Every feature should reduce the parent's cognitive load. If a feature adds work, it's wrong.
2. **Calm over comprehensive.** Show one insight, not ten. Surface the most important thing, not everything.
3. **Personal over generic.** "Oliver usually feeds every 3 hours" > "Babies typically feed every 2-4 hours."
4. **Proactive over reactive.** Tell parents what's coming before they need to search for it.
5. **Friend over clinician.** Rosie's voice is warm, direct, and conversational. Never clinical, never condescending.
6. **Anxiety-aware.** Design against tracking-induced anxiety. No scary red alerts, no milestone "deadlines," no comparison to other babies.
7. **One-handed, one-eyed.** Every interaction works while holding a baby with one arm, squinting at a screen at 3am.

### What Rosie Is NOT

- Not a social network (Facebook groups and Reddit serve this well)
- Not a gamified tracker (parenthood is not a game to be optimized)
- Not a medical diagnostic tool (always defer to pediatrician for health concerns)
- Not a notification machine (every push must earn its interruption)
- Not a data dashboard (parents track obsessively but rarely analyze — Rosie does the analysis)

---

## The 3am Test

Every feature, every design decision, every piece of copy should pass this test:

> A parent is sitting alone at 3am, baby on their chest, tears running down their face, wondering if they're doing everything wrong. Does this feature help that parent in that moment?

If yes, build it. If no, reconsider.

---

## Market Context

- Global parenting apps market: $1.69B (2024), projected strong growth through 2030
- Baby tech market projected at $35B by 2034
- a16z published investment thesis on AI parenting (Nov 2024)
- Magnify Ventures (Melinda French Gates, $52M) actively deploying in this space
- Joy raised $24M Series A (Nov 2025) — the market is hot
- The winners will be products that own the data relationship with the parent

---

*Last updated: February 26, 2026*
