type Props = {
  open: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function LeaveGameDialog({ open, onConfirm, onCancel }: Props) {
  if (!open) return null

  return (
    <div className="leave-dialog-backdrop" onClick={onCancel}>
      <div className="leave-dialog" onClick={e => e.stopPropagation()}>
        <h2>Leave game?</h2>
        <p>You'll be sent back to the lounge.</p>
        <div className="leave-dialog-buttons">
          <button className="btn leave-dialog-stay" onClick={onCancel}>Stay</button>
          <button className="btn leave-dialog-leave" onClick={onConfirm}>Leave</button>
        </div>
      </div>
    </div>
  )
}
