import { useEffect, useState } from 'react'
import { AuthForm } from '../../features/auth/components/AuthForm'
import { roadmapData } from '../../data/roadmap'
import logoUrl from '/maskable-icon-512x512-light.png'

interface LandingPageProps {
  onSuccess: () => void
}

const REPO_URL = 'https://github.com/tholo91/code-tasks'
const FEEDBACK_URL = 'https://www.heyspeak.io/l/dPAgTYLhiBV_veeNE8Tq1w'

const plannedItems = roadmapData.filter((item) => item.status === 'planned')

const problemPhrases = [
  'a notes app',
  'a voice memo',
  'a message to yourself',
  'a forgotten .md file',
  'twelve open browser tabs',
]

const mobileSteps = [
  { num: '01', text: 'Capture a task from your phone, mid-thought, in seconds.' },
  { num: '02', text: 'It syncs to your GitHub repo as clean, agent-ready markdown.' },
  { num: '03', text: "Claude Code, Cursor, Gemini, or Codex picks it up on its next run, and reports back when it's done." },
]

const communitySteps = [
  { num: '01', title: 'Star the repo', text: 'Two seconds, and it helps more than you would think.' },
  { num: '02', title: 'Grab an open story', text: 'Pick one from the board, open a PR against main.' },
  { num: '03', title: 'Tell us what is missing', text: 'Drop a 30-second voice note. We read every one.' },
]

const ideSteps = [
  { num: '01', text: 'Your agent pulls the freshest tasks from whichever branch they live on. No manual git fetch, no branch hunting.' },
  { num: '02', text: 'It briefs itself: open tasks grouped by priority, each with a one-line suggested approach.' },
  { num: '03', text: 'It handles the small ones, proposes a story for the bigger ones, and checks them off when done.' },
]

const MAX_WIDTH = '720px'

