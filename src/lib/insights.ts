import { average, filterByRange, round1, sortRoundsDesc } from './stats';
import type { Round } from '../types';

/**
 * Generates one short AI-style insight based on recent round history.
 * Deterministic from data so the same rounds always yield a stable insight.
 */
export function generateInsight(rounds: Round[]): string {
  if (rounds.length < 2) {
    return 'Play a few more rounds to unlock personalized performance insights.';
  }

  const sorted = sortRoundsDesc(rounds);
  const candidates: { weight: number; text: string }[] = [];

  // Putting trend (last 5 vs previous 5)
  const last5 = sorted.slice(0, 5);
  const prev5 = sorted.slice(5, 10);
  if (last5.length >= 3 && prev5.length >= 3) {
    const recentPutts = average(last5.map((r) => r.putts));
    const olderPutts = average(prev5.map((r) => r.putts));
    const delta = round1(olderPutts - recentPutts);
    if (Math.abs(delta) >= 0.5) {
      candidates.push({
        weight: Math.abs(delta) * 2,
        text:
          delta > 0
            ? `Your putting average has improved by ${delta} strokes over the last ${last5.length} rounds.`
            : `Your putting average has risen by ${Math.abs(delta)} strokes over the last ${last5.length} rounds — worth a practice focus.`,
      });
    }
  }

  // Par 5 opportunities (approx: better relative on longer courses)
  const shortCourses = sorted.filter((r) => r.yardage < 6500);
  const longCourses = sorted.filter((r) => r.yardage >= 6500);
  if (shortCourses.length >= 3 && longCourses.length >= 3) {
    const shortAvg = average(shortCourses.map((r) => r.score - r.par));
    const longAvg = average(longCourses.map((r) => r.score - r.par));
    if (shortAvg < longAvg - 0.5) {
      candidates.push({
        weight: longAvg - shortAvg,
        text: 'You tend to score better on courses shorter than 6,500 yards.',
      });
    } else if (longAvg < shortAvg - 0.5) {
      candidates.push({
        weight: shortAvg - longAvg,
        text: 'You hold up well on longer tracks — length is not your primary scoring barrier.',
      });
    }
  }

  // FIR trend
  if (last5.length >= 3 && prev5.length >= 3) {
    const recentFir = average(last5.map((r) => r.fir));
    const olderFir = average(prev5.map((r) => r.fir));
    const delta = round1(recentFir - olderFir);
    if (Math.abs(delta) >= 5) {
      candidates.push({
        weight: Math.abs(delta) / 5,
        text:
          delta > 0
            ? `FIR has increased by ${delta}% compared to your previous ${prev5.length} rounds.`
            : `FIR has dropped by ${Math.abs(delta)}% versus your previous ${prev5.length} rounds.`,
      });
    }
  }

  // GIR trend (percent points)
  if (last5.length >= 3 && prev5.length >= 3) {
    const recentGir = average(last5.map((r) => r.gir));
    const olderGir = average(prev5.map((r) => r.gir));
    const delta = round1(recentGir - olderGir);
    if (Math.abs(delta) >= 3) {
      candidates.push({
        weight: Math.abs(delta) / 3,
        text:
          delta > 0
            ? `GIR is up ${delta} percentage points over your last ${last5.length} rounds.`
            : `GIR is down ${Math.abs(delta)} percentage points recently — approach play may unlock lower scores.`,
      });
    }
  }

  // Best scoring opportunities: front vs back 9
  const recent10 = sorted.slice(0, 10);
  if (recent10.length >= 5) {
    const frontAvg = average(recent10.map((r) => r.front9));
    const backAvg = average(recent10.map((r) => r.back9));
    const gap = round1(Math.abs(frontAvg - backAvg));
    if (gap >= 1) {
      candidates.push({
        weight: gap,
        text:
          frontAvg < backAvg
            ? `Your front nine is stronger by ${gap} strokes on average — finishing holes are your biggest scoring opportunity.`
            : `Your back nine is stronger by ${gap} strokes — a steadier start could shave strokes fast.`,
      });
    }
  }

  // Personal best momentum
  const pb = Math.min(...sorted.map((r) => r.score));
  const recentPb = sorted.slice(0, 5).some((r) => r.score === pb);
  if (recentPb) {
    candidates.push({
      weight: 3,
      text: `You posted a personal-best ${pb} recently — momentum is on your side.`,
    });
  }

  // Course type: average relative on most-played
  const byCourse = new Map<string, Round[]>();
  for (const round of sorted.slice(0, 15)) {
    const list = byCourse.get(round.courseName) ?? [];
    list.push(round);
    byCourse.set(round.courseName, list);
  }
  let bestCourse: { name: string; rel: number } | null = null;
  for (const [name, list] of byCourse) {
    if (list.length < 2) continue;
    const rel = average(list.map((r) => r.score - r.par));
    if (!bestCourse || rel < bestCourse.rel) {
      bestCourse = { name, rel };
    }
  }
  if (bestCourse && bestCourse.rel < 12) {
    candidates.push({
      weight: 1.5,
      text: `${bestCourse.name} is currently your strongest venue (+${round1(bestCourse.rel)} to par).`,
    });
  }

  // Par-related: use relative score vs yardage proxy for "Par 5" style insight
  const longHoleProxy = sorted.slice(0, 10);
  if (longHoleProxy.length >= 5) {
    const highYard = longHoleProxy.filter((r) => r.yardage >= 7000);
    if (highYard.length >= 2) {
      candidates.push({
        weight: 1.2,
        text: 'Your best scoring opportunities are on Par 5 holes — prioritize second-shot strategy for birdie looks.',
      });
    }
  }

  // Score trend overall (filterByRange returns newest first)
  const trend10 = filterByRange(rounds, '10');
  if (trend10.length >= 6) {
    const newest = average(trend10.slice(0, 3).map((r) => r.score));
    const oldest = average(trend10.slice(-3).map((r) => r.score));
    const improvement = round1(oldest - newest);
    if (improvement >= 1.5) {
      candidates.push({
        weight: improvement,
        text: `Your scoring has improved by ${improvement} strokes comparing your last 3 rounds to earlier play.`,
      });
    }
  }

  if (candidates.length === 0) {
    return 'Your game is stable — look for one focus area (putts, GIR, or FIR) to create the next scoring breakthrough.';
  }

  candidates.sort((a, b) => b.weight - a.weight);
  // Pick top insight, with slight rotation based on most recent round id for variety
  const recentId = sorted[0]?.id ?? '';
  const idx =
    recentId.split('').reduce((s, c) => s + c.charCodeAt(0), 0) %
    Math.min(3, candidates.length);
  return candidates[idx].text;
}
