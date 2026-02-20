---
title: "feat: Complete Game Instructions Popover Integration"
type: feat
status: completed
date: 2026-02-20
issue: "#93"
brainstorm: docs/brainstorms/2026-02-20-game-instructions-modal-brainstorm.md
depends-on: "PR #110 (merged — component shell)"
---

# Complete Game Instructions Popover Integration

## Overview

PR #110 (by Marianne) landed the `InstructionsPopover` component with the
3-card carousel, dot indicators, and native Popover API usage. The PR body
explicitly deferred integration and CSS to follow-up work.

This plan covers everything remaining to ship the feature per the
brainstorm spec.

## What PR #110 Delivered

- `src/client/InstructionsPopover.tsx` (61 lines)
- 3-card carousel: How to Play, Scoring, Good Luck!
- Card navigation (prev/next buttons, dot indicators)
- "Got it" button on last card dismisses popover
- Resets to card 0 when popover reopens
- Uses native Popover API (`popover="auto"`)
- Trigger button with `.btn-icon` + info icon SVG

## Gap Analysis (brainstorm spec vs. current state)

| Brainstorm requirement | Status | Notes |
|------------------------|--------|-------|
| `InstructionsPopover` component | Done | PR #110 |
| 3 cards with approved content | Done | Card 3 title says "Good Luck!" instead of "Game Info" — content is functionally equivalent |
| "?" trigger on **Lobby** | Not done | Lobby has a comment placeholder at line 101 |
| "?" trigger on **Lounge** | Not done | Lounge has no topbar; needs layout addition |
| Auto-show once on Lounge load | Not done | Needs localStorage `schelling-instructions-seen` |
| Swipe navigation | Not done | `react-swipeable` not installed |
| CSS styling for popover | Not done | No styles exist for `#instructions-popover` or child classes |
| Trigger icon is "?" | Minor | PR #110 used an ℹ️ info icon — functionally fine, flag for Julianna |

## Proposed Solution

Five tasks, ordered by dependency. Tasks 1-2 can run in parallel.
Tasks 3-5 depend on 1-2 completing (component API changes) but are
independent of each other.

---

### Task 1: Install `react-swipeable` + add swipe to component

**File:** `package.json`, `src/client/InstructionsPopover.tsx`

**Why `react-swipeable`:** ~3 kB gzipped, zero transitive dependencies,
React 19 support confirmed. Handles the iOS Safari scroll-vs-swipe
conflict that raw touch handlers get wrong. Trivial hook API
(`useSwipeable`). Chosen over `@use-gesture/react` (larger, more
general-purpose) and raw `touchstart`/`touchmove` (no Safari conflict
handling).

Install: `bun add react-swipeable`

**Behavior:** Swipe left advances to next card, swipe right goes back.
Use the `useSwipeable` hook. Wire `onSwipedLeft` to the existing
`handleNext` and `onSwipedRight` to `handlePrev`. Enable
`preventScrollOnSwipe` to avoid iOS Safari scroll-vs-swipe conflicts.

**Structural constraint:** The popover `ref` must stay on the outer
`div` (needed for `showPopover`/`hidePopover`). Spread the swipe
handlers onto an inner wrapper `div` so both concerns stay separate.

---

### Task 2: Add auto-show prop + localStorage logic

**File:** `src/client/InstructionsPopover.tsx`

**Behavior:** Add an optional `autoShow` prop (default `false`).
When `autoShow` is true, on mount:

1. Check `localStorage` for key `schelling-instructions-seen`
2. If not set, programmatically open the popover via `showPopover()`
3. Set `localStorage.setItem('schelling-instructions-seen', 'true')`
   so it only fires once per browser

This uses the existing `popoverRef` already in the component.

---

### Task 3: Integrate into Lobby

**File:** `src/client/Lobby.tsx`

**Placement:** The Lobby `.screen-topbar` (`Lobby.tsx:99`) already has a
placeholder comment at line 101 saying where to add the instructions
button. Import `InstructionsPopover` and place it inside `.screen-topbar`
next to the existing back button. Remove the placeholder comment.

No `autoShow` prop here — Lobby is button-only.

---

### Task 4: Integrate into Lounge

**File:** `src/client/Lounge.tsx`

The Lounge has no `.screen-topbar`. The brainstorm noted this: "Lounge
does not — will need a lightweight topbar or positioned '?' button added."

**Structural decision:** Add a `.screen-topbar` to the Lounge (reuses
the existing class from `global.css:61-66` — `flex`, `space-between`,
`full width`). The topbar uses `justify-content: space-between`, so use
an empty `<span />` in the left slot to push the button right.

**Placement — two views in Lounge:**

