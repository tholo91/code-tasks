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
  const [helpOpen, setHelpOpen] = useState(false)

  const [state, formAction, isPending] = useActionState(
    async (_prev: FormState, formData: FormData): Promise<FormState> => {
      const token = (formData.get('token') as string)?.trim() ?? ''
      const passphrase = (formData.get('passphrase') as string)?.trim() ?? ''

      if (!token) {
        return { error: 'Token cannot be empty', pending: false }
      }
      if (!passphrase) {
        return { error: 'App passphrase cannot be empty', pending: false }
      }

      try {
        const result = await validateToken(token)

        if (!result.valid) {
          return { error: result.error, pending: false }
        }

        await setAuth(token, result.user, passphrase)
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
          Enter your GitHub Personal Access Token and a master passphrase to encrypt it.
        </p>

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
            className="mt-2 flex min-h-[44px] items-center text-label underline"
            style={{ color: 'var(--color-accent)', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
          >
            How do I get a token?
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
              <p className="mb-3">
                Your token connects Gitty directly to GitHub from your device.
                It's encrypted with your passphrase (AES-256 GCM) and stored
                locally only. It's never sent to any server — because there are none.
              </p>

              <ol className="mb-3 list-decimal pl-4 space-y-1">
                <li>Click the button below — you'll land on GitHub's "New fine-grained token" page</li>
                <li>Under "Repository access" — select "Only select repositories" — pick your repo</li>
                <li>Under "Repository permissions" — find "Contents" — set it to "Read and Write"</li>
                <li>Click "Generate token" — copy it — paste it above</li>
              </ol>

              <a
                href="https://github.com/settings/personal-access-tokens/new"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block rounded-md px-3 py-1 text-label font-medium"
                style={{
                  backgroundColor: 'var(--color-accent)',
                  color: '#ffffff',
                }}
              >
                Open GitHub Token Page
              </a>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <label
            htmlFor="passphrase-input"
            className="mb-2 block text-body font-medium"
            style={{ color: 'var(--color-text-primary)' }}
          >
            App Passphrase (Encryption Key)
          </label>
          <input
            id="passphrase-input"
            name="passphrase"
            type="password"
            autoComplete="new-password"
            placeholder="Your master key"
            disabled={isPending}
            className="input-field"
          />
          <p className="mt-1 text-caption" style={{ color: 'var(--color-text-secondary)' }}>
            This is never stored. You'll need it to unlock your token on other sessions.
          </p>
        </div>

        {state.error && (
          <div
            role="alert"
            className="mb-4 rounded-md border px-3 py-2 text-body"
            style={{
              borderColor: 'var(--color-danger)',
              color: 'var(--color-danger)',
              backgroundColor: 'rgba(248, 81, 73, 0.1)',
            }}
          >
            {state.error}
          </div>
        )}

        <p className="mb-3 text-label" style={{ color: 'var(--color-text-secondary)' }}>
          Your token never leaves this device.
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
