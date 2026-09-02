import {
  Institution,
  SimulatedOutcome,
  StudentVerificationResult,
} from '../models/student-verification.model';

// Fixture data pending GET /api/institutions; domains mirror each institution's academic mail domain.
export const STUDENT_VERIFICATION_INSTITUTIONS: readonly Institution[] = [
  // Indian Institutes of Technology
  { id: 'iit-bombay', name: 'IIT Bombay', domains: ['iitb.ac.in'] },
  { id: 'iit-delhi', name: 'IIT Delhi', domains: ['iitd.ac.in'] },
  { id: 'iit-gandhinagar', name: 'IIT Gandhinagar', domains: ['iitgn.ac.in'] },
  { id: 'iit-goa', name: 'IIT Goa', domains: ['iitgoa.ac.in'] },
  { id: 'iit-guwahati', name: 'IIT Guwahati', domains: ['iitg.ac.in'] },
  { id: 'iit-hyderabad', name: 'IIT Hyderabad', domains: ['iith.ac.in'] },
  { id: 'iit-indore', name: 'IIT Indore', domains: ['iiti.ac.in'] },
  { id: 'iit-jammu', name: 'IIT Jammu', domains: ['iitjammu.ac.in'] },
  { id: 'iit-jodhpur', name: 'IIT Jodhpur', domains: ['iitj.ac.in'] },
  { id: 'iit-kanpur', name: 'IIT Kanpur', domains: ['iitk.ac.in'] },
  { id: 'iit-kharagpur', name: 'IIT Kharagpur', domains: ['iitkgp.ac.in'] },
  { id: 'iit-madras', name: 'IIT Madras', domains: ['iitm.ac.in'] },
  { id: 'iit-mandi', name: 'IIT Mandi', domains: ['iitmandi.ac.in'] },
  { id: 'iit-palakkad', name: 'IIT Palakkad', domains: ['iitpkd.ac.in'] },
  { id: 'iit-patna', name: 'IIT Patna', domains: ['iitp.ac.in'] },
  { id: 'iit-roorkee', name: 'IIT Roorkee', domains: ['iitr.ac.in'] },
  { id: 'iit-ism-dhanbad', name: 'IIT (ISM) Dhanbad', domains: ['iitism.ac.in'] },
  { id: 'iit-ropar', name: 'IIT Ropar', domains: ['iitrpr.ac.in'] },
  { id: 'iit-tirupati', name: 'IIT Tirupati', domains: ['iittp.ac.in'] },
  { id: 'iit-bhu', name: 'IIT (BHU) Varanasi', domains: ['iitbhu.ac.in'] },

  // National Institutes of Technology
  { id: 'nit-agartala', name: 'NIT Agartala', domains: ['nita.ac.in'] },
  { id: 'nit-arunachal-pradesh', name: 'NIT Arunachal Pradesh', domains: ['nitap.ac.in'] },
  { id: 'nit-calicut', name: 'NIT Calicut', domains: ['nitc.ac.in'] },
  { id: 'nit-delhi', name: 'NIT Delhi', domains: ['nitdelhi.ac.in'] },
  { id: 'nit-durgapur', name: 'NIT Durgapur', domains: ['nitdgp.ac.in'] },
  { id: 'nit-hamirpur', name: 'NIT Hamirpur', domains: ['nith.ac.in'] },
  { id: 'nit-jaipur', name: 'MNIT Jaipur', domains: ['mnit.ac.in'] },
  { id: 'nit-jamshedpur', name: 'NIT Jamshedpur', domains: ['nitjsr.ac.in'] },
  { id: 'nit-karnataka', name: 'NITK Surathkal', domains: ['nitk.edu.in'] },
  { id: 'nit-kurukshetra', name: 'NIT Kurukshetra', domains: ['nitkkr.ac.in'] },
  { id: 'nit-manipur', name: 'NIT Manipur', domains: ['nitmanipur.ac.in'] },
  { id: 'nit-meghalaya', name: 'NIT Meghalaya', domains: ['nitmeghalaya.in'] },
  { id: 'nit-mizoram', name: 'NIT Mizoram', domains: ['nitmz.ac.in'] },
  { id: 'nit-nagaland', name: 'NIT Nagaland', domains: ['nitnagaland.ac.in'] },
  { id: 'nit-patna', name: 'NIT Patna', domains: ['nitp.ac.in'] },
  { id: 'nit-raipur', name: 'NIT Raipur', domains: ['nitrr.ac.in'] },
  { id: 'nit-rourkela', name: 'NIT Rourkela', domains: ['nitrkl.ac.in'] },
  { id: 'nit-sikkim', name: 'NIT Sikkim', domains: ['nitsikkim.ac.in'] },
  { id: 'nit-silchar', name: 'NIT Silchar', domains: ['nits.ac.in'] },
  { id: 'nit-srinagar', name: 'NIT Srinagar', domains: ['nitsri.ac.in'] },
  { id: 'nit-trichy', name: 'NIT Tiruchirappalli', domains: ['nitt.edu'] },
  { id: 'nit-uttarakhand', name: 'NIT Uttarakhand', domains: ['nituk.ac.in'] },
  { id: 'nit-warangal', name: 'NIT Warangal', domains: ['nitw.ac.in'] },

  // IIITs, BITS, IISc and IISERs
  { id: 'iiit-allahabad', name: 'IIIT Allahabad', domains: ['iiita.ac.in'] },
  { id: 'iiit-bangalore', name: 'IIIT Bangalore', domains: ['iiitb.ac.in'] },
  { id: 'iiit-delhi', name: 'IIIT Delhi', domains: ['iiitd.ac.in'] },
  { id: 'iiit-hyderabad', name: 'IIIT Hyderabad', domains: ['iiit.ac.in'] },
  { id: 'iiit-kottayam', name: 'IIIT Kottayam', domains: ['iiitkottayam.ac.in'] },
  { id: 'iiit-lucknow', name: 'IIIT Lucknow', domains: ['iiitl.ac.in'] },
  { id: 'iiit-naya-raipur', name: 'IIIT Naya Raipur', domains: ['iiitnr.ac.in'] },
  { id: 'iiit-sri-city', name: 'IIIT Sri City', domains: ['iiits.ac.in'] },
  { id: 'iiit-vadodara', name: 'IIIT Vadodara', domains: ['iiitvadodara.ac.in'] },
  { id: 'bits-pilani', name: 'BITS Pilani', domains: ['bits-pilani.ac.in', 'pilani.bits-pilani.ac.in', 'goa.bits-pilani.ac.in', 'hyderabad.bits-pilani.ac.in', 'dubai.bits-pilani.ac.in'] },
  { id: 'iisc-bangalore', name: 'Indian Institute of Science', domains: ['iisc.ac.in'] },
  { id: 'iiser-berhampur', name: 'IISER Berhampur', domains: ['iiserbpr.ac.in'] },
  { id: 'iiser-bhopal', name: 'IISER Bhopal', domains: ['iiserb.ac.in'] },
  { id: 'iiser-kolkata', name: 'IISER Kolkata', domains: ['iiserkol.ac.in'] },
  { id: 'iiser-mohali', name: 'IISER Mohali', domains: ['iisermohali.ac.in'] },
  { id: 'iiser-pune', name: 'IISER Pune', domains: ['iiserpune.ac.in'] },
  { id: 'iiser-thiruvananthapuram', name: 'IISER Thiruvananthapuram', domains: ['iisertvm.ac.in'] },
  { id: 'iiser-tirupati', name: 'IISER Tirupati', domains: ['iisertirupati.ac.in'] },

  // Central and state universities
  { id: 'aligarh-muslim-university', name: 'Aligarh Muslim University', domains: ['amu.ac.in'] },
  { id: 'anna-university', name: 'Anna University', domains: ['annauniv.edu'] },
  { id: 'ashoka-university', name: 'Ashoka University', domains: ['ashoka.edu.in'] },
  { id: 'banaras-hindu-university', name: 'Banaras Hindu University', domains: ['bhu.ac.in'] },
  { id: 'central-university-of-rajasthan', name: 'Central University of Rajasthan', domains: ['curaj.ac.in'] },
  { id: 'delhi-university', name: 'University of Delhi', domains: ['du.ac.in'] },
  { id: 'gauhati-university', name: 'Gauhati University', domains: ['gauhati.ac.in'] },
  { id: 'jadavpur-university', name: 'Jadavpur University', domains: ['jadavpuruniversity.in'] },
  { id: 'jawaharlal-nehru-university', name: 'Jawaharlal Nehru University', domains: ['jnu.ac.in'] },
  { id: 'jamia-millia-islamia', name: 'Jamia Millia Islamia', domains: ['jmi.ac.in'] },
  { id: 'kerala-university', name: 'University of Kerala', domains: ['keralauniversity.ac.in'] },
  { id: 'mumbai-university', name: 'University of Mumbai', domains: ['mu.ac.in'] },
  { id: 'osmania-university', name: 'Osmania University', domains: ['osmania.ac.in'] },
  { id: 'presidency-university', name: 'Presidency University', domains: ['presiuniv.ac.in'] },
  { id: 'panjab-university', name: 'Panjab University', domains: ['pu.ac.in'] },
  { id: 'pondicherry-university', name: 'Pondicherry University', domains: ['pondiuni.edu.in'] },
  { id: 'savitribai-phule-pune-university', name: 'Savitribai Phule Pune University', domains: ['unipune.ac.in'] },
  { id: 'university-of-calcutta', name: 'University of Calcutta', domains: ['caluniv.ac.in'] },
  { id: 'university-of-hyderabad', name: 'University of Hyderabad', domains: ['uohyd.ac.in'] },
  { id: 'visva-bharati-university', name: 'Visva-Bharati University', domains: ['visva-bharati.ac.in'] },
  { id: 'vtu', name: 'Visvesvaraya Technological University', domains: ['vtu.ac.in'] },

  // Well-known affiliated colleges and private universities
  { id: 'amity-university', name: 'Amity University', domains: ['amity.edu'] },
  { id: 'bms-college-of-engineering', name: 'BMS College of Engineering', domains: ['bmsce.ac.in'] },
  { id: 'christ-university', name: 'Christ University', domains: ['christuniversity.in'] },
  { id: 'college-of-engineering-pune', name: 'College of Engineering Pune', domains: ['coep.ac.in'] },
  { id: 'flame-university', name: 'FLAME University', domains: ['flame.edu.in'] },
  { id: 'hindu-college', name: 'Hindu College', domains: ['hinducollege.ac.in'] },
  { id: 'kj-somaiya-college-of-engineering', name: 'K J Somaiya College of Engineering', domains: ['somaiya.edu'] },
  { id: 'loyola-college', name: 'Loyola College', domains: ['loyolacollege.edu'] },
  { id: 'manipal-university', name: 'Manipal Academy of Higher Education', domains: ['manipal.edu'] },
  { id: 'm-s-ramaiah-institute-of-technology', name: 'M S Ramaiah Institute of Technology', domains: ['msrit.edu'] },
  { id: 'madras-christian-college', name: 'Madras Christian College', domains: ['mcc.edu.in'] },
  { id: 'miranda-house', name: 'Miranda House', domains: ['mirandahouse.ac.in'] },
  { id: 'pes-university', name: 'PES University', domains: ['pes.edu'] },
  { id: 'psg-college-of-technology', name: 'PSG College of Technology', domains: ['psgtech.edu'] },
  { id: 'rv-college-of-engineering', name: 'R V College of Engineering', domains: ['rvce.edu.in'] },
  { id: 'srm-institute-of-science-and-technology', name: 'SRM Institute of Science and Technology', domains: ['srmist.edu.in'] },
  { id: 'shiv-nadar-university', name: 'Shiv Nadar University', domains: ['snu.edu.in'] },
  { id: 'st-stephens-college', name: "St. Stephen's College", domains: ['ststephens.edu'] },
  { id: 'symbiosis-international-university', name: 'Symbiosis International University', domains: ['siu.edu.in'] },
  { id: 'thadomal-shahani-engineering-college', name: 'Thadomal Shahani Engineering College', domains: ['tsec.edu'] },
  { id: 'vellore-institute-of-technology', name: 'Vellore Institute of Technology', domains: ['vit.ac.in'] },
  { id: 'amrita-vishwa-vidyapeetham', name: 'Amrita Vishwa Vidyapeetham', domains: ['amrita.edu'] },
  { id: 'azim-premji-university', name: 'Azim Premji University', domains: ['apu.edu.in'] },
  { id: 'bennett-university', name: 'Bennett University', domains: ['bennett.edu.in'] },
  { id: 'bml-munjal-university', name: 'BML Munjal University', domains: ['bml.edu.in'] },
  { id: 'college-of-engineering-guindy', name: 'College of Engineering Guindy', domains: ['annauniv.edu'] },
  { id: 'dayananda-sagar-college-of-engineering', name: 'Dayananda Sagar College of Engineering', domains: ['dsce.edu.in'] },
  { id: 'daiict', name: 'Dhirubhai Ambani Institute of Information and Communication Technology', domains: ['daiict.ac.in'] },
  { id: 'd-y-patil-international-university', name: 'Dr. D. Y. Patil Institute of Technology', domains: ['dypatil.edu'] },
  { id: 'government-college-of-engineering-pune', name: 'Government College of Engineering Pune', domains: ['gcoepune.ac.in'] },
  { id: 'gujarat-university', name: 'Gujarat University', domains: ['gujaratuniversity.ac.in'] },
  { id: 'hans-raj-college', name: 'Hans Raj College', domains: ['hrc.du.ac.in'] },
  { id: 'jain-university', name: 'Jain University', domains: ['jainuniversity.ac.in'] },
  { id: 'kalinga-institute-of-industrial-technology', name: 'Kalinga Institute of Industrial Technology', domains: ['kiit.ac.in'] },
  { id: 'kirori-mal-college', name: 'Kirori Mal College', domains: ['kmc.du.ac.in'] },
  { id: 'krea-university', name: 'Krea University', domains: ['krea.edu.in'] },
  { id: 'lovely-professional-university', name: 'Lovely Professional University', domains: ['lpu.in'] },
  { id: 'madras-institute-of-technology', name: 'Madras Institute of Technology', domains: ['mitindia.edu'] },
  { id: 'nirma-university', name: 'Nirma University', domains: ['nirmauni.ac.in'] },
  { id: 'new-horizon-college-of-engineering', name: 'New Horizon College of Engineering', domains: ['newhorizonindia.edu'] },
  { id: 'op-jindal-global-university', name: 'O. P. Jindal Global University', domains: ['jgu.edu.in'] },
  { id: 'ramjas-college', name: 'Ramjas College', domains: ['ramjas.du.ac.in'] },
  { id: 'sardar-patel-institute-of-technology', name: 'Sardar Patel Institute of Technology', domains: ['spit.ac.in'] },
  { id: 'sastra-deemed-university', name: 'SASTRA Deemed University', domains: ['sastra.edu'] },
  { id: 'shaheed-sukhdev-college-of-business-studies', name: 'Shaheed Sukhdev College of Business Studies', domains: ['sscbs.du.ac.in'] },
  { id: 'sir-m-visvesvaraya-institute-of-technology', name: 'Sir M. Visvesvaraya Institute of Technology', domains: ['sirmvit.edu'] },
  { id: 'sri-venkateswara-college', name: 'Sri Venkateswara College', domains: ['svc.ac.in'] },
  { id: 'ssn-college-of-engineering', name: 'SSN College of Engineering', domains: ['ssn.edu.in'] },
  { id: 'thapar-institute-of-engineering-and-technology', name: 'Thapar Institute of Engineering and Technology', domains: ['thapar.edu'] },
  { id: 'university-of-jammu', name: 'University of Jammu', domains: ['jammuuniversity.ac.in'] },
  { id: 'university-of-lucknow', name: 'University of Lucknow', domains: ['lkouniv.ac.in'] },
  { id: 'university-of-madras', name: 'University of Madras', domains: ['unom.ac.in'] },
  { id: 'university-of-mysore', name: 'University of Mysore', domains: ['uni-mysore.ac.in'] },
  { id: 'university-of-rajasthan', name: 'University of Rajasthan', domains: ['uniraj.ac.in'] },
  { id: 'upes', name: 'University of Petroleum and Energy Studies', domains: ['upes.ac.in'] },
  { id: 'vishwakarma-institute-of-technology', name: 'Vishwakarma Institute of Technology', domains: ['vit.edu'] },
  { id: 'veermata-jijabai-technological-institute', name: 'Veermata Jijabai Technological Institute', domains: ['vjti.ac.in'] },

  // Additional fixture coverage grouped by institute family.
  { id: 'iit-bhilai', name: 'IIT Bhilai', domains: ['iitbhilai.ac.in'] },
  { id: 'iit-bhubaneswar', name: 'IIT Bhubaneswar', domains: ['iitbbs.ac.in'] },
  { id: 'iit-dharwad', name: 'IIT Dharwad', domains: ['iitdh.ac.in'] },
  { id: 'nit-andhra-pradesh', name: 'NIT Andhra Pradesh', domains: ['nitandhra.ac.in'] },
  { id: 'nit-goa', name: 'NIT Goa', domains: ['nitgoa.ac.in'] },
  { id: 'nit-puducherry', name: 'NIT Puducherry', domains: ['nitpy.ac.in'] },
  { id: 'iiit-jabalpur', name: 'IIITDM Jabalpur', domains: ['iiitdmj.ac.in'] },
  { id: 'iiit-kancheepuram', name: 'IIITDM Kancheepuram', domains: ['iiitdm.ac.in'] },
  { id: 'iiit-pune', name: 'International Institute of Information Technology, Pune', domains: ['iiitp.ac.in'] },
  { id: 'iiit-ranchi', name: 'IIIT Ranchi', domains: ['iitranchi.ac.in'] },

  // Central and state universities.
  { id: 'aud', name: 'Ambedkar University Delhi', domains: ['aud.ac.in'] },
  { id: 'allahabad-university', name: 'University of Allahabad', domains: ['allduniv.ac.in'] },
  { id: 'central-university-of-gujarat', name: 'Central University of Gujarat', domains: ['cug.ac.in'] },
  { id: 'central-university-of-karnataka', name: 'Central University of Karnataka', domains: ['cuk.ac.in'] },
  { id: 'central-university-of-kerala', name: 'Central University of Kerala', domains: ['cukerala.ac.in'] },
  { id: 'central-university-of-punjab', name: 'Central University of Punjab', domains: ['cup.edu.in'] },
  { id: 'central-university-of-tamil-nadu', name: 'Central University of Tamil Nadu', domains: ['cutn.ac.in'] },
  { id: 'cochin-university-of-science-and-technology', name: 'Cochin University of Science and Technology', domains: ['cusat.ac.in'] },
  { id: 'dr-b-r-ambedkar-university', name: 'Dr. B. R. Ambedkar University', domains: ['dbrau.ac.in'] },
  { id: 'dr-harisingh-gour-university', name: 'Dr. Harisingh Gour Vishwavidyalaya', domains: ['dhsgsu.edu.in'] },
  { id: 'goa-university', name: 'Goa University', domains: ['unigoa.ac.in'] },
  { id: 'hemchandracharya-north-gujarat-university', name: 'Hemchandracharya North Gujarat University', domains: ['ngu.ac.in'] },
  { id: 'himachal-pradesh-university', name: 'Himachal Pradesh University', domains: ['hpuniv.ac.in'] },
  { id: 'kannur-university', name: 'Kannur University', domains: ['kannuruniversity.ac.in'] },
  { id: 'maharaja-sayajirao-university', name: 'The Maharaja Sayajirao University of Baroda', domains: ['msubaroda.ac.in'] },
  { id: 'mahatma-gandhi-university', name: 'Mahatma Gandhi University', domains: ['mgu.ac.in'] },
  { id: 'north-eastern-hill-university', name: 'North-Eastern Hill University', domains: ['nehu.ac.in'] },
  { id: 'rajiv-gandhi-university', name: 'Rajiv Gandhi University', domains: ['rgu.ac.in'] },
  { id: 'sikkim-university', name: 'Sikkim University', domains: ['cus.ac.in'] },
  { id: 'university-of-bihar', name: 'Babasaheb Bhimrao Ambedkar Bihar University', domains: ['brabu.net'] },
  { id: 'university-of-haryana', name: 'Central University of Haryana', domains: ['cuh.ac.in'] },
  { id: 'university-of-kashmir', name: 'University of Kashmir', domains: ['kashmiruniversity.net'] },
  { id: 'university-of-north-bengal', name: 'University of North Bengal', domains: ['nbu.ac.in'] },
  { id: 'utkal-university', name: 'Utkal University', domains: ['utkaluniversity.ac.in'] },

  // Major private universities and affiliated colleges.
  { id: 'bharati-vidyapeeth', name: 'Bharati Vidyapeeth', domains: ['bvdu.ac.in'] },
  { id: 'birla-institute-of-technology-mesra', name: 'Birla Institute of Technology, Mesra', domains: ['bitmesra.ac.in'] },
  { id: 'chandigarh-university', name: 'Chandigarh University', domains: ['cuchd.in'] },
  { id: 'chitkara-university', name: 'Chitkara University', domains: ['chitkara.edu.in'] },
  { id: 'galgotias-university', name: 'Galgotias University', domains: ['galgotiasuniversity.edu.in'] },
  { id: 'graphic-era-university', name: 'Graphic Era University', domains: ['geu.ac.in'] },
  { id: 'hindustan-institute-of-technology-and-science', name: 'Hindustan Institute of Technology and Science', domains: ['hindustanuniv.ac.in'] },
  { id: 'icfai-university', name: 'ICFAI University', domains: ['ifheindia.org'] },
  { id: 'ict-mumbai', name: 'Institute of Chemical Technology, Mumbai', domains: ['ictmumbai.edu.in'] },
  { id: 'jaypee-institute-of-information-technology', name: 'Jaypee Institute of Information Technology', domains: ['jiit.ac.in'] },
  { id: 'mit-world-peace-university', name: 'MIT World Peace University', domains: ['mitwpu.edu.in'] },
  { id: 'nmims', name: 'SVKM’s Narsee Monjee Institute of Management Studies', domains: ['nmims.edu'] },
  { id: 'parul-university', name: 'Parul University', domains: ['paruluniversity.ac.in'] },
  { id: 'rashtriya-raksha-university', name: 'Rashtriya Raksha University', domains: ['rru.ac.in'] },
  { id: 'sathyabama-institute-of-science-and-technology', name: 'Sathyabama Institute of Science and Technology', domains: ['sathyabama.ac.in'] },
  { id: 'sharda-university', name: 'Sharda University', domains: ['sharda.ac.in'] },
  { id: 'sikkim-manipal-institute-of-technology', name: 'Sikkim Manipal Institute of Technology', domains: ['smu.edu.in'] },
  { id: 'shoolini-university', name: 'Shoolini University', domains: ['shooliniuniversity.com'] },
  { id: 'woxsen-university', name: 'Woxsen University', domains: ['woxsen.edu.in'] },
  { id: 'xim-university', name: 'XIM University', domains: ['xim.edu.in'] },

  // Additional Delhi, Mumbai, Anna University, and VTU colleges.
  { id: 'daulat-ram-college', name: 'Daulat Ram College', domains: ['dr.du.ac.in'] },
  { id: 'gargi-college', name: 'Gargi College', domains: ['gargi.du.ac.in'] },
  { id: 'lady-shri-ram-college', name: 'Lady Shri Ram College for Women', domains: ['lsr.edu.in'] },
  { id: 'ram-lal-anand-college', name: 'Ram Lal Anand College', domains: ['rlac.du.ac.in'] },
  { id: 'sri-guru-gobind-singh-college-of-commerce', name: 'Sri Guru Gobind Singh College of Commerce', domains: ['sggscc.ac.in'] },
  { id: 'fr-conceicao-rodrigues-college', name: 'Fr. Conceicao Rodrigues College of Engineering', domains: ['frcrce.ac.in'] },
  { id: 'k-j-somaiya-institute-of-technology', name: 'K J Somaiya Institute of Technology', domains: ['somaiya.edu'] },
  { id: 'm-s-ramaiah-university', name: 'M. S. Ramaiah University of Applied Sciences', domains: ['msruas.ac.in'] },
  { id: 'acharya-institute-of-technology', name: 'Acharya Institute of Technology', domains: ['acharya.ac.in'] },
  { id: 'cmr-institute-of-technology', name: 'CMR Institute of Technology', domains: ['cmrit.ac.in'] },
  { id: 'jss-science-and-technology-university', name: 'JSS Science and Technology University', domains: ['sjce.ac.in'] },
  { id: 'saveetha-institute-of-medical-and-technical-sciences', name: 'Saveetha Institute of Medical and Technical Sciences', domains: ['saveetha.com'] },
] as const;

