export type ExperienceStory = {
  id: string;
  title: string;
  location: string;
  trade: string;
  outcome: string;
  quote: string;
  customer: string;
  beforeImage: string;
  afterImage: string;
};

export type PricingPlan = {
  id: string;
  name: string;
  priceLabel: string;
  cadence: string;
  highlight?: boolean;
  description: string;
  bullets: string[];
  cta: string;
  minimumTerm?: string;
  minimumTotal?: string;
};

export const EXPERIENCE_STORIES: ExperienceStory[] = [
  {
    id: 'exp-1',
    title: 'Bathroom refresh completed in one weekend',
    location: 'Parramatta, NSW',
    trade: 'Plumbing + Tiling',
    outcome: 'Old fixtures deteriorated, replaced with modern plumbing system, new tiles, and contemporary bathroom design.',
    quote: 'We posted on Friday, reviewed qualified tradies, and had the bathroom completely transformed by Sunday afternoon.',
    customer: 'Amelia R.',
    beforeImage: 'https://images.unsplash.com/photo-1460317442991-0ec209397118?auto=format&fit=crop&w=900&h=620&q=80',
    afterImage: 'https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=900&h=620&q=80',
  },
  {
    id: 'exp-2',
    title: 'Front yard redesign with better drainage',
    location: 'Geelong, VIC',
    trade: 'Landscaping',
    outcome: 'Overgrown, muddy front yard transformed to manicured landscape with new paving, drainage, and attractive plantings.',
    quote: 'The reviews helped us choose the right landscaper. We could see their previous work and customer proof.',
    customer: 'Jordan P.',
    beforeImage: 'https://images.unsplash.com/photo-1416331108676-a22ccb276e35?auto=format&fit=crop&w=900&h=620&q=80',
    afterImage: 'https://images.unsplash.com/photo-1448630360428-65456885c650?auto=format&fit=crop&w=900&h=620&q=80',
  },
  {
    id: 'exp-3',
    title: 'Kitchen lighting upgraded without rewiring guesswork',
    location: 'Brisbane, QLD',
    trade: 'Electrical',
    outcome: 'Dark kitchen with outdated fixtures upgraded to modern LED task lighting, better switchgear, and improved electrical safety.',
    quote: 'The electrician profile and review history made the decision easy. We knew exactly what standard to expect and got it.',
    customer: 'Nina T.',
    beforeImage: 'https://images.unsplash.com/photo-1472220625704-91e1462799b2?auto=format&fit=crop&w=900&h=620&q=80',
    afterImage: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=900&h=620&q=80',
  },
  {
    id: 'exp-4',
    title: 'Deck repair turned into an outdoor entertaining upgrade',
    location: 'Newcastle, NSW',
    trade: 'Carpentry',
    outcome: 'Weathered, splintered deck completely rebuilt with treated timber, sealed properly, and extended for entertaining.',
    quote: 'The contractor history and reviews next to the quote made the decision transparent. Great work and professionalism.',
    customer: 'Lewis C.',
    beforeImage: 'https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=900&h=620&q=80',
    afterImage: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&h=620&q=80',
  },
  {
    id: 'exp-5',
    title: 'Roof leak solved before the next rain cycle',
    location: 'Wollongong, NSW',
    trade: 'Roofing',
    outcome: 'Recurring leak diagnosed quickly, damaged area sealed, flashing repaired, and roof protected before next rainfall.',
    quote: 'Speed mattered, but so did trust. The recent reviews gave us confidence to hire fast and get it done.',
    customer: 'Priya D.',
    beforeImage: 'https://images.unsplash.com/photo-1464890100898-a385f744067f?auto=format&fit=crop&w=900&h=620&q=80',
    afterImage: 'https://images.unsplash.com/photo-1502005229762-cf1b2da7c5d6?auto=format&fit=crop&w=900&h=620&q=80',
  },
  {
    id: 'exp-6',
    title: 'Interior repaint that lifted the whole property',
    location: 'Adelaide, SA',
    trade: 'Painting',
    outcome: 'Property went from tired and uneven to crisp, bright, and inspection-ready with professional interior painting.',
    quote: 'The platform experience felt much calmer than marketplace alternatives. Less noise, better decisions.',
    customer: 'Megan S.',
    beforeImage: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=900&h=620&q=80',
    afterImage: 'https://images.unsplash.com/photo-1464146072230-91cabc968266?auto=format&fit=crop&w=900&h=620&q=80',
  },
  {
    id: 'exp-7',
    title: 'Laundry floor retiled with clearer quote comparisons',
    location: 'Canberra, ACT',
    trade: 'Tiling',
    outcome: 'Bathroom tiling work awarded with less back-and-forth because customer could compare scope and contractor proof together.',
    quote: 'Instead of vague replies, we compared proper profiles. Faster decision, better result.',
    customer: 'Daniel H.',
    beforeImage: 'https://images.unsplash.com/photo-1460317442991-0ec209397118?auto=format&fit=crop&w=900&h=620&q=80',
    afterImage: 'https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=900&h=620&q=80',
  },
  {
    id: 'exp-8',
    title: 'Shed removal cleared the way for a full backyard project',
    location: 'Perth, WA',
    trade: 'Demolition',
    outcome: 'Neglected shed and old slab safely removed, opening the site for the next construction phase with better access.',
    quote: 'The demolition contractor had the right reviews and job notes were much clearer than other sites.',
    customer: 'Hayley M.',
    beforeImage: 'https://images.unsplash.com/photo-1464890100898-a385f744067f?auto=format&fit=crop&w=900&h=620&q=80',
    afterImage: 'https://images.unsplash.com/photo-1416331108676-a22ccb276e35?auto=format&fit=crop&w=900&h=620&q=80',
  },
  {
    id: 'exp-9',
    title: 'Emergency plumbing issue turned into a full fix',
    location: 'Gold Coast, QLD',
    trade: 'Plumbing',
    outcome: 'What started as a leak became a full fixture upgrade with cleaner pricing expectations and fast response.',
    quote: 'We could see which providers handled urgent jobs well. This team exceeded expectations.',
    customer: 'Sophie W.',
    beforeImage: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=900&h=620&q=80',
    afterImage: 'https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=900&h=620&q=80',
  },
  {
    id: 'exp-10',
    title: 'Small office refresh delivered through two trusted trades',
    location: 'Melbourne, VIC',
    trade: 'Electrical + Painting',
    outcome: 'Office space upgraded with fresh walls, professional lighting, and modern aesthetics with coordinated trades.',
    quote: 'The experience felt like a real product. Less random lead chasing, more professional coordination.',
    customer: 'Chris A.',
    beforeImage: 'https://images.unsplash.com/photo-1472220625704-91e1462799b2?auto=format&fit=crop&w=900&h=620&q=80',
    afterImage: 'https://images.unsplash.com/photo-1464146072230-91cabc968266?auto=format&fit=crop&w=900&h=620&q=80',
  },
];

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: 'starter',
    name: 'Starter',
    priceLabel: '$1',
    cadence: 'per month',
    description: 'For customers or small providers testing the platform with light usage.',
    bullets: [
      'Core TradeConnect access',
      'Category browsing and provider discovery',
      'Basic quote and messaging access',
      '36-month minimum commitment',
    ],
    cta: 'Start with Starter',
    minimumTerm: '36 months minimum commitment',
    minimumTotal: '$36 total minimum',
  },
  {
    id: 'growth',
    name: 'Growth',
    priceLabel: '$2',
    cadence: 'per month',
    highlight: true,
    description: 'For active users who want the standard TradeConnect workflow at the default subscription level.',
    bullets: [
      'Everything in Starter',
      'Priority visibility across discovery surfaces',
      'Extended profile and review visibility',
      '36-month minimum commitment',
    ],
    cta: 'Choose Growth',
    minimumTerm: '36 months minimum commitment',
    minimumTotal: '$72 total minimum',
  },
  {
    id: 'pro',
    name: 'Pro',
    priceLabel: '$5',
    cadence: 'per month',
    description: 'For power users who want the strongest ongoing marketplace presence.',
    bullets: [
      'Everything in Growth',
      'Top-tier account visibility',
      'Best fit for regular provider activity',
      '36-month minimum commitment',
    ],
    cta: 'Go Pro',
    minimumTerm: '36 months minimum commitment',
    minimumTotal: '$180 total minimum',
  },
  {
    id: 'flex-pass',
    name: 'No Lock-In Pass',
    priceLabel: '$20',
    cadence: 'one-time fee',
    description: 'A single 30-day access pass for users who want to try TradeConnect without a monthly commitment.',
    bullets: [
      '30-day trial access window',
      'No lock-in contract for the first pass',
      'Best for one-off evaluation or urgent use',
      'After the 30-day pass, repeat use with the same address and phone number must move to a monthly subscription',
    ],
    cta: 'Use 30-Day Pass',
  },
];

export const PRICING_POLICY_NOTES = [
  'All pricing shown here is demo pricing for the TradeConnect experience pages.',
  'The $20 no lock-in pass is a one-time 30-day trial option.',
  'If the same user returns with the same address and phone number after using the one-time pass, they must move onto a monthly subscription plan.',
  'Starter, Growth, and Pro each carry a 36-month minimum commitment based on their monthly rate.',
  'Minimum totals are $36 for Starter, $72 for Growth, and $180 for Pro.',
];
