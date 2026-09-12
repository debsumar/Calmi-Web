export type AvailabilityState = 'available' | 'unavailable';
export type Gender = 'female' | 'male' | 'non-binary';
export type SessionMode = 'Video' | 'Audio' | 'Chat';
export type AvailabilityFilter = 'any' | 'today' | 'week' | 'weekend';

export type TherapistBenefitId =
  | 'personalized-approach'
  | 'safe-non-judgmental'
  | 'holistic-perspective'
  | 'evidence-informed-care';

export interface TherapistWhyChooseUs {
  id: TherapistBenefitId;
  label: 'Personalized Approach' | 'Safe & Non-Judgmental' | 'Holistic Perspective' | 'Evidence-Informed Care';
}

export interface TherapistTestimonial {
  quote: string;
  author: string;
  rating: number;
}

export interface TherapistSessionSlot {
  id: string;
  label: string;
}

export interface TherapistAvailabilityDay {
  date: string;
  state: AvailabilityState;
  slots: TherapistSessionSlot[];
}

export interface Therapist {
  id: string;
  name: string;
  image: string;
  subtitle: string;
  qualifications: string[];
  experienceYears: number;
  price: number;
  duration: string;
  sessionMode: string;
  sessionModes: readonly SessionMode[];
  gender: Gender;
  rating: number;
  reviews: number;
  specialties: string[];
  languages: string[];
  bio: string;
  whyChooseUs: TherapistWhyChooseUs[];
  testimonials: TherapistTestimonial[];
  availability: TherapistAvailabilityDay[];
}

export interface TherapistFilterCriteria {
  availability: AvailabilityFilter;
  genders: readonly Gender[];
  languages: readonly string[];
  priceMin: number | null;
  priceMax: number | null;
  minRating: number | null;
  minExperience: number | null;
  specialty: string | null;
  sessionMode: SessionMode | null;
}

export const DEFAULT_FILTER_CRITERIA: TherapistFilterCriteria = {
  availability: 'any',
  genders: [],
  languages: [],
  priceMin: null,
  priceMax: null,
  minRating: null,
  minExperience: null,
  specialty: null,
  sessionMode: null,
};

export const AVAILABILITY_OPTIONS = [
  { value: 'any', label: 'Any' },
  { value: 'today', label: 'Available today' },
  { value: 'week', label: 'Available this week' },
  { value: 'weekend', label: 'Weekend slots' },
] as const satisfies readonly { value: AvailabilityFilter; label: string }[];

export const GENDER_OPTIONS = [
  { value: 'female', label: 'Female' },
  { value: 'male', label: 'Male' },
  { value: 'non-binary', label: 'Non-binary' },
] as const satisfies readonly { value: Gender; label: string }[];

const BENEFITS: TherapistWhyChooseUs[] = [
  { id: 'personalized-approach', label: 'Personalized Approach' },
  { id: 'safe-non-judgmental', label: 'Safe & Non-Judgmental' },
  { id: 'holistic-perspective', label: 'Holistic Perspective' },
  { id: 'evidence-informed-care', label: 'Evidence-Informed Care' },
];

function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  next.setDate(next.getDate() + days);
  return next;
}

function localToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function fromDateKey(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year ?? 0, (month ?? 1) - 1, day ?? 1);
}

function availabilityFor(
  id: string,
  experienceYears: number,
  unavailableThrough = 0,
  unavailableShift = 0,
): TherapistAvailabilityDay[] {
  const today = localToday();
  const morningHour = 9 + (Math.floor(experienceYears) % 3);

  return Array.from({ length: 60 }, (_, offset) => {
    const date = addDays(today, offset);
    const unavailable = offset <= unavailableThrough || (offset + unavailableShift) % 4 === 0;
    const state: AvailabilityState = unavailable ? 'unavailable' : 'available';
    return {
      date: toDateKey(date),
      state,
      slots: state === 'available'
        ? [
            { id: `${id}-${offset}-morning`, label: `${morningHour}:00 AM` },
            { id: `${id}-${offset}-midday`, label: '12:30 PM' },
            { id: `${id}-${offset}-evening`, label: '5:30 PM' },
          ]
        : [],
    };
  });
}