1. **Pre-join view** (`Lounge.tsx:38-55`): Add `.screen-topbar` with
   `<InstructionsPopover autoShow />` — this is the first screen new
   players see, so auto-show fires here.
2. **Post-join view** (`Lounge.tsx:58-86`): Add `.screen-topbar` with
   `<InstructionsPopover />` (no `autoShow`) — button stays accessible
   but doesn't re-trigger.

---

### Task 5: CSS for instructions popover

**File:** `static/styles/instructions.css` (new file)

Styles needed for the popover and its children.

**Consistency guide — match these project tokens:**

| Token | Source | Value |
|-------|--------|-------|
| Glassmorphism surface | `#qr-popover` (`lobby.css:80-88`) | `border: 1px solid rgba(255,255,255,0.1)`, `background: rgba(255,255,255,0.06)`, `backdrop-filter: blur(12px)` |
| Border radius (popovers) | `#qr-popover` | `12px` |
| Heading font | `.screen-header h1` (`global.css:142`) | `var(--font-fancy)` |
| Body font | global `p` (`global.css:38`) | `var(--font-body)`, weight `300` |
| Text color | global | `var(--cream)` for headings, `rgba(255,255,255,...)` for body |
| Interactive opacity | `.icon` (`lobby.css:69-77`) | `0.8` resting, `1` on hover |
| Transition | project-wide | `0.3s ease` |
| Button labels | `.btn` (`global.css:86`) | `letter-spacing: .15em`, `text-transform: uppercase`, `font-size: 0.75rem` |

**Intentional departures from global `p` style** (documented here so
the work agent doesn't "fix" them back):

- **`text-transform: none`** — instructions are sentences, not UI labels
- **`letter-spacing: 0.02em`** — wide tracking (`.15em`) hurts readability at sentence length
- **`color: rgba(255,255,255, 0.6)`** — brighter than global `p` (`0.35`) because this is primary content, not a caption

**Selectors to style** (class names already exist in `InstructionsPopover.tsx`):

| Selector | What it styles | Pattern to follow |
|----------|---------------|-------------------|
| `#instructions-popover` | Popover container | Clone `#qr-popover` glassmorphism (`lobby.css:80-88`), add `max-width: 340px`, center text. Use `12px` border-radius. |
| `.instructions-title` | Card heading (h2) | `var(--font-fancy)`, scaled down from `2.75rem` to ~`1.5rem` for popover context |
| `.instructions-body` | Card body text (p) | **Intentional departures** apply here — override global `p` |
| `.instructions-dots` | Dot container | Flex row, centered, small gap |
| `.instructions-dot` | Individual dot | Small circle (~8px), dim `rgba` background |
| `.instructions-dot.active` | Current page dot | `var(--cream)` background, `0.3s ease` transition |
| `.instructions-nav` | Button row | Flex, `space-between` |
| `.instructions-prev`, `.instructions-next` | Nav buttons | Match `.btn` label typography (`global.css:94-100`) + `.icon` opacity pattern (`0.8` resting, `1` hover) |

**Also:** Add `import '../static/styles/instructions.css'` to
`src/client.tsx` (alongside the existing CSS imports at lines 9-14).

---

## Content Discrepancies to Flag

These are minor differences between the brainstorm spec and PR #110's
implementation. Neither is a blocker — flag for Marianne/Julianna:

1. **Card 3 title:** Brainstorm says "Game Info"; implementation says
   "Good Luck!" (the "Good luck!" text moved from body to title)
2. **Trigger icon:** Brainstorm says "?" question mark; implementation
   uses ℹ️ info icon. Both communicate "help" — design call for Julianna.

## Acceptance Criteria

- [x] `react-swipeable` installed; swiping left/right navigates cards
- [x] Instructions button visible on Lounge screen (both pre-join and post-join views)
- [x] Instructions button visible on Lobby screen (in `.screen-topbar`)
- [x] First visit to Lounge auto-shows the popover
- [x] Subsequent visits do not auto-show (localStorage flag works)
- [x] Popover styled with glassmorphism, readable on 430px mobile screen
- [x] Dot indicators reflect current card
- [x] "Got it" on last card dismisses popover
- [x] Tapping outside popover dismisses it (native popover behavior)

## Dependencies

- **PR #110** (merged) — component exists on `main`
- **No blockers** — this is pure frontend work with one small new dep
- **Branch:** `<assignee>/instructions-popover-integration` (from `main`)

## References

- Brainstorm: `docs/brainstorms/2026-02-20-game-instructions-modal-brainstorm.md`
- Issue: #93 (content approved in #62)
- PR #110: `marianne/popovermodal` (merged)
- QR popover pattern: `src/client/Lobby.tsx:48-77`
- Glassmorphism CSS: `static/styles/lobby.css:80-88`
