export type AvailabilityState = 'available' | 'unavailable';
export type Gender = 'female' | 'male' | 'non-binary';
export type SessionMode = 'Video' | 'Audio' | 'Chat';
export type AvailabilityFilter = 'any' | 'today' | 'week' | 'weekend';

export type ExpertBenefitId =
  | 'personalized-approach'
  | 'safe-non-judgmental'
  | 'holistic-perspective'
  | 'evidence-informed-care';

export interface ExpertWhyChooseUs {
  id: ExpertBenefitId;
  label: 'Personalized Approach' | 'Safe & Non-Judgmental' | 'Holistic Perspective' | 'Evidence-Informed Care';
}

export interface ExpertTestimonial {
  quote: string;
  author: string;
  rating: number;
}

export interface ExpertSessionSlot {
  id: string;
  label: string;
}

export interface ExpertAvailabilityDay {
  date: string;
  state: AvailabilityState;
  slots: ExpertSessionSlot[];
}

export interface Expert {
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
  whyChooseUs: ExpertWhyChooseUs[];
  testimonials: ExpertTestimonial[];
  availability: ExpertAvailabilityDay[];
}

export interface ExpertFilterCriteria {
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

export const DEFAULT_FILTER_CRITERIA: ExpertFilterCriteria = {
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

const BENEFITS: ExpertWhyChooseUs[] = [
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
  workingDays?: readonly number[],
): ExpertAvailabilityDay[] {
  const today = localToday();
  const morningHour = 9 + (Math.floor(experienceYears) % 3);

  return Array.from({ length: 60 }, (_, offset) => {
    const date = addDays(today, offset);
    const unavailable = offset <= unavailableThrough
      || (workingDays ? !workingDays.includes(date.getDay()) : (offset + unavailableShift) % 4 === 0);
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
  // Skip honorifics so testimonials read "Finding Chandana", not "Finding Dr.".
  const parts = name.split(' ').filter((part) => !/^(dr|mr|mrs|ms)\.?$/i.test(part));
  return parts[0] ?? name;
}

function profileContent(name: string, specialty: string, rating: number): Pick<Expert, 'bio' | 'whyChooseUs' | 'testimonials'> {
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

function createExpert(
  base: Omit<Expert, 'bio' | 'whyChooseUs' | 'testimonials' | 'availability' | 'sessionMode'> & { bio?: string },
  unavailableThrough = 0,
  unavailableShift = 0,
  workingDays?: readonly number[],
): Expert {
  return {
    ...base,
    sessionMode: sessionModeLabel(base.sessionModes),
    ...profileContent(base.name, base.specialties[0] ?? 'personal goals', base.rating),
    ...(base.bio ? { bio: base.bio } : {}),
    availability: availabilityFor(base.id, base.experienceYears, unavailableThrough, unavailableShift, workingDays),
  };
}

export const EXPERTS: Expert[] = [
  createExpert({ id: 'pavneet-kaur', name: 'Pavneet Kaur', image: 'assets/users/pavneet.avif', subtitle: 'Counselling Psychologist', qualifications: ['Masters in Psychology'], experienceYears: 2, price: 1500, duration: '45 mins', sessionModes: ['Video'], gender: 'female', rating: 4.8, reviews: 24, specialties: ['Anxiety', 'Depression', 'Trauma & PTSD', 'Relationships', 'Stress Management'], languages: ['English', 'Hindi', 'Punjabi'], bio: 'I am a Counselling Psychologist with an MA in Clinical Psychology, trained in CBT and REBT, and a trauma-informed approach to counselling. I work with individuals experiencing anxiety, stress, relationship concerns, emotional difficulties, self-esteem concerns, life transitions, and unhelpful thought patterns. My approach is collaborative, empathetic, and focused on helping clients develop practical coping strategies, healthier perspectives, and sustainable emotional well-being.' }, -1, 0, [1, 2, 3, 4, 5]),
  createExpert({ id: 'neena-pareek', name: 'Neena Pareek', image: 'assets/users/neena.avif', subtitle: 'Reiki Healer, Breathwork & Meditation Practitioner', qualifications: ['MSc (IT)', 'Reiki Master'], experienceYears: 15, price: 1000, duration: '45 mins', sessionModes: ['Video'], gender: 'female', rating: 4.9, reviews: 210, specialties: ['Anxiety', 'Stress Management', 'Depression'], languages: ['Hindi'], bio: 'I am a Reiki Healer and Breathwork Practitioner with 15 years of experience, helping people reduce stress, anxiety and emotional overwhelm through personalised Reiki healing, breathwork and meditation practices. My approach is gentle, supportive and focused on creating a calm and balanced state of mind.' }, -1, 0, [1, 2, 3, 4, 5, 6]),
  createExpert({ id: 'rini-rao', name: 'Rini Rao', image: 'assets/users/rini.avif', subtitle: 'Relationship and Emotional Wellness Coach', qualifications: ['Certified Life Coach'], experienceYears: 6, price: 1500, duration: '45 mins', sessionModes: ['Video'], gender: 'female', rating: 4.8, reviews: 88, specialties: ['Relationships', 'Postpartum', 'Psychosexual Issues', 'Emotional Intimacy'], languages: ['English', 'Hindi'], bio: 'I help couples and individuals build deeper emotional intimacy, improve communication, repair conflicts, and navigate relationship and parenthood stress. I offer 1:1 coaching to help you build healthier, stronger relationships.' }, -1, 0, [1, 2, 3, 4, 5, 6]),
  createExpert({ id: 'isha-attri', name: 'Isha Attri', image: 'assets/users/isha.avif', subtitle: 'Life Coach', qualifications: ['Masters in Human Resources'], experienceYears: 1, price: 1500, duration: '60 mins', sessionModes: ['Video'], gender: 'female', rating: 4.8, reviews: 16, specialties: ['Relationships', 'Stress Management'], languages: ['English', 'Hindi'], bio: "I'm an ICF Level 2-trained Life Coach and ICF CCE-certified Parenting & Leadership Coach with 12+ years of corporate leadership experience. I help working professionals navigate stress, overthinking, emotional triggers, burnout, relationships, and career challenges through reflective, practical, and action-oriented coaching that supports sustainable personal and professional growth." }, -1, 0, [1, 2, 3, 4, 5]),
  createExpert({ id: 'divyanshi-tolani', name: 'Divyanshi Tolani', image: 'assets/users/divyanshi.avif', subtitle: 'Clinical Psychologist (A)', qualifications: ['Professional Diploma in Clinical Psychology (PDCP)'], experienceYears: 3, price: 1600, duration: '45 mins', sessionModes: ['Video'], gender: 'female', rating: 4.8, reviews: 32, specialties: ['Anxiety', 'Depression', 'Relationships', 'Stress Management', 'Couple Therapy', 'OCD'], languages: ['English', 'Hindi', 'Sindhi'], bio: 'I’m Divyanshi Tolani, a RCI Registered Clinical Psychologist with experience working with adolescents, young adults, and adults across a range of emotional and psychological concerns. My work includes supporting individuals experiencing anxiety, depression, stress, emotional regulation difficulties, interpersonal concerns, adjustment challenges, and life transitions. My approach to therapy is integrative and client-centered. I draw from approaches such as CBT and DBT, along with supportive and skills-based interventions, depending on what feels most helpful for the individual. I believe therapy is not about fitting everyone into the same framework, but about understanding each person’s unique experiences, patterns, and needs. I aim to create a space that feels safe, non-judgmental, and collaborative, where you can better understand yourself, work through what you’re experiencing, and develop tools that support meaningful and sustainable change.' }, -1, 0, [1, 3, 5]),
  createExpert({ id: 'param-sambodhi', name: 'Param Sambodhi', image: 'assets/users/param.avif', subtitle: 'Relationship Coach & Emotional Intelligence Expert', qualifications: ['Certified Emotional Intelligence Coach'], experienceYears: 9, price: 2500, duration: '60 mins', sessionModes: ['Video'], gender: 'female', rating: 4.9, reviews: 156, specialties: ['Relationships', 'Stress Management'], languages: ['English', 'Hindi'], bio: "I'm Param and I believe healthier relationships begin with understanding ourselves first. As a Relationship Coach and Emotional Intelligence Expert with 9+ years of experience, I’ve guided 10,000+ individuals through relationship challenges, emotional struggles and personal growth. My approach combines emotional awareness, self-understanding and practical communication tools to help people build healthier relationships — with themselves and others." }, -1, 0, [1, 2, 3, 4, 5, 6]),
  createExpert({ id: 'florentina-martin', name: 'Florentina Martin', image: 'assets/users/florentina.avif', subtitle: 'Life & Clarity Coach', qualifications: ['Certified Life Coach'], experienceYears: 10, price: 1200, duration: '60 mins', sessionModes: ['Video'], gender: 'female', rating: 4.8, reviews: 64, specialties: ['Anxiety', 'Relationships', 'Stress Management', 'Self-worth', 'Emotional Intelligence', 'Boundaries', 'Confidence', 'Life Transitions', 'Overthinking', 'People-pleasing', 'Goal Setting', 'Work-life Balance'], languages: ['English', 'Tamil'], bio: "I'm a Certified Life Coach and corporate professional with 10+ years of experience. I help women navigate life’s transitions, relationships, ambition and identity with greater clarity, confidence and emotional intelligence. My approach combines practical guidance with a focus on self-awareness, goal setting, healthy boundaries, self-worth and navigating relationships, stress and the limiting beliefs that can hold us back by creating a safe, non-judgmental space to help you gain clarity, make intentional choices and move forward with confidence." }, -1, 0, [1, 3]),
  createExpert({ id: 'chandana-reddy', name: 'Dr. Chandana Reddy', image: 'assets/users/chandana.avif', subtitle: 'Holistic Wellness & Transformation Coach', qualifications: ['Oncologist', 'Life Coach', 'Leadership & Executive Coach', 'Somatic Coach', 'Shadow Work Coach'], experienceYears: 10, price: 2999, duration: '60 mins', sessionModes: ['Video'], gender: 'female', rating: 4.9, reviews: 72, specialties: ['Anxiety', 'Depression', 'Trauma & PTSD', 'Relationships', 'Stress Management', 'Weight Management'], languages: ['English', 'Hindi', 'Kannada', 'Telugu'], bio: "I'm a former oncologist turned holistic wellness, somatic, and transformation coach. After years of treating illness from the inside out, I now empower individuals to bridge the mind-body connection—guiding you to step into your healthiest, happiest, and most wholesome self." }, -1, 0, [0, 1, 2, 3, 4, 5, 6]),
  createExpert({ id: 'heena-pahuja', name: 'Heena Pahuja', image: 'assets/users/heena.avif', subtitle: 'RCI Licensed Counselling Psychologist', qualifications: ['MSc Clinical Psychology'], experienceYears: 4, price: 1500, duration: '60 mins', sessionModes: ['Video'], gender: 'female', rating: 4.8, reviews: 40, specialties: ['Relationships', 'Stress Management'], languages: ['English'], bio: "I’m Heena, and my approach focuses on understanding what lies beneath behavior rather than just addressing the surface problem. I’ve worked with children, adolescents, parents, educators, and working professionals, helping people better understand their thoughts, emotions, relationships, and choices. My goal is to create a safe space for practical learning, self-understanding, and meaningful change at their own pace." }, -1, 0, [1, 2, 3, 4, 5, 6]),
  createExpert({ id: 'anisha-gugale', name: 'Anisha Gugale', image: 'assets/users/anisha.avif', subtitle: 'Clinical Psychology', qualifications: ['Masters in Clinical Psychology'], experienceYears: 1, price: 599, duration: '60 mins', sessionModes: ['Video'], gender: 'female', rating: 4.8, reviews: 40, specialties: ['Anxiety', 'Relationships', 'Stress Management'], languages: ['English', 'Hindi', 'Marathi'], bio: "I’m Anisha and am finishing my Master’s in Clinical Psychology. Having interned at multiple places, in varying settings I have realised both - the beauty and the misery of human life. Taking up psychology as a career path is my way of giving back to the ‘human’ in all the people around." }, -1, 0, [1, 2, 3, 4, 5]),
  createExpert({ id: 'mitali-gupta', name: 'Mitali Gupta', image: 'assets/users/mitali.avif', subtitle: 'Counselling Psychologist', qualifications: ['Masters in Clinical Psychology'], experienceYears: 2, price: 1200, duration: '45 mins', sessionModes: ['Video'], gender: 'female', rating: 4.8, reviews: 40, specialties: ['Cognitive Behaviour Therapy', 'Anxiety', 'Depression', 'Trauma & PTSD', 'Relationships', 'Stress Management'], languages: ['English', 'Hindi'], bio: "I’m Mitali, and I help young adults overcome stress, anxiety, and relationship problems. I create a safe, supportive space where you can understand yourself better, build healthier relationships, and feel more confident in navigating life’s challenges. My goal is to help you feel heard, understood, and empowered to create positive changes in your life." }, -1, 0, [0, 1, 2, 3, 4, 5, 6]),
  createExpert({ id: 'gargi-yadav', name: 'Gargi Yadav', image: 'assets/users/gargi.avif', subtitle: 'Counselling Psychologist', qualifications: ['B.A', 'M.A. (Psychology)'], experienceYears: 4.5, price: 2000, duration: '50 mins', sessionModes: ['Video', 'Audio'], gender: 'female', rating: 4.9, reviews: 128, specialties: ['Relationship & Communication Issues', 'Anxiety & Emotional Regulation', 'Self-Esteem & Personal Growth', 'Grief & Emotional Well-being'], languages: ['English', 'Hindi'] }, -1, 1),
  createExpert({ id: 'yukta-bansal', name: 'Yukta Bansal', image: 'assets/users/yukta.avif', subtitle: 'Counselling Psychologist', qualifications: ['BA', 'MA Psychology'], experienceYears: 3, price: 1500, duration: '40 mins', sessionModes: ['Video', 'Audio'], gender: 'female', rating: 4.8, reviews: 96, specialties: ['Teen & Adult Counselling', 'Relationship & Marital Issues', 'Self-Esteem & Depression', 'Women Challenges'], languages: ['English', 'Hindi'] }, 1, 1),
  createExpert({ id: 'manheer-kaur', name: 'Manheer Kaur', image: 'assets/users/manheer.avif', subtitle: 'Counselling Psychologist', qualifications: ['Masters in Clinical Psychology'], experienceYears: 2, price: 1500, duration: '60 mins', sessionModes: ['Video'], gender: 'female', rating: 4.8, reviews: 40, specialties: ['Trauma & PTSD', 'Relationships', 'Stress Management', 'Addiction', 'Depression', 'Anxiety'], languages: ['English', 'Hindi', 'Punjabi'], bio: 'I am Manheer, a CBT-certified therapist with a Master’s in Psychology (Clinical Psychology) and a Post Graduate Diploma in Guidance and Counselling. I have around 2 years of experience in counselling and working with clients, supporting them with anxiety, stress, overthinking, relationship concerns, and emotional regulation. My approach integrates CBT, ACT, and person-centered techniques.' }, -1, 0, [1, 2, 3, 4, 5, 6]),
  createExpert({ id: 'ritika-arora', name: 'Ritika Arora', image: 'assets/users/ritika.avif', subtitle: 'Inner Alignment Guide & Intuitive Counsellor', qualifications: ["Bachelor's Degree"], experienceYears: 2, price: 3100, duration: '60 mins', sessionModes: ['Video'], gender: 'female', rating: 4.8, reviews: 24, specialties: ['Guided Meditation', 'Yoga Nidra', 'Nervous System Regulation', 'Trauma & PTSD', 'Relationships', 'Depression', 'Anxiety', 'Stress Management'], languages: ['English', 'Hindi'], bio: 'I’m Ritika, working at the intersection of Psychology and Spirituality. In my 1:1 guided sessions, I create a space for deep inner work—helping individuals uncover and release unconscious patterns, reconnect with their authenticity and inner wisdom, and create meaningful shifts in how they relate to themselves, others, and their nervous system.' }, -1, 0, [1, 2, 3, 4, 5, 6]),
  createExpert({ id: 'bhakti-kataria', name: 'Bhakti Kataria', image: 'assets/users/bhakti.avif', subtitle: 'Expressive Arts Therapist & Counselling Psychologist', qualifications: ['MSc Counselling Psychology', 'Level 3 UNESCO-CID Expressive Arts Therapy License'], experienceYears: 2, price: 1200, duration: '60 mins', sessionModes: ['Video'], gender: 'female', rating: 4.8, reviews: 24, specialties: ['Anxiety', 'Depression', 'Emotional Dysregulation', 'Overwhelm', 'Burnout', 'Academic Stress', 'Career Stress', 'Self-esteem', 'Self-worth', 'Stress Management'], languages: ['English', 'Hindi', 'Sindhi'], bio: 'I’m Bhakti, an Expressive Arts Therapist and Counselling Psychologist. I completed my MSc in Counselling Psychology from CHRIST (Deemed to be University), Delhi NCR, and Level 3 Expressive Arts licensing from UNESCO-CID, with additional training in REBT and ACT. My experience spans hospitals, de-addiction centres, psychiatric setups, assisted living homes, and schools, where I have worked with adolescents, adults, and elderly populations using narrative and other expressive arts approaches. I work with 1:1 psychotherapy clients and facilitate school and corporate workshops.' }, -1, 0, [2, 3, 4, 5]),
];

const PRICES = EXPERTS.map((expert) => expert.price);
const RATING_VALUES = EXPERTS.map((expert) => expert.rating);
const EXPERIENCE_VALUES = EXPERTS.map((expert) => Math.floor(expert.experienceYears));
const MIN_RATING = Math.min(...RATING_VALUES);
const MIN_EXPERIENCE = Math.min(...EXPERIENCE_VALUES);

export const LANGUAGE_OPTIONS: readonly string[] = Array.from(new Set(EXPERTS.flatMap((expert) => expert.languages))).sort();
export const SPECIALTY_OPTIONS: readonly string[] = Array.from(new Set(EXPERTS.flatMap((expert) => expert.specialties))).sort();
export const SESSION_MODE_OPTIONS: readonly SessionMode[] = Array.from(new Set(EXPERTS.flatMap((expert) => expert.sessionModes))).sort() as SessionMode[];
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

export function firstAvailableDay(expert: Expert): ExpertAvailabilityDay | undefined {
  return expert.availability.find((day) => day.state === 'available' && day.slots.length > 0);
}

export function hasAvailability(expert: Expert, availability: AvailabilityFilter, today = localToday()): boolean {
  if (availability === 'any') return true;
  const normalizedToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const todayKey = toDateKey(normalizedToday);
  const weekEnd = addDays(normalizedToday, 6);
  return expert.availability.some((day) => {
    if (day.state !== 'available' || day.slots.length === 0) return false;
    if (availability === 'today') return day.date === todayKey;
    const date = fromDateKey(day.date);
    if (availability === 'week') return date >= normalizedToday && date <= weekEnd;
    return date >= normalizedToday && date <= weekEnd && (date.getDay() === 0 || date.getDay() === 6);
  });
}

export function filterExperts(
  experts: readonly Expert[],
  criteria: ExpertFilterCriteria,
  today = localToday(),
): Expert[] {
  const normalizedToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return experts.filter((expert) => {
    if (!hasAvailability(expert, criteria.availability, normalizedToday)) return false;
    if (criteria.genders.length > 0 && !criteria.genders.includes(expert.gender)) return false;
    if (criteria.languages.length > 0 && !criteria.languages.some((language) => expert.languages.includes(language))) return false;
    if (criteria.priceMin !== null && expert.price < criteria.priceMin) return false;
    if (criteria.priceMax !== null && expert.price > criteria.priceMax) return false;
    if (criteria.minRating !== null && expert.rating < criteria.minRating) return false;
    if (criteria.minExperience !== null && expert.experienceYears < criteria.minExperience) return false;
    if (criteria.specialty !== null && !expert.specialties.includes(criteria.specialty)) return false;
    if (criteria.sessionMode !== null && !expert.sessionModes.includes(criteria.sessionMode)) return false;
    return true;
  });
}
