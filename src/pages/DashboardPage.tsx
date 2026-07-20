import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { useGolf } from '../context/GolfContext';
import { generateInsight } from '../lib/insights';
import {
  getDashboardSummary,
  goalPercent,
  sortRoundsDesc,
  toRelativeScore,
} from '../lib/stats';
import { RoundForm } from '../components/rounds/RoundForm';
import type { Round } from '../types';
import {
  CalendarIcon,
  ChartIcon,
  DownloadIcon,
  MapIcon,
  PlusIcon,
  SparkIcon,
  TargetIcon,
  TransferIcon,
  TrophyIcon,
} from '../components/layout/Icons';

function formatPct(n: number): string {
  const v = Number.isFinite(n) ? n : 0;
  return `${Number.isInteger(v) ? v : Math.round(v * 10) / 10}%`;
}

export function DashboardPage() {
  const {
    rounds,
    profile,
    addRound,
    updateRound,
    deleteRound,
    pushToast,
  } = useGolf();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Round | null>(null);

  const summary = useMemo(
    () => getDashboardSummary(rounds, profile),
    [rounds, profile],
  );

  const insight = useMemo(() => generateInsight(rounds), [rounds]);
  const recent = summary.recentRound;
  const recentList = useMemo(() => sortRoundsDesc(rounds), [rounds]);

  const knownCourses = useMemo(
    () => [...new Set(rounds.map((r) => r.courseName))],
    [rounds],
  );

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(round: Round) {
    setEditing(round);
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditing(null);
  }

  function handleSubmit(round: Round) {
    if (editing) {
      updateRound(round);
      pushToast({
        type: 'success',
        title: '라운드 수정됨',
        message: `${round.courseName} · ${round.score} (${round.date})`,
      });
    } else {
      addRound(round);
      pushToast({
        type: 'success',
        title: '라운드 저장됨',
        message: `${round.courseName} · ${round.score} (${round.date})`,
      });
    }
    closeForm();
  }

  function handleDelete(round: Round) {
    const ok = window.confirm(
      `${round.date} · ${round.courseName} (${round.score}) 라운드를 삭제할까요?`,
    );
    if (!ok) return;
    deleteRound(round.id);
    if (editing?.id === round.id) closeForm();
    pushToast({
      type: 'info',
      title: '라운드 삭제됨',
      message: `${round.courseName} · ${round.score}`,
    });
  }

  return (
    <div>
      <header className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p className="subtitle">
            Today&apos;s golf summary · {format(new Date(), 'EEEE, MMMM d, yyyy')}
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={openCreate}>
          <PlusIcon />
          라운드 입력
        </button>
      </header>

      {formOpen && (
        <section
          className="card card-pad round-form-panel"
          aria-labelledby="round-form-heading"
        >
          <div className="round-form-header">
            <h2 className="card-title" id="round-form-heading">
              {editing ? '라운드 수정' : '새 라운드 입력'}
            </h2>
            <p className="round-form-hint">
              Front 9 + Back 9로 총 스코어가 자동 계산됩니다. GIR·FIR은 퍼센트(0–100)로
              입력하세요.
            </p>
          </div>
          <RoundForm
            mode={editing ? 'edit' : 'create'}
            initial={editing}
            knownCourses={knownCourses}
            onSubmit={handleSubmit}
            onCancel={closeForm}
          />
        </section>
      )}

      <section className="card insight-card" aria-labelledby="insight-heading">
        <div className="insight-label" id="insight-heading">
          <SparkIcon />
          Today&apos;s Insight
        </div>
        <p className="insight-text">{insight}</p>
        <p className="insight-meta">
          Generated from your recent rounds · updates after every new score
        </p>
      </section>

      <section className="stat-grid" aria-label="Key stats">
        <article className="card stat-card">
          <div className="accent-bar" />
          <div className="label">Current Handicap</div>
          <div className="value">{summary.handicap.toFixed(1)}</div>
          <div className="hint">Goal {profile.goalHandicap.toFixed(1)}</div>
        </article>

        <article className="card stat-card">
          <div className="accent-bar" />
          <div className="label">Average Score</div>
          <div className="value">{summary.averageScore || '—'}</div>
          <div className="hint">Last 10 rounds</div>
        </article>

        <article className="card stat-card">
          <div className="accent-bar" />
          <div className="label">Recent Round</div>
          <div className="value">{recent?.score ?? '—'}</div>
          <div className="hint">
            {recent
              ? `${recent.courseName.split(' ').slice(0, 2).join(' ')} · ${format(parseISO(recent.date), 'MMM d')}`
              : 'No rounds yet'}
          </div>
        </article>

        <article className="card stat-card">
          <div className="accent-bar" />
          <div className="label">Monthly Rounds</div>
          <div className="value">{summary.monthlyStats.rounds}</div>
          <div className="hint">{summary.monthlyStats.month}</div>
        </article>
      </section>

      <div className="dashboard-grid">
        <div className="section-stack">
          <section className="card card-pad">
            <div className="card-title-row">
              <h2 className="card-title" style={{ marginBottom: 0 }}>
                Recent Round
              </h2>
              {recent && (
                <div className="inline-actions">
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => openEdit(recent)}
                  >
                    수정
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => handleDelete(recent)}
                  >
                    삭제
                  </button>
                </div>
              )}
            </div>
            {recent ? (
              <div className="recent-round" style={{ marginTop: '0.85rem' }}>
                <div>
                  <div
                    style={{
                      color: 'var(--muted)',
                      fontSize: '0.88rem',
                      marginBottom: '0.35rem',
                    }}
                  >
                    {recent.courseName} ·{' '}
                    {format(parseISO(recent.date), 'MMMM d, yyyy')}
                  </div>
                  <div className="recent-score-row">
                    <div className="big-score">{recent.score}</div>
                    <span className="score-rel">
                      {toRelativeScore(recent.score, recent.par)}
                    </span>
                  </div>
                  {recent.notes && (
                    <p
                      style={{
                        marginTop: '0.5rem',
                        color: 'var(--ink-soft)',
                        fontSize: '0.9rem',
                      }}
                    >
                      {recent.notes}
                    </p>
                  )}
                </div>
                <div className="meta-grid">
                  <div className="meta-chip">
                    <div className="k">Front 9</div>
                    <div className="v">{recent.front9}</div>
                  </div>
                  <div className="meta-chip">
                    <div className="k">Back 9</div>
                    <div className="v">{recent.back9}</div>
                  </div>
                  <div className="meta-chip">
                    <div className="k">Putts</div>
                    <div className="v">{recent.putts}</div>
                  </div>
                  <div className="meta-chip">
                    <div className="k">GIR</div>
                    <div className="v">{formatPct(recent.gir)}</div>
                  </div>
                  <div className="meta-chip">
                    <div className="k">FIR</div>
                    <div className="v">{formatPct(recent.fir)}</div>
                  </div>
                  <div className="meta-chip">
                    <div className="k">Yardage</div>
                    <div className="v">{recent.yardage.toLocaleString()}</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="empty-state">
                <p>아직 라운드가 없습니다.</p>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ marginTop: '0.75rem' }}
                  onClick={openCreate}
                >
                  <PlusIcon /> 첫 라운드 입력
                </button>
              </div>
            )}
          </section>

          <section className="card card-pad">
            <div className="card-title-row">
              <h2 className="card-title" style={{ marginBottom: 0 }}>
                Round History
                {recentList.length > 0 && (
                  <span className="card-title-count">{recentList.length}</span>
                )}
              </h2>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={openCreate}
              >
                <PlusIcon /> 추가
              </button>
            </div>
            {recentList.length === 0 ? (
              <p className="empty-state">기록된 라운드가 없습니다.</p>
            ) : (
              <div
                className="table-wrap table-wrap-scroll"
                style={{ marginTop: '0.85rem' }}
              >
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Course</th>
                      <th>Score</th>
                      <th>GIR</th>
                      <th>FIR</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {recentList.map((r) => (
                      <tr key={r.id}>
                        <td className="mono">
                          {format(parseISO(r.date), 'MMM d, yyyy')}
                        </td>
                        <td className="course-cell">
                          <strong>{r.courseName}</strong>
                        </td>
                        <td className="mono">{r.score}</td>
                        <td className="mono">{formatPct(r.gir)}</td>
                        <td className="mono">{formatPct(r.fir)}</td>
                        <td>
                          <div className="inline-actions">
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              onClick={() => openEdit(r)}
                            >
                              수정
                            </button>
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              onClick={() => handleDelete(r)}
                            >
                              삭제
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="card card-pad">
            <h2 className="card-title">Monthly Statistics</h2>
            <p
              style={{
                color: 'var(--muted)',
                fontSize: '0.88rem',
                marginBottom: '1rem',
              }}
            >
              {summary.monthlyStats.month}
            </p>
            <div className="month-stats">
              <div className="month-stat">
                <div className="n">{summary.monthlyStats.rounds}</div>
                <div className="l">Rounds</div>
              </div>
              <div className="month-stat">
                <div className="n">
                  {summary.monthlyStats.rounds
                    ? summary.monthlyStats.averageScore
                    : '—'}
                </div>
                <div className="l">Avg Score</div>
              </div>
              <div className="month-stat">
                <div className="n">
                  {summary.monthlyStats.rounds
                    ? summary.monthlyStats.bestScore
                    : '—'}
                </div>
                <div className="l">Best Score</div>
              </div>
            </div>
          </section>
        </div>

        <div className="section-stack">
          <section className="card card-pad">
            <h2 className="card-title">
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                }}
              >
                <TargetIcon /> Goal Progress
              </span>
            </h2>
            <div className="goal-list">
              {summary.goalProgress.map((goal) => {
                const pct = goalPercent(goal);
                return (
                  <div key={goal.id} className="goal-item">
                    <div className="goal-head">
                      <strong>{goal.label}</strong>
                      <span>
                        {goal.current}
                        {goal.unit === '%' ? '%' : ''} / {goal.target}
                        {goal.unit === '%' ? '%' : ` ${goal.unit}`}
                      </span>
                    </div>
                    <div
                      className="progress-track"
                      role="progressbar"
                      aria-valuenow={pct}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`${goal.label} progress`}
                    >
                      <div
                        className={`progress-fill ${goal.id === 'handicap' ? 'gold' : ''}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="card card-pad">
            <h2 className="card-title">Quick Actions</h2>
            <div className="quick-actions">
              <button type="button" className="action-btn" onClick={openCreate}>
                <span className="icon">
                  <PlusIcon />
                </span>
                라운드 입력
              </button>
              <Link to="/trends" className="action-btn">
                <span className="icon">
                  <ChartIcon />
                </span>
                View trends
              </Link>
              <Link to="/courses" className="action-btn">
                <span className="icon">
                  <MapIcon />
                </span>
                Course stats
              </Link>
              <Link to="/import-export" className="action-btn">
                <span className="icon">
                  <DownloadIcon />
                </span>
                Export data
              </Link>
              <Link to="/import-export" className="action-btn">
                <span className="icon">
                  <TransferIcon />
                </span>
                Import CSV
              </Link>
              <div
                className="action-btn"
                style={{ cursor: 'default', opacity: 0.9 }}
              >
                <span className="icon">
                  <TrophyIcon />
                </span>
                PB: {rounds.length ? Math.min(...rounds.map((r) => r.score)) : '—'}
              </div>
              <div
                className="action-btn"
                style={{ cursor: 'default', opacity: 0.9 }}
              >
                <span className="icon">
                  <CalendarIcon />
                </span>
                {rounds.length} total rounds
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
