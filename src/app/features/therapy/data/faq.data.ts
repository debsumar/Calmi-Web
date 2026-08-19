import type { Therapist } from './therapist.data';

export interface TherapyFaq {
  question: string;
  answer: string;
}

export const THERAPY_FAQS: TherapyFaq[] = [
  {
    question: 'How is Calmi different from other mental wellness apps?',
    answer: 'Calmi brings mood tracking, personalized guidance, sleep support, journaling, and therapist connections into one calm, personalized experience.',
  },
  {
    question: 'Is Calmi a replacement for professional therapy?',
    answer: 'No. Calmi is designed to complement professional support, not replace a qualified psychologist or therapist.',
  },
  {
    question: 'How does Sleep Mode recommend the right audio for me?',
    answer: 'Sleep Mode uses your preferences, mood, and listening patterns to surface calming sounds and sessions suited to how you want to wind down.',
  },
  {
    question: 'How do I know which psychologist is right for me?',
    answer: 'Calmi uses your goals, preferences, and support needs to recommend psychologists who may be a good fit. You can review their profiles before choosing.',
  },
  {
    question: 'Can I use Calmi for free before subscribing?',
    answer: 'Yes. Calmi will offer free access to selected features, with premium content and experiences available through a subscription.',
  },
];

export function createTherapistFaqs(profile: Therapist): TherapyFaq[] {
  const sessionMode = profile.sessionMode.toLowerCase();
  const languages = profile.languages.join(', ');

  return [
    {
      question: 'What happens during my first session?',
      answer: `Your first ${profile.duration} ${sessionMode} session with ${profile.name} is mostly a conversation. You will talk about what brought you here, what you would like support with, and what pace feels comfortable, and you can ask anything you want before deciding what to focus on together. Sessions can be held in ${languages}.`,
    },
    {
      question: 'How many sessions will I need?',
      answer: 'There is no fixed number, because it depends on what you are working through and what you want from therapy. Some people come for a few focused sessions, others continue over a longer period. You and your therapist can review how things are going and adjust as you go.',
    },
    {
      question: 'Can I switch therapists if I don’t feel the right connection?',
      answer: 'Yes, and it is a normal thing to ask for. Feeling comfortable with your therapist matters more than staying with the first one you booked. You can browse other profiles on Calmi and book someone whose approach, language, or availability suits you better.',
    },
  ];
}
