export interface ToolDefinition {
  id: string;
  title: string;
  category: 'clinical' | 'lifestyle' | 'doctor' | 'advanced';
  group?: 'mindfulness' | 'insight' | 'support' | 'recovery';
  description: string;
  fields: Array<{
    name: string;
    label: string;
    type: 'text' | 'textarea' | 'number' | 'select' | 'checkbox';
    options?: string[];
  }>;
}

export const advancedGroups = {
  mindfulness: 'Mindfulness & Recovery',
  insight: 'Emotional Insight',
  support: 'Support & Movement',
  recovery: 'Focused Recovery Plans'
} as const;

export const clinicalTools: ToolDefinition[] = [
  {
    id: 'cbt_thought_record',
    title: 'CBT Thought Records',
    category: 'clinical',
    description: 'Capture a situation, automatic thought, emotional intensity, and a more balanced reframe.',
    fields: [
      { name: 'situation', label: 'Situation / trigger', type: 'textarea' },
      { name: 'thought', label: 'Automatic thought', type: 'textarea' },
      { name: 'emotion', label: 'Emotion + intensity (1-10)', type: 'text' },
      { name: 'evidenceFor', label: 'Evidence for the thought', type: 'textarea' },
      { name: 'evidenceAgainst', label: 'Evidence against the thought', type: 'textarea' },
      { name: 'balancedThought', label: 'Balanced thought', type: 'textarea' }
    ]
  },
  {
    id: 'grounding_54321',
    title: 'Grounding 5-4-3-2-1',
    category: 'clinical',
    description: 'Gently anchor back into the present moment using your senses.',
    fields: [
      { name: 'fiveSee', label: '5 things you can see', type: 'textarea' },
      { name: 'fourFeel', label: '4 things you can feel', type: 'textarea' },
      { name: 'threeHear', label: '3 things you can hear', type: 'textarea' },
      { name: 'twoSmell', label: '2 things you can smell', type: 'textarea' },
      { name: 'oneTaste', label: '1 thing you can taste or appreciate', type: 'textarea' }
    ]
  },
  {
    id: 'pmr',
    title: 'Progressive Muscle Relaxation',
    category: 'clinical',
    description: 'Track tension release across body areas before and after a PMR session.',
    fields: [
      { name: 'areas', label: 'Muscle groups focused on', type: 'text' },
      { name: 'before', label: 'Tension before (1-10)', type: 'number' },
      { name: 'after', label: 'Tension after (1-10)', type: 'number' },
      { name: 'notes', label: 'Session notes', type: 'textarea' }
    ]
  },
  {
    id: 'self_compassion_break',
    title: 'Self-Compassion Break',
    category: 'clinical',
    description: 'Name the hard moment, remember common humanity, and respond with kindness.',
    fields: [
      { name: 'moment', label: 'What feels painful right now?', type: 'textarea' },
      { name: 'humanity', label: 'How is this part of being human?', type: 'textarea' },
      { name: 'kindness', label: 'What would kindness sound like here?', type: 'textarea' }
    ]
  },
  {
    id: 'worry_time',
    title: 'Worry Time',
    category: 'clinical',
    description: 'Unload worries into a container and sort what is actionable from what must be released.',
    fields: [
      { name: 'worries', label: 'What are you worrying about?', type: 'textarea' },
      { name: 'actionable', label: 'What can you act on?', type: 'textarea' },
      { name: 'release', label: 'What needs acceptance or later review?', type: 'textarea' }
    ]
  },
  {
    id: 'safety_plan',
    title: 'Safety Plan',
    category: 'clinical',
    description: 'Create a private local-only support plan for crisis moments and urgent distress.',
    fields: [
      { name: 'warningSigns', label: 'Warning signs', type: 'textarea' },
      { name: 'coping', label: 'Internal coping strategies', type: 'textarea' },
      { name: 'contacts', label: 'Support people / professionals', type: 'textarea' },
      { name: 'environment', label: 'Ways to make your space safer', type: 'textarea' }
    ]
  }
];

