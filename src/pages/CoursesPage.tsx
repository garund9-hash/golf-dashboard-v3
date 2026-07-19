import { useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { useGolf } from '../context/GolfContext';
import { getCourseRankings, getCourseStats } from '../lib/stats';
import type { CourseSortKey, CourseStats } from '../types';

type SortDir = 'asc' | 'desc';

export function CoursesPage() {
  const { rounds } = useGolf();
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<CourseSortKey>('rounds');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [minRounds, setMinRounds] = useState<'all' | '2' | '3' | '5'>('all');

  const allStats = useMemo(() => getCourseStats(rounds), [rounds]);
  const rankings = useMemo(() => getCourseRankings(allStats), [allStats]);

  const filtered = useMemo(() => {
    let list = [...allStats];

    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (s) =>
          s.courseName.toLowerCase().includes(q) ||
          s.location.toLowerCase().includes(q),
      );
    }

    if (minRounds !== 'all') {
      const n = Number(minRounds);
      list = list.filter((s) => s.rounds >= n);
    }

    list.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      let cmp = 0;
      if (typeof av === 'string' && typeof bv === 'string') {
        cmp = av.localeCompare(bv);
      } else {
        cmp = Number(av) - Number(bv);
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return list;
  }, [allStats, search, sortKey, sortDir, minRounds]);

  function toggleSort(key: CourseSortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(
        key === 'courseName' || key === 'bestScore' || key === 'averageScore'
          ? 'asc'
          : 'desc',
      );
    }
  }

  function sortIndicator(key: CourseSortKey) {
    if (sortKey !== key) return '';
    return sortDir === 'asc' ? ' ↑' : ' ↓';
  }

  return (
    <div>
      <header className="page-header">
        <div>
          <h1>Course Statistics</h1>
          <p className="subtitle">
            Performance by venue · rankings, search, sort &amp; filter
          </p>
        </div>
      </header>

      <section className="ranking-grid" aria-label="Course rankings">
        <RankCard
          label="Most played"
          primary={rankings.mostPlayed[0]}
          list={rankings.mostPlayed}
          formatItem={(s) => `${s.rounds} rounds`}
        />
        <RankCard
          label="Lowest average"
          primary={rankings.lowestAvg[0]}
          list={rankings.lowestAvg}
          formatItem={(s) => `avg ${s.averageScore}`}
        />
        <RankCard
          label="Most improved"
          primary={rankings.mostImproved[0]}
          list={rankings.mostImproved}
          formatItem={(s) => `−${s.improvement} strokes`}
        />
        <article className="card rank-card">
          <div className="rank-label">Favorite course</div>
          {rankings.favorite ? (
            <>
              <div className="rank-name">{rankings.favorite.courseName}</div>
              <div className="rank-meta">
                Based on round count · {rankings.favorite.rounds} rounds · last{' '}
                {format(parseISO(rankings.favorite.lastPlayed), 'MMM d, yyyy')}
              </div>
            </>
          ) : (
            <div className="rank-meta">Not enough data</div>
          )}
        </article>
      </section>

      <div className="toolbar">
        <input
          type="search"
          className="search-input"
          placeholder="Search courses or locations…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search courses"
        />
        <select
          className="select-input"
          value={minRounds}
          onChange={(e) => setMinRounds(e.target.value as typeof minRounds)}
          aria-label="Filter by minimum rounds"
        >
          <option value="all">All courses</option>
          <option value="2">2+ rounds</option>
          <option value="3">3+ rounds</option>
          <option value="5">5+ rounds</option>
        </select>
        <select
          className="select-input"
          value={`${sortKey}:${sortDir}`}
          onChange={(e) => {
            const [k, d] = e.target.value.split(':') as [CourseSortKey, SortDir];
            setSortKey(k);
            setSortDir(d);
          }}
          aria-label="Sort courses"
        >
          <option value="rounds:desc">Most played</option>
          <option value="averageScore:asc">Lowest average</option>
          <option value="bestScore:asc">Best score</option>
          <option value="lastPlayed:desc">Recently played</option>
          <option value="courseName:asc">Name A–Z</option>
        </select>
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th className="sortable" onClick={() => toggleSort('courseName')}>
                Course{sortIndicator('courseName')}
              </th>
              <th className="sortable" onClick={() => toggleSort('rounds')}>
                Rounds{sortIndicator('rounds')}
              </th>
              <th className="sortable" onClick={() => toggleSort('bestScore')}>
                Best{sortIndicator('bestScore')}
              </th>
              <th className="sortable" onClick={() => toggleSort('averageScore')}>
                Average{sortIndicator('averageScore')}
              </th>
              <th>Low F9</th>
              <th>Low B9</th>
              <th>Best putts</th>
              <th>Best GIR</th>
              <th>Best FIR</th>
              <th className="sortable" onClick={() => toggleSort('lastPlayed')}>
                Last played{sortIndicator('lastPlayed')}
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={10} style={{ textAlign: 'center', color: 'var(--muted)' }}>
                  No courses match your filters.
                </td>
              </tr>
            ) : (
              filtered.map((s) => (
                <tr key={s.courseId}>
                  <td className="course-cell">
                    <strong>{s.courseName}</strong>
                    <span>
                      {s.location}
                      {s.yardage ? ` · ${s.yardage.toLocaleString()} yds` : ''}
                    </span>
                  </td>
                  <td className="mono">{s.rounds}</td>
                  <td className="mono">{s.bestScore}</td>
                  <td className="mono">{s.averageScore}</td>
                  <td className="mono">{s.lowestFront9}</td>
                  <td className="mono">{s.lowestBack9}</td>
                  <td className="mono">{s.bestPutting}</td>
                  <td className="mono">{s.bestGir}%</td>
                  <td className="mono">{s.bestFir}%</td>
                  <td className="mono">
                    {format(parseISO(s.lastPlayed), 'MMM d, yyyy')}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RankCard({
  label,
  primary,
  list,
  formatItem,
}: {
  label: string;
  primary?: CourseStats;
  list: CourseStats[];
  formatItem: (s: CourseStats) => string;
}) {
  return (
    <article className="card rank-card">
      <div className="rank-label">{label}</div>
      {primary ? (
        <>
          <div className="rank-name">{primary.courseName}</div>
          <div className="rank-meta">{formatItem(primary)}</div>
          {list.length > 1 && (
            <ul className="rank-list">
              {list.slice(1).map((s, i) => (
                <li key={s.courseId}>
                  <span>
                    {i + 2}. {s.courseName}
                  </span>
                  <span className="mono" style={{ color: 'var(--muted)' }}>
                    {formatItem(s)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : (
        <div className="rank-meta">Not enough data</div>
      )}
    </article>
  );
}
