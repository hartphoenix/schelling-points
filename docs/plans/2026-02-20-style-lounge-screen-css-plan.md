---
title: "style: Apply CSS styling to Lounge screen"
type: feat
status: active
date: 2026-02-20
---

# style: Apply CSS styling to Lounge screen

Apply existing CSS classes from `lounge.css` and `global.css` to `Lounge.tsx`. Match the design in `static/preview.html` (lines 14-25).

## Acceptance Criteria

- [ ] Pre-join view uses `.screen` wrapper, `.title-block`, `.title`, `.subtitle`, `.screen-footer`, `.input`, `.btn`
- [ ] Post-join view uses `.screen` wrapper, `.screen-footer`, `.btn`
- [ ] MoodPicker renders between input and buttons (pre-join) and above button (post-join) — no CSS changes to MoodPicker itself
- [ ] No regressions on other views (Lobby, Guesses)

## Pre-Join View (lines 37-51)

**Wireframe target** (`preview.html` lines 14-25):
```html
<div class="screen">
    <div class="title-block">
        <h1 class="title">The Schelling Point</h1>
        <p class="subtitle">Do you & your friends think alike?</p>
    </div>
    <div class="screen-footer">
        <input class="input" placeholder="Name" />
        <button class="btn">Create Game</button>
        <button class="btn">Join Game</button>
    </div>
</div>
```

### Changes to `Lounge.tsx` (pre-join return, lines 38-51):

| Line | Current | Change to |
|------|---------|-----------|
| 39 | `<div className="lounge">` | `<div className="screen">` |
| 40 | `<h1>Schelling Points</h1>` | Wrap in `.title-block`: `<div className="title-block"><h1 className="title">The Schelling Point</h1><p className="subtitle">Do you & your friends think alike?</p></div>` |
| 41 | `<input type="text" ...>` | Add `className="input"` |
| 49 | `<button onClick={handleJoin}>Join</button>` | Add `className="btn"` |
| — | No footer wrapper | Wrap input + MoodPicker + button in `<div className="screen-footer">` |

## Post-Join View (lines 54-65)

| Line | Current | Change to |
|------|---------|-----------|
| 55 | `<div className="lounge">` | `<div className="screen">` |
| 56 | `<h1>Lounge</h1>` | Wrap in `.screen-header`: `<div className="screen-header"><h1>Lounge</h1></div>` |
| 57-61 | Bare `<ul>` player list | Keep for now (styling is separate concern) |
| 63 | `<button onClick={handleNewGame}>New Game</button>` | Add `className="btn"`, wrap in `.screen-footer` |

## CSS Already Written

**`lounge.css`** — `.title-block` (margin-top 75%), `.title` (3rem Instrument Serif), `.subtitle` (0.85rem uppercase gray)

**`global.css`** — `.screen`, `.screen-footer`, `.btn`, `.input`, `.screen-header` all exist

## Out of Scope

- MoodPicker CSS (issue #56)
- Player list styling in post-join view
- Join Game by ID input (issue #82)
- Color constants centralization (issue #83)

## References

- Issue: #74
- Wireframe: `static/preview.html` lines 14-25
- CSS: `static/styles/lounge.css`, `static/styles/global.css`
- Pattern reference: `docs/solutions/ui-bugs/2026-02-20-guess-screen-css-styling.md`
