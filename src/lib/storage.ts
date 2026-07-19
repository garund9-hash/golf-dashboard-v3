import { profile as seedProfile, seedRounds } from '../data/seed';
import type { PlayerProfile, Round } from '../types';

/** Bump version to pick up new seed rounds */
const ROUNDS_KEY = 'golf-dashboard-v3-rounds-v3';
const PROFILE_KEY = 'golf-dashboard-v3-profile-v3';
const LEGACY_KEYS = [
  'golf-dashboard-v3-rounds',
  'golf-dashboard-v3-profile',
  'golf-dashboard-v3-rounds-v2',
  'golf-dashboard-v3-profile-v2',
];

function clearLegacy(): void {
  for (const key of LEGACY_KEYS) {
    localStorage.removeItem(key);
  }
}

/**
 * Runtime guard for round records read from LocalStorage. A same-origin script
 * or browser extension could write arbitrary shapes to these keys; validating
 * before trusting keeps malformed data out of stats/insights math.
 */
function isRound(x: unknown): x is Round {
  if (!x || typeof x !== 'object') return false;
  const r = x as Record<string, unknown>;
  return (
    typeof r.id === 'string' &&
    typeof r.date === 'string' &&
    typeof r.courseId === 'string' &&
    typeof r.courseName === 'string' &&
    typeof r.score === 'number' &&
    typeof r.par === 'number' &&
    typeof r.front9 === 'number' &&
    typeof r.back9 === 'number' &&
    typeof r.putts === 'number' &&
    typeof r.gir === 'number' &&
    typeof r.fir === 'number' &&
    typeof r.yardage === 'number' &&
    (r.notes === undefined || typeof r.notes === 'string')
  );
}

/** Runtime guard for the player profile read from LocalStorage. */
function isProfile(x: unknown): x is PlayerProfile {
  if (!x || typeof x !== 'object') return false;
  const p = x as Record<string, unknown>;
  return (
    typeof p.name === 'string' &&
    typeof p.handicap === 'number' &&
    typeof p.goalHandicap === 'number' &&
    Array.isArray(p.goals)
  );
}

export function loadRounds(): Round[] {
  clearLegacy();
  try {
    const raw = localStorage.getItem(ROUNDS_KEY);
    if (!raw) {
      saveRounds(seedRounds);
      return [...seedRounds];
    }
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [...seedRounds];
    return parsed.filter(isRound);
  } catch {
    return [...seedRounds];
  }
}

export function saveRounds(rounds: Round[]): void {
  localStorage.setItem(ROUNDS_KEY, JSON.stringify(rounds));
}

export function loadProfile(): PlayerProfile {
  clearLegacy();
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) {
      saveProfile(seedProfile);
      return { ...seedProfile, goals: seedProfile.goals.map((g) => ({ ...g })) };
    }
    const stored = JSON.parse(raw) as unknown;
    // Fall back to default if the stored shape is invalid or empty-state
    if (!isProfile(stored) || !stored.name) {
      return { ...seedProfile, goals: seedProfile.goals.map((g) => ({ ...g })) };
    }
    return stored;
  } catch {
    return { ...seedProfile, goals: seedProfile.goals.map((g) => ({ ...g })) };
  }
}

export function saveProfile(profile: PlayerProfile): void {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

export function resetData(): void {
  clearLegacy();
  saveRounds(seedRounds);
  saveProfile(seedProfile);
}
