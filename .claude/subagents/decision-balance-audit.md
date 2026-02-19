# Decision & Balance Audit

Analyze every player-facing decision point introduced in the PR (purchases, toggles, accept/deny choices, sliders, resource allocation). For each one, answer:

1. **Dominant strategy**: Is there an option that is always correct regardless of game state? If "yes to everything" or "no to everything" is optimal, flag it.
2. **Meaningful trade-off**: Does choosing one option make another option more valuable, or does every choice exist in isolation?
3. **Resource pressure**: Do resource constraints (money, time, sanity, etc.) actually force the player to choose, or can they afford everything?
4. **Downside existence**: Does saying "no" (or choosing the conservative option) ever produce a better outcome than "yes"? Under what conditions?
5. **Escalation curve**: As the game progresses, do decisions get harder (tighter resources, higher stakes), or does the player's advantage compound without limit?

Read the game logic, economy constants, and event/effect systems. Trace actual numeric outcomes for accept-vs-reject and buy-vs-skip decisions. Return a structured list of balance findings with suggested severity:
- P1 if a dominant strategy makes an entire mechanic decorative
- P2 if trade-offs exist but are too weak to matter in practice
- P3 if balance is close but could be tightened