export function LandingPage({ onSuccess }: LandingPageProps) {
  const [activeTab, setActiveTab] = useState<'mobile' | 'ide'>('mobile')
  const [showAuth, setShowAuth] = useState(false)

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
          maxWidth: MAX_WIDTH,
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
          Capture coding ideas on your phone.<br />
          Let AI build them later.
        </h1>

        <p
          style={{
            fontSize: 'var(--text-body)',
            lineHeight: 1.65,
            color: 'var(--color-text-secondary)',
            marginBottom: '2.25rem',
            maxWidth: '46ch',
          }}
        >
          Gitty is the open-source, privacy-first inbox for AI coding tasks. Capture an idea in seconds, sync it to GitHub, and feed it straight to Claude Code, Gemini, or Codex on their next run.
        </p>

        {showAuth ? (
          <AuthForm onSuccess={onSuccess} layout="inline" />
        ) : (
          <div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
              <CtaButton variant="primary" onClick={() => setShowAuth(true)}>
                Use Gitty, free forever
              </CtaButton>
              <CtaButton variant="secondary" href={REPO_URL}>
                <GitHubIcon />
                Contribute on GitHub
              </CtaButton>
            </div>
            <p
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--text-label)',
                color: 'var(--color-text-secondary)',
                margin: '1rem 0 0',
                opacity: 0.6,
              }}
            >
              No sign-up. Connect your GitHub in about 30 seconds.
            </p>
          </div>
        )}

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.4rem 1rem',
            marginTop: '2rem',
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--text-label)',
            color: 'var(--color-text-secondary)',
            opacity: 0.7,
          }}
        >
          <span>Open source</span>
          <span aria-hidden="true">·</span>
          <span>No database</span>
          <span aria-hidden="true">·</span>
          <span>Works offline</span>
          <span aria-hidden="true">·</span>
          <span>Your ideas stay in your repo</span>
        </div>

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

      {/* Problem */}
      <section
        style={{
          padding: '5rem 1.5rem',
          maxWidth: MAX_WIDTH,
          margin: '0 auto',
        }}
      >
        <SectionLabel>The problem</SectionLabel>

        <h2
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 'clamp(1.5rem, 5vw, 2.25rem)',
            fontWeight: 700,
            lineHeight: 1.2,
            letterSpacing: '-0.01em',
            color: 'var(--color-text-primary)',
            margin: '0 0 2rem',
          }}
        >
          Your best ideas die in<br />
          <RotatingPhrase items={problemPhrases} />
        </h2>

        <p
          style={{
            fontSize: 'var(--text-body)',
            lineHeight: 1.7,
            color: 'var(--color-text-secondary)',
            margin: 0,
            maxWidth: '48ch',
          }}
        >
          The idea hits on a walk, in bed, on the train, never at your desk. By the time you are back at your machine, it is buried under tabs or gone for good. Your AI agent could have built it. It just never got the chance.
        </p>
      </section>

      <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', margin: '0 1.5rem' }} />

      {/* How it works - tabbed */}
      <section
        style={{
          padding: '5rem 1.5rem',
          maxWidth: MAX_WIDTH,
          margin: '0 auto',
        }}
      >
        <SectionLabel>How it works</SectionLabel>

        {/* Tab buttons */}
        <div
          style={{
            display: 'inline-flex',
            gap: '0.375rem',
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '0.75rem',
            padding: '0.25rem',
            marginBottom: '2.5rem',
          }}
        >
          {(['mobile', 'ide'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--text-label)',
                letterSpacing: '0.04em',
                padding: '0.4rem 0.9rem',
                borderRadius: '0.5rem',
                border: 'none',
                cursor: 'pointer',
                transition: 'background 150ms ease, color 150ms ease',
                background: activeTab === tab ? 'var(--color-accent)' : 'transparent',
                color: activeTab === tab ? '#ffffff' : 'var(--color-text-secondary)',
              }}
            >
              {tab === 'mobile' ? 'On mobile' : 'In your IDE'}
            </button>
          ))}
        </div>

        {activeTab === 'mobile' && (
          <ol style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {mobileSteps.map((step) => (
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
        )}

        {activeTab === 'ide' && (
          <>
            <p
              style={{
                fontSize: 'var(--text-body)',
                lineHeight: 1.7,
                color: 'var(--color-text-secondary)',
                margin: '0 0 2.25rem',
                maxWidth: '44ch',
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
              {ideSteps.map((step) => (
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
          </>
        )}
      </section>

      <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', margin: '0 1.5rem' }} />

      {/* Screenshots */}
      <section
        style={{
          padding: '5rem 1.5rem',
          maxWidth: MAX_WIDTH,
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
            maxWidth: '480px',
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
          maxWidth: MAX_WIDTH,
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

      <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', margin: '0 1.5rem' }} />

      {/* Community */}
      <section
        style={{
          padding: '5rem 1.5rem',
          maxWidth: MAX_WIDTH,
          margin: '0 auto',
        }}
      >
        <SectionLabel>Built in public</SectionLabel>

        <h2
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 'clamp(1.5rem, 5vw, 2.25rem)',
            fontWeight: 700,
            lineHeight: 1.2,
            letterSpacing: '-0.01em',
            color: 'var(--color-text-primary)',
            margin: '0 0 1.25rem',
          }}
        >
          Help us build the best idea inbox for AI developers.
        </h2>

        <p
          style={{
            fontSize: 'var(--text-body)',
            lineHeight: 1.7,
            color: 'var(--color-text-secondary)',
            margin: '0 0 2.75rem',
            maxWidth: '48ch',
          }}
        >
          We are not a startup. No database, no upsell, no account beyond your GitHub login. Gitty is open source and still evolving, and the roadmap is shaped by the people who use it daily. That could be you.
        </p>

        <ol style={{ listStyle: 'none', padding: 0, margin: '0 0 2.75rem' }}>
          {communitySteps.map((step) => (
            <li
              key={step.num}
              style={{
                display: 'flex',
                gap: '1.5rem',
                paddingBottom: '2rem',
                alignItems: 'flex-start',
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 'var(--text-label)',
                  color: 'var(--color-accent)',
                  letterSpacing: '0.06em',
                  paddingTop: '0.2rem',
                  flexShrink: 0,
                  opacity: 0.7,
                }}
              >
                {step.num}
              </span>
              <div>
                <p
                  style={{
                    fontSize: 'var(--text-body)',
                    fontWeight: 600,
                    color: 'var(--color-text-primary)',
                    margin: '0 0 0.3rem',
                  }}
                >
                  {step.title}
                </p>
                <p
                  style={{
                    fontSize: 'var(--text-body)',
                    lineHeight: 1.6,
                    color: 'var(--color-text-secondary)',
                    margin: 0,
                  }}
                >
                  {step.text}
                </p>
              </div>
            </li>
          ))}
        </ol>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
          <CtaButton variant="primary" href={REPO_URL}>
            <GitHubIcon />
            Contribute on GitHub
          </CtaButton>
          <CtaButton variant="secondary" href={FEEDBACK_URL}>
            Leave feedback
          </CtaButton>
        </div>
      </section>

      {/* Footer */}
      <footer
        style={{
          borderTop: '1px solid var(--color-border)',
          padding: '2rem 1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          maxWidth: MAX_WIDTH,
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
          Wir bauen das zusammen. · Open source
        </span>
        <a
          href={REPO_URL}
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

function CtaButton({
  children,
  variant,
  href,
  onClick,
}: {
  children: React.ReactNode
  variant: 'primary' | 'secondary'
  href?: string
  onClick?: () => void
}) {
  const isPrimary = variant === 'primary'
  const baseStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontFamily: 'var(--font-mono)',
    fontSize: 'var(--text-body)',
    fontWeight: 600,
    padding: '0.7rem 1.25rem',
    borderRadius: '0.6rem',
    cursor: 'pointer',
    textDecoration: 'none',
    transition: 'background 150ms ease, border-color 150ms ease, opacity 150ms ease',
    background: isPrimary ? 'var(--color-accent)' : 'transparent',
    color: isPrimary ? '#ffffff' : 'var(--color-text-primary)',
    border: isPrimary ? '1px solid var(--color-accent)' : '1px solid var(--color-border)',
  }

  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        style={baseStyle}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.85')}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
      >
        {children}
      </a>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      style={baseStyle}
      onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.85')}
      onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
    >
      {children}
    </button>
  )
}

function RotatingPhrase({ items }: { items: string[] }) {
  const [index, setIndex] = useState(0)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReduced) return

    const interval = setInterval(() => {
      setVisible(false)
      window.setTimeout(() => {
        setIndex((prev) => (prev + 1) % items.length)
        setVisible(true)
      }, 250)
    }, 2400)

    return () => clearInterval(interval)
  }, [items.length])

  return (
    <span
      style={{
        display: 'inline-block',
        color: 'var(--color-accent)',
        opacity: visible ? 1 : 0,
        transition: 'opacity 250ms ease',
      }}
    >
      {items[index]}
    </span>
  )
}

function GitHubIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
    </svg>
  )
}
