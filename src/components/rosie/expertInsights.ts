// Expert insights and parent wellness content
// Sources: Emily Oster (Cribsheet), Dr. Becky Kennedy (Good Inside), AAP, research studies

export interface ExpertInsight {
  topic: string;
  insight: string;
  source: string;
  sourceType: 'research' | 'expert' | 'aap';
}

export interface ParentWellnessContent {
  weekRange: [number, number]; // [startWeek, endWeek]
  howYouMightFeel: string[];
  permissionSlip: string; // "It's okay to..."
  oneThingToday: string;
  selfCareReminder: string;
}

export interface QuickWin {
  activity: string;
  duration: string;
  benefit: string;
  ageAppropriate: [number, number]; // [minWeek, maxWeek]
}

// Expert insights organized by topic (legacy - kept for backward compatibility)
export const expertInsights: Record<string, ExpertInsight[]> = {
  sleep: [
    {
      topic: 'Sleep Training',
      insight: 'Sleep training methods, including cry-it-out, have been studied extensively. The research shows no negative effects on child development, attachment, or behavior.',
      source: 'Emily Oster, Cribsheet',
      sourceType: 'research',
    },
    {
      topic: 'Sleep Location',
      insight: 'Room-sharing (not bed-sharing) for the first 6-12 months is recommended. After that, there\'s no evidence that room-sharing is better or worse.',
      source: 'AAP Guidelines + Emily Oster analysis',
      sourceType: 'aap',
    },
    {
      topic: 'Night Feeds',
      insight: 'Most babies can go 6+ hours without feeding by 4-6 months, but "can" doesn\'t mean "must." Night weaning is a personal choice.',
      source: 'Emily Oster, Cribsheet',
      sourceType: 'research',
    },
    {
      topic: 'Sleep Regressions',
      insight: 'Sleep regressions are actually progressions. Your baby\'s brain is developing, which temporarily disrupts sleep. It\'s a sign of growth, not a setback.',
      source: 'Developmental research',
      sourceType: 'research',
    },
  ],
  feeding: [
    {
      topic: 'Breastfeeding',
      insight: 'Breastfeeding has real benefits, but they\'re more modest than often claimed. Formula-fed babies turn out just fine. Fed is best.',
      source: 'Emily Oster, Cribsheet',
      sourceType: 'research',
    },
    {
      topic: 'Introducing Solids',
      insight: 'Starting solids between 4-6 months is fine. Earlier introduction of allergenic foods (peanuts, eggs) may actually REDUCE allergy risk.',
      source: 'LEAP Study + AAP Guidelines',
      sourceType: 'research',
    },
    {
      topic: 'Feeding Schedule',
      insight: 'Scheduled feeding vs. on-demand feeding: the research doesn\'t show one is definitively better. Do what works for your family.',
      source: 'Emily Oster, Cribsheet',
      sourceType: 'research',
    },
  ],
  behavior: [
    {
      topic: 'Crying',
      insight: 'It\'s okay for babies to cry. You can\'t spoil a baby by responding to them, but you also don\'t damage them by not responding instantly every time.',
      source: 'Dr. Becky Kennedy + Research',
      sourceType: 'expert',
    },
    {
      topic: 'Tantrums',
      insight: 'Your child isn\'t giving you a hard time - they\'re having a hard time. Tantrums are a sign their brain is developing faster than their coping skills.',
      source: 'Dr. Becky Kennedy, Good Inside',
      sourceType: 'expert',
    },
    {
      topic: 'Boundaries',
      insight: 'Being a "sturdy leader" means holding boundaries AND connection. You can be firm and loving at the same time. Kids need both.',
      source: 'Dr. Becky Kennedy, Good Inside',
      sourceType: 'expert',
    },
    {
      topic: 'Hitting',
      insight: 'When toddlers hit, they\'re not being "bad." They\'re overwhelmed and their immature brain defaults to physical expression. Stay calm, block the hit, and name the feeling.',
      source: 'Dr. Becky Kennedy, Good Inside',
      sourceType: 'expert',
    },
    {
      topic: 'Power Struggles',
      insight: 'Offer two choices instead of commands: "Do you want to put your shoes on first or your jacket?" The child feels control, you get the outcome you need.',
      source: 'Janet Lansbury, No Bad Kids',
      sourceType: 'expert',
    },
  ],
  development: [
    {
      topic: 'Milestones',
      insight: 'Milestone ranges are wide for a reason. Most babies who are "late" to walk or talk catch up completely. Early isn\'t better.',
      source: 'Developmental research',
      sourceType: 'research',
    },
    {
      topic: 'Screen Time',
      insight: 'For babies under 18 months, the AAP recommends avoiding screens (except video calls). But occasional exposure won\'t cause harm.',
      source: 'AAP Guidelines',
      sourceType: 'aap',
    },
    {
      topic: 'Tummy Time',
      insight: 'Tummy time is helpful but not mandatory for specific durations. Any time on the belly counts. Work up gradually.',
      source: 'AAP Guidelines',
      sourceType: 'aap',
    },
  ],
};