function firstName(name: string): string {
  return name.split(' ')[0] ?? name;
}

function profileContent(name: string, specialty: string, rating: number): Pick<Therapist, 'bio' | 'whyChooseUs' | 'testimonials'> {
  return {
    bio: `${name} creates a calm, collaborative space for exploring ${specialty.toLowerCase()} and the experiences around it. Their sessions combine attentive listening with practical, evidence-informed tools, helping each person move forward at a pace that feels safe and sustainable.`,
    whyChooseUs: BENEFITS.map((benefit) => ({ ...benefit })),
    testimonials: [
      { quote: `Finding ${firstName(name)} on Calmi was a turning point for me. I was dealing with frequent breakdowns and anxiety attacks, but in just a few weeks, our conversations helped me identify my triggers and work through deeper issues at my own pace. I'm truly grateful for her therapies!`, author: 'Shivangi Khatri', rating },
      { quote: 'Kind, practical, and easy to talk to.', author: 'Rohit Menon', rating },
      { quote: `I put off therapy for almost three years because I assumed I would have to explain my whole life story before anything useful happened. Working with ${firstName(name)} gave me small, sustainable tools and a space where progress did not need to be perfect.`, author: 'Ananya Deshpande', rating },
    ],
  };
}

function sessionModeLabel(sessionModes: readonly SessionMode[]): string {
  if (sessionModes.length === 1) return sessionModes[0] ?? '';
  if (sessionModes.length === 2) return `${sessionModes[0]} & ${sessionModes[1]}`;
  return `${sessionModes.slice(0, -1).join(', ')} & ${sessionModes.at(-1)}`;
}

function createTherapist(
  base: Omit<Therapist, 'bio' | 'whyChooseUs' | 'testimonials' | 'availability' | 'sessionMode'>,
  unavailableThrough = 0,
  unavailableShift = 0,
): Therapist {
  return {
    ...base,
    sessionMode: sessionModeLabel(base.sessionModes),
    ...profileContent(base.name, base.specialties[0] ?? 'personal goals', base.rating),
    availability: availabilityFor(base.id, base.experienceYears, unavailableThrough, unavailableShift),
  };
}

