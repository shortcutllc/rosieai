# Rosie AI — Project Guidelines

## Source-of-Truth Documents

**IMPORTANT: Always read these before designing, wireframing, or building UI:**

- **`docs/strategy.md`** — Product strategy, feature roadmap with checkboxes, and implementation log. Check this FIRST to understand what's built, what's in progress, and what's next. The "Next Up" section at the bottom of the roadmap tracks current priorities.
- **`docs/design-thesis.md`** — Visual design system: spacing grid, typography scale, color system, animation vocabulary, component specs. Every CSS value must align with this document. Check card radius (20px), spacing tokens (4/8/12/16/20/24/32), typography weights, and color palette before writing any CSS.
- **`docs/wireframe-home-redesign.html`** — Interactive wireframe for the home tab redesign. Run `npx serve docs` to view.

## Wireframe-to-Code Implementation Process

When implementing UI from HTML wireframe files (e.g., `docs/wireframe-home-redesign.html`), follow this exact process. **Do NOT declare a component "done" until every step is completed.**

### Step 1: Extract CSS specs from the wireframe HTML

Read the wireframe HTML source and extract every CSS property for the target component. Build a spec sheet of exact values:

```
Component: .rosie-catchup-progress
  height: 4px
  background: #E5E5EA
  margin: 0
  border-radius: (none)
```

Do this for every class that makes up the component — container, children, text, icons, all of it.

### Step 2: Diff against implementation CSS

Search `rosie.css` for each class from Step 1. Compare every property value. Document mismatches:

```
.rosie-plan-duration
  font-weight: wireframe=400, actual=500  ← FIX
  font-size: wireframe=13px, actual=13px  ← OK
```

### Step 3: Apply CSS fixes

Edit `rosie.css` to match the wireframe values exactly. Only change properties that differ.

### Step 4: Check structural/markup differences

Compare the wireframe's HTML structure against the React component's JSX. Look for:
- Missing sections (e.g., a component exists in wireframe but not rendered on the target page)
- Extra elements not in the wireframe (e.g., emoji prefixes, extra wrappers)
- Different element ordering

### Step 5: Visual verification with browser (REQUIRED)

This step is **mandatory** — never skip it.

1. **Start both servers** using `preview_start` (dev server and wireframe server via `.claude/launch.json`)
2. **Open both tabs** in Chrome MCP — one for the wireframe, one for the dev server
3. **Handle time-of-day theming**: The app applies `morning|afternoon|evening|night` classes based on current hour. If it's nighttime, switch to daytime for comparison:
   ```js
   const c = document.querySelector('.rosie-container');
   c.classList.remove('night'); c.classList.add('afternoon');
   ```
4. **Screenshot the wireframe component** — scroll to it, take a screenshot
5. **Screenshot the same component on the dev server** — scroll to it, take a screenshot
6. **Compare side by side** — check fonts, colors, spacing, alignment, icons, borders, backgrounds
7. **Inspect computed styles** for anything that's hard to verify visually:
   ```js
   const el = document.querySelector('.rosie-whatever');
   const s = getComputedStyle(el);
   JSON.stringify({ color: s.color, fontSize: s.fontSize, fontWeight: s.fontWeight });
   ```
8. **If anything doesn't match**, go back to Step 3. Do NOT proceed until it matches.

### Step 6: Verify night mode

After daytime matches, switch to night mode and verify nothing breaks:
```js
const c = document.querySelector('.rosie-container');
c.classList.remove('afternoon'); c.classList.add('night');
```
Check that text is readable (not white-on-white), backgrounds are dark, and cards have appropriate contrast.

### Common Pitfalls
- **Don't trust the CSS diff alone** — a property can be correct in the stylesheet but overridden by specificity, media queries, or night mode.
- **Don't eyeball screenshots at full page zoom** — use `zoom` or `getComputedStyle` for precise values like font-weight, exact colors, and spacing.
- **Check all visual states** — done/complete items often have strikethrough, different colors, or hidden elements (like arrows). Verify each state.
- **Night mode is a separate pass** — daytime match + night mode match = done.

## Bash Guidelines

### IMPORTANT: Avoid commands that cause output buffering issues
- DO NOT pipe output through `head`, `tail`, `less`, or `more` when monitoring or checking command output
- DO NOT use `| head -n X` or `| tail -n X` to truncate output - these cause buffering problems
- Instead, let commands complete fully, or use `--max-lines` flags if the command supports them
- For log monitoring, prefer reading files directly rather than piping through filters

### When checking command output:
- Run commands directly without pipes when possible
- If you need to limit output, use command-specific flags (e.g., `git log -n 10` instead of `git log | head -10`)
- Avoid chained pipes that can cause output to buffer indefinitely

## Design System (Quick Reference)

These are the critical values from `docs/design-thesis.md`. When in doubt, read the full doc.

### Spacing Grid (only use these values)
`4px` · `8px` · `12px` · `16px` · `20px` · `24px` · `32px`

### Typography Scale
| Role | Size | Weight |
|------|------|--------|
| Greeting hero | 28px | 700 |
| Section title | 18px | 700 |
| Card title | 14-16px | 600 |
| Body text | 14-15px | 400-500 |
| Secondary text | 13px | 400 |
| Labels | 11px | 700 |
| Stat values | 18px | 700 |
| Stat labels | 11px | 600 |

