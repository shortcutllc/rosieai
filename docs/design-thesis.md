# Rosie Design Thesis

A living reference for the visual language, layout system, animation vocabulary, and component specs that define Rosie's interface.

Inspired by Airbnb's design system. Adapted for a baby companion app where calm, clarity, and speed matter most.

---

## Core Principles

### 1. Content-First
Every pixel of screen real estate should serve the parent. Headers scroll away. Stats are compact. The most important information (last feed, next action) is always visible without scrolling on mobile.

### 2. Whitespace-Driven Hierarchy
No card borders. No box-shadows on content cards. Visual separation comes from spacing alone. This creates a calm, breathable interface that reduces cognitive load for sleep-deprived parents.

### 3. Calm Motion
Animations should feel organic and reassuring, never flashy. Enter transitions are slow and decelerate (the content arrives gently). Exit transitions are fast and accelerate (the content gets out of the way quickly). Every animation respects `prefers-reduced-motion`.

### 4. Optimistic & Local-First
Data updates appear instantly (localStorage + optimistic UI). Supabase syncs in the background. The app should feel instantaneous even on poor connections.

### 5. Progressive Disclosure
Show the essential summary first. Let parents drill deeper when they want to. Home tab shows quick stats and recent events; This Week tab shows full developmental detail.

---

## Layout System

### Spacing Grid
| Token | Value | Usage |
|-------|-------|-------|
| `xs` | 4px | Inline icon gaps |
| `sm` | 8px | Tight card padding, label gaps |
| `md` | 12px | Card gap, list item gap |
| `lg` | 16px | Section inner padding (mobile side margin) |
| `xl` | 20px | Card padding, section header gap |
| `2xl` | 24px | Section-to-section gap, desktop side margin |
| `3xl` | 32px | Major section dividers |

### Widths
- Main content max-width: **600px** centered
- Chat content max-width: **768px** centered
- Card grid: 3-column on desktop, flex-wrap on mobile
- Mobile side padding: **16px**
- Desktop side padding: **24px**

### Header
- Compact: 56px (day pill + avatar)
- Greeting hero: `28px/700` title, `14px/400` subtitle
- Tab bar: segmented control with icons, 48px height
- Header is NOT sticky. It scrolls with content. Tabs remain accessible via scroll position.

---

## Animation Vocabulary

### Easing Curves
| Name | Curve | Duration | Usage |
|------|-------|----------|-------|
| Enter (decelerate) | `cubic-bezier(0.05, 0.7, 0.1, 1)` | 400ms | Content appearing, overlays opening, cards entering |
| Exit (accelerate) | `cubic-bezier(0.3, 0, 0.8, 0.15)` | 300ms | Content leaving, overlays closing, dismissals |
| Standard | `ease` | 200-300ms | Color changes, opacity fades, hover states |
| Spring-like | `cubic-bezier(0.34, 1.56, 0.64, 1)` | 300ms | Button presses, dot scaling, small interactive feedback |

### Animation Types

**Tab Fade** (switching between Home, Timeline, This Week)
- `opacity: 0 -> 1`, `translateY: 8px -> 0`
- Duration: 300ms, decelerate curve
- Triggered by `key={activeTab}` wrapper remount

**Section Stagger** (cards cascading in on tab load)
- Each section/card delayed by 60ms from previous
- `opacity: 0 -> 1`, `translateY: 12px -> 0`, `scale: 0.97 -> 1`
- Duration: 350ms, decelerate curve

**Carousel Crossfade** (This Week insight rotation)
- Fade out: 200ms `opacity: 1 -> 0`, `translateY: 0 -> 6px`
- Fade in: 200ms `opacity: 0 -> 1`, `translateY: 6px -> 0`
- Auto-advance: every 5 seconds
- Dot indicators: 300ms scale + color transition

**Auth Slide** (sign-in/sign-up view transitions)
- Forward (deeper): `translateX: 60px -> 0`, 400ms
- Back (returning): `translateX: -60px -> 0`, 400ms
- Combined with `opacity: 0 -> 1`

**Skeleton Shimmer** (loading placeholder)
- Linear gradient sweep: `background-position: -200% -> 200%`
- Duration: 1.5s, infinite loop
- Skeleton shapes match Home layout (greeting, tabs, cards, events)

**Interactive Feedback**
- Button hover: `scale(1.02)`, subtle shadow elevation
- Button active: `scale(0.98)`, pressed feel
- Form input focus: `translateY(-1px)`, elevated shadow
- Progress ring fill: 600ms decelerate stroke-dashoffset animation

### Reduced Motion
All animations are wrapped in `@media (prefers-reduced-motion: reduce)` with `animation: none !important` and `transition: none`. This is non-negotiable.

---

## Typography Scale

| Role | Size | Weight | Color |
|------|------|--------|-------|
| Greeting hero | 28px | 700 | `--rosie-text-primary` |
| Section title | 18px | 700 | `--rosie-text-primary` |
| Card title | 14-16px | 600 | `--rosie-text-primary` |
| Body text | 14-15px | 400-500 | `--rosie-text-primary` |
| Secondary text | 13px | 400 | `--rosie-text-secondary` |
| Labels (uppercase) | 11px | 700 | `--rosie-text-secondary` |
| Stat values | 18px | 700 | Type-specific color |
| Stat labels | 11px | 600 | `--rosie-text-secondary` |

