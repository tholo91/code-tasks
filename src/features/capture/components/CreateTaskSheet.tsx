import { useState, useRef, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { selectRepoDraft, useSyncStore } from '../../../stores/useSyncStore'
import { triggerLaunchHaptic, triggerSelectionHaptic } from '../../../services/native/haptic-service'
import { BottomSheet } from '../../../components/ui/BottomSheet'

interface CreateTaskSheetProps {
  onClose: () => void
  onTaskCreated: (taskId: string) => void
}

export function CreateTaskSheet({ onClose, onTaskCreated }: CreateTaskSheetProps) {
  const addTask = useSyncStore((s) => s.addTask)
  const selectedRepoFullName = useSyncStore((s) => s.selectedRepo?.fullName ?? null)
  // Snapshot the draft once at mount via getState() so we don't subscribe to draft updates
  // (the draft is *written* by this component, so re-reading it would be wasted work).
  const [title, setTitle] = useState(() => {
    if (!selectedRepoFullName) return ''
    return selectRepoDraft(selectedRepoFullName)(useSyncStore.getState())?.title ?? ''
  })
  const [notes, setNotes] = useState(() => {
    if (!selectedRepoFullName) return ''
    return selectRepoDraft(selectedRepoFullName)(useSyncStore.getState())?.notes ?? ''
  })
  const [isImportant, setIsImportant] = useState(() => {
    if (!selectedRepoFullName) return false
    return selectRepoDraft(selectedRepoFullName)(useSyncStore.getState())?.isImportant ?? false
  })
  const titleRef = useRef<HTMLTextAreaElement>(null)
  const notesRef = useRef<HTMLTextAreaElement>(null)
  const submitRef = useRef<HTMLButtonElement>(null)
  const sheetRef = useRef<HTMLDivElement>(null)

  // Persist draft to the store on every change so an accidental backdrop tap
  // or drag-down won't lose the in-progress capture. Scoped per repo.
  useEffect(() => {
    if (!selectedRepoFullName) return
    useSyncStore.getState().setRepoDraft(selectedRepoFullName, { title, notes, isImportant })
  }, [title, notes, isImportant, selectedRepoFullName])

  // Backdrop tap / drag-down → preserve draft so the user can keep editing on next open.
  const handlePreserveClose = useCallback(() => {
    onClose()
  }, [onClose])

  // Explicit Cancel button → discard draft.
  const handleCancel = useCallback(() => {
    if (selectedRepoFullName) {
      useSyncStore.getState().clearRepoDraft(selectedRepoFullName)
    }
    useSyncStore.setState({ isImportant: false })
    setTitle('')
    setNotes('')
    setIsImportant(false)
    onClose()
  }, [onClose, selectedRepoFullName])

  const handleSubmit = useCallback(() => {
    const trimmedTitle = title.trim()
    if (!trimmedTitle) return

    useSyncStore.setState({ isImportant })
    const newTask = addTask(trimmedTitle, notes.trim())
    triggerLaunchHaptic()
    onTaskCreated(newTask.id)

    // Reset state and dismiss immediately — fast capture, no second task
    if (selectedRepoFullName) {
      useSyncStore.getState().clearRepoDraft(selectedRepoFullName)
    }
    setIsImportant(false)
    useSyncStore.setState({ isImportant: false })
    setTitle('')
    setNotes('')
    onClose()
  }, [title, notes, isImportant, addTask, onTaskCreated, onClose, selectedRepoFullName])

  // Auto-focus title on mount — triggers on-screen keyboard
  // We use multiple strategies for maximum mobile compatibility:
  // 1. autoFocus prop on the textarea (works within user gesture chain)
  // 2. Programmatic focus after animation settles (fallback)
  useEffect(() => {
    // Immediate attempt — catches most browsers
    titleRef.current?.focus({ preventScroll: true })

    // If a draft was restored, the textareas need their auto-grow re-applied
    // since handleTitleChange / handleNotesChange only fire on user input.
    if (titleRef.current) {
      titleRef.current.style.height = 'auto'
      titleRef.current.style.height = `${titleRef.current.scrollHeight}px`
    }
    if (notesRef.current) {
      notesRef.current.style.height = 'auto'
      notesRef.current.style.height = `${notesRef.current.scrollHeight}px`
    }

    // Delayed attempt — handles sheet animation lag and iOS quirks
    const timer = setTimeout(() => {
      if (titleRef.current) {
        titleRef.current.focus({ preventScroll: true })
        titleRef.current.setSelectionRange(
          titleRef.current.value.length,
          titleRef.current.value.length
        )
      }
    }, 350)
    return () => clearTimeout(timer)
  }, [])

  // Keyboard shortcut: Cmd/Ctrl+Enter to submit
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        handleSubmit()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleSubmit])

  // iOS visualViewport keyboard fix
  useEffect(() => {
    const viewport = window.visualViewport
    if (!viewport) return

    const handleViewportResize = () => {
      const offsetFromBottom = window.innerHeight - viewport.height - viewport.offsetTop
      if (sheetRef.current) {
        sheetRef.current.style.paddingBottom = `${Math.max(0, offsetFromBottom)}px`
      }
    }

    viewport.addEventListener('resize', handleViewportResize)
    return () => viewport.removeEventListener('resize', handleViewportResize)
  }, [])

  // Auto-expand title textarea
  const handleTitleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setTitle(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = `${e.target.scrollHeight}px`
  }

  // Auto-expand notes textarea
  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNotes(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = `${e.target.scrollHeight}px`
  }

  // Shared borderless input style
  const borderlessStyle: React.CSSProperties = {
    background: 'transparent',
    border: 'none',
    outline: 'none',
    padding: 0,
    color: 'var(--color-text-primary)',
  }

  return (
    <BottomSheet
      ref={sheetRef}
      onClose={handlePreserveClose}
      backdropBlur
      ariaLabel="Create new task"
      testId="create-task-sheet"
    >
        {/* Form */}
        <div className="flex flex-col gap-2">
          {/* Title row with priority flag */}
          <div className="flex items-start gap-2">
            <textarea
              ref={titleRef}
              id="create-task-title"
              autoFocus
              value={title}
              onChange={handleTitleChange}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.metaKey && !e.ctrlKey) {
                  e.preventDefault()
                  notesRef.current?.focus()
                }
              }}
              placeholder="Task name"
              rows={1}
              className="flex-1 resize-none overflow-hidden font-semibold"
              style={{
                ...borderlessStyle,
                fontSize: '1rem',
                lineHeight: '1.4',
                minHeight: '2rem',
              }}
              aria-label="Task title"
              data-testid="create-task-title"
            />
            <motion.button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                setIsImportant(!isImportant)
                triggerSelectionHaptic()
              }}
              whileTap={{ scale: 0.85 }}
              className="flex-shrink-0 flex items-center justify-center pt-0.5"
              style={{
                width: 36,
                height: 36,
                color: isImportant ? 'var(--color-danger)' : 'var(--color-text-secondary)',
                opacity: isImportant ? 1 : 0.3,
              }}
              aria-label="Toggle important"
              aria-pressed={isImportant}
              data-testid="create-task-priority-flag"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M3.5 1a.5.5 0 01.5.5v1h8.5a.5.5 0 01.4.8L10.5 6l2.4 2.7a.5.5 0 01-.4.8H4v5a.5.5 0 01-1 0V1.5a.5.5 0 01.5-.5z" />
              </svg>
            </motion.button>
          </div>

          {/* Notes — borderless */}
          <textarea
            ref={notesRef}
            id="create-task-notes"
            value={notes}
            onChange={handleNotesChange}
            onFocus={() => {
              // Scroll the notes field into view when the keyboard opens
              // so the user can see what they type on mobile
              setTimeout(() => {
                notesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
              }, 300)
            }}
            placeholder="Notes or context (optional)"
            rows={2}
            className="w-full resize-none overflow-hidden font-normal"
            style={{
              ...borderlessStyle,
              fontSize: '1rem',
              lineHeight: '1.5',
              minHeight: '2rem',
            }}
            aria-label="Task notes"
            data-testid="create-task-notes"
          />

          {/* Action row: Cancel + Capture */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleCancel}
              className="text-body font-medium px-2 py-2"
              style={{ color: 'var(--color-text-secondary)' }}
              data-testid="create-task-cancel"
            >
              Cancel
            </button>
            <button
              ref={submitRef}
              type="button"
              onClick={handleSubmit}
              disabled={!title.trim()}
              className="btn-primary flex-1"
              data-testid="create-task-submit"
            >
              Capture
            </button>
          </div>
        </div>
    </BottomSheet>
  )
}
