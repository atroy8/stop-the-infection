import type { DistrictDef, DistrictId } from './types'

export const DISTRICT_ORDER: DistrictId[] = ['A', 'B', 'C', 'D', 'E']

export const DISTRICTS: Record<DistrictId, DistrictDef> = {
  A: {
    id: 'A',
    name: 'Gatewell Hub',
    type: 'Transit hub',
    population: 18000,
    density: 1.35,
    hospitalBeds: 260,
    trustBias: -5,
  },
  B: {
    id: 'B',
    name: 'Coreline',
    type: 'Dense core',
    population: 28000,
    density: 1.7,
    hospitalBeds: 560,
    trustBias: 0,
  },
  C: {
    id: 'C',
    name: 'Ashmere',
    type: 'Suburbs',
    population: 22000,
    density: 0.85,
    hospitalBeds: 260,
    trustBias: 5,
  },
  D: {
    id: 'D',
    name: 'Rivermark',
    type: 'Underserved',
    population: 20000,
    density: 1.25,
    hospitalBeds: 120,
    trustBias: -15,
  },
  E: {
    id: 'E',
    name: 'Forge Reach',
    type: 'Industrial fringe',
    population: 12000,
    density: 0.55,
    hospitalBeds: 90,
    trustBias: 0,
  },
}

export function cityPopulation(): number {
  return DISTRICT_ORDER.reduce((s, id) => s + DISTRICTS[id].population, 0)
}

export function totalBeds(): number {
  return DISTRICT_ORDER.reduce((s, id) => s + DISTRICTS[id].hospitalBeds, 0)
}
