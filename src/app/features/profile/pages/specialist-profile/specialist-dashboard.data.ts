/*
 * Shipped baseline for the Expert Space dashboard. No backend exists yet, so every
 * value here is empty or zero and each section renders its own empty state. When the
 * API lands, replace these constants with fetched data of the same shapes.
 */
export type SessionStatus = 'Completed' | 'Starts in 2 hrs' | 'Upcoming' | 'Cancelled';
export type SessionType = 'Follow-up' | 'First session' | 'Therapy session';
export type TherapyType = 'Individual Therapy' | 'Couple Therapy';
export type ReportKind = 'mood' | 'summary' | 'care';

export interface SpecialistHeader {
  /** Fallback only; the signed-in expert's own name wins. */
  name: string;
  /** Empty when the expert has not added a professional title. */
  title: string;
  specialties: string[];
  extraSpecialties: number;
  /** Live presence. False until a real presence source exists. */
  online: boolean;
  /** Trust claim. False until the expert's credentials are actually verified. */
  verified: boolean;
}

export interface NextSession {
  startsIn: string;
  timeRange: string;
  clientName: string;
}

export interface SessionsToday {
  completed: number;
  total: number;
  upcoming: number;
  rescheduled: number;
  cancelled: number;
}

export interface EarningsSummary {
  today: number;
  /** Null when there is no previous week to compare against. */
  weeklyChangePercent: number | null;
  month: number;
  total: number;
}

export interface InsightCount {
  id: ReportKind;
  label: string;
  count: number;
}

export interface InsightsSummary {
  sharedThisMonth: number;
  breakdown: InsightCount[];
}

export interface TodaySession {
  id: string;
  timeRange: string;
  clientName: string;
  age: number;
  gender: 'Male' | 'Female';
  avatar: string | null;
  sessionType: SessionType;
  status: SessionStatus;
  therapyType: TherapyType;
}

export interface PracticeStat {
  id: string;
  value: string;
  label: string;
  /** Null when there is nothing to compare against. */
  change: string | null;
}

export interface WeeklyPoint {
  label: string;
  value: number;
}

export interface ClientMessage {
  id: string;
  clientName: string;
  avatar: string | null;
  sessionType: SessionType;
  timestamp: string;
  text: string;
}

export interface SharedReport {
  id: string;
  kind: ReportKind;
  title: string;
  subtitle: string;
  date: string;
}

export interface InfoRow {
  label: string;
  /** Empty when the expert has not filled the row in. */
  value: string;
}

export interface SecurityRow {
  id: 'sign-in' | 'payout' | 'account';
  title: string;
  subtitle: string;
  badge: string | null;
}

export const SPECIALIST_HEADER: SpecialistHeader = {
  name: 'Calmi expert',
  title: '',
  specialties: [],
  extraSpecialties: 0,
  online: false,
  verified: false,
};

export const NEXT_SESSION: NextSession | null = null;

export const SESSIONS_TODAY: SessionsToday = {
  completed: 0,
  total: 0,
  upcoming: 0,
  rescheduled: 0,
  cancelled: 0,
};

export const EARNINGS: EarningsSummary = {
  today: 0,
  weeklyChangePercent: null,
  month: 0,
  total: 0,
};

export const INSIGHTS: InsightsSummary = {
  sharedThisMonth: 0,
  breakdown: [
    { id: 'mood', label: 'Mood insights', count: 0 },
    { id: 'summary', label: 'Session summary', count: 0 },
    { id: 'care', label: 'Care recommendations', count: 0 },
  ],
};

export const TODAY_SESSIONS: TodaySession[] = [];

export const PRACTICE_STATS: PracticeStat[] = [
  { id: 'sessions', value: '0', label: 'Sessions this month', change: null },
  { id: 'completion', value: '0%', label: 'Completion rate', change: null },
  { id: 'new', value: '0', label: 'New clients', change: null },
  { id: 'returning', value: '0', label: 'Returning clients', change: null },
];

export const WEEKLY_SESSIONS: WeeklyPoint[] = [];

export const CLIENT_MESSAGES: ClientMessage[] = [];

export const SHARED_REPORTS: SharedReport[] = [];

export const PROFESSIONAL_INFO: InfoRow[] = [
  { label: 'Name', value: '' },
  { label: 'Email', value: '' },
  { label: 'Experience', value: '' },
  { label: 'Languages', value: '' },
  { label: 'Consultation modes', value: '' },
  { label: 'Availability', value: '' },
];

export const SECURITY_ROWS: SecurityRow[] = [
  { id: 'sign-in', title: 'Sign-in method', subtitle: 'Email', badge: null },
  { id: 'payout', title: 'Payout details', subtitle: 'Not added yet', badge: null },
  { id: 'account', title: 'Account settings', subtitle: 'Profile, notifications, availability', badge: null },
];
