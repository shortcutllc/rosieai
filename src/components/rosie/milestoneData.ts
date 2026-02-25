/**
 * milestoneData.ts — Static developmental milestone definitions
 *
 * Organized by age range and category. Based on CDC and AAP guidelines.
 * These are the DEFINITIONS only — user completions are stored in
 * the rosie_milestones table via supabaseMilestones.ts.
 *
 * Categories:
 * - motor: Gross and fine motor skills
 * - cognitive: Problem-solving, learning, thinking
 * - social: Social-emotional development
 * - communication: Language and communication
 */

export interface MilestoneDefinition {
  id: string;
  title: string;
  description: string;
  category: 'motor' | 'cognitive' | 'social' | 'communication';
  ageRangeWeeks: [number, number]; // [earliest, latest] expected range
  icon: string;
}

export interface MilestoneGroup {
  label: string; // "0–2 Months", "2–4 Months", etc.
  ageRangeWeeks: [number, number];
  milestones: MilestoneDefinition[];
}

// ─── Milestone Definitions ──────────────────────────────────

const MILESTONES: MilestoneDefinition[] = [
  // ═══ 0–2 MONTHS (weeks 0–8) ═══

  // Social
  { id: 'social_smile', title: 'Social smile', description: 'Smiles in response to your voice or face', category: 'social', ageRangeWeeks: [4, 12], icon: '😊' },
  { id: 'self_soothe', title: 'Self-soothes briefly', description: 'Brings hands to mouth to calm down', category: 'social', ageRangeWeeks: [0, 12], icon: '🤚' },
  { id: 'looks_at_faces', title: 'Looks at faces', description: 'Focuses on and studies faces up close', category: 'social', ageRangeWeeks: [0, 8], icon: '👀' },

  // Motor
  { id: 'head_control_brief', title: 'Lifts head briefly', description: 'Lifts head during tummy time for a few seconds', category: 'motor', ageRangeWeeks: [0, 8], icon: '💪' },
  { id: 'smooth_movements', title: 'Smoother movements', description: 'Arm and leg movements become less jerky', category: 'motor', ageRangeWeeks: [4, 12], icon: '🤸' },

  // Communication
  { id: 'coos', title: 'Coos and gurgles', description: 'Makes cooing sounds (other than crying)', category: 'communication', ageRangeWeeks: [4, 12], icon: '🗣️' },
  { id: 'turns_to_sound', title: 'Turns toward sounds', description: 'Moves head toward familiar voices or sounds', category: 'communication', ageRangeWeeks: [0, 12], icon: '👂' },

  // Cognitive
  { id: 'tracks_objects', title: 'Tracks moving objects', description: 'Follows things with eyes from side to side', category: 'cognitive', ageRangeWeeks: [4, 12], icon: '🎯' },
  { id: 'recognizes_caregiver', title: 'Recognizes caregiver', description: 'Clearly recognizes parent at a distance', category: 'cognitive', ageRangeWeeks: [4, 12], icon: '❤️' },

  // ═══ 2–4 MONTHS (weeks 8–17) ═══

  // Social
  { id: 'smiles_spontaneously', title: 'Smiles spontaneously', description: 'Smiles on their own, not just in response', category: 'social', ageRangeWeeks: [8, 17], icon: '😄' },
  { id: 'copies_expressions', title: 'Copies expressions', description: 'Mimics your facial expressions (sticking tongue out, opening mouth)', category: 'social', ageRangeWeeks: [8, 17], icon: '🪞' },
  { id: 'enjoys_play', title: 'Enjoys playing with people', description: 'May cry when playing stops, shows excitement when interacting', category: 'social', ageRangeWeeks: [8, 17], icon: '🎭' },

  // Motor
  { id: 'head_control_steady', title: 'Steady head control', description: 'Holds head steady without support when held upright', category: 'motor', ageRangeWeeks: [8, 17], icon: '💪' },
  { id: 'pushes_up_arms', title: 'Pushes up on arms', description: 'Pushes up to elbows during tummy time', category: 'motor', ageRangeWeeks: [8, 17], icon: '🏋️' },
  { id: 'brings_hands_midline', title: 'Brings hands to midline', description: 'Brings hands together in front of body, clasps them', category: 'motor', ageRangeWeeks: [8, 17], icon: '🤲' },
  { id: 'swipes_at_toys', title: 'Swipes at dangling toys', description: 'Reaches and bats at toys hanging overhead', category: 'motor', ageRangeWeeks: [8, 17], icon: '🎪' },

  // Communication
  { id: 'babbles', title: 'Babbles with expression', description: 'Makes vowel sounds (ah, oh) and consonant sounds', category: 'communication', ageRangeWeeks: [8, 17], icon: '💬' },
  { id: 'laughs', title: 'Laughs out loud', description: 'Giggles or belly laughs in response to play', category: 'communication', ageRangeWeeks: [12, 20], icon: '😂' },
  { id: 'different_cries', title: 'Different cries for needs', description: 'Uses distinct cries for hunger, tiredness, discomfort', category: 'communication', ageRangeWeeks: [8, 17], icon: '😢' },

  // Cognitive
  { id: 'watches_faces_intently', title: 'Watches faces intently', description: 'Studies faces closely and follows with eyes', category: 'cognitive', ageRangeWeeks: [8, 17], icon: '🔍' },
  { id: 'recognizes_bottle', title: 'Recognizes familiar objects', description: 'Shows excitement when seeing bottle or breast', category: 'cognitive', ageRangeWeeks: [8, 17], icon: '🍼' },

  // ═══ 4–6 MONTHS (weeks 17–26) ═══

  // Social
  { id: 'knows_familiar_people', title: 'Knows familiar people', description: 'Responds differently to familiar people vs strangers', category: 'social', ageRangeWeeks: [17, 26], icon: '👋' },
  { id: 'likes_mirror', title: 'Likes looking in mirror', description: 'Smiles or reaches at their own reflection', category: 'social', ageRangeWeeks: [17, 26], icon: '🪞' },
  { id: 'responds_to_emotions', title: 'Responds to emotions', description: 'Reacts to tone of voice — smiles at happy, frowns at angry', category: 'social', ageRangeWeeks: [17, 26], icon: '🎭' },

  // Motor
  { id: 'rolls_tummy_to_back', title: 'Rolls tummy to back', description: 'Rolls from tummy to back independently', category: 'motor', ageRangeWeeks: [13, 22], icon: '🔄' },
  { id: 'rolls_back_to_tummy', title: 'Rolls back to tummy', description: 'Rolls from back to tummy independently', category: 'motor', ageRangeWeeks: [17, 30], icon: '🔄' },
  { id: 'sits_with_support', title: 'Sits with support', description: 'Sits upright with hands or pillow for support', category: 'motor', ageRangeWeeks: [17, 26], icon: '🪑' },
  { id: 'reaches_and_grabs', title: 'Reaches and grabs', description: 'Purposefully reaches for and grabs objects', category: 'motor', ageRangeWeeks: [13, 22], icon: '✊' },
  { id: 'transfers_objects', title: 'Transfers between hands', description: 'Passes a toy from one hand to the other', category: 'motor', ageRangeWeeks: [17, 30], icon: '🤹' },

  // Communication
  { id: 'responds_to_name', title: 'Responds to name', description: 'Turns head or looks up when you say their name', category: 'communication', ageRangeWeeks: [17, 30], icon: '📣' },
  { id: 'consonant_sounds', title: 'Consonant sounds', description: 'Makes consonant sounds like "ba", "da", "ga"', category: 'communication', ageRangeWeeks: [17, 30], icon: '🗣️' },
  { id: 'squeals', title: 'Squeals and blows raspberries', description: 'Makes high-pitched squealing sounds, blows bubbles', category: 'communication', ageRangeWeeks: [13, 26], icon: '😝' },

  // Cognitive
  { id: 'explores_with_mouth', title: 'Explores with mouth', description: 'Puts everything in mouth to explore', category: 'cognitive', ageRangeWeeks: [13, 26], icon: '👄' },
  { id: 'cause_and_effect', title: 'Discovers cause and effect', description: 'Repeats actions that produce results (shaking rattles, pressing buttons)', category: 'cognitive', ageRangeWeeks: [17, 30], icon: '🔔' },
  { id: 'curious_about_things', title: 'Curious about surroundings', description: 'Looks at things nearby, tries to get things out of reach', category: 'cognitive', ageRangeWeeks: [13, 26], icon: '🌍' },

  // ═══ 6–9 MONTHS (weeks 26–39) ═══

  // Social
  { id: 'stranger_anxiety', title: 'Stranger awareness', description: 'May be clingy with familiar adults, shy with strangers', category: 'social', ageRangeWeeks: [26, 39], icon: '🫣' },
  { id: 'has_favorite_toys', title: 'Has favorite toys', description: 'Shows clear preferences for certain toys or objects', category: 'social', ageRangeWeeks: [26, 39], icon: '🧸' },
  { id: 'plays_peekaboo', title: 'Plays peekaboo', description: 'Enjoys interactive games like peekaboo and pat-a-cake', category: 'social', ageRangeWeeks: [26, 39], icon: '🙈' },

  // Motor
  { id: 'sits_without_support', title: 'Sits without support', description: 'Sits independently without needing hands for balance', category: 'motor', ageRangeWeeks: [22, 35], icon: '🪑' },
  { id: 'crawls', title: 'Crawls', description: 'Moves forward on hands and knees (or army crawls/scoots)', category: 'motor', ageRangeWeeks: [26, 43], icon: '🐛' },
  { id: 'pulls_to_stand', title: 'Pulls to stand', description: 'Pulls up to standing using furniture', category: 'motor', ageRangeWeeks: [30, 43], icon: '🧗' },
  { id: 'pincer_grasp_developing', title: 'Pincer grasp developing', description: 'Uses thumb and finger to pick up small objects', category: 'motor', ageRangeWeeks: [30, 43], icon: '🤏' },

  // Communication
  { id: 'babbles_chains', title: 'Chains syllables together', description: 'Babbles chains like "bababa" or "mamama"', category: 'communication', ageRangeWeeks: [26, 39], icon: '💬' },
  { id: 'understands_no', title: 'Understands "no"', description: 'Pauses or stops briefly when hearing "no"', category: 'communication', ageRangeWeeks: [26, 43], icon: '🚫' },
  { id: 'points_at_things', title: 'Points at things', description: 'Uses finger to point at objects of interest', category: 'communication', ageRangeWeeks: [30, 48], icon: '👆' },

  // Cognitive
  { id: 'object_permanence', title: 'Object permanence', description: 'Looks for hidden objects — knows they still exist', category: 'cognitive', ageRangeWeeks: [26, 39], icon: '🔎' },
  { id: 'drops_objects_on_purpose', title: 'Drops objects on purpose', description: 'Drops things deliberately and watches them fall', category: 'cognitive', ageRangeWeeks: [26, 39], icon: '📦' },
  { id: 'explores_textures', title: 'Explores different textures', description: 'Shows interest in different textures, surfaces, and materials', category: 'cognitive', ageRangeWeeks: [26, 39], icon: '🧶' },

  // ═══ 9–12 MONTHS (weeks 39–52) ═══

  // Social
  { id: 'separation_anxiety', title: 'Separation anxiety', description: 'Cries or clings when caregiver leaves the room', category: 'social', ageRangeWeeks: [35, 52], icon: '😟' },
  { id: 'plays_social_games', title: 'Plays social games', description: 'Initiates peekaboo, pat-a-cake, or waving bye-bye', category: 'social', ageRangeWeeks: [35, 52], icon: '🎲' },
  { id: 'shows_affection', title: 'Shows affection', description: 'Gives hugs, pats, or open-mouth kisses to familiar people', category: 'social', ageRangeWeeks: [39, 52], icon: '🥰' },

  // Motor
  { id: 'cruises_furniture', title: 'Cruises along furniture', description: 'Walks sideways holding onto furniture', category: 'motor', ageRangeWeeks: [35, 52], icon: '🚶' },
  { id: 'stands_briefly', title: 'Stands without support', description: 'Stands alone for a few seconds without holding on', category: 'motor', ageRangeWeeks: [39, 56], icon: '🧍' },
  { id: 'first_steps', title: 'First steps', description: 'Takes a few independent steps (may be wobbly!)', category: 'motor', ageRangeWeeks: [39, 60], icon: '🦶' },
  { id: 'pincer_grasp_refined', title: 'Refined pincer grasp', description: 'Picks up small things between thumb and pointer finger cleanly', category: 'motor', ageRangeWeeks: [35, 48], icon: '🤏' },

  // Communication
  { id: 'first_words', title: 'First words', description: 'Says "mama" or "dada" with meaning (or another first word)', category: 'communication', ageRangeWeeks: [39, 56], icon: '🗣️' },
  { id: 'follows_simple_commands', title: 'Follows simple instructions', description: 'Understands "give me" or "put it down" with gesture', category: 'communication', ageRangeWeeks: [35, 52], icon: '✅' },
  { id: 'waves_bye', title: 'Waves bye-bye', description: 'Waves hand when someone says bye-bye', category: 'communication', ageRangeWeeks: [35, 48], icon: '👋' },

  // Cognitive
  { id: 'finds_hidden_objects', title: 'Finds hidden objects', description: 'Finds things you hide under blankets or cups', category: 'cognitive', ageRangeWeeks: [35, 48], icon: '🕵️' },
  { id: 'bangs_objects_together', title: 'Bangs objects together', description: 'Hits two objects together to make noise', category: 'cognitive', ageRangeWeeks: [30, 43], icon: '🥁' },
  { id: 'puts_things_in_container', title: 'Puts things in containers', description: 'Places objects in a cup, box, or bowl', category: 'cognitive', ageRangeWeeks: [35, 52], icon: '📥' },
  { id: 'uses_objects_correctly', title: 'Uses objects correctly', description: 'Drinks from cup, brushes hair, holds phone to ear', category: 'cognitive', ageRangeWeeks: [39, 56], icon: '📱' },
];

