import { useState, useActionState } from 'react'
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
      <form
        action={formAction}
        className="w-full max-w-md rounded-lg border p-6"
        style={{
          backgroundColor: 'var(--color-surface)',
          borderColor: 'var(--color-border)',
        }}
      >
        <h2
          className="mb-2 text-xl font-semibold"
          style={{ color: 'var(--color-text-primary)' }}
        >
          Authenticate
        </h2>
        <p
          className="mb-6 text-sm"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          Enter your GitHub Personal Access Token and a master passphrase to encrypt it.
        </p>

        <div className="mb-4">
          <label
            htmlFor="pat-input"
            className="mb-2 block text-sm font-medium"
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
            className="w-full rounded-md border px-3 py-2 text-sm outline-none"
            style={{
              backgroundColor: 'var(--color-canvas)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-primary)',
            }}
          />

          {/* Accordion toggle */}
          <button
            type="button"
            onClick={() => setHelpOpen((prev) => !prev)}
            aria-expanded={helpOpen}
            aria-controls="token-help"
            className="mt-2 flex min-h-[44px] items-center text-xs underline"
            style={{ color: 'var(--color-accent)', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
          >
            How do I get a token? →
          </button>

          {/* Accordion content */}
          <div
            id="token-help"
            aria-hidden={!helpOpen}
            className="overflow-hidden transition-[max-height] duration-200 ease-in-out motion-reduce:transition-none"
            style={{ maxHeight: helpOpen ? '600px' : '0' }}
          >
            <div
              className="mt-2 rounded-md border p-3 text-xs"
              style={{
                borderColor: 'var(--color-border)',
                backgroundColor: 'var(--color-canvas)',
                color: 'var(--color-text-secondary)',
              }}
            >
              {/* Privacy / trust paragraph */}
              <p className="mb-3">
                Your token connects Gitty directly to GitHub from your device.
                It's encrypted with your passphrase (AES-256 GCM) and stored
                locally only. It's never sent to any server — because there are none.
              </p>

              {/* Step-by-step instructions */}
              <ol className="mb-3 list-decimal pl-4 space-y-1">
                <li>Click the button below → you'll land on GitHub's "New fine-grained token" page</li>
                <li>Under "Repository access" → select "Only select repositories" → pick your repo</li>
                <li>Under "Repository permissions" → find "Contents" → set it to "Read and Write"</li>
                <li>Click "Generate token" → copy it → paste it above</li>
              </ol>

              {/* Deep-link CTA */}
              <a
                href="https://github.com/settings/personal-access-tokens/new"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block rounded-md px-3 py-1 text-xs font-medium"
                style={{
                  backgroundColor: 'var(--color-accent)',
                  color: '#ffffff',
                }}
              >
                Open GitHub Token Page →
              </a>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <label
            htmlFor="passphrase-input"
            className="mb-2 block text-sm font-medium"
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
            className="w-full rounded-md border px-3 py-2 text-sm outline-none"
            style={{
              backgroundColor: 'var(--color-canvas)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-primary)',
            }}
          />
          <p className="mt-1 text-[10px]" style={{ color: 'var(--color-text-secondary)' }}>
            This is never stored. You'll need it to unlock your token on other sessions.
          </p>
        </div>

        {state.error && (
          <div
            role="alert"
            className="mb-4 rounded-md border px-3 py-2 text-sm"
            style={{
              borderColor: '#f85149',
              color: '#f85149',
              backgroundColor: 'rgba(248, 81, 73, 0.1)',
            }}
          >
            {state.error}
          </div>
        )}

        {/* Always-visible trust line */}
        <p className="mb-3 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
          🔒 Your token never leaves this device.
        </p>

        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-md px-4 py-2 text-sm font-medium transition-opacity disabled:opacity-50"
          style={{
            backgroundColor: 'var(--color-accent)',
            color: '#ffffff',
          }}
        >
          {isPending ? 'Authenticating...' : 'Authenticate'}
        </button>
      </form>
    </div>
  )
}
