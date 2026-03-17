import { useState, useActionState } from 'react'
import { motion } from 'framer-motion'
import { validateToken } from '../../../services/github/auth-service'
import { useSyncStore } from '../../../stores/useSyncStore'

interface AuthFormProps {
  onSuccess: () => void
}

interface FormState {
  error: string | null
  pending: boolean
}

const initialState: FormState = { error: null, pending: false }

export function AuthForm({ onSuccess }: AuthFormProps) {
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
    <div className="flex min-h-screen items-center justify-center px-4">
      <form action={formAction} className="card w-full max-w-md p-6">
        <h2 className="mb-2 text-title font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          Authenticate
        </h2>
        <p className="mb-6 text-body" style={{ color: 'var(--color-text-secondary)' }}>
          Enter your GitHub Personal Access Token to connect.
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
          <label
            htmlFor="pat-input"
            className="mb-2 block text-body font-medium"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Personal Access Token
          </label>
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
            <span>How do I get a token?</span>
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

        <p className="mb-3 text-label" style={{ color: 'var(--color-text-secondary)' }}>
          Your token never leaves this device and is encrypted at rest.
        </p>

        <motion.button
          type="submit"
          disabled={isPending}
          className="btn-primary"
          whileTap={{ scale: 0.97 }}
        >
          {isPending ? 'Authenticating...' : 'Authenticate'}
        </motion.button>
      </form>
    </div>
  )
}
