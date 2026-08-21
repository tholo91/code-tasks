import { useState, useActionState } from 'react'
import { motion } from 'framer-motion'
import { validateToken } from '../../../services/github/auth-service'
import { useSyncStore } from '../../../stores/useSyncStore'

interface AuthFormProps {
  onSuccess: () => void
  layout?: 'centered' | 'inline'
}

interface FormState {
  error: string | null
  pending: boolean
}

const initialState: FormState = { error: null, pending: false }

export function AuthForm({ onSuccess, layout = 'centered' }: AuthFormProps) {
  const setAuth = useSyncStore((s) => s.setAuth)
  const authError = useSyncStore((s) => s.authError)
  const [helpOpen, setHelpOpen] = useState(false)
  const [migrated] = useState(() => {
    const flag = localStorage.getItem('code-tasks:migrated')
    if (flag) localStorage.removeItem('code-tasks:migrated')
    return !!flag
  })

  const [state, formAction, isPending] = useActionState(
    async (_prev: FormState, formData: FormData): Promise<FormState> => {
      const token = (formData.get('token') as string)?.trim() ?? ''

      if (!token) {
        return { error: 'Token cannot be empty', pending: false }
      }

      try {
        const result = await validateToken(token)

        if (!result.valid) {
          return { error: result.error, pending: false }
        }

        await setAuth(token, result.user)
        onSuccess()
        return { error: null, pending: false }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Authentication failed'
        return { error: message, pending: false }
      }
    },
    initialState,
  )

  return (
    <div className={layout === 'inline' ? 'w-full' : 'flex min-h-screen items-center justify-center px-4'}>
      <form action={formAction} className="card w-full max-w-md p-6" data-testid="auth-form">
        <p className="mb-3 font-mono text-label" style={{ color: 'var(--color-accent)' }}>1 GitHub → 2 Repository → 3 First capture → 4 Agent Connect</p>
        <h2 className="mb-2 text-title font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          Connect GitHub
        </h2>
        <p className="mb-6 text-body" style={{ color: 'var(--color-text-secondary)' }}>
          Use a fine-grained personal access token limited to the repositories you choose, with Contents: Read and write.
        </p>

        {migrated && (
          <div
            className="mb-4 rounded-md border px-3 py-2 text-body"
            style={{
              borderColor: 'var(--color-accent)',
              color: 'var(--color-accent)',
              backgroundColor: 'rgba(88, 166, 255, 0.1)',
            }}
          >
            We've simplified login — please re-enter your token once.
          </div>
        )}

        <div className="mb-4">
          <label htmlFor="pat-input" className="sr-only">Personal access token</label>
          <input
            id="pat-input"
            name="token"
            type="password"
            autoComplete="off"
            placeholder="ghp_..."
            disabled={isPending}
            className="input-field"
          />

          {/* Accordion toggle */}
          <button
            type="button"
            onClick={() => setHelpOpen((prev) => !prev)}
            aria-expanded={helpOpen}
            aria-controls="token-help"
            className="mt-2 flex min-h-[44px] w-full items-center justify-between rounded-md px-2 text-label"
            style={{ color: 'var(--color-accent)', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <span>How do I create a fine-grained token?</span>
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="currentColor"
              className="transition-transform duration-200 motion-reduce:transition-none"
              style={{ transform: helpOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
            >
              <path fillRule="evenodd" d="M4.22 5.72a.75.75 0 0 1 1.06 0L8 8.44l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 6.78a.75.75 0 0 1 0-1.06Z" />
            </svg>
          </button>

          {/* Accordion content */}
          <div
            id="token-help"
            aria-hidden={!helpOpen}
            className="overflow-hidden transition-[max-height] duration-200 ease-in-out motion-reduce:transition-none"
            style={{ maxHeight: helpOpen ? '600px' : '0' }}
          >
            <div
              className="card mt-2 p-3 text-label"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              <ol className="mb-3 list-decimal pl-4 space-y-1">
                <li>Tap "Open GitHub" below</li>
                <li>Repository access → Only select repositories → pick yours</li>
                <li>Permissions → Contents → Read and Write</li>
                <li>Generate token, copy it</li>
                <li>Paste it in the field above</li>
              </ol>

              <a
                href="https://github.com/settings/personal-access-tokens/new"
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full rounded-md px-3 py-2 text-center text-label font-medium"
                style={{
                  backgroundColor: 'var(--color-accent)',
                  color: '#ffffff',
                }}
              >
                Open GitHub
              </a>
            </div>
          </div>
        </div>

        {(state.error || authError) && (
          <div
            role="alert"
            className="mb-4 rounded-md border px-3 py-2 text-body"
            style={{
              borderColor: 'var(--color-danger)',
              color: 'var(--color-danger)',
              backgroundColor: 'rgba(248, 81, 73, 0.1)',
            }}
          >
            {state.error || authError}
          </div>
        )}

        <motion.button
          type="submit"
          disabled={isPending}
          className="btn-primary"
          whileTap={{ scale: 0.97 }}
        >
          {isPending ? 'Connecting…' : 'Connect GitHub'}
        </motion.button>

        <p className="mt-3 text-label" style={{ color: 'var(--color-text-secondary)' }}>
          Stored encrypted on this device. Gitty has no user database.
        </p>
      </form>
    </div>
  )
}
