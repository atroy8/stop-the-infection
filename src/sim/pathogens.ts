import type { PathogenDef, PathogenId } from './types'

export const PATHOGENS: Record<PathogenId, PathogenDef> = {
  flash: {
    id: 'flash',
    name: 'Flash',
    tagline: 'Fast respiratory · high early R',
    baseR: 1.78,
    visibilityRate: 0.44,
    severity: 0.1,
    asymptomaticBias: 0.12,
    description:
      'Hits hard and early. Visible cases track truth faster. Closures and messaging punch above weight — wait too long and hospitals spike before Trust is spent well.',
  },
  shadow: {
    id: 'shadow',
    name: 'Shadow',
    tagline: 'Stealth · severity · fog',
    baseR: 1.4,
    visibilityRate: 0.15,
    severity: 0.14,
    asymptomaticBias: 0.52,
    description:
      'Slower, nastier, quieter. Tracing and sentinel are MVPs. Closures without data look like overreach. False calm precedes a hospital cliff.',
  },
}
