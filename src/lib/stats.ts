import {
  endOfMonth,
  format,
  parseISO,
  startOfMonth,
  startOfYear,
  isWithinInterval,
} from 'date-fns';
import type {
  CourseStats,
  DashboardSummary,
  Goal,
  PlayerProfile,
  Round,
  TrendRange,
} from '../types';
import { courses } from '../data/seed';

export function sortRoundsDesc(rounds: Round[]): Round[] {
  return [...rounds].sort((a, b) => b.date.localeCompare(a.date));
}

export function sortRoundsAsc(rounds: Round[]): Round[] {
  return [...rounds].sort((a, b) => a.date.localeCompare(b.date));
}

export function average(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((s, n) => s + n, 0) / nums.length;
}

export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function estimateHandicap(rounds: Round[]): number {
  const sorted = sortRoundsDesc(rounds);
  const differentials = sorted
    .slice(0, 20)
    .map((r) => ((r.score - r.par) * 113) / 113)
    .sort((a, b) => a - b);

  if (differentials.length === 0) return 0;
  const count = Math.min(8, Math.max(1, Math.floor(differentials.length * 0.4)));
  return round1(average(differentials.slice(0, count)));
}

export function filterByRange(rounds: Round[], range: TrendRange): Round[] {
  const sorted = sortRoundsDesc(rounds);
  const now = new Date();

  switch (range) {
    case '5':
      return sorted.slice(0, 5);
    case '10':
      return sorted.slice(0, 10);
    case '20':
      return sorted.slice(0, 20);
    case 'year': {
      const start = startOfYear(now);
      return sorted.filter((r) => parseISO(r.date) >= start);
    }
    case 'all':
    default:
      return sorted;
  }
}

export function getDashboardSummary(
  rounds: Round[],
  profile: PlayerProfile,
): DashboardSummary {
  const sorted = sortRoundsDesc(rounds);
  const recent = sorted[0] ?? null;
  const last10 = sorted.slice(0, 10);
  const avgScore = round1(average(last10.map((r) => r.score)));
  const handicap = estimateHandicap(rounds);

  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const monthRounds = sorted.filter((r) =>
    isWithinInterval(parseISO(r.date), { start: monthStart, end: monthEnd }),
  );

  const goals = recomputeGoals(rounds, profile, handicap, avgScore);

  return {
    handicap,
    averageScore: avgScore,
    recentRound: recent,
    goalProgress: goals,
    monthlyStats: {
      month: format(now, 'MMMM yyyy'),
      rounds: monthRounds.length,
      averageScore: round1(average(monthRounds.map((r) => r.score))),
      bestScore:
        monthRounds.length > 0
          ? Math.min(...monthRounds.map((r) => r.score))
          : 0,
    },
  };
}

function recomputeGoals(
  rounds: Round[],
  profile: PlayerProfile,
  handicap: number,
  avgScore: number,
): Goal[] {
  const last10 = sortRoundsDesc(rounds).slice(0, 10);
  const putts = round1(average(last10.map((r) => r.putts)));
  const girPct = round1(average(last10.map((r) => r.gir)));

  return profile.goals.map((g) => {
    if (g.id === 'handicap') return { ...g, current: handicap };
    if (g.id === 'avg-score') return { ...g, current: avgScore };
    if (g.id === 'putts') return { ...g, current: putts };
    if (g.id === 'gir') return { ...g, current: girPct };
    return g;
  });
}

export function goalPercent(goal: Goal): number {
  if (goal.direction === 'lower') {
    // Progress toward lower target: better when current is closer to/below target
    const baseline = goal.target * 1.5;
    const span = baseline - goal.target;
    if (span <= 0) return goal.current <= goal.target ? 100 : 0;
    const progress = ((baseline - goal.current) / span) * 100;
    return Math.min(100, Math.max(0, Math.round(progress)));
  }
  // higher is better
  if (goal.target <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((goal.current / goal.target) * 100)));
}

export function getTrendSeries(rounds: Round[], range: TrendRange) {
  const filtered = sortRoundsAsc(filterByRange(rounds, range));
  let best = Infinity;
  let runningSum = 0;

  return filtered.map((round, i) => {
    runningSum += round.score;
    if (round.score < best) best = round.score;
    const rollingWindow = filtered.slice(Math.max(0, i - 4), i + 1);
    return {
      date: round.date,
      label: format(parseISO(round.date), 'MMM d'),
      score: round.score,
      handicapDiff: round1(round.score - round.par),
      rollingAvg: round1(average(rollingWindow.map((r) => r.score))),
      bestSoFar: best === Infinity ? null : best,
      putts: round.putts,
      gir: round.gir,
      fir: round.fir,
      isPersonalBest: round.score === best,
      courseName: round.courseName,
    };
  });
}

export function getCourseStats(rounds: Round[]): CourseStats[] {
  const byCourse = new Map<string, Round[]>();

  for (const round of rounds) {
    const list = byCourse.get(round.courseId) ?? [];
    list.push(round);
    byCourse.set(round.courseId, list);
  }

  const stats: CourseStats[] = [];

  for (const [courseId, courseRounds] of byCourse) {
    const course = courses.find((c) => c.id === courseId);
    const sorted = sortRoundsAsc(courseRounds);
    const scores = courseRounds.map((r) => r.score);
    const half = Math.max(1, Math.floor(sorted.length / 2));
    const firstHalf = sorted.slice(0, half);
    const secondHalf = sorted.slice(-half);
    const firstAvg = average(firstHalf.map((r) => r.score));
    const recentAvg = average(secondHalf.map((r) => r.score));

    stats.push({
      courseId,
      courseName: course?.name ?? courseRounds[0].courseName,
      location: course?.location ?? '',
      yardage: course?.yardage ?? courseRounds[0].yardage,
      par: course?.par ?? courseRounds[0].par,
      rounds: courseRounds.length,
      bestScore: Math.min(...scores),
      averageScore: round1(average(scores)),
      lowestFront9: Math.min(...courseRounds.map((r) => r.front9)),
      lowestBack9: Math.min(...courseRounds.map((r) => r.back9)),
      bestPutting: Math.min(...courseRounds.map((r) => r.putts)),
      bestGir: round1(Math.max(...courseRounds.map((r) => r.gir))),
      bestFir: round1(Math.max(...courseRounds.map((r) => r.fir))),
      lastPlayed: sortRoundsDesc(courseRounds)[0].date,
      firstAvg: round1(firstAvg),
      recentAvg: round1(recentAvg),
      improvement: round1(firstAvg - recentAvg),
    });
  }

  return stats;
}

export function getCourseRankings(stats: CourseStats[]) {
  const mostPlayed = [...stats].sort((a, b) => b.rounds - a.rounds).slice(0, 3);
  const lowestAvg = [...stats]
    .filter((s) => s.rounds >= 2)
    .sort((a, b) => a.averageScore - b.averageScore)
    .slice(0, 3);
  const mostImproved = [...stats]
    .filter((s) => s.rounds >= 3 && (s.improvement ?? 0) > 0)
    .sort((a, b) => (b.improvement ?? 0) - (a.improvement ?? 0))
    .slice(0, 3);
  const favorite = mostPlayed[0] ?? null;

  return { mostPlayed, lowestAvg, mostImproved, favorite };
}

export function toRelativeScore(score: number, par: number): string {
  const diff = score - par;
  if (diff === 0) return 'E';
  return diff > 0 ? `+${diff}` : `${diff}`;
}