export const lifestyleTools: ToolDefinition[] = [
  {
    id: 'gratitude_log',
    title: 'Gratitude',
    category: 'lifestyle',
    description: 'Record three small or meaningful things that deserve appreciation today.',
    fields: [
      { name: 'one', label: 'Gratitude 1', type: 'text' },
      { name: 'two', label: 'Gratitude 2', type: 'text' },
      { name: 'three', label: 'Gratitude 3', type: 'text' }
    ]
  },
  {
    id: 'sleep_tracker',
    title: 'Sleep Tracker',
    category: 'lifestyle',
    description: 'Track duration, quality, and your wind-down patterns.',
    fields: [
      { name: 'hours', label: 'Hours slept', type: 'number' },
      { name: 'quality', label: 'Sleep quality (1-10)', type: 'number' },
      { name: 'windDown', label: 'Wind-down notes', type: 'textarea' }
    ]
  },
  {
    id: 'medication_tracker',
    title: 'Medication Tracker',
    category: 'lifestyle',
    description: 'Track medication, supplements, timing, and observations.',
    fields: [
      { name: 'name', label: 'Medication / supplement', type: 'text' },
      { name: 'time', label: 'Time taken', type: 'text' },
      { name: 'notes', label: 'Notes / side effects / benefits', type: 'textarea' }
    ]
  },
  {
    id: 'social_connection',
    title: 'Social Connection',
    category: 'lifestyle',
    description: 'Log the people, quality, and energy impact of your social interactions.',
    fields: [
      { name: 'person', label: 'Who did you connect with?', type: 'text' },
      { name: 'impact', label: 'Energy impact', type: 'select', options: ['Charged', 'Neutral', 'Drained'] },
      { name: 'quality', label: 'Connection quality (1-10)', type: 'number' }
    ]
  },
  {
    id: 'energy_budget',
    title: 'Energy Budget',
    category: 'lifestyle',
    description: 'Plan your spoons, drains, and recovery moments before you run empty.',
    fields: [
      { name: 'capacity', label: 'Starting capacity (1-10)', type: 'number' },
      { name: 'demands', label: 'Highest-demand tasks', type: 'textarea' },
      { name: 'recharge', label: 'Recharge plans', type: 'textarea' }
    ]
  },
  {
    id: 'affirmations',
    title: 'Affirmations',
    category: 'lifestyle',
    description: 'Save the affirmation that resonates and note how you want to carry it today.',
    fields: [
      { name: 'affirmation', label: 'Chosen affirmation', type: 'textarea' },
      { name: 'reflection', label: 'Reflection or intention', type: 'textarea' }
    ]
  },
  {
    id: 'mood_calendar',
    title: 'Mood Calendar',
    category: 'lifestyle',
    description: 'Review your emotional pattern across recent days in a simple private calendar view.',
    fields: [
      { name: 'reflection', label: 'Calendar reflection note', type: 'textarea' }
    ]
  },
  {
    id: 'daily_wellness_score',
    title: 'Daily Wellness Score',
    category: 'lifestyle',
    description: 'Rate the basics that support your nervous system and overall steadiness.',
    fields: [
      { name: 'nutrition', label: 'Nutrition support (1-10)', type: 'number' },
      { name: 'movement', label: 'Movement / body care (1-10)', type: 'number' },
      { name: 'rest', label: 'Rest support (1-10)', type: 'number' },
      { name: 'connection', label: 'Connection / support (1-10)', type: 'number' },
      { name: 'note', label: 'Short note', type: 'textarea' }
    ]
  },
  {
    id: 'emergency_contacts',
    title: 'Emergency Contacts',
    category: 'lifestyle',
    description: 'Keep essential support names and numbers stored locally on your device.',
    fields: [
      { name: 'name', label: 'Contact name', type: 'text' },
      { name: 'relationship', label: 'Relationship', type: 'text' },
      { name: 'phone', label: 'Phone / contact method', type: 'text' },
      { name: 'notes', label: 'What support can they offer?', type: 'textarea' }
    ]
  }
];