export const FIXTURE_OTP = '123456';
export const FIXTURE_CHECK_DELAY_MS = 240;
export const OTP_TTL_SECONDS = 10 * 60;
export const RESEND_COOLDOWN_SECONDS = 45;

export const ALLOWED_DOCUMENT_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'application/pdf',
] as const;

export const MAX_DOCUMENT_SIZE_BYTES = 3 * 1024 * 1024;

export function isAllowedDocumentMimeType(mimeType: string): boolean {
  return (ALLOWED_DOCUMENT_MIME_TYPES as readonly string[]).includes(mimeType.toLowerCase());
}

export function isAllowedDocumentSize(size: number): boolean {
  return Number.isFinite(size) && size >= 0 && size <= MAX_DOCUMENT_SIZE_BYTES;
}

export function isValidDocument(file: Pick<File, 'type' | 'size'>): boolean {
  return isAllowedDocumentMimeType(file.type) && isAllowedDocumentSize(file.size);
}

/** Fixture response factory. Replace this seam with the API response mapper. */
export function createFixtureResult(
  outcome: SimulatedOutcome,
  requestId: string,
  now = new Date(),
): StudentVerificationResult | null {
  switch (outcome) {
    case 'approved':
      return {
        requestId,
        status: 'approved',
        verifiedUntil: new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      };
    case 'alreadyVerified':
      return {
        requestId,
        status: 'approved',
        verifiedUntil: new Date(now.getTime() + 120 * 24 * 60 * 60 * 1000).toISOString(),
        reasonCode: 'already_verified',
      };
    case 'failed':
      return { requestId, status: 'rejected', reasonCode: 'not_enrolled' };
    case 'otpExpired':
      return { requestId, status: 'rejected', reasonCode: 'otp_expired' };
    case 'error':
      return null;
  }
}