// ─── Public API ─────────────────────────────────────────────

/**
 * Get all milestone definitions
 */
export function getAllMilestones(): MilestoneDefinition[] {
  return MILESTONES;
}

/**
 * Get milestone definitions grouped by age range
 */
export function getMilestoneGroups(): MilestoneGroup[] {
  return [
    {
      label: '0–2 Months',
      ageRangeWeeks: [0, 8],
      milestones: MILESTONES.filter(m => m.ageRangeWeeks[0] < 8),
    },
    {
      label: '2–4 Months',
      ageRangeWeeks: [8, 17],
      milestones: MILESTONES.filter(m => m.ageRangeWeeks[0] >= 8 && m.ageRangeWeeks[0] < 17),
    },
    {
      label: '4–6 Months',
      ageRangeWeeks: [17, 26],
      milestones: MILESTONES.filter(m => m.ageRangeWeeks[0] >= 13 && m.ageRangeWeeks[0] < 26 && m.ageRangeWeeks[1] <= 30),
    },
    {
      label: '6–9 Months',
      ageRangeWeeks: [26, 39],
      milestones: MILESTONES.filter(m => m.ageRangeWeeks[0] >= 22 && m.ageRangeWeeks[0] < 39 && m.ageRangeWeeks[1] <= 48),
    },
    {
      label: '9–12 Months',
      ageRangeWeeks: [39, 52],
      milestones: MILESTONES.filter(m => m.ageRangeWeeks[0] >= 30 && m.ageRangeWeeks[1] > 43),
    },
  ];
}