// Age-specific expert insights
// Organized by developmental stage with tips relevant to that age
export interface AgeStageInsights {
  ageRange: [number, number]; // [minWeek, maxWeek]
  stageName: string;
  insights: ExpertInsight[];
}

export const ageSpecificInsights: AgeStageInsights[] = [
  // 0-3 months (weeks 1-12): Fourth trimester
  {
    ageRange: [1, 12],
    stageName: '0-3 Months',
    insights: [
      {
        topic: 'Newborn Sleep',
        insight: 'Newborns don\'t have circadian rhythms yet. Day/night confusion is normal and will resolve by 6-8 weeks. You can\'t "train" a newborn.',
        source: 'Emily Oster, Cribsheet',
        sourceType: 'research',
      },
      {
        topic: 'Feeding',
        insight: 'Breastfeeding has real benefits, but they\'re more modest than often claimed. Formula-fed babies turn out just fine. Fed is best.',
        source: 'Emily Oster, Cribsheet',
        sourceType: 'research',
      },
      {
        topic: 'Crying',
        insight: 'Crying peaks around 6-8 weeks. It\'s not your fault. You can\'t spoil a newborn by holding them. The "fourth trimester" concept is real.',
        source: 'Dr. Harvey Karp + Research',
        sourceType: 'expert',
      },
      {
        topic: 'Sleep Location',
        insight: 'Room-sharing (not bed-sharing) for the first 6-12 months is recommended by the AAP to reduce SIDS risk. A bassinet by your bed works great.',
        source: 'AAP Safe Sleep Guidelines',
        sourceType: 'aap',
      },
      {
        topic: 'Tummy Time',
        insight: 'Tummy time is helpful but not mandatory for specific durations. Any time on the belly counts - even 1-2 minutes. Work up gradually.',
        source: 'AAP Guidelines',
        sourceType: 'aap',
      },
      {
        topic: 'Cluster Feeding',
        insight: 'Cluster feeding (wanting to eat constantly) in the evening is normal and helps build milk supply. It\'s not a sign of low supply.',
        source: 'La Leche League + Research',
        sourceType: 'research',
      },
    ],
  },
  // 3-6 months (weeks 13-26): Emerging personality
  {
    ageRange: [13, 26],
    stageName: '3-6 Months',
    insights: [
      {
        topic: 'Sleep Training',
        insight: 'Sleep training methods, including cry-it-out, have been studied extensively. The research shows no negative effects on child development, attachment, or behavior.',
        source: 'Emily Oster, Cribsheet',
        sourceType: 'research',
      },
      {
        topic: 'Sleep Regression',
        insight: 'The 4-month "regression" is actually a progression - baby\'s sleep is maturing. It\'s hard but temporary. This is often when parents consider sleep training.',
        source: 'Developmental research',
        sourceType: 'research',
      },
      {
        topic: 'Night Weaning',
        insight: 'Most babies can go 6+ hours without feeding by 4-6 months, but "can" doesn\'t mean "must." Night weaning is a personal choice based on your family\'s needs.',
        source: 'Emily Oster, Cribsheet',
        sourceType: 'research',
      },
      {
        topic: 'Rolling & Safe Sleep',
        insight: 'Once baby can roll both ways, you don\'t need to flip them back. Time to stop swaddling and ensure a clear crib. They\'ll find their comfortable position.',
        source: 'AAP Safe Sleep Guidelines',
        sourceType: 'aap',
      },
      {
        topic: 'Introducing Solids',
        insight: 'Starting solids between 4-6 months is fine. Signs of readiness: good head control, sitting with support, interest in food. Earlier introduction of allergens may REDUCE allergy risk.',
        source: 'LEAP Study + AAP Guidelines',
        sourceType: 'research',
      },
      {
        topic: 'Separation Anxiety',
        insight: 'Early separation anxiety may appear around 6 months. This is a sign of healthy attachment, not a problem. Brief separations and predictable goodbyes help.',
        source: 'Developmental research',
        sourceType: 'research',
      },
    ],
  },
  // 6-9 months (weeks 27-39): On the move
  {
    ageRange: [27, 39],
    stageName: '6-9 Months',
    insights: [
      {
        topic: 'Feeding Independence',
        insight: 'Baby-led weaning is safe when done properly. Gagging is normal and different from choking. Let baby explore textures and feed themselves when ready.',
        source: 'AAP Guidelines + Research',
        sourceType: 'research',
      },
      {
        topic: 'Movement',
        insight: 'Some babies crawl, some scoot, some skip straight to walking. There\'s no "right" way. Milestone ranges are wide for a reason.',
        source: 'Developmental research',
        sourceType: 'research',
      },
      {
        topic: 'Stranger Anxiety',
        insight: 'Peak stranger anxiety often hits around 8-9 months. This is a sign of healthy cognitive development - they now understand who\'s familiar and who isn\'t.',
        source: 'Developmental research',
        sourceType: 'research',
      },
      {
        topic: 'Sleep Changes',
        insight: 'Dropping from 3 naps to 2 usually happens around 7-9 months. Signs: fighting the third nap, bedtime getting too late, or early morning wakes.',
        source: 'Sleep research',
        sourceType: 'research',
      },
      {
        topic: 'Baby-Proofing',
        insight: 'Baby-proofing isn\'t about creating a padded world - it\'s about removing serious hazards so you can say "yes" more than "no." Outlets, cords, stairs are priorities.',
        source: 'AAP Safety Guidelines',
        sourceType: 'aap',
      },
      {
        topic: 'Object Permanence',
        insight: 'Your baby now knows things exist even when hidden. That\'s why they get upset when you leave - they remember you exist! Peekaboo is actually developmental practice.',
        source: 'Piaget + Developmental research',
        sourceType: 'research',
      },
    ],
  },
  // 9-12 months (weeks 40-52): Almost a toddler
  {
    ageRange: [40, 52],
    stageName: '9-12 Months',
    insights: [
      {
        topic: 'Communication',
        insight: 'First words often come between 10-14 months, but understanding starts much earlier. Keep narrating your day - they\'re absorbing everything.',
        source: 'Language development research',
        sourceType: 'research',
      },
      {
        topic: 'Walking',
        insight: 'Normal range for first steps is 9-18 months. Early walking isn\'t a sign of intelligence; late walking isn\'t a concern (usually). Let them develop at their pace.',
        source: 'AAP Milestones',
        sourceType: 'aap',
      },
      {
        topic: 'Milk Transition',
        insight: 'The AAP recommends whole milk starting at 12 months, not before. No need to "wean" from breast/formula if you don\'t want to - that\'s your choice.',
        source: 'AAP Nutrition Guidelines',
        sourceType: 'aap',
      },
      {
        topic: 'Picky Eating Begins',
        insight: 'Many babies who "ate everything" become selective around 12-18 months. This is protective (avoiding potential toxins) and usually resolves with patience, not pressure.',
        source: 'Ellyn Satter + Research',
        sourceType: 'research',
      },
      {
        topic: 'Screen Time',
        insight: 'For babies under 18 months, the AAP recommends avoiding screens except video calls. But occasional exposure won\'t cause lasting harm - don\'t stress about imperfection.',
        source: 'AAP Guidelines',
        sourceType: 'aap',
      },
      {
        topic: 'Independence',
        insight: 'Your baby is becoming opinionated! Wanting to do things "their way" is healthy development. Offer choices when possible: "This cup or that cup?"',
        source: 'Dr. Becky Kennedy + Research',
        sourceType: 'expert',
      },
    ],
  },
  // 12-18 months (weeks 53-78): Early toddlerhood
  {
    ageRange: [53, 78],
    stageName: '12-18 Months',
    insights: [
      {
        topic: 'Tantrums Begin',
        insight: 'Your child isn\'t giving you a hard time - they\'re having a hard time. Tantrums are a sign their brain is developing faster than their coping skills.',
        source: 'Dr. Becky Kennedy, Good Inside',
        sourceType: 'expert',
      },
      {
        topic: 'Language Explosion',
        insight: 'Receptive language (understanding) far exceeds expressive language (speaking). They understand way more than they can say. Keep talking to them!',
        source: 'Language development research',
        sourceType: 'research',
      },
      {
        topic: 'Nap Transition',
        insight: 'Most toddlers drop to one nap between 13-18 months. Signs: consistently fighting one nap, taking a long time to fall asleep, or the second nap pushing bedtime late.',
        source: 'Sleep research',
        sourceType: 'research',
      },
      {
        topic: 'Boundaries',
        insight: 'Being a "sturdy leader" means holding boundaries AND connection. You can be firm and loving at the same time. Kids need both to feel safe.',
        source: 'Dr. Becky Kennedy, Good Inside',
        sourceType: 'expert',
      },
      {
        topic: 'Hitting & Biting',
        insight: 'When toddlers hit or bite, they\'re not being "bad." They\'re overwhelmed and their immature brain defaults to physical expression. Stay calm, block, name the feeling.',
        source: 'Dr. Becky Kennedy, Good Inside',
        sourceType: 'expert',
      },
      {
        topic: 'No! Phase',
        insight: '"No" is developmentally appropriate - it means they\'re learning autonomy. Pick your battles. Acknowledge their "no" even when you have to proceed anyway.',
        source: 'Janet Lansbury, No Bad Kids',
        sourceType: 'expert',
      },
    ],
  },
  // 18-24 months (weeks 79-104): Toddler territory
  {
    ageRange: [79, 104],
    stageName: '18-24 Months',
    insights: [
      {
        topic: 'Power Struggles',
        insight: 'Offer two choices instead of commands: "Do you want to put your shoes on first or your jacket?" They feel control, you get the outcome you need.',
        source: 'Janet Lansbury, No Bad Kids',
        sourceType: 'expert',
      },
      {
        topic: 'Emotional Regulation',
        insight: 'You can\'t reason with a dysregulated toddler. Connect first (get down to their level, offer comfort), then redirect. Logic comes after calm.',
        source: 'Dr. Becky Kennedy, Good Inside',
        sourceType: 'expert',
      },
      {
        topic: 'Potty Training',
        insight: 'Most kids aren\'t developmentally ready for potty training until 2-3 years old. Signs of readiness: staying dry longer, interest in the toilet, discomfort when wet.',
        source: 'AAP Guidelines',
        sourceType: 'aap',
      },
      {
        topic: 'Screen Time',
        insight: 'After 18 months, limited high-quality programming (PBS Kids, Sesame Street) is okay. Watch together when possible. It\'s about quality, not perfection.',
        source: 'AAP Guidelines',
        sourceType: 'aap',
      },
      {
        topic: 'Parallel Play',
        insight: 'Toddlers play NEAR other kids, not WITH them yet. This "parallel play" is developmentally normal. True cooperative play develops around 3-4 years.',
        source: 'Developmental research',
        sourceType: 'research',
      },
      {
        topic: 'Big Emotions',
        insight: 'A toddler\'s prefrontal cortex (emotional regulation center) won\'t be fully developed until their mid-20s. They literally can\'t control their emotions like adults.',
        source: 'Neuroscience research',
        sourceType: 'research',
      },
    ],
  },
  // 24-30 months (weeks 105-130): Two's
  {
    ageRange: [105, 130],
    stageName: '24-30 Months',
    insights: [
      {
        topic: 'Terrible Twos',
        insight: 'The "terrible twos" are really the "developmentally appropriate boundary-testing twos." Their job is to push limits. Your job is to hold them with connection.',
        source: 'Dr. Becky Kennedy, Good Inside',
        sourceType: 'expert',
      },
      {
        topic: 'Sibling Prep',
        insight: 'If expecting another baby, prepare but don\'t over-prepare. Two-year-olds don\'t understand time well. Keep routines stable and expect some regression.',
        source: 'Child development research',
        sourceType: 'research',
      },
      {
        topic: 'Potty Learning',
        insight: 'No healthy child goes to college in diapers. Pressure and punishment delay potty training. Let them lead when possible, stay neutral about accidents.',
        source: 'AAP + Research',
        sourceType: 'research',
      },
      {
        topic: 'Imagination',
        insight: 'Pretend play is exploding! This is crucial cognitive development. They\'re learning to think symbolically - a stick becomes a sword, a box becomes a castle.',
        source: 'Developmental research',
        sourceType: 'research',
      },
      {
        topic: 'Sharing',
        insight: 'Forced sharing teaches nothing about generosity. Turn-taking ("When you\'re done, it\'s their turn") teaches more than demanding instant sharing.',
        source: 'Janet Lansbury + Research',
        sourceType: 'expert',
      },
      {
        topic: 'Empathy',
        insight: 'True empathy is emerging. They notice when others are sad. Model it: "Look, that child is crying. I wonder if they\'re hurt." Don\'t force apologies.',
        source: 'Dr. Becky Kennedy + Research',
        sourceType: 'expert',
      },
    ],
  },
  // 30-36 months (weeks 131-156): Almost three
  {
    ageRange: [131, 156],
    stageName: '30-36 Months',
    insights: [
      {
        topic: 'Preschool Readiness',
        insight: 'Social-emotional skills matter more than academics for preschool readiness. Can they separate from you? Handle basic needs? Play near others? That\'s enough.',
        source: 'Early childhood research',
        sourceType: 'research',
      },
      {
        topic: 'Fears',
        insight: 'New fears (dark, monsters, loud noises) are normal at this age. Their imagination is powerful but they can\'t distinguish real from imaginary yet. Validate, don\'t dismiss.',
        source: 'Developmental research',
        sourceType: 'research',
      },
      {
        topic: 'Cooperative Play',
        insight: 'True cooperative play is emerging. They\'re starting to play WITH other kids, not just near them. Conflicts are normal - they\'re learning social skills.',
        source: 'Developmental research',
        sourceType: 'research',
      },
      {
        topic: 'Questions',
        insight: '"Why?" on repeat is exhausting but important. They\'re building mental models of how the world works. It\'s okay to say "I don\'t know, let\'s find out."',
        source: 'Child development research',
        sourceType: 'research',
      },
      {
        topic: 'Perfectionism',
        insight: 'Some kids this age get frustrated when they can\'t do things "right." Focus on effort, not outcome: "You worked so hard on that!" not "Good job!"',
        source: 'Carol Dweck + Research',
        sourceType: 'research',
      },
      {
        topic: 'The Big Picture',
        insight: 'You\'re not raising them to be a good toddler. You\'re raising them to be a good human. Struggles now are building resilience for later. You\'re doing great.',
        source: 'Dr. Becky Kennedy, Good Inside',
        sourceType: 'expert',
      },
    ],
  },
];

