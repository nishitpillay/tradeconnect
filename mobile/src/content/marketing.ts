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
};

export const EXPERIENCE_STORIES: ExperienceStory[] = [
  {
    id: 'exp-1',
    title: 'Bathroom refresh completed in one weekend',
    location: 'Parramatta, NSW',
    trade: 'Plumbing + Tiling',
    outcome: 'Old fittings replaced, shower resealed, and tiling cleaned up with one coordinated hire flow.',
    quote: 'We posted on Friday, reviewed two tradies, and had the bathroom sorted by Sunday afternoon.',
    customer: 'Amelia R.',
    beforeImage: 'https://picsum.photos/seed/tc-bathroom-before/900/620',
    afterImage: 'https://picsum.photos/seed/tc-bathroom-after/900/620',
  },
  {
    id: 'exp-2',
    title: 'Front yard redesign with better drainage',
    location: 'Geelong, VIC',
    trade: 'Landscaping',
    outcome: 'The job moved from muddy patch to finished entry path with cleaner garden edges and drainage.',
    quote: 'The reviews helped us avoid guesswork. We could see which landscaper actually finished jobs like ours.',
    customer: 'Jordan P.',
    beforeImage: 'https://picsum.photos/seed/tc-yard-before/900/620',
    afterImage: 'https://picsum.photos/seed/tc-yard-after/900/620',
  },
  {
    id: 'exp-3',
    title: 'Kitchen lighting upgraded without rewiring guesswork',
    location: 'Brisbane, QLD',
    trade: 'Electrical',
    outcome: 'A dated lighting setup was replaced with brighter task lighting and safer switchgear.',
    quote: 'The electrician profile and review history made the decision easy. We knew exactly what standard to expect.',
    customer: 'Nina T.',
    beforeImage: 'https://picsum.photos/seed/tc-kitchen-before/900/620',
    afterImage: 'https://picsum.photos/seed/tc-kitchen-after/900/620',
  },
  {
    id: 'exp-4',
    title: 'Deck repair turned into an outdoor entertaining upgrade',
    location: 'Newcastle, NSW',
    trade: 'Carpentry',
    outcome: 'The customer started with repair work and ended with a safer, cleaner deck ready for summer use.',
    quote: 'We liked seeing the contractor history next to the quote. It felt much more transparent.',
    customer: 'Lewis C.',
    beforeImage: 'https://picsum.photos/seed/tc-deck-before/900/620',
    afterImage: 'https://picsum.photos/seed/tc-deck-after/900/620',
  },
  {
    id: 'exp-5',
    title: 'Roof leak solved before the next rain cycle',
    location: 'Wollongong, NSW',
    trade: 'Roofing',
    outcome: 'A recurring leak was diagnosed quickly, flashing repaired, and the damaged area sealed before more weather hit.',
    quote: 'The speed mattered, but so did trust. The recent reviews made it easier to hire fast.',
    customer: 'Priya D.',
    beforeImage: 'https://picsum.photos/seed/tc-roof-before/900/620',
    afterImage: 'https://picsum.photos/seed/tc-roof-after/900/620',
  },
  {
    id: 'exp-6',
    title: 'Interior repaint that lifted the whole property',
    location: 'Adelaide, SA',
    trade: 'Painting',
    outcome: 'The property went from tired and uneven to crisp, bright, and inspection-ready.',
    quote: 'The platform felt much calmer than the usual marketplace experience. Less noise, better decisions.',
    customer: 'Megan S.',
    beforeImage: 'https://picsum.photos/seed/tc-paint-before/900/620',
    afterImage: 'https://picsum.photos/seed/tc-paint-after/900/620',
  },
  {
    id: 'exp-7',
    title: 'Laundry floor retiled with clearer quote comparisons',
    location: 'Canberra, ACT',
    trade: 'Tiling',
    outcome: 'The tiling work was awarded with less back-and-forth because the customer could compare scope and proof together.',
    quote: 'Instead of sorting through vague replies, we could compare proper profiles and make a faster call.',
    customer: 'Daniel H.',
    beforeImage: 'https://picsum.photos/seed/tc-laundry-before/900/620',
    afterImage: 'https://picsum.photos/seed/tc-laundry-after/900/620',
  },
  {
    id: 'exp-8',
    title: 'Shed removal cleared the way for a full backyard project',
    location: 'Perth, WA',
    trade: 'Demolition',
    outcome: 'A neglected shed and old slab were removed safely, opening the site for the next construction phase.',
    quote: 'The demolition contractor had the right reviews and the job notes were much clearer than other sites.',
    customer: 'Hayley M.',
    beforeImage: 'https://picsum.photos/seed/tc-shed-before/900/620',
    afterImage: 'https://picsum.photos/seed/tc-shed-after/900/620',
  },
  {
    id: 'exp-9',
    title: 'Emergency plumbing issue turned into a full fix',
    location: 'Gold Coast, QLD',
    trade: 'Plumbing',
    outcome: 'What started as a leak became a full fixture upgrade with cleaner pricing expectations from the start.',
    quote: 'We could see which providers actually handled urgent jobs and finished them well.',
    customer: 'Sophie W.',
    beforeImage: 'https://picsum.photos/seed/tc-plumbing-before/900/620',
    afterImage: 'https://picsum.photos/seed/tc-plumbing-after/900/620',
  },
  {
    id: 'exp-10',
    title: 'Small office refresh delivered through two trusted trades',
    location: 'Melbourne, VIC',
    trade: 'Electrical + Painting',
    outcome: 'The office space was upgraded with fresh walls, better lighting, and less coordination overhead for the customer.',
    quote: 'The experience felt more like a product and less like chasing random leads. That was the difference.',
    customer: 'Chris A.',
    beforeImage: 'https://picsum.photos/seed/tc-office-before/900/620',
    afterImage: 'https://picsum.photos/seed/tc-office-after/900/620',
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
      'Month-to-month billing',
    ],
    cta: 'Start with Starter',
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
      'Recommended default plan',
    ],
    cta: 'Choose Growth',
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
      'Built for long-term platform use',
    ],
    cta: 'Go Pro',
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
  'If the same user returns with the same address and phone number after using the one-time pass, they must move to a monthly subscription plan.',
];
