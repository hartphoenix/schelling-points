import * as React from 'react'
import * as t from './types'

const ALL_MOODS: t.Mood[] = ['😀', '😐', '😞']

type Props = {
    currentMood: t.Mood
    onSelect: (mood: t.Mood) => void
}

export function MoodPicker({ currentMood, onSelect }: Props) {
    const [isOpen, setIsOpen] = React.useState(false)

    function handlePick(mood: t.Mood) {
        onSelect(mood)
        setIsOpen(false)
    }

    return (
        <div className="mood-picker">
            {isOpen ? (
                <div className="mood-options">
                    {ALL_MOODS.map(mood => (
                        <button
                            key={mood}
                            className={mood === currentMood ? 'mood-option selected' : 'mood-option'}
                            onClick={() => handlePick(mood)}
                        >
                            {mood}
                        </button>
                    ))}
                </div>
            ) : (
                <button
                    className="mood-current"
                    onClick={() => setIsOpen(true)}
                >
                    {currentMood}
                </button>
            )}
        </div>
    )
}