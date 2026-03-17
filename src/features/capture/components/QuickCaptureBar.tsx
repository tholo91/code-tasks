import { useState, useCallback } from 'react'
import { useSyncStore } from '../../../stores/useSyncStore'
import { triggerLaunchHaptic } from '../../../services/native/haptic-service'

interface QuickCaptureBarProps {
  isOnline: boolean
}

export function QuickCaptureBar({ isOnline }: QuickCaptureBarProps) {
  const [value, setValue] = useState('')
  const addTask = useSyncStore((s) => s.addTask)

  const handleSubmit = useCallback(() => {
    const trimmed = value.trim()
    if (!trimmed) return
    addTask(trimmed, '')
    triggerLaunchHaptic()
    setValue('')
  }, [addTask, value])

  return (
    <div className="mx-auto w-full max-w-[640px] px-4">
      <div
        className="flex flex-col gap-2 rounded-lg border px-3 py-2"
        style={{
          backgroundColor: 'var(--color-surface)',
          borderColor: 'var(--color-border)',
        }}
      >
        <label
          htmlFor="quick-capture-input"
          className="text-caption uppercase tracking-wider"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          Quick Capture
        </label>
        <div className="flex items-center gap-2">
          <input
            id="quick-capture-input"
            type="text"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                handleSubmit()
              }
            }}
            placeholder="Capture an idea and press Enter"
            className="input-field flex-1"
            data-testid="quick-capture-input"
          />
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!value.trim()}
            className="btn-primary"
            style={{ width: 'auto', minHeight: 40, paddingInline: 16 }}
            data-testid="quick-capture-submit"
          >
            Add
          </button>
        </div>
        {!isOnline && (
          <span className="text-caption" style={{ color: 'var(--color-warning)' }}>
            Offline — will sync when back online.
          </span>
        )}
      </div>
    </div>
  )
}
