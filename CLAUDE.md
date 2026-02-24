# Rosie AI — Project Guidelines

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
- All styles in a single file: `src/components/rosie/rosie.css` (~135KB)
- CSS classes use `rosie-*` prefix (BEM-ish naming)
- No CSS-in-JS, no Tailwind — plain custom CSS with CSS variables
- Key CSS variables are defined at the top of the file (colors, radii, shadows)

### Animation Standards
- Enter transitions: 400ms with `cubic-bezier(0.05, 0.7, 0.1, 1)` (Material Design 3 decelerate)
- Exit transitions: 300ms with `cubic-bezier(0.3, 0, 0.8, 0.15)` (accelerating out)
- Always respect `prefers-reduced-motion: reduce`
- Use the `shouldRender` + `isVisible` pattern for mount/unmount animations (see RosieChat.tsx)

### Data Persistence
- Timeline events → `rosie_events` table (Supabase)
- User settings (location, etc.) → `rosie_profiles.settings` JSONB column
- Growth measurements → `rosie_growth_measurements` table
- All data also cached in localStorage (`rosie_data` key) for offline/fast access
- Supabase is source of truth; localStorage is cache

## Scripts

### Seed Data (`scripts/seed-data.mjs`)
Generates realistic baby tracking data from birth to today. Deletes existing events/growth data first, then re-seeds.

**What it generates:**
- Timeline events (feeds, sleep, diapers, notes) with age-appropriate patterns that evolve weekly
- Growth measurements at CDC 50th percentile checkpoints (birth, 2wk, 1mo, 2mo, 3mo, 4mo)

**How to run:**
1. Get auth tokens from the browser: open the app → DevTools Console → `JSON.parse(localStorage.getItem('sb-lpgamnbjkeigacvwbcwn-auth-token'))`
2. Or let Claude extract tokens via the browser MCP tools (navigate to rosieai.netlify.app, read localStorage)
3. Run: `ROSIE_ACCESS_TOKEN=<access_token> ROSIE_REFRESH_TOKEN=<refresh_token> node scripts/seed-data.mjs`
4. After running, clear `rosie_data` from localStorage in the app (or hard refresh) to see new data

**Config at top of file:** `BIRTH_DATE`, `BABY_NAME` — update these if the baby profile changes.
