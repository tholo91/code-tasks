import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { roadmapData } from '../../../data/roadmap';
import { RoadmapItem, RoadmapStatus } from '../../../types/roadmap';
import { pageVariants, TRANSITION_NORMAL } from '../../../config/motion';

interface RoadmapViewProps {
  onClose: () => void;
}

const statusLabel: Record<RoadmapStatus, string> = {
  'in-progress': 'In Arbeit',
  'planned': 'Geplant',
  'shipped': 'Umgesetzt'
};

const statusBadgeClass: Record<RoadmapStatus, string> = {
  'in-progress': 'badge badge-amber',
  'planned': 'badge badge-blue',
  'shipped': 'badge badge-green',
};

export function RoadmapView({ onClose }: RoadmapViewProps) {
  const [showShipped, setShowShipped] = useState(false);

  const inProgress = roadmapData.filter(item => item.status === 'in-progress');
  const planned = roadmapData.filter(item => item.status === 'planned');
  const shipped = roadmapData.filter(item => item.status === 'shipped');

  if (roadmapData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center min-h-[300px]">
        <p className="text-body" style={{ color: 'var(--color-text-secondary)' }}>
          Wir planen gerade &mdash; schau bald wieder rein!
        </p>
        <button
          onClick={onClose}
          className="mt-4 text-body font-semibold underline"
          style={{ color: 'var(--color-accent)' }}
        >
          Zurück
        </button>
      </div>
    );
  }

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="flex flex-col w-full max-w-[640px] px-4 py-6 gap-6"
    >
      <header className="flex items-center justify-between">
        <h2 className="text-title font-bold">Gitty Roadmap</h2>
        <button
          onClick={onClose}
          aria-label="Close roadmap"
          className="p-2 rounded-full hover:bg-[rgba(255,255,255,0.05)]"
          style={{ minWidth: '44px', minHeight: '44px' }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </header>

      <section className="flex flex-col gap-4">
        {inProgress.length > 0 && (
          <div className="flex flex-col gap-3">
            <h3 className="text-label font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-secondary)' }}>
              In Arbeit
            </h3>
            {inProgress.map(item => <RoadmapCard key={item.id} item={item} />)}
          </div>
        )}

        {planned.length > 0 && (
          <div className="flex flex-col gap-3">
            <h3 className="text-label font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-secondary)' }}>
              Geplant
            </h3>
            {planned.map(item => <RoadmapCard key={item.id} item={item} />)}
          </div>
        )}

        {shipped.length > 0 && (
          <div className="flex flex-col gap-3 mt-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
            <button
              onClick={() => setShowShipped(!showShipped)}
              className="flex items-center justify-between py-4 text-label font-semibold"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              <span>{statusLabel.shipped} ({shipped.length})</span>
              <svg
                width="16" height="16" viewBox="0 0 16 16" fill="currentColor"
                style={{
                  transform: showShipped ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform var(--duration-fast)',
                }}
              >
                <path d="M4.427 7.427l3.396 3.396a.25.25 0 00.354 0l3.396-3.396A.25.25 0 0011.396 7H4.604a.25.25 0 00-.177.427z" />
              </svg>
            </button>
            <AnimatePresence>
              {showShipped && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={TRANSITION_NORMAL}
                  className="flex flex-col gap-3 overflow-hidden pb-4"
                >
                  {shipped.map(item => <RoadmapCard key={item.id} item={item} isShipped />)}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </section>
    </motion.div>
  );
}

function RoadmapCard({ item, isShipped }: { item: RoadmapItem; isShipped?: boolean }) {
  return (
    <div
      className="card p-4 flex flex-col gap-2"
      style={{ opacity: isShipped ? 0.7 : 1 }}
    >
      <div className="flex items-start justify-between gap-4">
        <h4 className="text-body font-semibold leading-snug">{item.title}</h4>
        <span className={statusBadgeClass[item.status]}>
          {isShipped && <span className="mr-1">✓</span>}
          {statusLabel[item.status]}
        </span>
      </div>
      <p className="text-label line-clamp-3" style={{ color: 'var(--color-text-secondary)' }}>
        {item.description}
      </p>
      {item.category && (
        <span
          className="text-caption self-start px-1.5 py-0.5 rounded"
          style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: 'var(--color-text-secondary)' }}
        >
          {item.category}
        </span>
      )}
    </div>
  );
}
