import { useEffect, useState } from "react"

export function Timer({ secsLeft }: { secsLeft: number }) {
  const [remaining, setRemaining] = useState(Math.round(secsLeft))

  useEffect(() => {
    setRemaining(Math.round(secsLeft)) // sync when server sends a new value
  }, [secsLeft])

  useEffect(() => {
    if (remaining <= 0) return
    // setTimeout (not setInterval) so the 1s cadence restarts cleanly
    // whenever `remaining` changes — including server syncs.
    const id = setTimeout(() => setRemaining(r => Math.max(0, r - 1)), 1000)
    return () => clearTimeout(id)
  }, [remaining])

  return <>{remaining}</>
}
