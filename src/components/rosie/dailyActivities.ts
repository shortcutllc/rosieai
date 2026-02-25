/**
 * dailyActivities.ts — Age-appropriate activity suggestions
 *
 * Curated activities organized by age range and development category.
 * These are static editorial content — no database table needed.
 * The selection logic picks 3–5 activities per day based on baby's age,
 * completed milestones, and time of day.
 */

export interface Activity {
  id: string;
  title: string;
  description: string;
  duration: string; // "5 min", "10–15 min"
  ageRangeWeeks: [number, number]; // [earliest, latest]
  category: 'motor' | 'cognitive' | 'social' | 'sensory' | 'communication';
  relatedMilestones: string[]; // milestone IDs this activity supports
  icon: string;
  tip?: string; // optional parent tip
}

// ─── Activity Library ───────────────────────────────────────

const ACTIVITIES: Activity[] = [
  // ═══ 0–8 WEEKS ═══

  {
    id: 'tummy_time_basic',
    title: 'Tummy Time',
    description: 'Place baby on their tummy on a firm surface. Get down to their level and talk to them.',
    duration: '2–5 min',
    ageRangeWeeks: [0, 8],
    category: 'motor',
    relatedMilestones: ['head_control_brief'],
    icon: '💪',
    tip: 'Start with 1–2 minutes after diaper changes. Build up gradually. It\'s okay if they fuss a little.',
  },
  {
    id: 'face_time',
    title: 'Face to Face',
    description: 'Hold baby 8–12 inches from your face. Make different expressions slowly — smile, open mouth, stick out tongue.',
    duration: '3–5 min',
    ageRangeWeeks: [0, 12],
    category: 'social',
    relatedMilestones: ['looks_at_faces', 'social_smile', 'copies_expressions'],
    icon: '😊',
    tip: 'Newborns see best at 8–12 inches. That\'s about the distance from your elbow to your hand.',
  },
  {
    id: 'high_contrast_cards',
    title: 'High Contrast Cards',
    description: 'Show black and white cards or images. Move them slowly from side to side for baby to track.',
    duration: '3–5 min',
    ageRangeWeeks: [0, 12],
    category: 'cognitive',
    relatedMilestones: ['tracks_objects'],
    icon: '🎯',
  },
  {
    id: 'narrate_your_day',
    title: 'Narrate Your Day',
    description: 'Talk to baby about what you\'re doing. "Now we\'re changing your diaper. Let\'s put on a clean one."',
    duration: 'Ongoing',
    ageRangeWeeks: [0, 52],
    category: 'cognitive',
    relatedMilestones: ['turns_to_sound', 'coos'],
    icon: '🗣️',
    tip: 'It feels silly at first, but hearing language is the single most important thing for brain development.',
  },
  {
    id: 'skin_to_skin',
    title: 'Skin to Skin',
    description: 'Hold baby against your bare chest. Great for bonding, regulating temperature, and calming.',
    duration: '15–30 min',
    ageRangeWeeks: [0, 17],
    category: 'social',
    relatedMilestones: ['recognizes_caregiver', 'self_soothe'],
    icon: '🤱',
  },
  {
    id: 'gentle_touch',
    title: 'Gentle Touch Exploration',
    description: 'Stroke baby\'s arms, legs, back with different textures — a soft cloth, your fingers, a silky scarf.',
    duration: '5 min',
    ageRangeWeeks: [0, 17],
    category: 'sensory',
    relatedMilestones: ['smooth_movements'],
    icon: '✋',
  },

  // ═══ 8–17 WEEKS ═══

  {
    id: 'tummy_time_mirror',
    title: 'Tummy Time with Mirror',
    description: 'Place a baby-safe mirror in front of baby during tummy time. They\'ll be fascinated by the face looking back.',
    duration: '5–10 min',
    ageRangeWeeks: [8, 26],
    category: 'motor',
    relatedMilestones: ['head_control_steady', 'pushes_up_arms', 'likes_mirror'],
    icon: '🪞',
  },
  {
    id: 'dangling_toys',
    title: 'Reach and Bat',
    description: 'Hold a toy just within baby\'s reach. Encourage them to swipe and reach for it. Celebrate their tries.',
    duration: '5–10 min',
    ageRangeWeeks: [8, 22],
    category: 'motor',
    relatedMilestones: ['swipes_at_toys', 'reaches_and_grabs'],
    icon: '🎪',
  },
  {
    id: 'singing',
    title: 'Song Time',
    description: 'Sing simple songs with hand motions. "Itsy Bitsy Spider", "Twinkle Twinkle", or make up your own.',
    duration: '5–10 min',
    ageRangeWeeks: [4, 52],
    category: 'social',
    relatedMilestones: ['laughs', 'enjoys_play'],
    icon: '🎵',
    tip: 'Your baby doesn\'t care if you\'re off-key. They just want to hear YOUR voice.',
  },
  {
    id: 'bicycle_legs',
    title: 'Bicycle Legs',
    description: 'Gently move baby\'s legs in a cycling motion. Good for digestion and strengthening core.',
    duration: '2–3 min',
    ageRangeWeeks: [4, 26],
    category: 'motor',
    relatedMilestones: ['smooth_movements'],
    icon: '🚲',
    tip: 'Great for gassy babies. Try this during diaper changes.',
  },
  {
    id: 'conversation',
    title: 'Back-and-Forth "Chat"',
    description: 'When baby coos or babbles, pause and respond as if they\'re talking. Take turns. Build the conversation.',
    duration: '5 min',
    ageRangeWeeks: [8, 30],
    category: 'communication',
    relatedMilestones: ['coos', 'babbles', 'different_cries'],
    icon: '💬',
    tip: 'This teach-and-take pattern is the foundation of all communication. You\'re teaching them how conversation works.',
  },

  // ═══ 17–26 WEEKS ═══

  {
    id: 'sitting_practice',
    title: 'Supported Sitting',
    description: 'Sit baby up with pillows around them for support. Place toys within reach at seated height.',
    duration: '5–10 min',
    ageRangeWeeks: [17, 30],
    category: 'motor',
    relatedMilestones: ['sits_with_support', 'reaches_and_grabs'],
    icon: '🪑',
    tip: 'Boppy pillows work great as a sitting support ring.',
  },
  {
    id: 'sensory_bottles',
    title: 'Sensory Discovery',
    description: 'Let baby feel different safe textures — crinkle books, soft balls, rubber toys, wooden blocks.',
    duration: '10 min',
    ageRangeWeeks: [13, 30],
    category: 'sensory',
    relatedMilestones: ['explores_with_mouth', 'curious_about_things'],
    icon: '🧶',
    tip: 'Everything goes in the mouth at this age. Make sure toys are clean and too large to swallow.',
  },
  {
    id: 'peekaboo_intro',
    title: 'Peekaboo',
    description: 'Hide behind a cloth and pop out saying "peekaboo!" Start simple — your face is the best toy.',
    duration: '5 min',
    ageRangeWeeks: [17, 39],
    category: 'cognitive',
    relatedMilestones: ['object_permanence', 'laughs', 'plays_peekaboo'],
    icon: '🙈',
    tip: 'This simple game is actually teaching object permanence — one of the biggest cognitive leaps.',
  },
  {
    id: 'name_game',
    title: 'The Name Game',
    description: 'Say baby\'s name from different spots in the room. See if they turn toward your voice. Celebrate when they do.',
    duration: '3–5 min',
    ageRangeWeeks: [17, 35],
    category: 'communication',
    relatedMilestones: ['responds_to_name', 'turns_to_sound'],
    icon: '📣',
  },
  {
    id: 'rattle_play',
    title: 'Shake and Pass',
    description: 'Show baby how to shake a rattle. Place it in one hand, then offer another toy to the other hand.',
    duration: '5–10 min',
    ageRangeWeeks: [17, 30],
    category: 'motor',
    relatedMilestones: ['transfers_objects', 'cause_and_effect', 'reaches_and_grabs'],
    icon: '🔔',
  },

  // ═══ 26–39 WEEKS ═══

  {
    id: 'crawling_motivation',
    title: 'Crawling Course',
    description: 'Place a favorite toy just out of reach. Cheer baby on as they figure out how to get to it.',
    duration: '10–15 min',
    ageRangeWeeks: [26, 43],
    category: 'motor',
    relatedMilestones: ['crawls'],
    icon: '🐛',
    tip: 'Every baby figures out movement differently — scooting, army crawling, and rolling all count.',
  },
  {
    id: 'container_play',
    title: 'In and Out',
    description: 'Give baby a container and small toys. Show how to put things in and dump them out. Repeat endlessly.',
    duration: '10 min',
    ageRangeWeeks: [26, 48],
    category: 'cognitive',
    relatedMilestones: ['puts_things_in_container', 'drops_objects_on_purpose', 'cause_and_effect'],
    icon: '📥',
  },
  {
    id: 'clapping_games',
    title: 'Clapping Songs',
    description: 'Clap baby\'s hands together while singing. "Pat-a-cake", "If You\'re Happy and You Know It."',
    duration: '5 min',
    ageRangeWeeks: [26, 43],
    category: 'social',
    relatedMilestones: ['plays_peekaboo', 'plays_social_games'],
    icon: '👏',
  },
  {
    id: 'finger_foods_intro',
    title: 'Finger Food Practice',
    description: 'Offer soft, small pieces of food baby can pick up. Banana, avocado, well-cooked sweet potato.',
    duration: '15 min',
    ageRangeWeeks: [26, 43],
    category: 'motor',
    relatedMilestones: ['pincer_grasp_developing'],
    icon: '🍌',
    tip: 'The pincer grasp develops through practice. Messy meals are learning opportunities.',
  },
  {
    id: 'reading_board_books',
    title: 'Board Book Time',
    description: 'Read simple board books together. Let baby turn pages, point at pictures, and feel textures.',
    duration: '5–10 min',
    ageRangeWeeks: [22, 52],
    category: 'cognitive',
    relatedMilestones: ['points_at_things', 'consonant_sounds'],
    icon: '📚',
    tip: 'Don\'t worry about reading every word. Pointing and naming pictures is just as valuable.',
  },
  {
    id: 'standing_supported',
    title: 'Standing Practice',
    description: 'Hold baby\'s hands and let them practice standing. Place toys on a low table to encourage pulling up.',
    duration: '5–10 min',
    ageRangeWeeks: [26, 43],
    category: 'motor',
    relatedMilestones: ['pulls_to_stand'],
    icon: '🧗',
  },

  // ═══ 39–52 WEEKS ═══

  {
    id: 'cruising_setup',
    title: 'Furniture Walk',
    description: 'Arrange furniture so baby can cruise from piece to piece. Place motivating toys along the route.',
    duration: '10–15 min',
    ageRangeWeeks: [35, 52],
    category: 'motor',
    relatedMilestones: ['cruises_furniture', 'stands_briefly', 'first_steps'],
    icon: '🚶',
  },
  {
    id: 'wave_bye',
    title: 'Wave Bye-Bye',
    description: 'Practice waving when someone leaves or when you wave to toys, pets, or reflections.',
    duration: '2–3 min',
    ageRangeWeeks: [30, 52],
    category: 'communication',
    relatedMilestones: ['waves_bye', 'follows_simple_commands'],
    icon: '👋',
  },
  {
    id: 'stacking_nesting',
    title: 'Stack and Knock Down',
    description: 'Stack blocks or cups and let baby knock them down. They\'ll love the crash. You build, they destroy.',
    duration: '10 min',
    ageRangeWeeks: [35, 52],
    category: 'cognitive',
    relatedMilestones: ['cause_and_effect', 'uses_objects_correctly'],
    icon: '🏗️',
    tip: 'Knocking down is the first step. Stacking comes later. Both are learning.',
  },
  {
    id: 'phone_play',
    title: 'Pretend Play',
    description: 'Give baby a toy phone, cup, or hairbrush. Watch them start to use objects "correctly" — pure magic.',
    duration: '5–10 min',
    ageRangeWeeks: [39, 52],
    category: 'cognitive',
    relatedMilestones: ['uses_objects_correctly'],
    icon: '📱',
  },
  {
    id: 'hide_and_find',
    title: 'Hide the Toy',
    description: 'Hide a toy under a blanket or behind your back. Ask "Where did it go?" and let baby find it.',
    duration: '5–10 min',
    ageRangeWeeks: [30, 52],
    category: 'cognitive',
    relatedMilestones: ['finds_hidden_objects', 'object_permanence'],
    icon: '🕵️',
  },
  {
    id: 'music_and_movement',
    title: 'Dance Party',
    description: 'Put on music and move together. Hold baby and sway, bounce, or let them "dance" while standing.',
    duration: '5–10 min',
    ageRangeWeeks: [17, 52],
    category: 'social',
    relatedMilestones: ['enjoys_play'],
    icon: '💃',
    tip: 'Movement + music + your face = the ultimate baby engagement combo.',
  },
];

