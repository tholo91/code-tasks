import { useEffect } from 'react'
import { motion, useMotionValue, animate } from 'framer-motion'
import { TRANSITION_SPRING } from '../../../config/motion'
import { DraggableTaskCard } from './DraggableTaskCard'
import { TaskCard } from './TaskCard'
import type { Task } from '../../../types/task'

const BUTTON_WIDTH = 70

interface SwipeableTaskCardProps {
  task: Task
  onDelete: (taskId: string) => void
  onMove?: (taskId: string) => void
  isSwipeOpen: boolean
  onSwipeOpen: (taskId: string) => void
  onSwipeClose: () => void
  showMoveAction: boolean
  // DraggableTaskCard pass-through props
  onTap: (taskId: string) => void
  onComplete: (taskId: string) => void
  isNewest: boolean
  isDimmed?: boolean
  onDragStart?: () => void
  onDragEnd?: () => void
  /** When true, renders inside a Reorder.Group (uses DraggableTaskCard) */
  isDraggable?: boolean
}

export function SwipeableTaskCard({
  task,
  onDelete,
  onMove,
  isSwipeOpen,
  onSwipeOpen,
  onSwipeClose,
  showMoveAction,
  onTap,
  onComplete,
  isNewest,
  isDimmed = false,
  onDragStart,
  onDragEnd,
  isDraggable = true,
}: SwipeableTaskCardProps) {
  const x = useMotionValue(0)
  const trayWidth = showMoveAction ? BUTTON_WIDTH * 2 : BUTTON_WIDTH

  // Close tray when another card opens
  useEffect(() => {
    if (!isSwipeOpen) {
      animate(x, 0, TRANSITION_SPRING)
    }
  }, [isSwipeOpen, x])

  const handleDragEnd = (_: unknown, info: { offset: { x: number }; velocity: { x: number } }) => {
    if (info.offset.x < -trayWidth / 2 || info.velocity.x < -300) {
      animate(x, -trayWidth, TRANSITION_SPRING)
      onSwipeOpen(task.id)
    } else {
      animate(x, 0, TRANSITION_SPRING)
      onSwipeClose()
    }
  }

  return (
    <div
      className="relative overflow-hidden rounded-lg"
      data-testid={`swipeable-card-${task.id}`}
    >
      {/* Action tray (behind the card) */}
      <div
        className="absolute right-0 top-0 bottom-0 flex"
        style={{ width: trayWidth }}
      >
        {showMoveAction && (
          <button
            onClick={() => onMove?.(task.id)}
            className="flex flex-1 flex-col items-center justify-center gap-1"
            style={{ backgroundColor: 'var(--color-accent)' }}
            aria-label="Move task to another repository"
            data-testid={`swipe-move-${task.id}`}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M4 10h12m0 0l-4-4m4 4l-4 4" stroke="white" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <span className="text-[10px] font-medium text-white">Move to...</span>
          </button>
        )}
        <button
          onClick={() => onDelete(task.id)}
          className="flex flex-1 flex-col items-center justify-center gap-1"
          style={{ backgroundColor: 'var(--color-danger)' }}
          aria-label="Delete task"
          data-testid={`swipe-delete-${task.id}`}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="M6 4V3a1 1 0 011-1h6a1 1 0 011 1v1m-10 0h14m-12 0v12a2 2 0 002 2h6a2 2 0 002-2V4" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <span className="text-[10px] font-medium text-white">Delete</span>
        </button>
      </div>

      {/* Swipeable card layer */}
      <motion.div
        drag="x"
        dragConstraints={{ left: -trayWidth, right: 0 }}
        dragElastic={0.1}
        style={{ x, backgroundColor: 'var(--color-canvas)' }}
        onDragEnd={handleDragEnd}
        exit={{
          x: '-100%',
          opacity: 0,
          height: 0,
          marginBottom: 0,
          transition: {
            x: { type: 'spring', stiffness: 400, damping: 30 },
            height: { delay: 0.15, duration: 0.2 },
            marginBottom: { delay: 0.15, duration: 0.2 },
            opacity: { delay: 0.1, duration: 0.15 },
          }
        }}
      >
        {isDraggable ? (
          <DraggableTaskCard
            task={task}
            onTap={onTap}
            onComplete={onComplete}
            isNewest={isNewest}
            isDimmed={isDimmed}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
          />
        ) : (
          <TaskCard
            task={task}
            onTap={onTap}
            onComplete={onComplete}
            isNewest={isNewest}
          />
        )}
      </motion.div>
    </div>
  )
}
