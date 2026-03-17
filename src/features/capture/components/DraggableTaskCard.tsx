import { useRef, useEffect } from 'react'
import { Reorder, useDragControls } from 'framer-motion'
import { TRANSITION_SPRING } from '../../../config/motion'
import { triggerSelectionHaptic } from '../../../services/native/haptic-service'
import { TaskCard } from './TaskCard'
import type { Task } from '../../../types/task'

const LONG_PRESS_DELAY = 250 // ms — iOS standard
const MOVE_TOLERANCE = 10    // px — cancels long-press if finger moves (scroll detection)

interface DraggableTaskCardProps {
  task: Task
  onTap: (taskId: string) => void
  onComplete: (taskId: string) => void
  isNewest: boolean
  isDimmed?: boolean
  onDragStart?: () => void
  onDragEnd?: () => void
}

export function DraggableTaskCard({
  task,
  onTap,
  onComplete,
  isNewest,
  isDimmed = false,
  onDragStart,
  onDragEnd,
}: DraggableTaskCardProps) {
  const controls = useDragControls()
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isDraggingRef = useRef(false)
  const pointerStartPos = useRef({ x: 0, y: 0 })

  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current)
    }
  }, [])

  const startDrag = (nativeEvent: PointerEvent) => {
    isDraggingRef.current = true
    triggerSelectionHaptic()
    onDragStart?.()
    let eventForDrag: PointerEvent = nativeEvent
    if (typeof PointerEvent === 'function') {
      try {
        eventForDrag = new PointerEvent('pointerdown', {
          clientX: pointerStartPos.current.x,
          clientY: pointerStartPos.current.y,
          pointerId: nativeEvent.pointerId,
          pointerType: nativeEvent.pointerType,
          isPrimary: nativeEvent.isPrimary,
          buttons: nativeEvent.buttons,
        })
      } catch {
        eventForDrag = nativeEvent
      }
    }
    controls.start(eventForDrag)
  }

  const handlePointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('[role="checkbox"]')) return

    pointerStartPos.current = { x: e.clientX, y: e.clientY }
    const nativeEvent = e.nativeEvent as PointerEvent

    longPressTimerRef.current = setTimeout(() => {
      startDrag(nativeEvent)
    }, LONG_PRESS_DELAY)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!longPressTimerRef.current) return
    const dx = e.clientX - pointerStartPos.current.x
    const dy = e.clientY - pointerStartPos.current.y
    // Cancel long-press if finger moves beyond tolerance.
    // If movement is primarily horizontal, let swipe gesture handle it.
    if (Math.abs(dx) > MOVE_TOLERANCE || Math.abs(dy) > MOVE_TOLERANCE) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
  }

  const handlePointerUp = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
    if (isDraggingRef.current) {
      onDragEnd?.()
    }
    // Small delay to let click handler check isDraggingRef
    setTimeout(() => { isDraggingRef.current = false }, 10)
  }

  const handleClick = () => {
    if (!isDraggingRef.current) {
      onTap(task.id)
    }
  }

  const handleDragHandlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.stopPropagation()
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
    pointerStartPos.current = { x: e.clientX, y: e.clientY }
    startDrag(e.nativeEvent as PointerEvent)
  }

  return (
    <Reorder.Item
      value={task}
      dragListener={false}
      dragControls={controls}
      whileDrag={{
        scale: 1.03,
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        zIndex: 50,
      }}
      transition={TRANSITION_SPRING}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onClick={handleClick}
      style={{
        position: 'relative',
        listStyle: 'none',
        opacity: isDimmed ? 0.5 : 1,
        transition: 'opacity 0.15s',
      }}
      data-testid={`reorder-item-${task.id}`}
    >
      <div className="relative">
        <TaskCard
          task={task}
          onComplete={onComplete}
          isNewest={isNewest}
          className="pr-12"
        />
        <button
          type="button"
          onPointerDown={handleDragHandlePointerDown}
          onClick={(e) => e.stopPropagation()}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-2"
          style={{
            backgroundColor: 'rgba(255,255,255,0.04)',
            border: '1px solid var(--color-border)',
          }}
          aria-label="Reorder task"
          data-testid={`drag-handle-${task.id}`}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
            <path d="M6 3.5a1.5 1.5 0 1 1-3.001 0A1.5 1.5 0 0 1 6 3.5Zm7 0a1.5 1.5 0 1 1-3.001 0A1.5 1.5 0 0 1 13 3.5ZM6 8a1.5 1.5 0 1 1-3.001 0A1.5 1.5 0 0 1 6 8Zm7 0a1.5 1.5 0 1 1-3.001 0A1.5 1.5 0 0 1 13 8ZM6 12.5a1.5 1.5 0 1 1-3.001 0A1.5 1.5 0 0 1 6 12.5Zm7 0a1.5 1.5 0 1 1-3.001 0A1.5 1.5 0 0 1 13 12.5Z" />
          </svg>
        </button>
      </div>
    </Reorder.Item>
  )
}
