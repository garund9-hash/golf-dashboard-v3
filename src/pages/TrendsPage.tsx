import { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useGolf } from '../context/GolfContext';
import {
  average,
  filterByRange,
  getTrendSeries,
  round1,
  sortRoundsDesc,
} from '../lib/stats';
import type { TrendRange } from '../types';

const RANGES: { value: TrendRange; label: string }[] = [
  { value: '5', label: 'Last 5' },
  { value: '10', label: 'Last 10' },
  { value: '20', label: 'Last 20' },
  { value: 'year', label: 'This year' },
  { value: 'all', label: 'All time' },
];

const tooltipStyle = {
  background: '#fbf8f2',
  border: '1px solid rgba(12,47,36,0.12)',
  borderRadius: 10,
  fontSize: 12,
  boxShadow: '0 8px 24px rgba(12,47,36,0.08)',
};

export function TrendsPage() {
  const { rounds } = useGolf();
  const [range, setRange] = useState<TrendRange>('10');

  const series = useMemo(() => getTrendSeries(rounds, range), [rounds, range]);
  const filtered = useMemo(() => filterByRange(rounds, range), [rounds, range]);

  const summary = useMemo(() => {
    if (filtered.length === 0) {
      return { avg: 0, best: 0, worst: 0, hcpTrend: 0, pbCount: 0 };
    }
    const scores = filtered.map((r) => r.score);
    const best = Math.min(...scores);
    const sortedAsc = [...sortRoundsDesc(filtered)].reverse();
    let runningBest = Infinity;
    let pbCount = 0;
    for (const r of sortedAsc) {
      if (r.score < runningBest) {
        runningBest = r.score;
        pbCount += 1;
      }
    }
    const newest = average(filtered.slice(0, Math.min(3, filtered.length)).map((r) => r.score - r.par));
    const oldest = average(
      filtered.slice(-Math.min(3, filtered.length)).map((r) => r.score - r.par),
    );
    return {
      avg: round1(average(scores)),
      best,
      worst: Math.max(...scores),
      hcpTrend: round1(oldest - newest),
      pbCount,
    };
  }, [filtered]);

  const personalBests = series.filter((p) => p.isPersonalBest);

  return (
    <div>
      <header className="page-header">
        <div>
          <h1>Performance Trends</h1>
          <p className="subtitle">
            Visualize scoring, handicap differential, and personal bests
          </p>
        </div>
        <div className="range-pills" role="tablist" aria-label="Time range">
          {RANGES.map((r) => (
            <button
              key={r.value}
              type="button"
              role="tab"
              aria-selected={range === r.value}
              className={`range-pill ${range === r.value ? 'active' : ''}`}
              onClick={() => setRange(r.value)}
            >
              {r.label}
            </button>
          ))}
        </div>
      </header>

      <section className="trend-summary" aria-label="Trend summary">
        <article className="card stat-card">
          <div className="accent-bar" />
          <div className="label">Avg Score</div>
          <div className="value">{series.length ? summary.avg : '—'}</div>
          <div className="hint">{filtered.length} rounds in range</div>
        </article>
        <article className="card stat-card">
          <div className="accent-bar" />
          <div className="label">Best Score</div>
          <div className="value">{series.length ? summary.best : '—'}</div>
          <div className="hint">
            {summary.pbCount > 0 ? (
              <span className="pb-badge">PB markers on chart</span>
            ) : (
              'In selected range'
            )}
          </div>
        </article>
        <article className="card stat-card">
          <div className="accent-bar" />
          <div className="label">Rolling Form</div>
          <div className="value">
            {series.length ? series[series.length - 1].rollingAvg : '—'}
          </div>
          <div className="hint">5-round rolling average</div>
        </article>
        <article className="card stat-card">
          <div className="accent-bar" />
          <div className="label">Diff Trend</div>
          <div className="value">
            {series.length
              ? summary.hcpTrend > 0
                ? `↓ ${summary.hcpTrend}`
                : summary.hcpTrend < 0
                  ? `↑ ${Math.abs(summary.hcpTrend)}`
                  : '0'
              : '—'}
          </div>
          <div className="hint">To-par change (early → recent)</div>
        </article>
      </section>

      {series.length === 0 ? (
        <div className="card card-pad empty-state">
          No rounds in this range. Try a wider window or import scores.
        </div>
      ) : (
        <>
          <div className="chart-grid">
            <section className="card card-pad chart-card">
              <h2 className="card-title">Handicap trend</h2>
              <p className="chart-legend">
                <span>
                  <span className="legend-dot" style={{ background: '#c4a035' }} />
                  Score to par (differential proxy)
                </span>
              </p>
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="hcpFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#c4a035" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#c4a035" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(12,47,36,0.08)" strokeDasharray="3 3" />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: '#6b7a72', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: '#6b7a72', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={36}
                    reversed
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value) => [`+${value}`, 'To par']}
                    labelFormatter={(_, payload) =>
                      payload?.[0]?.payload?.courseName
                        ? `${payload[0].payload.label} · ${payload[0].payload.courseName}`
                        : ''
                    }
                  />
                  <Area
                    type="monotone"
                    dataKey="handicapDiff"
                    stroke="#c4a035"
                    strokeWidth={2.5}
                    fill="url(#hcpFill)"
                    name="To par"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </section>

            <section className="card card-pad chart-card">
              <h2 className="card-title">Average score trend</h2>
              <p className="chart-legend">
                <span>
                  <span className="legend-dot" style={{ background: '#1f6b4a' }} />
                  Round score
                </span>
                <span>
                  <span className="legend-dot" style={{ background: '#2a5f8f' }} />
                  Rolling avg
                </span>
              </p>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="rgba(12,47,36,0.08)" strokeDasharray="3 3" />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: '#6b7a72', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    domain={['dataMin - 2', 'dataMax + 2']}
                    tick={{ fill: '#6b7a72', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={36}
                    reversed
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value, name) => [value, name === 'score' ? 'Score' : 'Rolling avg']}
                  />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="#1f6b4a"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: '#1f6b4a' }}
                    activeDot={{ r: 5 }}
                    name="score"
                  />
                  <Line
                    type="monotone"
                    dataKey="rollingAvg"
                    stroke="#2a5f8f"
                    strokeWidth={2}
                    strokeDasharray="5 4"
                    dot={false}
                    name="rollingAvg"
                  />
                  {personalBests.map((pb) => (
                    <ReferenceDot
                      key={`pb-${pb.date}-${pb.score}`}
                      x={pb.label}
                      y={pb.score}
                      r={6}
                      fill="#c4a035"
                      stroke="#0c2f24"
                      strokeWidth={1.5}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </section>
          </div>

          <div className="chart-grid">
            <section className="card card-pad chart-card">
              <h2 className="card-title">
                Best score progression
                <span className="pb-badge">Personal best</span>
              </h2>
              <p className="chart-legend">
                Running best score over the selected range (lower is better)
              </p>
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="bestFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#1f6b4a" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#1f6b4a" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(12,47,36,0.08)" strokeDasharray="3 3" />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: '#6b7a72', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    domain={['dataMin - 2', 'dataMax + 2']}
                    tick={{ fill: '#6b7a72', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={36}
                    reversed
                  />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Area
                    type="stepAfter"
                    dataKey="bestSoFar"
                    stroke="#1f6b4a"
                    strokeWidth={2.5}
                    fill="url(#bestFill)"
                    name="Best so far"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </section>

            <section className="card card-pad chart-card">
              <h2 className="card-title">Rolling average score</h2>
              <p className="chart-legend">
                5-round rolling mean with personal best markers
              </p>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="rgba(12,47,36,0.08)" strokeDasharray="3 3" />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: '#6b7a72', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    domain={['dataMin - 1', 'dataMax + 1']}
                    tick={{ fill: '#6b7a72', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={36}
                    reversed
                  />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Line
                    type="monotone"
                    dataKey="rollingAvg"
                    stroke="#134433"
                    strokeWidth={3}
                    dot={(props) => {
                      const { cx, cy, payload } = props;
                      if (payload?.isPersonalBest) {
                        return (
                          <circle
                            key={`dot-${payload.date}`}
                            cx={cx}
                            cy={cy}
                            r={6}
                            fill="#c4a035"
                            stroke="#0c2f24"
                            strokeWidth={1.5}
                          />
                        );
                      }
                      return (
                        <circle
                          key={`dot-${payload?.date ?? cx}`}
                          cx={cx}
                          cy={cy}
                          r={3}
                          fill="#134433"
                        />
                      );
                    }}
                    name="Rolling avg"
                  />
                </LineChart>
              </ResponsiveContainer>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
