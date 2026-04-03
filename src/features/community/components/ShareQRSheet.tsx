import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import QRCode from 'qrcode'
import { BottomSheet } from '../../../components/ui/BottomSheet'
import { APP_URL, GITHUB_REPO_URL } from '../../../config/app'
import { TRANSITION_FAST, TRANSITION_NORMAL } from '../../../config/motion'

interface ShareQRSheetProps {
  onClose: () => void
}

type ShareTab = 'app' | 'github'

const TABS: { key: ShareTab; label: string; url: string }[] = [
  { key: 'app', label: 'App', url: APP_URL },
  { key: 'github', label: 'GitHub', url: GITHUB_REPO_URL },
]

/**
 * Bottom sheet with tabbed QR codes for sharing Gitty.
 * Shows App URL and GitHub repo URL tabs with copy-to-clipboard
 * and native Web Share API support.
 */
export function ShareQRSheet({ onClose }: ShareQRSheetProps) {
  const [activeTab, setActiveTab] = useState<ShareTab>('app')
  const [qrDataUrls, setQrDataUrls] = useState<Record<ShareTab, string>>({ app: '', github: '' })
  const [copied, setCopied] = useState(false)
  const prefersReducedMotion = useReducedMotion()

  const activeUrl = TABS.find((t) => t.key === activeTab)!.url

  // Generate QR codes on mount
  useEffect(() => {
    let cancelled = false
    async function generate() {
      const results: Record<string, string> = {}
      for (const tab of TABS) {
        try {
          results[tab.key] = await QRCode.toDataURL(tab.url, {
            width: 200,
            margin: 2,
            color: {
              dark: '#e6edf3',   // --color-text-primary (light on dark)
              light: '#00000000', // transparent background
            },
            errorCorrectionLevel: 'M',
          })
        } catch {
          results[tab.key] = ''
        }
      }
      if (!cancelled) {
        setQrDataUrls(results as Record<ShareTab, string>)
      }
    }
    generate()
    return () => { cancelled = true }
  }, [])

  // Copy URL to clipboard
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(activeUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea')
      textarea.value = activeUrl
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    }
  }, [activeUrl])

  // Native share via Web Share API
  const handleNativeShare = useCallback(async () => {
    if (!navigator.share) return
    try {
      await navigator.share({
        title: 'Gitty — Task capture for developers',
        text: 'Check out Gitty, a task capture app built for developers who think in repos.',
        url: activeUrl,
      })
    } catch {
      // User cancelled or share failed — no-op
    }
  }, [activeUrl])

  const canNativeShare = typeof navigator !== 'undefined' && !!navigator.share

  const tabTransition = prefersReducedMotion ? { duration: 0.1 } : TRANSITION_FAST
  const contentTransition = prefersReducedMotion ? { duration: 0.1 } : TRANSITION_NORMAL

  return (
    <BottomSheet onClose={onClose} ariaLabel="Share Gitty" testId="share-qr-sheet">
      {/* Title */}
      <h3
        className="text-lg font-bold text-center mb-4"
        style={{ color: 'var(--color-text-primary)' }}
      >
        Share Gitty
      </h3>

      {/* Tab switcher */}
      <div
        className="relative flex rounded-lg p-1 mb-5"
        style={{ backgroundColor: 'var(--color-canvas)' }}
        role="tablist"
        aria-label="Share URL type"
        data-testid="share-tab-list"
      >
        {TABS.map((tab) => (
          <button
            key={tab.key}
            role="tab"
            aria-selected={activeTab === tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="relative z-10 flex-1 py-2 text-sm font-semibold rounded-md transition-colors"
            style={{
              color: activeTab === tab.key
                ? 'var(--color-text-primary)'
                : 'var(--color-text-secondary)',
              minHeight: '44px',
            }}
            data-testid={`share-tab-${tab.key}`}
          >
            {tab.label}
          </button>
        ))}
        {/* Animated indicator */}
        <motion.div
          layout
          transition={tabTransition}
          className="absolute top-1 bottom-1 rounded-md"
          style={{
            width: 'calc(50% - 4px)',
            left: activeTab === 'app' ? '4px' : 'calc(50% + 0px)',
            backgroundColor: 'var(--color-surface)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
          }}
        />
      </div>

      {/* QR Code display */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={prefersReducedMotion ? {} : { opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={prefersReducedMotion ? {} : { opacity: 0, scale: 0.96 }}
          transition={contentTransition}
          className="flex flex-col items-center gap-3 mb-5"
        >
          {/* QR container */}
          <div
            className="flex items-center justify-center rounded-xl p-4"
            style={{
              backgroundColor: 'var(--color-canvas)',
              border: '1px solid var(--color-border)',
            }}
            data-testid={`share-qr-${activeTab}`}
          >
            {qrDataUrls[activeTab] ? (
              <img
                src={qrDataUrls[activeTab]}
                alt={`QR code for ${activeTab === 'app' ? 'Gitty app' : 'GitHub repository'}`}
                width={200}
                height={200}
                style={{ imageRendering: 'pixelated' }}
              />
            ) : (
              <div
                className="flex items-center justify-center"
                style={{ width: 200, height: 200, color: 'var(--color-text-secondary)' }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                </svg>
              </div>
            )}
          </div>

          {/* URL label */}
          <p
            className="text-xs text-center font-mono tracking-wide truncate max-w-full px-4"
            style={{ color: 'var(--color-text-secondary)', opacity: 0.7 }}
            data-testid={`share-url-${activeTab}`}
          >
            {activeUrl}
          </p>
        </motion.div>
      </AnimatePresence>

      {/* Action buttons */}
      <div className="flex flex-col gap-2.5">
        {/* Copy URL */}
        <button
          onClick={handleCopy}
          className="flex items-center justify-center gap-2.5 rounded-xl font-semibold text-body transition-opacity hover:opacity-90 active:opacity-80"
          style={{
            minHeight: '48px',
            backgroundColor: 'var(--color-accent)',
            color: 'var(--color-canvas)',
          }}
          data-testid="share-copy-button"
        >
          {copied ? (
            <>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M2.5 8L6.5 12L13.5 4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Copied!
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 010 1.5h-1.5a.25.25 0 00-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 00.25-.25v-1.5a.75.75 0 011.5 0v1.5A1.75 1.75 0 019.25 16h-7.5A1.75 1.75 0 010 14.25v-7.5z" />
                <path d="M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0114.25 11h-7.5A1.75 1.75 0 015 9.25v-7.5zm1.75-.25a.25.25 0 00-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 00.25-.25v-7.5a.25.25 0 00-.25-.25h-7.5z" />
              </svg>
              Copy URL
            </>
          )}
        </button>

        {/* Native share (if available) */}
        {canNativeShare && (
          <button
            onClick={handleNativeShare}
            className="flex items-center justify-center gap-2.5 rounded-xl text-body transition-colors hover:bg-[rgba(255,255,255,0.04)] active:bg-[rgba(255,255,255,0.06)]"
            style={{
              minHeight: '48px',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-secondary)',
            }}
            data-testid="share-native-button"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 0a.75.75 0 01.75.75v7.5a.75.75 0 01-1.5 0V.75A.75.75 0 018 0z" />
              <path d="M4.354 3.646a.5.5 0 010 .708L8 .707l3.646 3.647a.5.5 0 01-.708.707L8 2.121 5.061 5.061a.5.5 0 01-.707-.707l3.293-3.293a.5.5 0 01.707 0z" />
              <path d="M1.5 10A1.5 1.5 0 003 11.5h10a1.5 1.5 0 001.5-1.5V6A1.5 1.5 0 0013 4.5h-2a.75.75 0 000 1.5h2v4H3V6h2a.75.75 0 000-1.5H3A1.5 1.5 0 001.5 6v4z" />
            </svg>
            Share...
          </button>
        )}
      </div>
    </BottomSheet>
  )
}
