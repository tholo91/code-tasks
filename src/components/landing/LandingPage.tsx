import { AuthForm } from '../../features/auth/components/AuthForm'
import { roadmapData } from '../../data/roadmap'
import logoUrl from '/maskable-icon-512x512-light.png'

interface LandingPageProps {
  onSuccess: () => void
}

const plannedItems = roadmapData.filter((item) => item.status === 'planned')

const steps = [
  { num: '01', text: 'Capture a task from your phone, mid-thought, in seconds.' },
  { num: '02', text: 'It lands in your GitHub repo as a markdown file.' },
  { num: '03', text: "Claude Code, Cursor, or Codex reads it on next startup and can report back when it's done." },
]

const agentSteps = [
  { num: '01', text: 'The file tells your agent to pull the freshest tasks from whichever branch they live on. No manual git fetch, no branch hunting.' },
  { num: '02', text: 'It briefs itself: open tasks grouped by priority, each with a one-line suggested approach.' },
  { num: '03', text: 'It handles the small ones, proposes a story for the bigger ones, and checks them off when done.' },
]

export function LandingPage({ onSuccess }: LandingPageProps) {
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      overflowY: 'auto',
      overflowX: 'hidden',
      background: 'var(--color-canvas)',
      color: 'var(--color-text-primary)',
    }}>

      {/* Hero */}
      <section
        style={{
          minHeight: '100svh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '5rem 1.5rem 4rem',
          maxWidth: '480px',
          margin: '0 auto',
          position: 'relative',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '1.75rem',
          }}
        >
          <img
            src={logoUrl}
            alt="Gitty logo"
            style={{ width: '28px', height: '28px', borderRadius: '6px' }}
          />
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--text-label)',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color: 'var(--color-accent)',
            }}
          >
            Gitty
          </span>
        </div>

        <h1
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 'clamp(2rem, 7vw, 3rem)',
            fontWeight: 700,
            lineHeight: 1.1,
            letterSpacing: '-0.02em',
            color: 'var(--color-text-primary)',
            marginBottom: '1.25rem',
          }}
        >
          Capture on your phone.<br />
          Ship in your agent's next run.
        </h1>

        <p
          style={{
            fontSize: 'var(--text-body)',
            lineHeight: 1.65,
            color: 'var(--color-text-secondary)',
            marginBottom: '2.75rem',
            maxWidth: '34ch',
          }}
        >
          Tap a task on your phone. It lands as markdown in your repo, pre-formatted so Claude Code, Cursor, or Codex picks it up automatically.
        </p>

        <AuthForm onSuccess={onSuccess} layout="inline" />

        <div
          style={{
            position: 'absolute',
            bottom: '2rem',
            left: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            color: 'var(--color-text-secondary)',
            fontSize: 'var(--text-label)',
            fontFamily: 'var(--font-mono)',
            opacity: 0.6,
          }}
          aria-hidden="true"
        >
          <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
            <path fillRule="evenodd" d="M8 1a.75.75 0 0 1 .75.75v10.69l3.22-3.22a.75.75 0 1 1 1.06 1.06l-4.5 4.5a.75.75 0 0 1-1.06 0l-4.5-4.5a.75.75 0 1 1 1.06-1.06L7.25 12.44V1.75A.75.75 0 0 1 8 1Z" />
          </svg>
          scroll
        </div>
      </section>

      <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', margin: '0 1.5rem' }} />

      {/* How it works */}
      <section
        style={{
          padding: '5rem 1.5rem',
          maxWidth: '480px',
          margin: '0 auto',
        }}
      >
        <SectionLabel>How it works</SectionLabel>

        <ol style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {steps.map((step) => (
            <li
              key={step.num}
              style={{
                display: 'flex',
                gap: '1.5rem',
                paddingBottom: '2.25rem',
                alignItems: 'flex-start',
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 'var(--text-label)',
                  color: 'var(--color-accent)',
                  letterSpacing: '0.06em',
                  paddingTop: '0.1rem',
                  flexShrink: 0,
                  opacity: 0.7,
                }}
              >
                {step.num}
              </span>
              <p
                style={{
                  fontSize: 'var(--text-body)',
                  lineHeight: 1.65,
                  color: 'var(--color-text-primary)',
                  margin: 0,
                }}
              >
                {step.text}
              </p>
            </li>
          ))}
        </ol>
      </section>

      <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', margin: '0 1.5rem' }} />

      {/* Connect your AI agent */}
      <section
        style={{
          padding: '5rem 1.5rem',
          maxWidth: '480px',
          margin: '0 auto',
        }}
      >
        <SectionLabel>Connect your AI agent</SectionLabel>

        <p
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--text-body)',
            lineHeight: 1.7,
            color: 'var(--color-text-secondary)',
            margin: '0 0 2.25rem',
            maxWidth: '38ch',
          }}
        >
          Your captures land as agent-ready markdown. Claude Code, Cursor, Codex, and Gemini CLI all read the same file, brief themselves, and get to work.
        </p>

        <div style={{ marginBottom: '2.75rem' }}>
          <p
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--text-label)',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--color-text-secondary)',
              margin: '0 0 0.6rem',
              opacity: 0.6,
            }}
          >
            Claude Code shortcut
          </p>
          <code
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--text-body)',
              color: 'var(--color-accent)',
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: '0.6rem',
              padding: '0.65rem 0.9rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <span style={{ color: 'var(--color-text-secondary)', opacity: 0.5 }}>&gt;</span>
            /captured-ideas
          </code>
          <p
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--text-label)',
              lineHeight: 1.6,
              color: 'var(--color-text-secondary)',
              margin: '0.85rem 0 0',
              opacity: 0.55,
            }}
          >
            Cursor, Codex, and Gemini CLI read the same file directly.
          </p>
        </div>

        <ol style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {agentSteps.map((step) => (
            <li
              key={step.num}
              style={{
                display: 'flex',
                gap: '1.5rem',
                paddingBottom: '2.25rem',
                alignItems: 'flex-start',
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 'var(--text-label)',
                  color: 'var(--color-accent)',
                  letterSpacing: '0.06em',
                  paddingTop: '0.1rem',
                  flexShrink: 0,
                  opacity: 0.7,
                }}
              >
                {step.num}
              </span>
              <p
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 'var(--text-body)',
                  lineHeight: 1.7,
                  color: 'var(--color-text-primary)',
                  margin: 0,
                }}
              >
                {step.text}
              </p>
            </li>
          ))}
        </ol>
      </section>

      <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', margin: '0 1.5rem' }} />

      {/* Screenshots */}
      <section
        style={{
          padding: '5rem 1.5rem',
          maxWidth: '480px',
          margin: '0 auto',
          width: '100%',
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            display: 'flex',
            gap: '1rem',
            width: '100%',
            alignItems: 'flex-start',
          }}
        >
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <img
              src={`${import.meta.env.BASE_URL}screenshot-tasks.webp`}
              alt="Gitty task list"
              width={220}
              height={428}
              style={{
                borderRadius: '1.25rem',
                width: '100%',
                height: 'auto',
                boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
                border: '1px solid var(--color-border)',
                display: 'block',
              }}
            />
            <p style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--text-label)',
              color: 'var(--color-text-secondary)',
              margin: 0,
              opacity: 0.7,
            }}>Capture anywhere. Syncs straight to your repo.</p>
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '2.5rem' }}>
            <img
              src={`${import.meta.env.BASE_URL}screenshot-repos.webp`}
              alt="Gitty repo selector"
              width={220}
              height={428}
              style={{
                borderRadius: '1.25rem',
                width: '100%',
                height: 'auto',
                boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
                border: '1px solid var(--color-border)',
                display: 'block',
              }}
            />
            <p style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--text-label)',
              color: 'var(--color-text-secondary)',
              margin: 0,
              opacity: 0.7,
            }}>Switch repos instantly</p>
          </div>
        </div>
      </section>

      <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', margin: '0 1.5rem' }} />

      {/* Roadmap teaser */}
      <section
        style={{
          padding: '5rem 1.5rem',
          maxWidth: '480px',
          margin: '0 auto',
        }}
      >
        <SectionLabel>What's coming</SectionLabel>

        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {plannedItems.map((item, i) => (
            <li
              key={item.id}
              style={{
                paddingBottom: i < plannedItems.length - 1 ? '2rem' : 0,
                borderBottom: i < plannedItems.length - 1 ? '1px solid var(--color-border)' : 'none',
                marginBottom: i < plannedItems.length - 1 ? '2rem' : 0,
              }}
            >
              <p
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 'var(--text-body)',
                  fontWeight: 600,
                  color: 'var(--color-text-primary)',
                  margin: '0 0 0.4rem',
                }}
              >
                {item.title}
              </p>
              <p
                style={{
                  fontSize: 'var(--text-body)',
                  lineHeight: 1.55,
                  color: 'var(--color-text-secondary)',
                  margin: 0,
                }}
              >
                {item.description}
              </p>
            </li>
          ))}
        </ul>
      </section>

      {/* Footer */}
      <footer
        style={{
          borderTop: '1px solid var(--color-border)',
          padding: '2rem 1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          maxWidth: '480px',
          margin: '0 auto',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--text-label)',
            color: 'var(--color-text-secondary)',
            opacity: 0.6,
          }}
        >
          Built in public. Wir bauen das zusammen.
        </span>
        <a
          href="https://github.com/tholo91/code-tasks"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            fontSize: 'var(--text-label)',
            color: 'var(--color-text-secondary)',
            textDecoration: 'none',
            cursor: 'pointer',
            transition: 'color 150ms ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-text-primary)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-text-secondary)')}
          aria-label="View Gitty on GitHub"
        >
          <GitHubIcon />
          GitHub
        </a>
      </footer>

    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 'var(--text-label)',
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: 'var(--color-text-secondary)',
        marginBottom: '2.25rem',
        opacity: 0.7,
      }}
    >
      {children}
    </p>
  )
}

function GitHubIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
    </svg>
  )
}