// Get age-specific insights for a given week
export const getInsightsForWeek = (weekNumber: number): ExpertInsight[] => {
  const stage = ageSpecificInsights.find(
    s => weekNumber >= s.ageRange[0] && weekNumber <= s.ageRange[1]
  );
  return stage?.insights || [];
};

// Get the stage name for a given week
export const getStageNameForWeek = (weekNumber: number): string => {
  const stage = ageSpecificInsights.find(
    s => weekNumber >= s.ageRange[0] && weekNumber <= s.ageRange[1]
  );
  return stage?.stageName || 'First Year';
};

// Parent wellness content by week range
export const parentWellnessContent: ParentWellnessContent[] = [
  {
    weekRange: [1, 2],
    howYouMightFeel: [
      'Overwhelmed and undersupplied (both are normal)',
      'Hormonal shifts causing mood swings',
      'Like you have no idea what you\'re doing',
      'Weepy - the "baby blues" are real and common',
    ],
    permissionSlip: 'It\'s okay to not feel instantly bonded. It\'s okay to feel scared. It\'s okay to ask for help with EVERYTHING.',
    oneThingToday: 'Take a shower (or at least wash your face). Small acts of self-care matter.',
    selfCareReminder: 'You just created a human. Your only job right now is to feed the baby and recover. Everything else can wait.',
  },
  {
    weekRange: [3, 4],
    howYouMightFeel: [
      'Exhausted on a cellular level',
      'Anxious about doing everything "right"',
      'Isolated, especially if partner returns to work',
      'Moments of joy mixed with moments of doubt',
    ],
    permissionSlip: 'It\'s okay to put the baby down safely and step away when you need a break. It\'s okay to not answer the door.',
    oneThingToday: 'Drink a full glass of water. Hydration affects everything, including mood.',
    selfCareReminder: 'The dishes can wait. Sleep when baby sleeps isn\'t always possible, but rest when you can is.',
  },
  {
    weekRange: [5, 6],
    howYouMightFeel: [
      'Like you\'re in survival mode (you are)',
      'Frustrated that it\'s still this hard',
      'Questioning every decision you make',
      'Touched out and overstimulated',
    ],
    permissionSlip: 'It\'s okay to feel angry or resentful sometimes. These feelings don\'t make you a bad parent. They make you human.',
    oneThingToday: 'Step outside for 5 minutes, even just to the mailbox. Fresh air helps.',
    selfCareReminder: 'Week 6 is often the hardest. If you\'re surviving, you\'re succeeding. This peak will pass.',
  },
  {
    weekRange: [7, 8],
    howYouMightFeel: [
      'Glimmers of a routine emerging',
      'Still tired, but maybe slightly less',
      'Anticipating the 2-month shots',
      'Starting to feel more confident',
    ],
    permissionSlip: 'It\'s okay to start introducing a bottle (if breastfeeding). It\'s okay to let someone else hold the baby.',
    oneThingToday: 'Do one thing that\'s just for you - read an article, listen to a podcast, eat a real meal.',
    selfCareReminder: 'If you\'ve made it 8 weeks, you can make it through anything. The hardest part is behind you.',
  },
  {
    weekRange: [9, 12],
    howYouMightFeel: [
      'More confident in your parenting instincts',
      'Guilty about returning to work (if applicable)',
      'Anxious about the "4 month sleep regression"',
      'Like you\'re finally getting the hang of this',
    ],
    permissionSlip: 'It\'s okay to go back to work and miss your baby. It\'s okay to not go back and miss your old life. Both are valid.',
    oneThingToday: 'Make plans with another adult - even a phone call counts.',
    selfCareReminder: 'The fourth trimester is ending. You survived. Take a moment to acknowledge how far you\'ve come.',
  },
  {
    weekRange: [13, 20],
    howYouMightFeel: [
      'Frustrated if sleep has regressed',
      'Proud of your baby\'s new skills',
      'Eager for more predictability',
      'Wondering about sleep training',
    ],
    permissionSlip: 'It\'s okay to sleep train. It\'s okay not to. The research says both are fine.',
    oneThingToday: 'Take a photo of you WITH your baby, not just of your baby.',
    selfCareReminder: 'The 4-month regression is a brain development milestone. It\'s hard, but it means your baby is growing.',
  },
  {
    weekRange: [21, 30],
    howYouMightFeel: [
      'More like yourself again',
      'Enjoying your baby\'s personality',
      'Nervous about starting solids',
      'Dealing with separation anxiety (theirs and yours)',
    ],
    permissionSlip: 'It\'s okay if solids are messy and slow. It\'s okay if your baby hates purees. There\'s no one right way.',
    oneThingToday: 'Do something physical - even a 10-minute walk or some stretching.',
    selfCareReminder: 'You\'re halfway through the first year. Look how much you\'ve both grown.',
  },
  {
    weekRange: [31, 40],
    howYouMightFeel: [
      'Exhausted from chasing a mobile baby',
      'Proud and terrified in equal measure',
      'Nostalgic for the newborn days (already!)',
      'Ready for more sleep',
    ],
    permissionSlip: 'It\'s okay to use screen time occasionally. It\'s okay to give pouches instead of homemade purees.',
    oneThingToday: 'Put down your phone and just watch your baby play for 5 minutes. They\'re amazing.',
    selfCareReminder: 'Babyproofing is self-care. Every outlet covered is one less thing to worry about.',
  },
  {
    weekRange: [41, 52],
    howYouMightFeel: [
      'Disbelief that a year has passed',
      'Pride in how far you\'ve come',
      'Uncertainty about the toddler phase',
      'Ready for the next chapter',
    ],
    permissionSlip: 'It\'s okay to be sad that babyhood is ending. It\'s okay to be relieved. It\'s okay to feel both.',
    oneThingToday: 'Write down three things you\'re proud of from this year.',
    selfCareReminder: 'You made it through the hardest year. You are your baby\'s perfect parent.',
  },
  // Year 2: Toddlerhood (weeks 53-104)
  {
    weekRange: [53, 65],
    howYouMightFeel: [
      'Exhausted by constant supervision needs',
      'Frustrated by tantrums and big emotions',
      'Amazed by their growing vocabulary',
      'Nostalgic for baby days (already!)',
    ],
    permissionSlip: 'It\'s okay to not enjoy every moment. Toddlers are hard. You can love your child and not love this phase.',
    oneThingToday: 'Sit on the floor and follow their lead in play for 5 minutes. No phones, no agenda.',
    selfCareReminder: 'Toddlers push boundaries because they feel safe with you. That\'s a success, not a failure.',
  },
  {
    weekRange: [66, 78],
    howYouMightFeel: [
      'Tested by the "no" phase',
      'Wondering if tantrums are normal (they are)',
      'Proud of their growing independence',
      'Touched out from constant physical demands',
    ],
    permissionSlip: 'It\'s okay to put them in a safe space and take a 2-minute breather. Regulated you > reactive you.',
    oneThingToday: 'Name your own emotions out loud: "Mommy/Daddy feels frustrated right now."',
    selfCareReminder: 'Dr. Becky says: "Kids don\'t give you a hard time, they\'re having a hard time." So are you. Both are valid.',
  },
  {
    weekRange: [79, 91],
    howYouMightFeel: [
      'Negotiating with a tiny dictator daily',
      'Delighted by their imagination',
      'Questioning every parenting choice',
      'Craving adult conversation desperately',
    ],
    permissionSlip: 'It\'s okay to use screen time strategically. It\'s okay to need a break from imaginative play.',
    oneThingToday: 'Have a real conversation with another adult - even by text counts.',
    selfCareReminder: 'The fact that you worry about being a good parent means you ARE a good parent.',
  },
  {
    weekRange: [92, 104],
    howYouMightFeel: [
      'Amazed they\'re almost two',
      'Anticipating the "terrible twos"',
      'Proud of their blossoming personality',
      'Feeling more confident as a parent',
    ],
    permissionSlip: 'It\'s okay if potty training isn\'t happening yet. Most kids aren\'t ready until 2.5-3.',
    oneThingToday: 'Take a photo together - not just of them. You belong in these memories.',
    selfCareReminder: 'The "terrible twos" are a myth. It\'s really the "developmentally appropriate boundary testing twos."',
  },
  // Year 3 (weeks 105-156)
  {
    weekRange: [105, 117],
    howYouMightFeel: [
      'Exhausted by endless questions',
      'Amazed by their growing logic',
      'Frustrated by power struggles',
      'Proud of how far you\'ve both come',
    ],
    permissionSlip: 'It\'s okay to say "I don\'t know, let\'s find out" to their questions. You don\'t need all the answers.',
    oneThingToday: 'Let them help with something you\'d normally do faster alone. Process over outcome.',
    selfCareReminder: 'Two-year-olds are supposed to be irrational. Their prefrontal cortex is decades from being done.',
  },
  {
    weekRange: [118, 130],
    howYouMightFeel: [
      'Tested by potty training challenges',
      'Delighted by their sense of humor',
      'Overwhelmed by their energy levels',
      'More comfortable in your parenting skin',
    ],
    permissionSlip: 'It\'s okay if potty training takes months. No healthy kid goes to college in diapers.',
    oneThingToday: 'Laugh at something together. Silliness is connection.',
    selfCareReminder: 'You\'re not raising them to be good toddlers. You\'re raising them to be good humans. Big picture.',
  },
  {
    weekRange: [131, 143],
    howYouMightFeel: [
      'Navigating social dynamics at play dates',
      'Proud of their growing empathy',
      'Exhausted by nap transition struggles',
      'Excited about their upcoming milestones',
    ],
    permissionSlip: 'It\'s okay if they\'re not "sharing" perfectly. Forced sharing teaches nothing. Turn-taking is the goal.',
    oneThingToday: 'Go outside together, even for 10 minutes. Fresh air fixes more than you\'d think.',
    selfCareReminder: 'They remember how you make them feel, not whether you did Pinterest crafts.',
  },
  {
    weekRange: [144, 156],
    howYouMightFeel: [
      'Disbelief they\'re almost three',
      'Proud of the little person they\'re becoming',
      'Nervous about preschool transitions',
      'Nostalgic for the baby they were',
    ],
    permissionSlip: 'It\'s okay to not feel ready for the next phase. Growth is bittersweet.',
    oneThingToday: 'Tell them specifically what you love about them: "I love how curious you are."',
    selfCareReminder: 'You\'ve kept a human alive and thriving for three years. That\'s extraordinary.',
  },
];

