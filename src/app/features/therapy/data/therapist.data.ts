export type AvailabilityState = 'available' | 'unavailable';

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
  rating: number;
  reviews: number;
  specialties: string[];
  languages: string[];
  bio: string;
  whyChooseUs: TherapistWhyChooseUs[];
  testimonials: TherapistTestimonial[];
  availability: TherapistAvailabilityDay[];
}

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

function availabilityFor(id: string, experienceYears: number): TherapistAvailabilityDay[] {
  const start = new Date();
  const today = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const morningHour = 9 + (experienceYears % 3);

  return Array.from({ length: 60 }, (_, offset) => {
    const date = addDays(today, offset);
    const state: AvailabilityState = offset % 4 === 0 ? 'unavailable' : 'available';
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

function profileContent(name: string, specialty: string, rating: number): Pick<Therapist, 'bio' | 'whyChooseUs' | 'testimonials'> {
  return {
    bio: `${name} creates a calm, collaborative space for exploring ${specialty.toLowerCase()} and the experiences around it. Their sessions combine attentive listening with practical, evidence-informed tools, helping each person move forward at a pace that feels safe and sustainable.`,
    whyChooseUs: BENEFITS.map((benefit) => ({ ...benefit })),
    testimonials: [
      {
        quote: `Finding ${firstName(name)} on Calmi was a turning point for me. I was dealing with frequent breakdowns and anxiety attacks, but in just a few weeks, our conversations helped me identify my triggers and work through deeper issues at my own pace. I'm truly grateful for her therapies!`,
        author: 'Shivangi Khatri',
        rating,
      },
      {
        // Deliberately short: proves the Show more control stays hidden when the
        // clamp does not actually truncate anything.
        quote: 'Kind, practical, and easy to talk to.',
        author: 'Rohit Menon',
        rating,
      },
      {
        // Deliberately very long: exercises the clamp, ellipsis, Show more toggle
        // and the expand/collapse height change.
        quote: `I put off therapy for almost three years because I assumed I would have to explain my whole life story before anything useful happened, and I did not think I had the energy for that. What actually happened with ${firstName(name)} was very different. The first session was mostly me talking in circles, and instead of pushing me toward a framework, she reflected back the patterns she was hearing and asked whether they sounded familiar. They did, painfully so. Over the following months we worked on the difference between a thought and a fact, on why I treated rest as something I had to earn, and on the specific situations at work that reliably tipped me into a spiral. She gave me small experiments to try between sessions rather than homework I would resent, and when something did not work she was genuinely curious about why instead of treating it as non-compliance. There were weeks where I made no visible progress and she never made me feel like I was failing at recovery. What changed most is not that the hard days disappeared, because they have not, but that I now notice them arriving instead of only realising afterwards, and I have things I can actually do at that point. My family has commented that I sound less braced for impact on the phone. If you are reading this while hesitating the way I did, I would say the version of therapy I feared and the version I got were not the same thing at all.`,
        author: 'Ananya Deshpande',
        rating,
      },
    ],
  };
}

function firstName(name: string): string {
  return name.split(' ')[0] ?? name;
}

function createTherapist(
  base: Omit<Therapist, 'bio' | 'whyChooseUs' | 'testimonials' | 'availability'>,
): Therapist {
  return {
    ...base,
    ...profileContent(base.name, base.specialties[0] ?? 'personal goals', base.rating),
    availability: availabilityFor(base.id, base.experienceYears),
  };
}

export const THERAPISTS: Therapist[] = [
  createTherapist({
    id: 'gargi-yadav', name: 'Gargi Yadav', image: '', subtitle: 'Clinical Psychologist',
    qualifications: ['M.Phil', 'M.Sc'], experienceYears: 8, price: 2000, duration: '50 mins',
    sessionMode: 'Video & Audio', rating: 4.9, reviews: 128,
    specialties: [
      'Relationship & Communication Issues',
      'Anxiety & Emotional Regulation',
      'Self-Esteem & Personal Growth',
      'Grief & Emotional Well-being',
    ],
    languages: ['English', 'Hindi'],
  }),
  createTherapist({
    id: 'yukta-bansal', name: 'Yukta Bansal', image: '', subtitle: 'Counselling Psychologist',
    qualifications: ['M.Phil', 'M.A.'], experienceYears: 7, price: 1500, duration: '30 mins',
    sessionMode: 'Video & Audio', rating: 4.8, reviews: 96,
    specialties: [
      'Adolescent & Teen Counselling',
      'Relationship & Marital Issues',
      'Self-Esteem & Depression',
      'Women Challenges',
    ],
    languages: ['English', 'Hindi'],
  }),
  createTherapist({
    id: 'prerna-gawde', name: 'Prerna Gawde', image: '', subtitle: 'Clinical Psychologist',
    qualifications: ['M.Phil', 'M.A.'], experienceYears: 6, price: 2500, duration: '45 mins',
    sessionMode: 'Video & Audio', rating: 4.7, reviews: 74,
    specialties: ['Bipolar disorder', 'Schizophrenia'], languages: ['English', 'Hindi', 'Marathi'],
  }),
  createTherapist({
    id: 'rahul-menon', name: 'Rahul Menon', image: '', subtitle: 'Wellness Counsellor',
    qualifications: ['M.Sc', 'M.A.'], experienceYears: 9, price: 1800, duration: '40 mins',
    sessionMode: 'Video & Audio', rating: 4.8, reviews: 112,
    specialties: ['Burnout', 'Sleep Issues', 'Grief'], languages: ['English', 'Hindi', 'Malayalam'],
  }),
  createTherapist({
    id: 'sneha-iyer', name: 'Sneha Iyer', image: '', subtitle: 'Trauma-informed Psychologist',
    qualifications: ['M.Phil', 'M.Sc'], experienceYears: 10, price: 2200, duration: '50 mins',
    sessionMode: 'Video & Audio', rating: 4.9, reviews: 143,
    specialties: ['Trauma & PTSD', 'Anxiety & Stress', 'Self Esteem'], languages: ['English', 'Hindi', 'Tamil'],
  }),
  createTherapist({
    id: 'arjun-sharma', name: 'Arjun Sharma', image: '', subtitle: 'Counselling Psychologist',
    qualifications: ['M.A.', 'PG Diploma'], experienceYears: 5, price: 1200, duration: '30 mins',
    sessionMode: 'Video & Audio', rating: 4.6, reviews: 58,
    specialties: ['Career Stress', 'Anger Issues', 'OCD'], languages: ['English', 'Hindi'],
  }),
];