export const doctorTools: ToolDefinition[] = [
  {
    id: 'phq_9',
    title: 'PHQ-9',
    category: 'doctor',
    description: 'A quick local log for the PHQ-9 screening score and notes.',
    fields: [
      { name: 'score', label: 'Total PHQ-9 score', type: 'number' },
      { name: 'notes', label: 'Context / clinical notes', type: 'textarea' }
    ]
  },
  {
    id: 'gad_7',
    title: 'GAD-7',
    category: 'doctor',
    description: 'Track a GAD-7 screening result privately on-device.',
    fields: [
      { name: 'score', label: 'Total GAD-7 score', type: 'number' },
      { name: 'notes', label: 'Context / clinical notes', type: 'textarea' }
    ]
  },
  {
    id: 'cognitive_distortions',
    title: 'Cognitive Distortions',
    category: 'doctor',
    description: 'Identify thinking traps and challenge them with a reality-based response.',
    fields: [
      { name: 'distortion', label: 'Distortion noticed', type: 'text' },
      { name: 'example', label: 'Example thought', type: 'textarea' },
      { name: 'reframe', label: 'Balanced alternative', type: 'textarea' }
    ]
  },
  {
    id: 'behavioral_activation',
    title: 'Behavioral Activation',
    category: 'doctor',
    description: 'Plan small meaningful actions and compare predicted versus actual benefit.',
    fields: [
      { name: 'activity', label: 'Planned activity', type: 'text' },
      { name: 'predicted', label: 'Predicted benefit (1-10)', type: 'number' },
      { name: 'actual', label: 'Actual benefit (1-10)', type: 'number' }
    ]
  },
  {
    id: 'hydration',
    title: 'Hydration',
    category: 'doctor',
    description: 'Track water intake and how hydration affects your body and mood.',
    fields: [
      { name: 'glasses', label: 'Glasses of water', type: 'number' },
      { name: 'effect', label: 'How did hydration affect you?', type: 'textarea' }
    ]
  },
  {
    id: 'sunlight',
    title: 'Sunlight',
    category: 'doctor',
    description: 'Track daylight exposure for circadian support and nervous system stability.',
    fields: [
      { name: 'minutes', label: 'Minutes in sunlight', type: 'number' },
      { name: 'timing', label: 'When did you get daylight?', type: 'text' }
    ]
  },
  {
    id: 'dbt_skills',
    title: 'DBT Skills',
    category: 'doctor',
    description: 'Track which distress tolerance or emotion regulation skills you used.',
    fields: [
      { name: 'skill', label: 'Skill used', type: 'text' },
      { name: 'effectiveness', label: 'Effectiveness (1-10)', type: 'number' },
      { name: 'notes', label: 'Notes', type: 'textarea' }
    ]
  },
  {
    id: 'healthy_boundaries',
    title: 'Healthy Boundaries',
    category: 'doctor',
    description: 'Write down a needed boundary and language that helps you hold it.',
    fields: [
      { name: 'boundary', label: 'Boundary needed', type: 'textarea' },
      { name: 'script', label: 'Boundary script', type: 'textarea' }
    ]
  },
  {
    id: 'somatic_pain_map',
    title: 'Somatic Pain Map',
    category: 'doctor',
    description: 'Track where distress is showing up in the body.',
    fields: [
      { name: 'location', label: 'Body location', type: 'text' },
      { name: 'sensation', label: 'Sensation', type: 'text' },
      { name: 'intensity', label: 'Intensity (1-10)', type: 'number' }
    ]
  },
  {
    id: 'behavioral_experiment',
    title: 'Behavioral Experiment',
    category: 'doctor',
    description: 'Test a prediction, observe what happened, and update the belief.',
    fields: [
      { name: 'prediction', label: 'Prediction', type: 'textarea' },
      { name: 'experiment', label: 'Experiment plan', type: 'textarea' },
      { name: 'result', label: 'Actual result', type: 'textarea' }
    ]
  },
  {
    id: 'self_care_checklist',
    title: 'Self-Care Checklist',
    category: 'doctor',
    description: 'Log the basics: nourishment, hygiene, rest, movement, and care.',
    fields: [
      { name: 'nourishment', label: 'Ate something nourishing', type: 'checkbox' },
      { name: 'hydrated', label: 'Hydrated', type: 'checkbox' },
      { name: 'rested', label: 'Rested or paused', type: 'checkbox' },
      { name: 'moved', label: 'Moved body gently', type: 'checkbox' },
      { name: 'notes', label: 'Notes', type: 'textarea' }
    ]
  },
  {
    id: 'relapse_prevention',
    title: 'Relapse Prevention Plan',
    category: 'doctor',
    description: 'Capture early warning signs and first recovery actions.',
    fields: [
      { name: 'signs', label: 'Early warning signs', type: 'textarea' },
      { name: 'actions', label: 'First action steps', type: 'textarea' }
    ]
  },
  {
    id: 'digital_wellbeing',
    title: 'Digital Wellbeing',
    category: 'doctor',
    description: 'Notice digital overstimulation and plan healthier screen boundaries.',
    fields: [
      { name: 'drainingApps', label: 'Most draining apps', type: 'text' },
      { name: 'unplugPlan', label: 'Offline plan', type: 'textarea' }
    ]
  },
  {
    id: 'forgiveness_work',
    title: 'Forgiveness Work',
    category: 'doctor',
    description: 'Gently process resentment, hurt, and the possibility of release.',
    fields: [
      { name: 'hurt', label: 'What are you holding?', type: 'textarea' },
      { name: 'release', label: 'What would releasing look like?', type: 'textarea' }
    ]
  },
  {
    id: 'meaning_reflection',
    title: 'Meaning / Existential Reflection',
    category: 'doctor',
    description: 'Reconnect to meaning, purpose, and what matters most.',
    fields: [
      { name: 'value', label: 'Value or purpose thread', type: 'text' },
      { name: 'reflection', label: 'Reflection', type: 'textarea' }
    ]
  }
];

