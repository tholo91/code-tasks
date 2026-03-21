export function AuthSkeleton() {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center"
      role="status"
      aria-label="Loading application"
      style={{ backgroundColor: 'var(--color-canvas)' }}
    >
      {/* Ambient glow behind the icon */}
      <div
        className="absolute"
        style={{
          width: 200,
          height: 200,
          background: 'radial-gradient(circle, rgba(88, 166, 255, 0.08) 0%, transparent 70%)',
          filter: 'blur(40px)',
          animation: 'splash-glow 2.5s ease-in-out infinite alternate',
        }}
      />

      {/* Fox mascot icon */}
      <img
        src="/pwa-192x192.png"
        alt=""
        width={80}
        height={80}
        style={{
          animation: 'splash-fade-in 0.6s ease-out both',
          borderRadius: 20,
        }}
      />

      {/* App name */}
      <h1
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '1.75rem',
          fontWeight: 600,
          color: 'var(--color-text-primary)',
          marginTop: 20,
          letterSpacing: '-0.02em',
          animation: 'splash-fade-in 0.6s ease-out 0.15s both',
        }}
      >
        Gitty
      </h1>

      {/* Slogan */}
      <p
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 'var(--text-label)',
          color: 'var(--color-text-secondary)',
          marginTop: 8,
          letterSpacing: '0.04em',
          animation: 'splash-fade-in 0.6s ease-out 0.3s both',
        }}
      >
        capture it. ship it.
      </p>

      {/* Loading dots */}
      <div
        className="flex items-center gap-1.5"
        style={{
          marginTop: 32,
          animation: 'splash-fade-in 0.6s ease-out 0.5s both',
        }}
      >
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              width: 4,
              height: 4,
              borderRadius: '50%',
              backgroundColor: 'var(--color-accent)',
              opacity: 0.6,
              animation: `splash-dot 1.2s ease-in-out ${i * 0.15}s infinite`,
            }}
          />
        ))}
      </div>

      <style>{`
        @keyframes splash-fade-in {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes splash-dot {
          0%, 60%, 100% {
            opacity: 0.3;
            transform: scale(1);
          }
          30% {
            opacity: 1;
            transform: scale(1.4);
          }
        }

        @keyframes splash-glow {
          from {
            opacity: 0.5;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1.1);
          }
        }
      `}</style>
    </div>
  )
}
