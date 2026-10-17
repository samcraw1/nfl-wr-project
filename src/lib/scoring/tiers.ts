/**
 * Tiered point functions, ported verbatim from legacy/formula.py.
 * Thresholds and comparison operators are intentionally unchanged.
 */

export function yacPoints(yac: number): number {
  if (yac >= 50) return 5;
  if (yac >= 30) return 3;
  if (yac >= 15) return 1;
  return 0;
}

export function receivingYardsPoints(receivingYards: number): number {
  if (receivingYards >= 150) return 5;
  if (receivingYards >= 100) return 3;
  if (receivingYards >= 50) return 1;
  return 0;
}

export function receivingTdsPoints(receivingTds: number): number {
  if (receivingTds >= 2) return 5;
  if (receivingTds >= 1) return 3;
  return 0;
}

export function receptionsPoints(receptions: number): number {
  if (receptions >= 7) return 5;
  if (receptions >= 5) return 3;
  if (receptions >= 3) return 1;
  return 0;
}

export function targetsPoints(targets: number): number {
  if (targets >= 10) return 5;
  if (targets >= 7) return 3;
  if (targets >= 4) return 1;
  return 0;
}

export function targetSharePoints(targetShare: number): number {
  if (targetShare >= 0.3) return 5;
  if (targetShare >= 0.2) return 3;
  if (targetShare >= 0.1) return 1;
  return 0;
}

export function receivingAirYardsPoints(airYards: number): number {
  if (airYards >= 150) return 5;
  if (airYards >= 100) return 3;
  if (airYards >= 50) return 1;
  return 0;
}

export function receivingFirstDownsPoints(firstDowns: number): number {
  if (firstDowns >= 6) return 5;
  if (firstDowns >= 4) return 3;
  if (firstDowns >= 2) return 1;
  return 0;
}

export function receivingFumblesLostPoints(fumblesLost: number): number {
  if (fumblesLost >= 1) return -3;
  return 0;
}

export function receivingDropPoints(drops: number): number {
  if (drops >= 2) return -3;
  if (drops === 1) return -1;
  return 0;
}

// The functions below exist in the legacy formula module but are not part of
// wr_formula / total_score. Kept so the tiers are not lost.

export function rushingYardsPoints(rushingYards: number): number {
  if (rushingYards >= 100) return 5;
  if (rushingYards >= 50) return 3;
  if (rushingYards >= 25) return 2;
  if (rushingYards >= 1) return 1;
  return 0;
}

export function rushingTdsPoints(rushingTds: number): number {
  if (rushingTds >= 2) return 5;
  if (rushingTds >= 1) return 3;
  if (rushingTds > 0) return 1;
  return 0;
}

export function kickoffReturnYardsPoints(kickoffReturnYards: number): number {
  if (kickoffReturnYards >= 100) return 5;
  if (kickoffReturnYards >= 50) return 3;
  if (kickoffReturnYards >= 25) return 2;
  if (kickoffReturnYards >= 1) return 1;
  return 0;
}

/** Covers both punt- and kickoff-return TDs; there is no kickoff-only TD column. */
export function specialTeamsTdsPoints(specialTeamsTds: number): number {
  if (specialTeamsTds >= 2) return 5;
  if (specialTeamsTds >= 1) return 3;
  return 0;
}
