---
title: "Apply CSS styling to Lounge screen (pre-join and post-join views)"
date: 2026-02-20
category: ui-bugs
component: src/client/Lounge.tsx
problem_type: missing-styling
severity: moderate
tags:
  - css
  - lounge
  - layout
  - avatar
  - pre-join
  - post-join
  - design-consistency
related_issues:
  - 74
  - 89
  - 71
---

# Lounge Screen CSS Styling

## Problem

The Lounge screen (`Lounge.tsx`) rendered bare HTML elements without applying the shared CSS class system used by Lobby, Guesses, and Scores screens. The component used generic `<div className="lounge">`, `<h1>`, `<input>`, and `<button>` without the shared `.screen`, `.title-block`, `.input`, `.btn`, and `.screen-footer` classes. The `.avatar-selected` class in `lobby.css` was also incomplete — only had sizing and border-radius, missing flex centering and typography.

## Root Cause

CSS classes existed in the stylesheets (`global.css`, `lounge.css`, `lobby.css`) but were never applied to the JSX in `Lounge.tsx`. The component was created with placeholder HTML before the CSS system was established in PR #71 (Lobby) and PR #89 (Guesses).

## Solution

Applied existing shared CSS classes to all Lounge JSX elements across both views. Replaced the player list with an avatar + count design. Fixed `.avatar-selected` to be a complete styled element.

### Pre-join view

- Wrapper: `<div className="lounge">` -> `<div className="screen lounge">`
- Added `.title-block` with `.title` (h1) and `.subtitle` (p)
- Added `.screen-footer` wrapping `.input` and `.btn` elements
- Removed MoodPicker (available post-join only)

### Post-join view

- Wrapper: `<div className="lounge">` -> `<div className="screen lounge">`
- Added `.screen-header` with `.title-block`
- Replaced `<ul>` player list with `.avatar-wrapper` containing `.avatar-selected` (user initial) + `.avatar-mood` (emoji)
- Added player count: `{otherPlayers.length} players online`
- Added `.screen-footer` with MoodPicker + `.btn` buttons

### lobby.css fix

```css
/* Before */
.avatar-selected {
  width: 120px;
  height: 120px;
  border-radius: 50%;
}

/* After */
.avatar-selected {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 80px;
  height: 80px;
  border-radius: 50%;
  color: var(--black);
  font-size: 2rem;
  font-weight: 500;
  text-transform: uppercase;
}
```

## Design Decision: Avatar + Count vs. Player List

The lounge can hold 40+ concurrent players. A full `<ul>` of names would create a long scrollable list and cause color collisions with the game lobby's color-coded player system (where colors carry semantic meaning). The avatar + count pattern shows the user they're logged in (initial + mood) and how many others are present, keeping the screen clean.

## Merge Conflict Resolution

The lounge branch included a font-size tweak to `guess.css` (`.75rem` -> `.65rem`). On main, `guess.css` was deleted (renamed to `guesses.css`, timer styles moved to `global.css`). Resolution: deleted `guess.css`, applied the font-size change to `global.css:172` instead.

## Human Observations (from session)

- **"it looks huge"** — `.avatar-selected` at 80px was initially perceived as too large for a small identity indicator. Acceptable after seeing it in context with surrounding elements.
- **User prefers to code herself** — Agent should provide documented instructions with line references, not make direct edits. Julianna (UX/Designer) wants to learn and own the implementation.
- **Stale file reads caused incorrect review feedback** — Agent must re-read files before reviewing, especially when user edits in VS Code concurrently.

## Prevention Checklist

- [ ] Every new CSS class has a corresponding `className=` in JSX
- [ ] CSS classes are visually complete per design reference (layout, typography, spacing)
- [ ] All file reads are fresh before editing or reviewing
- [ ] Import paths verified against current branch's actual filenames
- [ ] No placeholder UI without functional handlers
- [ ] No commented-out code in committed diffs
- [ ] No inline styles that could be CSS classes

## References

- PR: #103
- Issue: #74
- Plan: `docs/plans/2026-02-20-style-lounge-screen-css-plan.md`
- Wireframe: `static/preview.html` lines 14-25
- Pattern reference: PR #71 (Lobby CSS), PR #89 (Guesses CSS)
- Related issues: #82 (join by ID), #92 (join-via-URL styling), #95 (lounge visualization)
