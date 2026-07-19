import { useEffect, useMemo, useState, type FormEvent } from 'react';
import type { Round } from '../../types';
import { courses } from '../../data/seed';

export type RoundFormValues = {
  date: string;
  courseName: string;
  par: string;
  front9: string;
  back9: string;
  putts: string;
  gir: string;
  fir: string;
  yardage: string;
  notes: string;
};

export type RoundFormErrors = Partial<Record<keyof RoundFormValues | 'score', string>>;

const emptyValues = (): RoundFormValues => ({
  date: new Date().toISOString().slice(0, 10),
  courseName: '',
  par: '72',
  front9: '',
  back9: '',
  putts: '',
  gir: '',
  fir: '',
  yardage: '6500',
  notes: '',
});

function fromRound(round: Round): RoundFormValues {
  return {
    date: round.date,
    courseName: round.courseName,
    par: String(round.par),
    front9: String(round.front9),
    back9: String(round.back9),
    putts: String(round.putts),
    gir: String(round.gir),
    fir: String(round.fir),
    yardage: String(round.yardage),
    notes: round.notes ?? '',
  };
}

function parseNum(s: string): number | null {
  if (s.trim() === '') return null;
  const n = Number(String(s).trim().replace(/%/g, ''));
  return Number.isFinite(n) ? n : null;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40) || 'course';
}

export function validateRoundForm(values: RoundFormValues): {
  errors: RoundFormErrors;
  round?: Omit<Round, 'id'>;
} {
  const errors: RoundFormErrors = {};
  const date = values.date.trim();
  const courseName = values.courseName.trim();
  const par = parseNum(values.par);
  const front9 = parseNum(values.front9);
  const back9 = parseNum(values.back9);
  const putts = parseNum(values.putts);
  const gir = parseNum(values.gir);
  const fir = parseNum(values.fir);
  const yardage = parseNum(values.yardage) ?? 6500;

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    errors.date = '날짜를 YYYY-MM-DD 형식으로 입력하세요.';
  }
  if (!courseName) {
    errors.courseName = '코스 이름을 입력하세요.';
  }
  if (par === null || par < 60 || par > 80) {
    errors.par = 'Par는 60–80 사이여야 합니다.';
  }
  if (front9 === null || front9 < 20 || front9 > 80) {
    errors.front9 = 'Front 9 점수를 확인하세요.';
  }
  if (back9 === null || back9 < 20 || back9 > 80) {
    errors.back9 = 'Back 9 점수를 확인하세요.';
  }
  if (putts === null || putts < 10 || putts > 60) {
    errors.putts = '퍼트 수는 10–60이어야 합니다.';
  }
  if (gir === null || gir < 0 || gir > 100) {
    errors.gir = 'GIR은 0–100% 입니다.';
  }
  if (fir === null || fir < 0 || fir > 100) {
    errors.fir = 'FIR은 0–100% 입니다.';
  }
  if (yardage < 4000 || yardage > 9000) {
    errors.yardage = '야드지는 4000–9000 범위로 입력하세요.';
  }

  if (Object.keys(errors).length > 0) {
    return { errors };
  }

  const score = (front9 as number) + (back9 as number);
  if (score < 50 || score > 150) {
    errors.score = `총 스코어(${score})가 비정상입니다.`;
    return { errors };
  }

  return {
    errors: {},
    round: {
      date,
      courseId: slugify(courseName),
      courseName,
      score,
      par: par as number,
      front9: front9 as number,
      back9: back9 as number,
      putts: putts as number,
      gir: gir as number,
      fir: fir as number,
      yardage,
      notes: values.notes.trim() || undefined,
    },
  };
}

interface RoundFormProps {
  mode: 'create' | 'edit';
  initial?: Round | null;
  knownCourses: string[];
  onSubmit: (round: Round) => void;
  onCancel: () => void;
}

