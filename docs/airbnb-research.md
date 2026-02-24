# Rosie UI/UX Research — Airbnb Layout & Animation Study

## Date: Feb 23, 2026

---

## Airbnb Homepage Layout Measurements (Extracted from Live Site)

### Header
- Height: 80px
- Padding: 0 32px
- Position: static (scrolls away, NOT sticky)
- Background: transparent
- Tabs centered with animated 3D icons + text labels (Homes, Experiences, Services)
- Active tab: bold underline indicator

### Search Bar
- Pill-shaped, full-width with rounded corners
- 3 sections: Where | When | Who + red search button
- Prominent shadow for elevation
- Tapping morphs into fullscreen search (shared element transition)

### Content Sections
- Section-to-section vertical spacing: ~304px (consistent rhythm)
- Section title: 20px, weight 600, letter-spacing -0.18px, color rgb(34,34,34)
- Section subtitle: 14px, weight 400, color rgb(106,106,106)
- Arrow icon (→) next to title for "see more"
- ~5 repeating sections on homepage

### Card Carousels
- Horizontal scroll: `scroll-snap-type: inline mandatory`
- Card gap: 12px
- Card width: ~188px (desktop, responsive)
- Card border-radius: 20px
- Card image: ~1:1 aspect ratio (square-ish)
- No card border, no box-shadow — separation via whitespace
- Heart/favorite button: 32x32px overlay on image
- "Guest favorite" badge: pill overlay on image

### Card Typography
- Title: 13px, weight 500, rgb(34,34,34)
- Price/secondary: 12px, weight 400, rgb(106,106,106)
- Rating: 12px with star icon

### Page Layout
- Side margin: ~28px on desktop
- Body font: "Airbnb Cereal VF", fallback -apple-system
- Body text color: rgb(34,34,34)
- Body background: white
- No visible card borders — whitespace creates separation

---

## Airbnb Animation Patterns

### Spring Physics (Not Fixed Duration)
- Uses spring-based timing (mass, stiffness, damping) instead of cubic-bezier
- Duration emerges naturally from spring parameters
- Feels physical and organic vs "programmatic"

### Shared Element Transitions
- Components tagged with semantic IDs
- Search pill → fullscreen search (morphing transition)
- Card image → detail page image (expanding transition)
- Framework automatically handles morphing between states

### Declarative Motion Framework
- Initial state + final state + transition definition
- Generic UIViewControllerAnimatedTransitioning handles everything
- Any engineer can add rich transitions without hundreds of lines of code

### Specific Animations
- Search pill morph: spring animation
- Bottom sheets: slide up with spring, swipe-to-dismiss with velocity threshold
- Parallax collapsing header image with sticky toolbar
- Card carousel: scroll-snap with momentum

### Lottie Animations
- Created by Airbnb for complex micro-interactions
- After Effects → JSON → native rendering
- Used for loading states, celebrations, onboarding

### Skeleton Loading
- Matches exact card dimensions
- Shimmer: gradient highlight sweeps left-to-right
- Pulse: opacity 50%→100% gentle fade
- Appears within 300ms of user action
- Users perceive 30% faster loading vs spinners

---

## Rosie Current State (Audit)

### Layout
- Sticky header with clock (56px font), date, greeting, age badge — ~300px before content
- 4-tab segmented control (text only, no icons)
- Main content max-width: 600px centered
- Fixed bottom Quick Log bar (frosted glass)
- Side padding: 16px mobile, 24px desktop

### Cards
- Timeline events: 18px padding, 24px border-radius, gradient bg, left accent bar
- Summary cards: 3-column grid, 12px gap, 20px padding, top accent bar
- Hover: -2px translateY lift, enhanced shadow
- Active: scale(0.98) press

### Animations
- Chat overlay: 400ms enter / 300ms exit (Material Design 3 curves)
- Message bubbles: 0.3s fade+scale+translateY
- Loading: spinner only (no skeleton screens)
- Buttons: hover scale(1.02), active scale(0.98)
- Timer: pulse glow, ambient glow, ring pulse keyframes
- Modals: slide-up 0.35s
- No tab transition animations (instant swap)
- No staggered card entry animations

### Typography
- Clock: 56px/300 (44px mobile)
- Greeting: 28px/700
- Card titles: 20px/700
- Event time: 18px/700
- Body: 15px/500
- Labels: 11-12px/600-700
- Font: -apple-system, SF Pro Display

### Colors
- Background: #FAFAFA
- Cards: #FFFFFF
- Text primary: #1D1D1F
- Text secondary: #86868B
- Feed: #FF9500 (orange)
- Sleep: #B57BEC (purple)
- Diaper: #6DD86D (green)
- Accent: #007AFF (blue)

---

## Gap Analysis: Airbnb Patterns → Rosie Improvements

### HIGH IMPACT

1. **Collapsing Header** — Rosie's header eats ~300px on mobile. Airbnb's header is static (scrolls away). We should collapse on scroll: shrink clock, hide greeting, keep tabs sticky.

2. **Skeleton Loading States** — Airbnb uses shimmer placeholders matching exact card shapes. Rosie only has a spinner. Add skeleton cards for timeline events and summary cards.

3. **Tab Content Transitions** — Airbnb cross-fades between sections. Rosie does instant swap. Add subtle fade/slide transition between tabs.

4. **Consistent Section Rhythm** — Airbnb sections are exactly ~304px apart. Rosie's spacing is inconsistent. Normalize all section gaps.

### MEDIUM IMPACT

5. **Horizontal Carousels** — Airbnb's homepage is entirely horizontal-scrolling card rows. Rosie's summary cards could use horizontal scroll on mobile.

6. **Tab Icons** — Airbnb tabs have animated 3D icons. Rosie tabs are text-only. Add small icons for visual personality.

7. **Staggered Card Entry** — Cards could cascade in with staggered delays when a tab loads.

8. **Lighter Card Typography** — Airbnb uses 13px/500 for card titles. Rosie uses 18px/700. Less bold = more breathing room.

### LOWER PRIORITY (Save for Later)

9. **Spring-based animations** — CSS can't do true springs yet. Approximate with overshoot curves.
10. **Pull-to-refresh** — Standard mobile pattern, not critical for MVP.
11. **Swipe-to-dismiss modals** — Nice polish, complex to implement.
12. **Scroll-snap carousels** — `scroll-snap-type: inline mandatory` for horizontal sections.
