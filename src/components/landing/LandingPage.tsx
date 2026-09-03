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
        <section className="mx-auto grid items-center gap-8 px-5 py-8 md:grid-cols-[1.1fr_.9fr] md:gap-10 md:py-16" style={{ maxWidth: MAX_WIDTH, minHeight: 'min(720px, 86svh)' }}>
          <div>
            <div className="mb-7 flex items-center gap-3">
              <img src={logoUrl} alt="Gitty" className="h-8 w-8 rounded-lg" />
              <span className="font-mono text-label uppercase tracking-[0.14em]" style={{ color: 'var(--color-accent)' }}>A mobile repo inbox for AI coding</span>
            </div>
            <h1 className="max-w-[18ch] font-mono font-bold tracking-tight md:max-w-[20ch]" style={{ fontSize: 'clamp(2rem, 8vw, 4.25rem)', lineHeight: 1.02, letterSpacing: '-0.04em' }}>
              <span className="block md:inline">Capture now.</span>{' '}
              <span className="block md:inline">Hand it to your</span>{' '}
              <span className="block md:inline">coding agent later.</span>
            </h1>
            <p className="mt-6 max-w-[62ch] text-body leading-7" style={{ color: 'var(--color-text-secondary)' }}>
              Gitty saves your rough ideas locally first, then syncs them to the right GitHub repository as plain Markdown — ready for Claude Code, Codex, Cursor, or Gemini when you are.
            </p>
            <p className="mt-4 max-w-[58ch] border-l-2 pl-3 font-mono text-label leading-5" style={{ borderColor: 'var(--color-accent)', color: 'var(--color-text-secondary)' }}>
              Saved on your phone first. Synced in the background to a dedicated branch in the right GitHub repo.
            </p>
            {showAuth ? (
              <div className="mt-7"><AuthForm onSuccess={onSuccess} layout="inline" /></div>
            ) : (
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <button type="button" className="btn-primary w-full px-5 sm:w-auto" onClick={() => setShowAuth(true)}>Connect a repository</button>
                <a href={REPO_URL} target="_blank" rel="noopener noreferrer" className="btn-ghost inline-flex min-h-[44px] w-full items-center justify-center border px-5 no-underline sm:w-auto" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}>View on GitHub</a>
              </div>
            )}
            <p className="mt-5 font-mono text-label" style={{ color: 'var(--color-text-secondary)' }}>Free and open source · Offline-first · No Gitty database</p>
          </div>
          <CapturePreview />
        </section>

        <section className="mx-auto px-5 py-16" style={{ maxWidth: MAX_WIDTH }}>
          <p className="font-mono text-label uppercase tracking-[0.12em]" style={{ color: 'var(--color-accent)' }}>How it works</p>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <Step n="01" title="Capture">Write it down on your phone and choose the repository.</Step>
            <Step n="02" title="Sync">Gitty saves locally first, then syncs to a dedicated GitHub branch.</Step>
            <Step n="03" title="Pick up">When you are ready, ask your coding agent: “Check my Gitty inbox.” Filed and Done updates return to your phone.</Step>
          </div>
        </section>

        <section className="mx-auto grid gap-8 px-5 pb-16 md:grid-cols-2" style={{ maxWidth: MAX_WIDTH }}>
          <Screenshot src={REPO_SCREENSHOT} alt="Selecting a GitHub repository in Gitty" />
          <div className="flex flex-col justify-center rounded-2xl border p-6 font-mono text-sm" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}>
            <span style={{ color: 'var(--color-text-secondary)' }}>phone capture</span>
            <span className="my-3" style={{ color: 'var(--color-accent)' }}>↓</span>
            <code>branch: gitty/&lt;username&gt;</code>
            <code className="mt-1">file: captured-ideas-&lt;username&gt;.md</code>
            <span className="my-3" style={{ color: 'var(--color-accent)' }}>↓</span>
            <code>Check my Gitty inbox</code>
          </div>
        </section>

        <section className="border-t px-5 py-14" style={{ borderColor: 'var(--color-border)' }}>
          <div className="mx-auto flex flex-col items-start justify-between gap-6 md:flex-row md:items-center" style={{ maxWidth: MAX_WIDTH }}>
            <div><h2 className="font-mono text-2xl font-bold">Capture now. Pick it up later.</h2><p className="mt-2 text-body" style={{ color: 'var(--color-text-secondary)' }}>Saved locally first, then synced as plain Markdown to your GitHub repo.</p></div>
            <button type="button" className="btn-primary w-auto px-5" onClick={() => { setShowAuth(true); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>Connect a repository</button>
          </div>
        </section>
      </main>
    </div>
  )
}

function CapturePreview() {
  return <div className="rounded-2xl border p-4 shadow-2xl" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}><img src={TASK_SCREENSHOT} alt="Gitty capture inbox on a phone" className="mx-auto max-h-[430px] rounded-xl object-contain" /></div>
}

function Screenshot({ src, alt }: { src: string; alt: string }) {
  return <div className="rounded-2xl border p-4" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}><img src={src} alt={alt} className="mx-auto max-h-[540px] rounded-xl object-contain" /></div>
}

function Step({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return <article className="rounded-xl border p-5" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}><span className="font-mono text-label" style={{ color: 'var(--color-accent)' }}>{n}</span><h3 className="mt-4 font-mono text-xl font-bold">{title}</h3><p className="mt-2 text-body leading-6" style={{ color: 'var(--color-text-secondary)' }}>{children}</p></article>
}
