import * as React from 'react'
import { useSwipeable } from 'react-swipeable'

const cards: { title: string; body: React.ReactNode }[] = [
  { title: 'How to Play', body: <>The game begins with a category prompt, and your job is to guess what word everyone <em>else</em> will guess. It's large-scale <strong>Mind-Meld</strong>.</> },
  { title: 'The Clues', body: <>Each round, you'll get a hint about what everyone guessed. Everyone sees the same clue. Guess again. (If your guess is the same as the current clue, it'll be thrown out – so get creative).</> },
  { title: 'The Goal', body: <>By the end of 20 rounds, get everyone to guess the same word at the same time. You'll have just 10 seconds for each guess, so let 'er rip!</> },
]

type Props = {
  autoShow?: boolean
}

export function InstructionsPopover({ autoShow = false }: Props) {
  const [card, setCard] = React.useState(0)
  const popoverRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const el = popoverRef.current
    if (!el) return
    const onToggle = () => setCard(0)
    el.addEventListener('toggle', onToggle)
    return () => el.removeEventListener('toggle', onToggle)
  }, [])

  // Auto-show on first visit (localStorage flag prevents repeat)
  React.useEffect(() => {
    if (!autoShow) return
    if (localStorage.getItem('schelling-instructions-seen')) return
    popoverRef.current?.showPopover()
    localStorage.setItem('schelling-instructions-seen', 'true')
  }, [autoShow])

  function handleNext() {
    if (card < cards.length - 1) {
      setCard(card + 1)
    } else {
      popoverRef.current?.hidePopover()
    }
  }

  function handlePrev() {
    if (card > 0) setCard(card - 1)
  }

  const swipeHandlers = useSwipeable({
    onSwipedLeft: handleNext,
    onSwipedRight: handlePrev,
    preventScrollOnSwipe: true,
  })

  return (<>
    <button className="btn-icon" popoverTarget="instructions-popover" aria-label="Game instructions">
      <svg className="icon" width="18" height="18" viewBox="0 0 24 24"
        fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
        strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="16" x2="12" y2="12"/>
        <line x1="12" y1="8" x2="12.01" y2="8"/>
      </svg>
    </button>
    <div id="instructions-popover" popover="auto" ref={popoverRef}>
      <div {...swipeHandlers}>
        <h2 className="instructions-title">{cards[card].title}</h2>
        <p className="instructions-body">{cards[card].body}</p>
        <div className="instructions-dots">
          {cards.map((_, i) => (
            <span key={i} className={`instructions-dot${i === card ? ' active' : ''}`} />
          ))}
        </div>
        <div className="instructions-nav">
          {card > 0
            ? <button className="btn-icon instructions-prev" onClick={handlePrev}>Back</button>
            : <span />}
          <button className="btn-icon instructions-next" onClick={handleNext}>
            {card < cards.length - 1 ? 'Next' : 'Got it'}
          </button>
        </div>
      </div>
    </div>
  </>)
}