Font stack: `-apple-system, SF Pro Display, system-ui, sans-serif`

---

## Color System

### Semantic Colors
| Name | Value | Usage |
|------|-------|-------|
| Background | `#FAFAFA` | Page background |
| Card | `#FFFFFF` | Card surfaces |
| Text Primary | `#1D1D1F` | Headlines, body |
| Text Secondary | `#86868B` | Labels, hints, timestamps |
| Text Tertiary | `#C4C4C4` | Inactive dots, placeholders |

### Type-Specific Colors
| Type | Primary | Gradient From | Gradient To | Usage |
|------|---------|---------------|-------------|-------|
| Feed | `#FF9500` | `#FF9500` | `#FFB84D` | Feed cards, stats ring, accent bars |
| Sleep | `#B57BEC` | `#B57BEC` | `#D4A5FF` | Sleep cards, stats ring, accent bars |
| Diaper | `#30D158` | `#4CD964` | `#7EE88B` | Diaper cards, stats ring, accent bars |
| Accent | `#007AFF` | - | - | Buttons, links, active states |
| Purple | `#8B5CF6` | - | - | This Week badges, carousel dots |
| Danger | `#FF3B30` | - | - | Delete buttons, warnings |

### Card Accents
Each card type has a 4px gradient bar at the top. The gradient flows from `gradientFrom` to `gradientTo` (left to right). This is the primary visual differentiator between feed, sleep, and diaper cards.

---

## Component Specs

### Quick Log Action Cards
- Layout: 3-column row, equal width
- Top accent: 4px gradient bar, full width
- Content: icon (24px), label (11px uppercase), value (colored, 16px bold), detail (13px), action button
- Action button: pill shape, type-colored background, white text
- Border-radius: 20px
- Stagger animation: 100ms delay between cards

### This Week Carousel
- Single card visible at a time with fade crossfade
- Auto-advances every 5 seconds
- Dot indicators below: 7px circles, 6px gap
- Active dot: purple, scale(1.3)
- Swipe support on touch devices
- Content: category badge (icon + week + category), insight text, "Read more" link
- Background: subtle gradient (`#F8F4FF -> #FFF8F0`)

### Stats Section (Today's Stats)
- 3 mini progress rings in a row (space-around)
- Ring size: 72px SVG
- Stroke width: 7px, rounded linecap
- Center text: value (18px/700) + label (11px uppercase)
- "What's Normal" card below: 3-column range display
- Range values colored per type

### Timeline Events
- Left accent bar: 3px, rounded, type-colored
- Icon: 32px circle with type-colored background
- Content: title (14px/600) + detail (13px/400)
- Time: right-aligned, 12px/500
- Spacing: 6px gap between events

### Profile Modal
- Centered modal with overlay backdrop
- 3-tab segmented control (Baby, Growth, Settings)
- "Done" button top-left, "Profile" title centered
- Settings: grouped sections with labels + inputs + save buttons

---

## Patterns to Apply Consistently

### Section Title + Arrow
Every section on Home uses the pattern:
```
[Section Title]                    [Link →]
```
Left: bold title (18px/700). Right: tappable link with arrow ("More →", "All →").

### Card Without Borders
Cards use `background: white` and `border-radius: 20px` but NO `border` and NO `box-shadow`. Whitespace between cards creates visual separation. Exception: subtle `border: 1px solid rgba(0,0,0,0.04)` on insight cards with gradient backgrounds.

### Loading States
Never show a spinner for content areas. Use skeleton placeholders that match the exact shape of the content they replace (greeting skeleton, tab skeleton, card skeletons, event row skeletons).

### Optimistic Updates
When a user logs a feed/sleep/diaper, update the timeline and stats immediately. Sync to Supabase in the background. If the sync fails, show a subtle retry indicator (never block the UI).

---

## Implementation Checklist

### Completed
- [x] Tab fade transitions (300ms decelerate)
- [x] Section stagger animations (60ms delay cascade)
- [x] Action card stagger entry
- [x] Auth view slide transitions (left/right)
- [x] Skeleton shimmer loading
- [x] Form input focus lift
- [x] Progress ring fill animation
- [x] This Week carousel with auto-advance + dots
- [x] Reduced motion support for all animations
- [x] Smart greeting rotation with parent name
- [x] Stats section with progress rings + What's Normal

### Remaining
- [ ] Collapsing header on scroll (shrink greeting, keep tabs sticky)
- [ ] Horizontal card carousels (scroll-snap) for mobile stats
- [ ] Spring-based animations (CSS `linear()` easing approximation)
- [ ] Pull-to-refresh gesture
- [ ] Swipe-to-dismiss on modals and overlays
- [ ] Development tab carousel slide animation
- [ ] Parallax scroll effects on hero sections
