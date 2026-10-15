export type SessionStatus = 'Completed' | 'Starts in 2 hrs' | 'Upcoming' | 'Cancelled';
export type SessionType = 'Follow-up' | 'First session' | 'Therapy session';
export type TherapyType = 'Individual Therapy' | 'Couple Therapy';
export type ReportKind = 'mood' | 'summary' | 'care';

export interface SpecialistHeader {
  name: string;
  title: string;
  specialties: string[];
  extraSpecialties: number;
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
  weeklyChangePercent: number;
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
  change: string;
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
  value: string;
}

export interface SecurityRow {
  id: 'sign-in' | 'payout' | 'account';
  title: string;
  subtitle: string;
  badge: string | null;
}

export const SPECIALIST_HEADER: SpecialistHeader = {
  name: 'Dr. Garima Adhikari',
  title: 'Clinical Psychologist',
  specialties: ['Relationships', 'Stress', 'Anxiety', 'Self-esteem'],
  extraSpecialties: 2,
};

export const NEXT_SESSION: NextSession = {
  startsIn: 'Next session in 2 hours',
  timeRange: '11:00 AM – 11:50 AM',
  clientName: 'Riya Sharma',
};

export const SESSIONS_TODAY: SessionsToday = {
  completed: 1,
  total: 5,
  upcoming: 3,
  rescheduled: 0,
  cancelled: 1,
};

export const EARNINGS: EarningsSummary = {
  today: 4800,
  weeklyChangePercent: 12,
  month: 28800,
  total: 112600,
};

export const INSIGHTS: InsightsSummary = {
  sharedThisMonth: 5,
  breakdown: [
    { id: 'mood', label: 'Mood insights', count: 3 },
    { id: 'summary', label: 'Session summary', count: 2 },
    { id: 'care', label: 'Care recommendations', count: 0 },
  ],
};

export const TODAY_SESSIONS: TodaySession[] = [
  {
    id: 'aarav-mehta',
    timeRange: '9:00 – 9:50 AM',
    clientName: 'Aarav Mehta',
    age: 25,
    gender: 'Male',
    avatar: null,
    sessionType: 'Follow-up',
    status: 'Completed',
    therapyType: 'Individual Therapy',
  },
  {
    id: 'riya-sharma',
    timeRange: '11:00 – 11:50 AM',
    clientName: 'Riya Sharma',
    age: 22,
    gender: 'Female',
    avatar: 'assets/users/isha.avif',
    sessionType: 'First session',
    status: 'Starts in 2 hrs',
    therapyType: 'Couple Therapy',
  },
  {
    id: 'karan-verma',
    timeRange: '2:00 – 2:50 PM',
    clientName: 'Karan Verma',
    age: 28,
    gender: 'Male',
    avatar: null,
    sessionType: 'Follow-up',
    status: 'Upcoming',
    therapyType: 'Individual Therapy',
  },
  {
    id: 'neha-kapoor',
    timeRange: '5:00 – 5:50 PM',
    clientName: 'Neha Kapoor',
    age: 24,
    gender: 'Female',
    avatar: 'assets/users/anisha.avif',
    sessionType: 'Therapy session',
    status: 'Upcoming',
    therapyType: 'Individual Therapy',
  },
  {
    id: 'reyansh',
    timeRange: '7:30 – 8:20 PM',
    clientName: 'Reyansh',
    age: 20,
    gender: 'Male',
    avatar: null,
    sessionType: 'Therapy session',
    status: 'Cancelled',
    therapyType: 'Individual Therapy',
  },
];

export const PRACTICE_STATS: PracticeStat[] = [
  { id: 'sessions', value: '42', label: 'Sessions this month', change: '8%' },
  { id: 'completion', value: '94%', label: 'Completion rate', change: '5%' },
  { id: 'new', value: '12', label: 'New clients', change: '3' },
  { id: 'returning', value: '30', label: 'Returning clients', change: '10%' },
];

export const WEEKLY_SESSIONS: WeeklyPoint[] = [
  { label: 'W1', value: 6 },
  { label: 'W2', value: 9 },
  { label: 'W3', value: 9.5 },
  { label: 'W4', value: 12 },
];

export const CLIENT_MESSAGES: ClientMessage[] = [
  {
    id: 'riya-sharma-message',
    clientName: 'Riya Sharma',
    avatar: 'assets/users/isha.avif',
    sessionType: 'First session',
    timestamp: 'Today, 9:12 AM',
    text: "I've been feeling guilty in my LDR relationship as I've had a few conflicts this week with him and want to understand how to respond more calmly.",
  },
  {
    id: 'karan-verma-message',
    clientName: 'Karan Verma',
    avatar: null,
    sessionType: 'Follow-up',
    timestamp: 'Yesterday, 8:45 PM',
    text: 'I would like to pick up our last conversation. I\'ve been dealing with a lot of anxiety and overthinking lately about my career and future, and I could really use some guidance on navigating it.',
  },
];

export const SHARED_REPORTS: SharedReport[] = [
  {
    id: 'mood-sep-2026',
    kind: 'mood',
    title: 'Mood Insights Report – September 2026',
    subtitle: 'Riya Sharma • 12 check-ins',
    date: 'Sep 12, 2026',
  },
  {
    id: 'mood-aug-2026',
    kind: 'mood',
    title: 'Mood Insights Report – August 2026',
    subtitle: 'Neha Kapoor • 8 check-ins',
    date: 'Sep 02, 2026',
  },
  {
    id: 'summary-session-3',
    kind: 'summary',
    title: 'Session Summary – Session 3',
    subtitle: 'Aarav Mehta',
    date: 'Aug 10, 2026',
  },
  {
    id: 'care-recommendations',
    kind: 'care',
    title: 'Care Recommendations',
    subtitle: 'Karan Verma',
    date: 'Aug 05, 2026',
  },
];

export const PROFESSIONAL_INFO: InfoRow[] = [
  { label: 'Name', value: 'Dr. Garima Adhikari' },
  { label: 'Email', value: 'garima.adhikari@calmi.in' },
  { label: 'Experience', value: '5+ years' },
  { label: 'Languages', value: 'English, Hindi, Punjabi' },
  { label: 'Consultation modes', value: 'Video, Audio' },
  { label: 'Availability', value: 'Mon – Sat, 9:00 AM – 7:00 PM' },
];

export const SECURITY_ROWS: SecurityRow[] = [
  { id: 'sign-in', title: 'Sign-in method', subtitle: 'Google', badge: 'Connected' },
  { id: 'payout', title: 'Payout details', subtitle: 'HDFC Bank **** 2847', badge: 'Verified' },
  { id: 'account', title: 'Account settings', subtitle: 'Profile, notifications, availability', badge: null },
];