export function RoundForm({
  mode,
  initial,
  knownCourses,
  onSubmit,
  onCancel,
}: RoundFormProps) {
  const [values, setValues] = useState<RoundFormValues>(() =>
    initial ? fromRound(initial) : emptyValues(),
  );
  const [errors, setErrors] = useState<RoundFormErrors>({});

  useEffect(() => {
    setValues(initial ? fromRound(initial) : emptyValues());
    setErrors({});
  }, [initial, mode]);

  const courseOptions = useMemo(() => {
    const set = new Set<string>([
      ...courses.map((c) => c.name),
      ...knownCourses,
    ]);
    return [...set].sort();
  }, [knownCourses]);

  const front = parseNum(values.front9);
  const back = parseNum(values.back9);
  const liveScore =
    front !== null && back !== null ? front + back : null;

  function setField<K extends keyof RoundFormValues>(key: K, value: string) {
    setValues((prev) => {
      const next = { ...prev, [key]: value };
      // Auto-fill par/yardage from catalog when course matches
      if (key === 'courseName') {
        const match = courses.find(
          (c) => c.name.toLowerCase() === value.trim().toLowerCase(),
        );
        if (match) {
          next.par = String(match.par);
          next.yardage = String(match.yardage);
        }
      }
      return next;
    });
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const result = validateRoundForm(values);
    if (!result.round || Object.keys(result.errors).length > 0) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    const id =
      mode === 'edit' && initial
        ? initial.id
        : `rnd-${result.round.date}-${result.round.courseId}-${Date.now()}`;
    onSubmit({ ...result.round, id });
  }

  return (
    <form className="round-form" onSubmit={handleSubmit} noValidate>
      <div className="form-grid">
        <div className="form-row two">
          <div>
            <label htmlFor="rf-date">날짜</label>
            <input
              id="rf-date"
              type="date"
              className="select-input"
              style={{ width: '100%' }}
              value={values.date}
              onChange={(e) => setField('date', e.target.value)}
              required
            />
            {errors.date && <p className="field-error">{errors.date}</p>}
          </div>
          <div>
            <label htmlFor="rf-course">골프 코스</label>
            <input
              id="rf-course"
              type="text"
              className="select-input"
              style={{ width: '100%' }}
              list="course-suggestions"
              placeholder="코스 이름"
              value={values.courseName}
              onChange={(e) => setField('courseName', e.target.value)}
              required
              autoComplete="off"
            />
            <datalist id="course-suggestions">
              {courseOptions.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
            {errors.courseName && (
              <p className="field-error">{errors.courseName}</p>
            )}
          </div>
        </div>

        <div className="form-row two">
          <div>
            <label htmlFor="rf-front">Front 9</label>
            <input
              id="rf-front"
              type="number"
              className="select-input"
              style={{ width: '100%' }}
              min={20}
              max={80}
              value={values.front9}
              onChange={(e) => setField('front9', e.target.value)}
              required
            />
            {errors.front9 && <p className="field-error">{errors.front9}</p>}
          </div>
          <div>
            <label htmlFor="rf-back">Back 9</label>
            <input
              id="rf-back"
              type="number"
              className="select-input"
              style={{ width: '100%' }}
              min={20}
              max={80}
              value={values.back9}
              onChange={(e) => setField('back9', e.target.value)}
              required
            />
            {errors.back9 && <p className="field-error">{errors.back9}</p>}
          </div>
        </div>

        <div className="score-live">
          <span>총 스코어</span>
          <strong className="mono">{liveScore ?? '—'}</strong>
          {errors.score && <p className="field-error">{errors.score}</p>}
        </div>

        <div className="form-row two">
          <div>
            <label htmlFor="rf-par">Par</label>
            <input
              id="rf-par"
              type="number"
              className="select-input"
              style={{ width: '100%' }}
              min={60}
              max={80}
              value={values.par}
              onChange={(e) => setField('par', e.target.value)}
            />
            {errors.par && <p className="field-error">{errors.par}</p>}
          </div>
          <div>
            <label htmlFor="rf-putts">Putts</label>
            <input
              id="rf-putts"
              type="number"
              className="select-input"
              style={{ width: '100%' }}
              min={10}
              max={60}
              value={values.putts}
              onChange={(e) => setField('putts', e.target.value)}
              required
            />
            {errors.putts && <p className="field-error">{errors.putts}</p>}
          </div>
        </div>

        <div className="form-row two">
          <div>
            <label htmlFor="rf-gir">GIR (%)</label>
            <input
              id="rf-gir"
              type="number"
              className="select-input"
              style={{ width: '100%' }}
              min={0}
              max={100}
              step={0.1}
              placeholder="예: 50"
              value={values.gir}
              onChange={(e) => setField('gir', e.target.value)}
              required
            />
            {errors.gir && <p className="field-error">{errors.gir}</p>}
          </div>
          <div>
            <label htmlFor="rf-fir">FIR (%)</label>
            <input
              id="rf-fir"
              type="number"
              className="select-input"
              style={{ width: '100%' }}
              min={0}
              max={100}
              step={0.1}
              placeholder="예: 57"
              value={values.fir}
              onChange={(e) => setField('fir', e.target.value)}
              required
            />
            {errors.fir && <p className="field-error">{errors.fir}</p>}
          </div>
        </div>

        <div className="form-row two">
          <div>
            <label htmlFor="rf-yardage">Yardage</label>
            <input
              id="rf-yardage"
              type="number"
              className="select-input"
              style={{ width: '100%' }}
              min={4000}
              max={9000}
              value={values.yardage}
              onChange={(e) => setField('yardage', e.target.value)}
            />
            {errors.yardage && <p className="field-error">{errors.yardage}</p>}
          </div>
          <div>
            <label htmlFor="rf-notes">메모 (선택)</label>
            <input
              id="rf-notes"
              type="text"
              className="select-input"
              style={{ width: '100%' }}
              placeholder="짧은 메모"
              value={values.notes}
              onChange={(e) => setField('notes', e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="btn-row">
        <button type="submit" className="btn btn-primary">
          {mode === 'edit' ? '라운드 수정 저장' : '라운드 저장'}
        </button>
        <button type="button" className="btn btn-ghost" onClick={onCancel}>
          취소
        </button>
      </div>
    </form>
  );
}
