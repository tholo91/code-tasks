import { useState } from 'react'
import { AuthForm } from '../../features/auth/components/AuthForm'
import logoUrl from '/maskable-icon-512x512-light.png'

interface LandingPageProps { onSuccess: () => void }

const REPO_URL = 'https://github.com/tholo91/code-tasks'
const MAX_WIDTH = '1040px'
const TASK_SCREENSHOT = `${import.meta.env.BASE_URL}screenshot-tasks.webp`
const REPO_SCREENSHOT = `${import.meta.env.BASE_URL}screenshot-repos.webp`

export function LandingPage({ onSuccess }: LandingPageProps) {
  const [showAuth, setShowAuth] = useState(false)

  return (
    <div className="fixed inset-0 overflow-x-hidden overflow-y-auto" style={{ background: 'var(--color-canvas)', color: 'var(--color-text-primary)' }}>
      <main>
        <section className="mx-auto grid items-center gap-10 px-5 py-10 md:grid-cols-[1.1fr_.9fr] md:py-16" style={{ maxWidth: MAX_WIDTH, minHeight: 'min(760px, 88svh)' }}>
          <div>
            <div className="mb-7 flex items-center gap-3">
              <img src={logoUrl} alt="Gitty" className="h-8 w-8 rounded-lg" />
              <span className="font-mono text-label uppercase tracking-[0.14em]" style={{ color: 'var(--color-accent)' }}>Gitty · A mobile repo inbox for AI coding</span>
            </div>
            <h1 className="font-mono font-bold tracking-tight" style={{ fontSize: 'clamp(2.25rem, 6vw, 4.25rem)', lineHeight: 1.02 }}>
              Capture coding ideas on the go. Keep them in the repo.
            </h1>
            <p className="mt-6 max-w-[62ch] text-body leading-7" style={{ color: 'var(--color-text-secondary)' }}>
              Gitty syncs rough tasks to the right GitHub repository as plain Markdown, ready for Claude Code, Codex, Cursor, or Gemini when you are.
            </p>
            {showAuth ? (
              <div className="mt-7"><AuthForm onSuccess={onSuccess} layout="inline" /></div>
            ) : (
              <div className="mt-7 flex flex-wrap gap-3">
                <button type="button" className="btn-primary w-auto px-5" onClick={() => setShowAuth(true)}>Connect a repository</button>
                <a href={REPO_URL} target="_blank" rel="noopener noreferrer" className="btn-ghost inline-flex min-h-[44px] items-center border px-5 no-underline" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}>View on GitHub</a>
              </div>
            )}
            <p className="mt-5 font-mono text-label" style={{ color: 'var(--color-text-secondary)' }}>Free and open source · Offline-first · No Gitty database</p>
          </div>
          <RepoFlow />
        </section>

        <section className="border-y px-5 py-16" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}>
          <div className="mx-auto" style={{ maxWidth: MAX_WIDTH }}>
            <p className="font-mono text-label uppercase tracking-[0.12em]" style={{ color: 'var(--color-accent)' }}>The moment before the issue</p>
            <h2 className="mt-4 max-w-[20ch] font-mono text-3xl font-bold md:text-5xl">Before it is an issue, it is a thought.</h2>
            <p className="mt-5 max-w-[56ch] text-body leading-7" style={{ color: 'var(--color-text-secondary)' }}>Notes lose the repo. Issues ask for commitment. Gitty catches the thought in between.</p>
          </div>
        </section>

        <section className="mx-auto px-5 py-16" style={{ maxWidth: MAX_WIDTH }}>
          <p className="font-mono text-label uppercase tracking-[0.12em]" style={{ color: 'var(--color-accent)' }}>How it works</p>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <Step n="01" title="Capture">Pick a repository and save the thought in seconds.</Step>
            <Step n="02" title="Sync">Gitty saves locally first, then syncs to a dedicated GitHub branch.</Step>
            <Step n="03" title="Pick up">Ask your coding agent: “Check my Gitty inbox.” Filed and Done updates return to your phone.</Step>
          </div>
        </section>

        <section className="mx-auto grid gap-8 px-5 pb-16 md:grid-cols-2" style={{ maxWidth: MAX_WIDTH }}>
          <Screenshot src={TASK_SCREENSHOT} alt="Gitty capture inbox on a phone" />
          <div className="flex flex-col justify-center rounded-2xl border p-6 font-mono text-sm" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}>
            <span style={{ color: 'var(--color-text-secondary)' }}>phone capture</span>
            <span className="my-3" style={{ color: 'var(--color-accent)' }}>↓</span>
            <code>branch: gitty/&lt;user&gt;</code>
            <code className="mt-1">file: captured-ideas-&lt;user&gt;.md</code>
            <span className="my-3" style={{ color: 'var(--color-accent)' }}>↓</span>
            <code>Check my Gitty inbox</code>
          </div>
        </section>

        <section className="border-t px-5 py-14" style={{ borderColor: 'var(--color-border)' }}>
          <div className="mx-auto flex flex-col items-start justify-between gap-6 md:flex-row md:items-center" style={{ maxWidth: MAX_WIDTH }}>
            <div><h2 className="font-mono text-2xl font-bold">Your captures stay portable.</h2><p className="mt-2 text-body" style={{ color: 'var(--color-text-secondary)' }}>Plain Markdown in GitHub. Local-first capture. No Gitty user database.</p></div>
            <button type="button" className="btn-primary w-auto px-5" onClick={() => { setShowAuth(true); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>Connect a repository</button>
          </div>
        </section>
      </main>
    </div>
  )
}

function RepoFlow() {
  return <div className="rounded-2xl border p-4 shadow-2xl" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}><img src={REPO_SCREENSHOT} alt="Selecting a GitHub repository in Gitty" className="mx-auto max-h-[430px] rounded-xl object-contain" /></div>
}

function Screenshot({ src, alt }: { src: string; alt: string }) {
  return <div className="rounded-2xl border p-4" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}><img src={src} alt={alt} className="mx-auto max-h-[540px] rounded-xl object-contain" /></div>
}

function Step({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return <article className="rounded-xl border p-5" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}><span className="font-mono text-label" style={{ color: 'var(--color-accent)' }}>{n}</span><h3 className="mt-4 font-mono text-xl font-bold">{title}</h3><p className="mt-2 text-body leading-6" style={{ color: 'var(--color-text-secondary)' }}>{children}</p></article>
}