export const THERAPISTS: Therapist[] = [
  createTherapist({ id: 'gargi-yadav', name: 'Gargi Yadav', image: 'assets/users/gargi.avif', subtitle: 'Counselling Psychologist', qualifications: ['B.A', 'M.A. (Psychology)'], experienceYears: 4.5, price: 2000, duration: '50 mins', sessionModes: ['Video', 'Audio'], gender: 'female', rating: 4.9, reviews: 128, specialties: ['Relationship & Communication Issues', 'Anxiety & Emotional Regulation', 'Self-Esteem & Personal Growth', 'Grief & Emotional Well-being'], languages: ['English', 'Hindi'] }, -1, 1),
  createTherapist({ id: 'yukta-bansal', name: 'Yukta Bansal', image: 'assets/users/yukta.avif', subtitle: 'Counselling Psychologist', qualifications: ['BA', 'MA Psychology'], experienceYears: 3, price: 1500, duration: '40 mins', sessionModes: ['Video', 'Audio'], gender: 'female', rating: 4.8, reviews: 96, specialties: ['Teen & Adult Counselling', 'Relationship & Marital Issues', 'Self-Esteem & Depression', 'Women Challenges'], languages: ['English', 'Hindi'] }, 1, 1),
  createTherapist({ id: 'prerna-gawde', name: 'Prerna Gawde', image: '', subtitle: 'Clinical Psychologist', qualifications: ['M.Phil', 'M.A.'], experienceYears: 6, price: 2500, duration: '45 mins', sessionModes: ['Video', 'Audio'], gender: 'female', rating: 4.7, reviews: 74, specialties: ['Bipolar disorder', 'Schizophrenia'], languages: ['English', 'Hindi', 'Marathi'] }, 2, 0),
  createTherapist({ id: 'rahul-menon', name: 'Rahul Menon', image: '', subtitle: 'Wellness Counsellor', qualifications: ['M.Sc', 'M.A.'], experienceYears: 9, price: 1800, duration: '40 mins', sessionModes: ['Video', 'Audio', 'Chat'], gender: 'male', rating: 4.8, reviews: 112, specialties: ['Burnout', 'Sleep Issues', 'Grief'], languages: ['English', 'Hindi', 'Malayalam'] }, -1, 2),
  createTherapist({ id: 'sneha-iyer', name: 'Sneha Iyer', image: '', subtitle: 'Trauma-informed Psychologist', qualifications: ['M.Phil', 'M.Sc'], experienceYears: 10, price: 2200, duration: '50 mins', sessionModes: ['Video', 'Audio'], gender: 'female', rating: 4.9, reviews: 143, specialties: ['Trauma & PTSD', 'Anxiety & Stress', 'Self Esteem'], languages: ['English', 'Hindi', 'Tamil'] }, 1, 0),
  createTherapist({ id: 'arjun-sharma', name: 'Arjun Sharma', image: '', subtitle: 'Counselling Psychologist', qualifications: ['M.A.', 'PG Diploma'], experienceYears: 5, price: 1200, duration: '30 mins', sessionModes: ['Video', 'Audio'], gender: 'male', rating: 4.6, reviews: 58, specialties: ['Career Stress', 'Anger Issues', 'OCD'], languages: ['English', 'Hindi'] }, -1, 3),
  createTherapist({ id: 'meera-sen', name: 'Meera Sen', image: '', subtitle: 'Counselling Psychologist', qualifications: ['M.A. Psychology', 'PG Diploma'], experienceYears: 7, price: 1600, duration: '45 mins', sessionModes: ['Video', 'Audio', 'Chat'], gender: 'female', rating: 4.5, reviews: 81, specialties: ['Workplace Stress', 'Career Transitions', 'Anxiety & Stress'], languages: ['English', 'Bengali', 'Hindi'] }, 8, 0),
  createTherapist({ id: 'vishal-naik', name: 'Vishal Naik', image: '', subtitle: 'Clinical Psychologist', qualifications: ['M.Phil Clinical Psychology', 'M.A.'], experienceYears: 12, price: 3000, duration: '50 mins', sessionModes: ['Video', 'Chat'], gender: 'male', rating: 4.9, reviews: 164, specialties: ['OCD', 'Panic Attacks', 'Depression'], languages: ['English', 'Kannada', 'Hindi'] }, -1, 1),
  createTherapist({ id: 'aanya-kapoor', name: 'Aanya Kapoor', image: '', subtitle: 'Wellness Counsellor', qualifications: ['M.Sc Counselling', 'B.A.'], experienceYears: 2, price: 900, duration: '30 mins', sessionModes: ['Audio', 'Chat'], gender: 'non-binary', rating: 4.4, reviews: 39, specialties: ['Identity Exploration', 'Self-Esteem & Personal Growth', 'Relationship & Communication Issues'], languages: ['English', 'Hindi', 'Tamil'] }, 2, 2),
  createTherapist({ id: 'kavya-reddy', name: 'Kavya Reddy', image: '', subtitle: 'Trauma-informed Psychologist', qualifications: ['M.A. Psychology', 'M.Sc'], experienceYears: 8, price: 2800, duration: '50 mins', sessionModes: ['Video', 'Audio'], gender: 'female', rating: 4.7, reviews: 104, specialties: ['Trauma & PTSD', 'Grief', 'Women Challenges'], languages: ['English', 'Telugu', 'Kannada'] }, -1, 3),
  createTherapist({ id: 'dev-patel', name: 'Dev Patel', image: '', subtitle: 'Counselling Psychologist', qualifications: ['M.A. Counselling', 'PG Diploma'], experienceYears: 4, price: 1400, duration: '40 mins', sessionModes: ['Video', 'Chat'], gender: 'non-binary', rating: 4.6, reviews: 67, specialties: ['Teen & Adult Counselling', 'Anger Issues', 'Sleep Issues'], languages: ['English', 'Gujarati', 'Hindi'] }, 1, 2),
];

