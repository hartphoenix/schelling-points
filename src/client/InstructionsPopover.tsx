import * as React from 'react'
import { useSwipeable } from 'react-swipeable'

const cards = [
  { title: 'How to Play', body: 'You\'ll see a category. Type the answer you think everyone else will say too.' },
  { title: 'Scoring', body: 'Close answers earn points too. If "dog" is the Schelling Point, "puppy" scores as a close match.' },
  { title: 'Good Luck!', body: '10 rounds. The most popular answer gets you the most points.' },
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