/**
 * Get milestones relevant to a baby's current age.
 * Returns milestones where the baby's age falls within the expected range,
 * plus the next upcoming group for "coming soon" display.
 */
export function getMilestonesForAge(ageInWeeks: number): {
  current: MilestoneDefinition[];
  upcoming: MilestoneDefinition[];
  past: MilestoneDefinition[];
} {
  const current: MilestoneDefinition[] = [];
  const upcoming: MilestoneDefinition[] = [];
  const past: MilestoneDefinition[] = [];

  for (const milestone of MILESTONES) {
    const [earliest, latest] = milestone.ageRangeWeeks;

    if (ageInWeeks > latest) {
      // Baby is past the expected window
      past.push(milestone);
    } else if (ageInWeeks >= earliest - 4) {
      // Baby is in or near the expected window (include 4 weeks early for awareness)
      current.push(milestone);
    } else if (earliest - ageInWeeks <= 8) {
      // Coming within the next 8 weeks
      upcoming.push(milestone);
    }
  }

  return { current, upcoming, past };
}

/**
 * Get milestones for a specific catch-up quiz age range.
 * Returns the most important milestones a parent should check off
 * if their baby has already passed this age.
 */
export function getMilestonesForCatchUp(ageInWeeks: number): MilestoneDefinition[] {
  // Return all milestones where the baby is past or within the expected range
  // Sorted by expected onset time (earliest first)
  return MILESTONES
    .filter(m => ageInWeeks >= m.ageRangeWeeks[0])
    .sort((a, b) => a.ageRangeWeeks[0] - b.ageRangeWeeks[0]);
}

/**
 * Get a specific milestone definition by ID
 */
export function getMilestoneById(id: string): MilestoneDefinition | undefined {
  return MILESTONES.find(m => m.id === id);
}

/**
 * Get milestone category display info
 */
export function getCategoryInfo(category: MilestoneDefinition['category']): { label: string; icon: string; color: string } {
  switch (category) {
    case 'motor': return { label: 'Motor', icon: '💪', color: '#FF9500' };
    case 'cognitive': return { label: 'Cognitive', icon: '🧠', color: '#007AFF' };
    case 'social': return { label: 'Social', icon: '❤️', color: '#FF2D55' };
    case 'communication': return { label: 'Communication', icon: '💬', color: '#34C759' };
  }
}
