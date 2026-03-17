interface BaseSettingsMenuItemProps {
  icon: React.ReactNode
  label: string
  testId?: string
}

type SettingsMenuItemProps =
  | (BaseSettingsMenuItemProps & { onClick: () => void; href?: never })
  | (BaseSettingsMenuItemProps & { href: string; onClick?: never })

const itemClass =
  'flex items-center justify-between rounded-lg px-3 py-3 transition-colors hover:opacity-80 min-h-[44px] w-full'
const itemStyle = { backgroundColor: 'var(--color-canvas)' } as const

const ChevronRight = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 12 12"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    style={{ color: 'var(--color-text-secondary)' }}
  >
    <path d="M4 2L8 6L4 10" />
  </svg>
)

const ExternalLinkIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ color: 'var(--color-text-secondary)' }}
  >
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <polyline points="15 3 21 3 21 9" />
    <line x1="10" y1="14" x2="21" y2="3" />
  </svg>
)

export function SettingsMenuItem({ icon, label, testId, ...props }: SettingsMenuItemProps) {
  const content = (
    <>
      <div className="flex items-center gap-3">
        {icon}
        <span className="text-body font-medium" style={{ color: 'var(--color-text-primary)' }}>
          {label}
        </span>
      </div>
      {'href' in props ? <ExternalLinkIcon /> : <ChevronRight />}
    </>
  )

  if ('href' in props && props.href) {
    return (
      <a
        href={props.href}
        target="_blank"
        rel="noopener noreferrer"
        className={itemClass}
        style={itemStyle}
        data-testid={testId}
      >
        {content}
      </a>
    )
  }

  return (
    <button
      onClick={props.onClick}
      className={itemClass}
      style={itemStyle}
      data-testid={testId}
    >
      {content}
    </button>
  )
}
