export interface GolfCourse {
  id: string;
  name: string;
  location: string;
  par: number;
  yardage: number;
}

export interface Round {
  id: string;
  date: string; // ISO date YYYY-MM-DD
  courseId: string;
  courseName: string;
  score: number;
  par: number;
  front9: number;
  back9: number;
  putts: number;
  /** Greens in regulation as percentage 0–100 */
  gir: number;
  /** Fairways in regulation as percentage 0–100 */
  fir: number;
  yardage: number;
  notes?: string;
}

export interface Goal {
  id: string;
  label: string;
  target: number;
  current: number;
  unit: string;
  direction: 'lower' | 'higher';
}

export interface PlayerProfile {
  name: string;
  handicap: number;
  goalHandicap: number;
  goals: Goal[];
}

export type TrendRange = '5' | '10' | '20' | 'year' | 'all';

export type CourseSortKey =
  | 'courseName'
  | 'rounds'
  | 'bestScore'
  | 'averageScore'
  | 'lastPlayed';

export interface CourseStats {
  courseId: string;
  courseName: string;
  location: string;
  yardage: number;
  par: number;
  rounds: number;
  bestScore: number;
  averageScore: number;
  lowestFront9: number;
  lowestBack9: number;
  bestPutting: number;
  bestGir: number;
  bestFir: number;
  lastPlayed: string;
  firstAvg?: number;
  recentAvg?: number;
  improvement?: number;
}

export interface ImportRow {
  date: string;
  courseName: string;
  score: number;
  par: number;
  front9: number;
  back9: number;
  putts: number;
  gir: number;
  fir: number;
  yardage: number;
  notes?: string;
}

export interface ImportValidationError {
  row: number;
  field: string;
  message: string;
}

export interface ImportPreview {
  rows: ImportRow[];
  errors: ImportValidationError[];
  duplicates: number[];
  validCount: number;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  message: string;
}

export interface DashboardSummary {
  handicap: number;
  averageScore: number;
  recentRound: Round | null;
  goalProgress: Goal[];
  monthlyStats: {
    month: string;
    rounds: number;
    averageScore: number;
    bestScore: number;
  };
}
