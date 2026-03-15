export function AuthSkeleton() {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center gap-4"
      role="status"
      aria-label="Loading application"
    >
      <div
        className="h-10 w-10 animate-spin rounded-full border-4 border-current border-t-transparent"
        style={{ color: 'var(--color-accent)' }}
      />
      <p
        className="text-body"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        Loading...
      </p>
    </div>
  )
}
