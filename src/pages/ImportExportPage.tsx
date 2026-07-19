import { useMemo, useRef, useState, type DragEvent } from 'react';
import { useGolf } from '../context/GolfContext';
import {
  downloadCsv,
  exportRoundsCsv,
  exportStatsCsv,
  filterRoundsForExport,
  importRowsToRounds,
  parseImportCsv,
  type ExportFilters,
} from '../lib/csv';
import { getCourseStats } from '../lib/stats';
import type { ImportPreview } from '../types';
import { DownloadIcon, UploadIcon } from '../components/layout/Icons';

export function ImportExportPage() {
  const { rounds, addRounds, pushToast, resetToSeed } = useGolf();
  const fileRef = useRef<HTMLInputElement>(null);

  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [fileName, setFileName] = useState('');

  const courseNames = useMemo(() => {
    const set = new Set(rounds.map((r) => r.courseName));
    return [...set].sort();
  }, [rounds]);

  const years = useMemo(() => {
    const set = new Set(rounds.map((r) => r.date.slice(0, 4)));
    return [...set].sort().reverse();
  }, [rounds]);

  const [filters, setFilters] = useState<ExportFilters>({
    dateFrom: '',
    dateTo: '',
    courseName: 'all',
    season: 'all',
  });

  const exportCount = useMemo(
    () => filterRoundsForExport(rounds, filters).length,
    [rounds, filters],
  );

  function handleFileText(text: string, name: string) {
    setFileName(name);
    try {
      const result = parseImportCsv(text, rounds);
      setPreview(result);
      if (result.validCount === 0 && result.errors.length > 0) {
        pushToast({
          type: 'error',
          title: 'Import validation failed',
          message: `${result.errors.length} error(s) found. Fix the CSV and try again.`,
        });
      } else {
        pushToast({
          type: 'info',
          title: 'Preview ready',
          message: `${result.validCount} valid row(s), ${result.duplicates.length} duplicate(s), ${result.errors.length} error(s).`,
        });
      }
    } catch (e) {
      pushToast({
        type: 'error',
        title: 'Could not parse CSV',
        message: e instanceof Error ? e.message : 'Unknown parse error',
      });
      setPreview(null);
    }
  }

  function onFileSelected(file: File | null) {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.csv')) {
      pushToast({
        type: 'error',
        title: 'Invalid file',
        message: 'Please upload a .csv file.',
      });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      handleFileText(String(reader.result ?? ''), file.name);
    };
    reader.onerror = () => {
      pushToast({
        type: 'error',
        title: 'Read failed',
        message: 'Could not read the selected file.',
      });
    };
    reader.readAsText(file);
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    onFileSelected(file ?? null);
  }

  function confirmImport() {
    if (!preview || preview.rows.length === 0) {
      pushToast({
        type: 'error',
        title: 'Nothing to import',
        message: 'Load a valid CSV preview first.',
      });
      return;
    }

    const skipSet = skipDuplicates
      ? new Set(preview.duplicates)
      : new Set<number>();

    const newRounds = importRowsToRounds(preview.rows, skipSet, rounds);

    if (newRounds.length === 0) {
      pushToast({
        type: 'error',
        title: 'No new rounds',
        message: skipDuplicates
          ? 'All valid rows were duplicates or skipped.'
          : 'No rows could be imported.',
      });
      return;
    }

    addRounds(newRounds);
    pushToast({
      type: 'success',
      title: 'Import successful',
      message: `Imported ${newRounds.length} round(s)${
        skipDuplicates && preview.duplicates.length
          ? `, skipped ${preview.duplicates.length} duplicate(s)`
          : ''
      }.`,
    });
    setPreview(null);
    setFileName('');
    if (fileRef.current) fileRef.current.value = '';
  }

  function exportHistory() {
    const filtered = filterRoundsForExport(rounds, filters);
    if (filtered.length === 0) {
      pushToast({
        type: 'error',
        title: 'Export failed',
        message: 'No rounds match the selected filters.',
      });
      return;
    }
    try {
      const csv = exportRoundsCsv(filtered);
      downloadCsv(`golf-rounds-${new Date().toISOString().slice(0, 10)}.csv`, csv);
      pushToast({
        type: 'success',
        title: 'Export complete',
        message: `Downloaded ${filtered.length} round(s) as CSV.`,
      });
    } catch (e) {
      pushToast({
        type: 'error',
        title: 'Export failed',
        message: e instanceof Error ? e.message : 'Unknown error',
      });
    }
  }

  function exportStats() {
    const filtered = filterRoundsForExport(rounds, filters);
    if (filtered.length === 0) {
      pushToast({
        type: 'error',
        title: 'Export failed',
        message: 'No rounds match the selected filters.',
      });
      return;
    }
    try {
      const stats = getCourseStats(filtered).map((s) => ({
        courseName: s.courseName,
        rounds: s.rounds,
        bestScore: s.bestScore,
        averageScore: s.averageScore,
        lowestFront9: s.lowestFront9,
        lowestBack9: s.lowestBack9,
        bestPutting: s.bestPutting,
        bestGir: s.bestGir,
        bestFir: s.bestFir,
        lastPlayed: s.lastPlayed,
      }));
      const csv = exportStatsCsv(stats);
      downloadCsv(`golf-stats-${new Date().toISOString().slice(0, 10)}.csv`, csv);
      pushToast({
        type: 'success',
        title: 'Statistics exported',
        message: `Downloaded stats for ${stats.length} course(s).`,
      });
    } catch (e) {
      pushToast({
        type: 'error',
        title: 'Export failed',
        message: e instanceof Error ? e.message : 'Unknown error',
      });
    }
  }

  function downloadTemplate() {
    const sample = exportRoundsCsv([
      {
        id: 'sample',
        date: '2026-07-01',
        courseId: 'sample',
        courseName: 'Example Course',
        score: 85,
        par: 72,
        front9: 42,
        back9: 43,
        putts: 30,
        gir: 50,
        fir: 57,
        yardage: 6500,
        notes: 'Optional note',
      },
    ]);
    downloadCsv('golf-import-template.csv', sample);
    pushToast({
      type: 'success',
      title: 'Template downloaded',
      message: 'GIR and FIR are percentages (0–100).',
    });
  }

  return (
    <div>
      <header className="page-header">
        <div>
          <h1>Import / Export</h1>
          <p className="subtitle">
            CSV round history with validation, duplicate detection, and filters
          </p>
        </div>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => {
            resetToSeed();
            setPreview(null);
            pushToast({
              type: 'info',
              title: 'Data reset',
              message: 'Cleared all rounds and restored Junho Lee profile.',
            });
          }}
        >
          Reset all data
        </button>
      </header>

      <div className="ie-grid">
        {/* Import */}
        <section className="card card-pad ie-section">
          <h2>Import</h2>
          <p className="desc">
            Upload a CSV of rounds. Data is validated, duplicates are detected,
            and you can preview before committing.
          </p>

          <div
            className={`dropzone ${dragOver ? 'dragover' : ''}`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => fileRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') fileRef.current?.click();
            }}
          >
            <UploadIcon />
            <strong style={{ marginTop: '0.75rem' }}>
              Drop CSV here or click to browse
            </strong>
            <p>
              Required: date, courseName, score, front9, back9, putts,{' '}
              <strong>gir</strong> (%), <strong>fir</strong> (%) — e.g. 45 or 45%
            </p>
            {fileName && (
              <p style={{ marginTop: '0.5rem', color: 'var(--pine)', fontWeight: 600 }}>
                {fileName}
              </p>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            hidden
            onChange={(e) => onFileSelected(e.target.files?.[0] ?? null)}
          />

          <div className="btn-row">
            <button type="button" className="btn btn-secondary" onClick={downloadTemplate}>
              <DownloadIcon /> Download template
            </button>
          </div>

          {preview && (
            <>
              <div className="import-summary">
                <span className="summary-pill ok">{preview.validCount} valid</span>
                <span className="summary-pill warn">
                  {preview.duplicates.length} duplicate
                  {preview.duplicates.length === 1 ? '' : 's'}
                </span>
                <span className="summary-pill err">
                  {preview.errors.length} error
                  {preview.errors.length === 1 ? '' : 's'}
                </span>
              </div>

              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginTop: '1rem',
                  fontSize: '0.9rem',
                }}
              >
                <input
                  type="checkbox"
                  checked={skipDuplicates}
                  onChange={(e) => setSkipDuplicates(e.target.checked)}
                />
                Skip duplicate rounds (same date, course, and score)
              </label>

              {preview.errors.length > 0 && (
                <div className="error-list">
                  <strong>Validation errors</strong>
                  <ul>
                    {preview.errors.slice(0, 20).map((err, i) => (
                      <li key={`${err.row}-${err.field}-${i}`}>
                        Row {err.row} · {err.field}: {err.message}
                      </li>
                    ))}
                    {preview.errors.length > 20 && (
                      <li>…and {preview.errors.length - 20} more</li>
                    )}
                  </ul>
                </div>
              )}

              {preview.rows.length > 0 && (
                <div className="preview-box">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Course</th>
                        <th>Score</th>
                        <th>Putts</th>
                        <th>GIR %</th>
                        <th>FIR %</th>
                        <th>Dup?</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.rows.slice(0, 25).map((row, i) => {
                        const rowNum = i + 2;
                        const isDup = preview.duplicates.includes(rowNum);
                        return (
                          <tr key={`${row.date}-${row.courseName}-${i}`}>
                            <td className="mono">{row.date}</td>
                            <td>{row.courseName}</td>
                            <td className="mono">{row.score}</td>
                            <td className="mono">{row.putts}</td>
                            <td className="mono">{row.gir}%</td>
                            <td className="mono">{row.fir}%</td>
                            <td>{isDup ? 'Yes' : '—'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="btn-row">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={confirmImport}
                  disabled={preview.rows.length === 0}
                >
                  Confirm import
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => {
                    setPreview(null);
                    setFileName('');
                    if (fileRef.current) fileRef.current.value = '';
                  }}
                >
                  Cancel
                </button>
              </div>
            </>
          )}
        </section>

        {/* Export */}
        <section className="card card-pad ie-section">
          <h2>Export</h2>
          <p className="desc">
            Download round history or course statistics as CSV. Filter by date,
            course, or season first.
          </p>

          <div className="form-grid">
            <div className="form-row two">
              <div>
                <label htmlFor="dateFrom">Date from</label>
                <input
                  id="dateFrom"
                  type="date"
                  className="select-input"
                  style={{ width: '100%' }}
                  value={filters.dateFrom ?? ''}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, dateFrom: e.target.value }))
                  }
                />
              </div>
              <div>
                <label htmlFor="dateTo">Date to</label>
                <input
                  id="dateTo"
                  type="date"
                  className="select-input"
                  style={{ width: '100%' }}
                  value={filters.dateTo ?? ''}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, dateTo: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="form-row">
              <label htmlFor="courseFilter">Golf course</label>
              <select
                id="courseFilter"
                className="select-input"
                value={filters.courseName ?? 'all'}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, courseName: e.target.value }))
                }
              >
                <option value="all">All courses</option>
                {courseNames.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-row">
              <label htmlFor="seasonFilter">Season / year</label>
              <select
                id="seasonFilter"
                className="select-input"
                value={filters.season ?? 'all'}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, season: e.target.value }))
                }
              >
                <option value="all">All seasons</option>
                <option value="spring">Spring</option>
                <option value="summer">Summer</option>
                <option value="fall">Fall</option>
                <option value="winter">Winter</option>
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="import-summary">
            <span className="summary-pill">{exportCount} rounds match filters</span>
            <span className="summary-pill">{rounds.length} total stored</span>
          </div>

          <div className="btn-row">
            <button type="button" className="btn btn-primary" onClick={exportHistory}>
              <DownloadIcon /> Export round history
            </button>
            <button type="button" className="btn btn-secondary" onClick={exportStats}>
              <DownloadIcon /> Export statistics
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
