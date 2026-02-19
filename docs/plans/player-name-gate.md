# Player Name Gate for Direct Game URL Entry

## Context

When a user navigates to `/game/:gameId` directly (e.g. via shared link or QR code), the App component immediately sends `SUBSCRIBE_GAME` with whatever `playerName` is in state — which is empty string for first-time users. The Lounge's name input flow is bypassed entirely. This means players join games with no name.

**Goal:** Gate the `/game/:gameId` entry point so users must have a playerName before subscribing. Check localStorage first; if empty, show a name input.

## Changes

**Single file:** [client.tsx](src/client.tsx)

### 1. Add local state for the name gate (after line 60)

Two `useState` calls:
- `playerName` — committed name, initialized from `state.playerName` (which reads localStorage via `initialState()`). This gates the subscribe effect.
- `nameInput` — controlled input value for the text field. Only used while the gate is visible.

### 2. Add `handleNameSubmit` function

Mirrors the pattern in [Lounge.tsx:17-22](src/client/Lounge.tsx#L17-L22):
- Trim and validate non-empty
- Save to localStorage with key `'playerName'` (same format as Lounge)
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
    mood: state.mood,
  })
}, [gameId, playerName])
```

### 4. Add conditional render before the `switch` block (before line 86)

When `gameId` is present but `playerName` is empty, render a name input using existing global CSS classes (`.screen`, `.screen-header`, `.screen-footer`, `.input`, `.btn` from [global.css](static/styles/global.css)):

```tsx
if (gameId && !playerName) {
  return (
    <div className="screen">
      <div className="screen-header">
        <h1>What's your name?</h1>
      </div>
      <div className="screen-footer">
        <input
          className="input"
          type="text"
          placeholder="Your name"
          value={nameInput}
          autoFocus
          onChange={e => setNameInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleNameSubmit()}
        />
        <button className="btn" onClick={handleNameSubmit}>Join Game</button>
      </div>
    </div>
  )
}
```

## What stays untouched

- **Server** — `SUBSCRIBE_GAME` handler already accepts `playerName` from the message, no changes needed
- **Lounge.tsx** — its name flow is separate (sends `JOIN_LOUNGE`, not `SUBSCRIBE_GAME`), no shared component extraction needed
- **State types / initialState** — `playerName` on State stays as-is; we add a parallel local `useState` for the gate
- **No new files or dependencies**

## Verification

1. Open app at `/` — Lounge flow should work exactly as before
2. Open `/game/<valid-id>` with no `playerName` in localStorage — should see name input screen
3. Enter name and submit — should save to localStorage and proceed to the game lobby
4. Refresh `/game/<valid-id>` — should skip the gate (name already in localStorage)
5. Clear localStorage, revisit `/game/<valid-id>` — gate should appear again
