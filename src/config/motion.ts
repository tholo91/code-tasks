import type { Variants, Transition } from 'framer-motion'

export const TRANSITION_FAST: Transition = {
  duration: 0.15,
  ease: [0.2, 0.8, 0.2, 1],
}

export const TRANSITION_NORMAL: Transition = {
  duration: 0.3,
  ease: [0.2, 0.8, 0.2, 1],
}

export const TRANSITION_SPRING: Transition = {
  type: 'spring',
  stiffness: 400,
  damping: 30,
}

export const pageVariants: Variants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: TRANSITION_NORMAL },
  exit: { opacity: 0, y: -12, transition: TRANSITION_FAST },
}

export const listContainerVariants: Variants = {
  animate: {
    transition: { staggerChildren: 0.04 },
  },
}

export const listItemVariants: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: TRANSITION_NORMAL },
}

export const successFlash: Variants = {
  initial: { opacity: 0, scale: 0.6 },
  animate: { opacity: 1, scale: 1, transition: TRANSITION_SPRING },
  exit: { opacity: 0, scale: 0.6, transition: TRANSITION_FAST },
}
