---
title: "feat: Player name gate for direct game URL entry"
type: feat
status: active
date: 2026-02-19
issue: "#51"
---

# Player Name Gate for Direct Game URL Entry

## Context

When a user navigates to `/game/:gameId` directly (e.g. via shared link or QR code), the App component immediately sends `SUBSCRIBE_GAME` with whatever `playerName` is in state — which is empty string for first-time users. The Lounge's name input flow is bypassed entirely. This means players join games with no name.

**Goal:** Gate the `/game/:gameId` entry point so users must have a playerName before subscribing. Check localStorage first; if empty, show a name input.

## Changes

**Single file:** [client.tsx](src/client.tsx)

### 1. Add local state for the name gate (after line 60)

Three `useState` calls:
- `playerName` — committed name, initialized from `state.playerName` (which reads localStorage via `initialState()`). This gates the subscribe effect.
- `nameInput` — controlled input value for the text field. Only used while the gate is visible.
- `currentMood` — selected mood, initialized from `state.mood`. Passed to `SUBSCRIBE_GAME` on submit.

Also add an import for `MoodPicker` at the top of the file:
```tsx
import { MoodPicker } from './client/MoodPicker'
```

### 2. Add `handleNameSubmit` function

Mirrors the pattern in [Lounge.tsx:19-24](src/client/Lounge.tsx#L19-L24):
- Trim and validate non-empty
- Save to localStorage with key `'playerName'` (same key as Lounge uses)
- Call `setPlayerName` to commit the name, which triggers the subscribe effect

### 3. Modify the `SUBSCRIBE_GAME` effect (lines 74-84)

- Add `playerName` to the dependency array
- Add early return when `!playerName` (empty/falsy)
- Use local `playerName` state instead of `state.playerName` in the message

```tsx
React.useEffect(() => {
  if (!gameId) return
  if (!playerName) return

  state.mailbox.send({
    type: 'SUBSCRIBE_GAME',
    gameId,
    playerId: state.playerId,
    playerName: playerName,
    mood: currentMood,
  })
}, [gameId, playerName])
```

### 4. Add conditional render before the `switch` block (before line 86)

When `gameId` is present but `playerName` is empty, render a name input using the same markup pattern and CSS classes as the Lounge pre-join view ([Lounge.tsx:38-51](src/client/Lounge.tsx#L38-L51)). This means the gate inherits whatever styling is applied to `.lounge` — one set of styles covers both screens.

```tsx
if (gameId && !playerName) {
  return (
    <div className="lounge">
      <h1>What's your name?</h1>
      <input
        type="text"
        placeholder="Your name"
        value={nameInput}
        autoFocus
        onChange={e => setNameInput(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && handleNameSubmit()}
      />
      <MoodPicker currentMood={currentMood} onSelect={setCurrentMood} />
      <button onClick={handleNameSubmit}>Join Game</button>
    </div>
  )
}
```

## What stays untouched

- **Server** — `SUBSCRIBE_GAME` handler already accepts `playerName` from the message, no changes needed
- **Lounge.tsx** — its name flow is separate (sends `JOIN_LOUNGE`, not `SUBSCRIBE_GAME`), no shared component extraction needed
- **State types / initialState** — `playerName` on State stays as-is; we add a parallel local `useState` for the gate
- **MoodPicker** — already exists as a reusable component, just imported and used
- **No new files or dependencies**

## Acceptance Criteria

- [ ] `/` route — Lounge flow works exactly as before (no regression)
- [ ] `/game/<valid-id>` with no `playerName` in localStorage — name input screen appears
- [ ] Enter name and submit — saves to localStorage, proceeds to game lobby
- [ ] Refresh `/game/<valid-id>` — skips the gate (name already in localStorage)
- [ ] Clear localStorage, revisit `/game/<valid-id>` — gate appears again
- [ ] Empty/whitespace-only name — submit is rejected (trim + validate)
- [ ] Mood picker visible on gate screen — selected mood is sent with `SUBSCRIBE_GAME`

## References

- Issue: [#51 — lobby view onboards new user](https://github.com/hartphoenix/schelling-points/issues/51)
- Related todo: [join-via-link-name-entry.md](../../.claude/todos/user/join-via-link-name-entry.md)
- Architecture: [codebase-review-handoff.md](../solutions/2026-02-18-codebase-review-handoff.md)
