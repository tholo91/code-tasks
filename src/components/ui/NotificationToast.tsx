import { motion, useReducedMotion } from 'framer-motion'
import { TRANSITION_FAST } from '../../config/motion'
import type { NotificationEntry } from '../../hooks/useNotificationDedup'

interface NotificationToastProps {
  notification: NotificationEntry | null
  onDismiss: () => void
}

function ToastIcon({ type }: { type: NotificationEntry['type'] }) {
  if (type === 'task-moved') {
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path
          d="M1.75 1.5a.25.25 0 0 0-.25.25v12.5c0 .138.112.25.25.25h12.5a.25.25 0 0 0 .25-.25V1.75a.25.25 0 0 0-.25-.25H1.75ZM0 1.75C0 .784.784 0 1.75 0h12.5C15.216 0 16 .784 16 1.75v12.5A1.75 1.75 0 0 1 14.25 16H1.75A1.75 1.75 0 0 1 0 14.25V1.75Zm9.22 3.72a.75.75 0 0 1 1.06 0l2.25 2.25a.75.75 0 0 1 0 1.06l-2.25 2.25a.75.75 0 1 1-1.06-1.06l.97-.97H5.75a.75.75 0 0 1 0-1.5h4.44l-.97-.97a.75.75 0 0 1 0-1.06Z"
          fill="var(--color-info)"
        />
      </svg>
    )
  }

  // Default: checkmark icon for sync-result, import-feedback, pull-refresh
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM6.5 10.793 4.354 8.646l.707-.707L6.5 9.378l4.44-4.439.706.707L6.5 10.793Z"
        fill="var(--color-success)"
      />
    </svg>
  )
}

export function NotificationToast({ notification, onDismiss }: NotificationToastProps) {
  const shouldReduceMotion = useReducedMotion()
  const transition = shouldReduceMotion ? { duration: 0 } : TRANSITION_FAST

  if (!notification) return null

  return (
    <motion.div
      key={notification.message}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={transition}
      onClick={onDismiss}
      className="fixed bottom-24 left-4 right-4 z-50 mx-auto max-w-lg rounded-lg px-4 py-3 flex items-center gap-2 cursor-pointer"
      style={{
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        boxShadow: '0 4px 24px rgba(0, 0, 0, 0.5)',
      }}
      role="status"
      aria-live="polite"
      data-testid="notification-toast"
    >
      <ToastIcon type={notification.type} />
      <span className="text-body" style={{ color: 'var(--color-text-primary)' }}>
        {notification.message}
      </span>
    </motion.div>
  )
}