// Quick wins by age
export const quickWins: QuickWin[] = [
  // Newborn (0-4 weeks)
  { activity: '1 minute of tummy time', duration: '1 min', benefit: 'Builds neck strength', ageAppropriate: [1, 4] },
  { activity: 'Narrate a diaper change', duration: '2 min', benefit: 'Language exposure', ageAppropriate: [1, 52] },
  { activity: 'Black and white pictures', duration: '3 min', benefit: 'Visual development', ageAppropriate: [1, 8] },
  { activity: 'Skin-to-skin cuddle', duration: '5 min', benefit: 'Bonding + regulation', ageAppropriate: [1, 12] },

  // 1-2 months
  { activity: 'Sing during a feeding', duration: '3 min', benefit: 'Bonding + language', ageAppropriate: [4, 52] },
  { activity: 'Gentle bicycle legs', duration: '2 min', benefit: 'Relieves gas, motor skills', ageAppropriate: [4, 16] },
  { activity: 'Face-to-face cooing', duration: '3 min', benefit: 'Social development', ageAppropriate: [4, 16] },
  { activity: 'Mirror play', duration: '3 min', benefit: 'Self-awareness', ageAppropriate: [6, 52] },

  // 3-4 months
  { activity: 'Tummy time with toys', duration: '5 min', benefit: 'Strength + reaching', ageAppropriate: [12, 26] },
  { activity: 'Shake a rattle together', duration: '3 min', benefit: 'Cause and effect', ageAppropriate: [12, 30] },
  { activity: 'Read a board book', duration: '3 min', benefit: 'Language + bonding', ageAppropriate: [8, 52] },
  { activity: 'Practice rolling', duration: '5 min', benefit: 'Gross motor skills', ageAppropriate: [14, 26] },

  // 5-7 months
  { activity: 'Peekaboo game', duration: '3 min', benefit: 'Object permanence', ageAppropriate: [20, 52] },
  { activity: 'Explore textures', duration: '5 min', benefit: 'Sensory development', ageAppropriate: [20, 52] },
  { activity: 'Supported sitting play', duration: '5 min', benefit: 'Core strength', ageAppropriate: [20, 30] },
  { activity: 'Clap hands together', duration: '2 min', benefit: 'Motor skills + music', ageAppropriate: [24, 52] },

  // 8-12 months
  { activity: 'Stack and knock blocks', duration: '5 min', benefit: 'Fine motor + cause/effect', ageAppropriate: [32, 78] },
  { activity: 'Practice waving bye-bye', duration: '2 min', benefit: 'Social skills', ageAppropriate: [32, 65] },
  { activity: 'Point and name things', duration: '5 min', benefit: 'Language building', ageAppropriate: [36, 78] },
  { activity: 'Dance party', duration: '3 min', benefit: 'Gross motor + joy', ageAppropriate: [30, 156] },

  // Year 2: Toddlers (12-24 months)
  { activity: 'Simple puzzles (2-4 pieces)', duration: '5 min', benefit: 'Problem solving', ageAppropriate: [52, 104] },
  { activity: 'Scribbling with crayons', duration: '5 min', benefit: 'Fine motor + creativity', ageAppropriate: [52, 156] },
  { activity: 'Hide and seek (simple)', duration: '5 min', benefit: 'Object permanence + fun', ageAppropriate: [52, 156] },
  { activity: 'Stacking cups', duration: '3 min', benefit: 'Spatial reasoning', ageAppropriate: [52, 91] },
  { activity: 'Ball rolling back and forth', duration: '5 min', benefit: 'Turn-taking + motor', ageAppropriate: [52, 104] },
  { activity: 'Looking at books together', duration: '5 min', benefit: 'Language + bonding', ageAppropriate: [52, 156] },
  { activity: 'Sorting by color', duration: '5 min', benefit: 'Cognitive development', ageAppropriate: [65, 156] },
  { activity: 'Pretend cooking', duration: '5 min', benefit: 'Imagination', ageAppropriate: [65, 156] },
  { activity: 'Naming body parts', duration: '3 min', benefit: 'Language + body awareness', ageAppropriate: [52, 104] },
  { activity: 'Blow bubbles', duration: '5 min', benefit: 'Tracking + outdoor time', ageAppropriate: [52, 156] },

  // Year 3: Toddlers (24-36 months)
  { activity: 'Matching games', duration: '5 min', benefit: 'Memory + focus', ageAppropriate: [91, 156] },
  { activity: 'Play-doh squishing', duration: '10 min', benefit: 'Fine motor + creativity', ageAppropriate: [91, 156] },
  { activity: 'Simple role play', duration: '5 min', benefit: 'Social-emotional', ageAppropriate: [91, 156] },
  { activity: 'Counting objects', duration: '3 min', benefit: 'Early math', ageAppropriate: [91, 156] },
  { activity: 'Obstacle course', duration: '10 min', benefit: 'Gross motor + following directions', ageAppropriate: [91, 156] },
  { activity: 'Puzzles (5-10 pieces)', duration: '5 min', benefit: 'Problem solving', ageAppropriate: [104, 156] },
  { activity: 'Simon says', duration: '5 min', benefit: 'Listening + impulse control', ageAppropriate: [104, 156] },
  { activity: 'Drawing shapes', duration: '5 min', benefit: 'Pre-writing skills', ageAppropriate: [104, 156] },
  { activity: 'Sorting by size', duration: '5 min', benefit: 'Early math concepts', ageAppropriate: [104, 156] },
  { activity: 'Helping with chores', duration: '5 min', benefit: 'Responsibility + motor skills', ageAppropriate: [78, 156] },
];

// Get appropriate content for a specific week
export const getParentWellnessForWeek = (week: number): ParentWellnessContent | null => {
  return parentWellnessContent.find(
    content => week >= content.weekRange[0] && week <= content.weekRange[1]
  ) || null;
};

export const getQuickWinsForWeek = (week: number): QuickWin[] => {
  return quickWins
    .filter(win => week >= win.ageAppropriate[0] && week <= win.ageAppropriate[1])
    .slice(0, 4); // Return max 4 activities
};

export const getExpertInsightForTopic = (topic: keyof typeof expertInsights): ExpertInsight | null => {
  const insights = expertInsights[topic];
  if (!insights || insights.length === 0) return null;
  // Return a random insight for variety
  return insights[Math.floor(Math.random() * insights.length)];
};