export const advancedTools: ToolDefinition[] = [
  {
    id: 'mindfulness_mbsr',
    title: 'Mindfulness MBSR',
    category: 'advanced',
    group: 'mindfulness',
    description: 'Log a mindfulness-based stress reduction session and your observations.',
    fields: [
      { name: 'duration', label: 'Duration (minutes)', type: 'number' },
      { name: 'focus', label: 'Practice focus', type: 'text' },
      { name: 'insight', label: 'Session insight', type: 'textarea' }
    ]
  },
  {
    id: 'recovery_journal',
    title: 'Recovery Journal',
    category: 'advanced',
    group: 'mindfulness',
    description: 'Capture your healing progress, limits, and recovery wins.',
    fields: [
      { name: 'win', label: 'Recovery win', type: 'textarea' },
      { name: 'need', label: 'What do you need next?', type: 'textarea' }
    ]
  },
  {
    id: 'sound_therapy',
    title: 'Sound Therapy',
    category: 'advanced',
    group: 'mindfulness',
    description: 'Pair your audio preference with a purpose for the session.',
    fields: [
      { name: 'sound', label: 'Preferred sound', type: 'select', options: ['Binaural Beats', 'Pure Tones', 'Nature Noise'] },
      { name: 'purpose', label: 'Session purpose', type: 'text' }
    ]
  },
  {
    id: 'dream_journal',
    title: 'Dream Journal',
    category: 'advanced',
    group: 'mindfulness',
    description: 'Capture dream symbols, emotions, and waking reflections.',
    fields: [
      { name: 'dream', label: 'Dream recall', type: 'textarea' },
      { name: 'emotion', label: 'Dominant dream emotion', type: 'text' }
    ]
  },
  {
    id: 'mood_thermometer',
    title: 'Mood Thermometer',
    category: 'advanced',
    group: 'insight',
    description: 'Give your emotional intensity a more precise reading.',
    fields: [
      { name: 'rating', label: 'Mood / distress rating (1-100)', type: 'number' },
      { name: 'trigger', label: 'What happened just before?', type: 'textarea' }
    ]
  },
  {
    id: 'values_act',
    title: 'Values (ACT)',
    category: 'advanced',
    group: 'insight',
    description: 'Clarify the value you want to live from and one committed action.',
    fields: [
      { name: 'value', label: 'Core value', type: 'text' },
      { name: 'action', label: 'Committed action', type: 'textarea' }
    ]
  },
  {
    id: 'emotion_wheel',
    title: 'Emotion Wheel',
    category: 'advanced',
    group: 'insight',
    description: 'Move from a broad feeling to the more precise layer underneath it.',
    fields: [
      { name: 'outerEmotion', label: 'Broad emotion', type: 'text' },
      { name: 'coreEmotion', label: 'More precise feeling', type: 'text' }
    ]
  },
  {
    id: 'micro_joy',
    title: 'Micro Joy',
    category: 'advanced',
    group: 'insight',
    description: 'Collect tiny moments of ease, delight, warmth, or beauty.',
    fields: [
      { name: 'moment', label: 'Moment of joy', type: 'textarea' },
      { name: 'body', label: 'How did your body respond?', type: 'text' }
    ]
  },
  {
    id: 'peer_support',
    title: 'Peer Support',
    category: 'advanced',
    group: 'support',
    description: 'Draft safe outreach scripts and support asks.',
    fields: [
      { name: 'person', label: 'Who are you reaching out to?', type: 'text' },
      { name: 'message', label: 'Draft message / support ask', type: 'textarea' }
    ]
  },
  {
    id: 'exercise_mood',
    title: 'Exercise & Mood',
    category: 'advanced',
    group: 'support',
    description: 'Track movement and whether it shifted your mood or energy.',
    fields: [
      { name: 'movement', label: 'Type of movement', type: 'text' },
      { name: 'duration', label: 'Minutes', type: 'number' },
      { name: 'shift', label: 'Mood shift after movement', type: 'textarea' }
    ]
  },
  {
    id: 'nature_therapy',
    title: 'Nature Therapy',
    category: 'advanced',
    group: 'support',
    description: 'Track time outdoors, grounding, fresh air, and sensory support from nature.',
    fields: [
      { name: 'place', label: 'Where did you go?', type: 'text' },
      { name: 'duration', label: 'Minutes in nature', type: 'number' },
      { name: 'effect', label: 'How did it affect you?', type: 'textarea' }
    ]
  },
  {
    id: 'letter_therapy',
    title: 'Letter Therapy',
    category: 'advanced',
    group: 'support',
    description: 'Write an unsent letter to process grief, anger, gratitude, or closure.',
    fields: [
      { name: 'recipient', label: 'Recipient', type: 'text' },
      { name: 'letter', label: 'Letter', type: 'textarea' }
    ]
  },
  {
    id: 'compassion_fatigue',
    title: 'Compassion Fatigue',
    category: 'advanced',
    group: 'recovery',
    description: 'Track signs of emotional depletion from caregiving or over-supporting others.',
    fields: [
      { name: 'load', label: 'Care load (1-10)', type: 'number' },
      { name: 'signs', label: 'Signs of depletion', type: 'textarea' }
    ]
  },
  {
    id: 'recovery_goals',
    title: 'Recovery Goals',
    category: 'advanced',
    group: 'recovery',
    description: 'Set a longer-term healing goal and the next small step toward it.',
    fields: [
      { name: 'goal', label: 'Recovery goal', type: 'textarea' },
      { name: 'nextStep', label: 'Next small step', type: 'textarea' }
    ]
  },
  {
    id: 'wind_down_ritual',
    title: 'Wind-Down Ritual',
    category: 'advanced',
    group: 'recovery',
    description: 'Track the rituals that help signal safety and sleep to your body.',
    fields: [
      { name: 'screenOff', label: 'Screens off at', type: 'text' },
      { name: 'ritual', label: 'Wind-down ritual', type: 'textarea' }
    ]
  }
];