// ─── Public API ─────────────────────────────────────────────

/**
 * Get all activities
 */
export function getAllActivities(): Activity[] {
  return ACTIVITIES;
}

/**
 * Get activities appropriate for a baby's current age.
 */
export function getActivitiesForAge(ageInWeeks: number): Activity[] {
  return ACTIVITIES.filter(a => {
    const [earliest, latest] = a.ageRangeWeeks;
    return ageInWeeks >= earliest && ageInWeeks <= latest;
  });
}

/**
 * Get today's suggested activities (3–5 activities).
 * Uses deterministic rotation so the same activities show all day,
 * but change each day.
 */
export function getTodaysActivities(
  ageInWeeks: number,
  completedMilestoneIds: string[] = [],
  count: number = 4
): Activity[] {
  const eligible = getActivitiesForAge(ageInWeeks);

  if (eligible.length === 0) return [];
  if (eligible.length <= count) return eligible;

  // Prioritize activities related to milestones the baby HASN'T completed yet
  const scored = eligible.map(activity => {
    const hasUncompletedRelated = activity.relatedMilestones.some(
      mId => !completedMilestoneIds.includes(mId)
    );
    return {
      activity,
      // Higher score = more relevant
      score: hasUncompletedRelated ? 2 : 1,
    };
  });

  // Sort by relevance, then use deterministic daily rotation
  scored.sort((a, b) => b.score - a.score);

  // Deterministic daily offset — same activities all day, different tomorrow
  const today = new Date();
  const dayHash = today.getFullYear() * 400 + today.getMonth() * 32 + today.getDate();
  const offset = dayHash % scored.length;

  // Pick `count` activities starting from the daily offset
  const selected: Activity[] = [];
  for (let i = 0; i < count && i < scored.length; i++) {
    const index = (offset + i) % scored.length;
    selected.push(scored[index].activity);
  }

  // Ensure category diversity — swap duplicates if possible
  const categories = new Set<string>();
  const diversified: Activity[] = [];
  const remaining = scored
    .map(s => s.activity)
    .filter(a => !selected.includes(a));

  for (const activity of selected) {
    if (categories.has(activity.category) && remaining.length > 0) {
      // Try to swap with a different-category activity
      const swapIndex = remaining.findIndex(a => !categories.has(a.category));
      if (swapIndex !== -1) {
        const swap = remaining.splice(swapIndex, 1)[0];
        categories.add(swap.category);
        diversified.push(swap);
        continue;
      }
    }
    categories.add(activity.category);
    diversified.push(activity);
  }

  return diversified.slice(0, count);
}

/**
 * Get activities by category
 */
export function getActivitiesByCategory(
  category: Activity['category'],
  ageInWeeks: number
): Activity[] {
  return getActivitiesForAge(ageInWeeks).filter(a => a.category === category);
}

/**
 * Get activities that support a specific milestone
 */
export function getActivitiesForMilestone(milestoneId: string): Activity[] {
  return ACTIVITIES.filter(a => a.relatedMilestones.includes(milestoneId));
}