const PRICES = THERAPISTS.map((therapist) => therapist.price);
const RATING_VALUES = THERAPISTS.map((therapist) => therapist.rating);
const EXPERIENCE_VALUES = THERAPISTS.map((therapist) => Math.floor(therapist.experienceYears));
const MIN_RATING = Math.min(...RATING_VALUES);
const MIN_EXPERIENCE = Math.min(...EXPERIENCE_VALUES);

export const LANGUAGE_OPTIONS: readonly string[] = Array.from(new Set(THERAPISTS.flatMap((therapist) => therapist.languages))).sort();
export const SPECIALTY_OPTIONS: readonly string[] = Array.from(new Set(THERAPISTS.flatMap((therapist) => therapist.specialties))).sort();
export const SESSION_MODE_OPTIONS: readonly SessionMode[] = Array.from(new Set(THERAPISTS.flatMap((therapist) => therapist.sessionModes))).sort() as SessionMode[];
export const PRICE_BOUNDS = {
  min: Math.min(...PRICES),
  max: Math.max(...PRICES),
} as const;
export const RATING_OPTIONS: readonly number[] = Array.from(new Set(RATING_VALUES))
  .filter((rating) => rating > MIN_RATING)
  .sort((a, b) => a - b);
export const EXPERIENCE_OPTIONS: readonly number[] = Array.from(new Set(EXPERIENCE_VALUES))
  .filter((experience) => experience > MIN_EXPERIENCE)
  .sort((a, b) => a - b);

export function firstAvailableDay(therapist: Therapist): TherapistAvailabilityDay | undefined {
  return therapist.availability.find((day) => day.state === 'available' && day.slots.length > 0);
}

export function hasAvailability(therapist: Therapist, availability: AvailabilityFilter, today = localToday()): boolean {
  if (availability === 'any') return true;
  const normalizedToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const todayKey = toDateKey(normalizedToday);
  const weekEnd = addDays(normalizedToday, 6);
  return therapist.availability.some((day) => {
    if (day.state !== 'available' || day.slots.length === 0) return false;
    if (availability === 'today') return day.date === todayKey;
    const date = fromDateKey(day.date);
    if (availability === 'week') return date >= normalizedToday && date <= weekEnd;
    return date >= normalizedToday && date <= weekEnd && (date.getDay() === 0 || date.getDay() === 6);
  });
}

export function filterTherapists(
  therapists: readonly Therapist[],
  criteria: TherapistFilterCriteria,
  today = localToday(),
): Therapist[] {
  const normalizedToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return therapists.filter((therapist) => {
    if (!hasAvailability(therapist, criteria.availability, normalizedToday)) return false;
    if (criteria.genders.length > 0 && !criteria.genders.includes(therapist.gender)) return false;
    if (criteria.languages.length > 0 && !criteria.languages.some((language) => therapist.languages.includes(language))) return false;
    if (criteria.priceMin !== null && therapist.price < criteria.priceMin) return false;
    if (criteria.priceMax !== null && therapist.price > criteria.priceMax) return false;
    if (criteria.minRating !== null && therapist.rating < criteria.minRating) return false;
    if (criteria.minExperience !== null && therapist.experienceYears < criteria.minExperience) return false;
    if (criteria.specialty !== null && !therapist.specialties.includes(criteria.specialty)) return false;
    if (criteria.sessionMode !== null && !therapist.sessionModes.includes(criteria.sessionMode)) return false;
    return true;
  });
}