### Colors
- Text primary: `#1D1D1F` — Text secondary: `#6B6B70` — Text tertiary: `#86868B`
- Feed: `#FF9500` — Sleep: `#B57BEC` — Diaper: `#30D158`
- Accent: `#007AFF` — Purple: `#8B5CF6` — Danger: `#FF3B30`

### Card Rules
- Border-radius: **20px** (use `--rosie-radius-card`)
- **No box-shadow** on content cards — whitespace creates separation
- **No borders** on content cards — exception: `1px solid rgba(0,0,0,0.04)` on gradient-bg cards only

### Animation
- Enter: 400ms `cubic-bezier(0.05, 0.7, 0.1, 1)` (decelerate)
- Exit: 300ms `cubic-bezier(0.3, 0, 0.8, 0.15)` (accelerate)
- Always respect `prefers-reduced-motion: reduce`

## Design Principles

### Chat UI Layout (Ask Rosie)
- The chat is a **fullscreen overlay** — not a tab or page. It slides up over the main app.
- Layout is modeled after **Claude.ai**: seamless header, centered 768px content column, no borders between sections.
- **Always ensure the chat input box is visible on screen.** This is critical — never let it get pushed below the fold.
- Header buttons are **icon-only** (back chevron, compose pencil) — no text labels.
- Header, content, and input area share the same solid background — no frosted glass, no border lines between them.
- Mobile: 16px side padding. Desktop (≥768px): 24px side padding.

### Rosie's AI Voice
- Rosie is a **calm, experienced friend** — not a clinical chatbot.
- System prompt is in `netlify/functions/chat.ts`. When modifying, preserve the conversational tone.
- **Never use markdown headers** (#, ##, ###) in responses — this is a text conversation.
- Keep responses short: 2-3 paragraphs max. No walls of text.
- No emojis unless the user uses them first.
- Chat suggestions in `reassuranceMessages.ts` should be personalized with the baby's name.

### CSS Architecture
- All styles in a single file: `src/components/rosie/rosie.css` (~137KB)
- CSS classes use `rosie-*` prefix (BEM-ish naming)
- No CSS-in-JS, no Tailwind — plain custom CSS with CSS variables
- Key CSS variables are defined at the top of the file (colors, radii, shadows)

### Data Persistence
- Timeline events → `rosie_events` table (Supabase)
- User settings (location, etc.) → `rosie_profiles.settings` JSONB column
- Growth measurements → `rosie_growth_measurements` table
- Catch-up quiz → `rosie_babies.catch_up_data` JSONB column
- All data also cached in localStorage (`rosie_data` key) for offline/fast access
- Supabase is source of truth; localStorage is cache

## Dev/Test Account

A pre-confirmed dev account exists for autonomous visual testing (onboarding, all tabs, night mode, etc.):

| Field | Value |
|-------|-------|
| Email | `rosie-dev@testaccount.dev` |
| Password | `testtest123` |

**How to sign in on localhost:**
1. Start the dev server
2. Clear localStorage keys: `rosie_data`, `sb-lpgamnbjkeigacvwbcwn-auth-token`, `rosie_current_baby_id`
3. Reload → Welcome screen → "Let's get started" → "Already have an account? Sign in"
4. Enter the credentials above

**To reset onboarding** (re-test the full flow):
- Delete the user's profile and baby data from Supabase, clear localStorage, reload

**To create a new pre-confirmed dev account:**
```bash
curl -X POST 'https://lpgamnbjkeigacvwbcwn.supabase.co/auth/v1/admin/users' \
  -H 'Authorization: Bearer <SERVICE_ROLE_KEY>' \
  -H 'apikey: <SERVICE_ROLE_KEY>' \
  -H 'Content-Type: application/json' \
  -d '{"email":"<email>","password":"<password>","email_confirm":true}'
```
> The service role key is not in the repo — ask the user or check Supabase Dashboard → Settings → API.

## Scripts

### Seed Data (`scripts/seed-data.mjs`)
Generates realistic baby tracking data from birth to today. Deletes existing events/growth data first, then re-seeds.

**What it generates:**
- Timeline events (feeds, sleep, diapers, notes) with age-appropriate patterns that evolve weekly
- Growth measurements at CDC 50th percentile checkpoints (birth, 2wk, 1mo, 2mo, 3mo, 4mo)

**How to run:**
1. Get the refresh token from the browser: open the app → DevTools Console → `JSON.parse(localStorage.getItem('sb-lpgamnbjkeigacvwbcwn-auth-token')).refresh_token`
2. Run: `ROSIE_REFRESH_TOKEN=<refresh_token> node scripts/seed-data.mjs`
3. After running, clear `rosie_data` from localStorage in the app (or hard refresh) to see new data

> Only the refresh token is needed — the script exchanges it for a fresh access token automatically. The refresh token is a short string (e.g. `barjbk6zbg37`), much easier to copy than the full JWT.

**Config at top of file:** `BIRTH_DATE`, `BABY_NAME` — update these if the baby profile changes.
