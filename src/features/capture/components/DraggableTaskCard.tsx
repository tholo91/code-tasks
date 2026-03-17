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
      <TaskCard
        task={task}
        onComplete={onComplete}
        isNewest={isNewest}
      />
    </Reorder.Item>
  )
}
