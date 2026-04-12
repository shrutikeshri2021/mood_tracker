export interface CheckInEntry {
  id: string;
  date: string;
  timeOfDay: 'Morning' | 'Afternoon' | 'Evening';
  mood: string;
  moodIntensity: number;
  stress: number;
  energy: number;
  sleepQuality: number;
  workload: number;
  focus: number;
  socialBattery: number;
  tags: string[];
  triggers: string[];
  notes: string;
}

export interface JournalEntry {
  id: string;
  date: string;
  type: 'free' | 'prompt' | 'voice';
  content: string;
  emotionDetected?: string;
}

export interface BurnoutResult {
  score: number;
  level: 'Low' | 'Moderate' | 'High';
  explanation: string;
}

export interface BalanceScoreResult {
  score: number;
  label: string;
}

export interface Pattern {
  title: string;
  description: string;
  type: 'positive' | 'warning' | 'neutral';
}

export interface Forecast {
  prediction: string;
  confidence: string;
  rationale: string;
  copingSuggestions: string[];
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function weekdayKey(date: string) {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return 'unknown';
  return parsed.toLocaleDateString(undefined, { weekday: 'long' });
}

function moodValence(mood: string) {
  const key = mood.toLowerCase();
  if (['calm', 'peaceful', 'inspired', 'happy', 'joyful', 'steady'].some((word) => key.includes(word))) return 8;
  if (['okay', 'neutral', 'fine'].some((word) => key.includes(word))) return 6;
  if (['stressy', 'anxious', 'worried', 'overwhelmed'].some((word) => key.includes(word))) return 3;
  if (['exhausted', 'burned out', 'tired', 'sad'].some((word) => key.includes(word))) return 2;
  return 5;
}

function average(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function calculateBurnoutScore(entries: CheckInEntry[]): BurnoutResult {
  if (!entries.length) {
    return {
      score: 18,
      level: 'Low',
      explanation: 'Log a few check-ins to unlock a more personal burnout reading. Right now we are using a gentle baseline.'
    };
  }

  const recent = entries.slice(-7);
  const avgStress = average(recent.map((entry) => entry.stress));
  const avgEnergy = average(recent.map((entry) => entry.energy));
  const avgSleep = average(recent.map((entry) => entry.sleepQuality));
  const avgWorkload = average(recent.map((entry) => entry.workload));
  const avgMood = average(recent.map((entry) => moodValence(entry.mood)));

  const olderHalf = recent.slice(0, Math.max(1, Math.floor(recent.length / 2)));
  const newerHalf = recent.slice(Math.max(1, Math.floor(recent.length / 2)));
  const moodTrendPenalty = average(olderHalf.map((entry) => moodValence(entry.mood))) - average(newerHalf.map((entry) => moodValence(entry.mood)));

  const score = clamp(
    Math.round(
      (avgStress / 10) * 30 +
      (avgWorkload / 10) * 22 +
      ((10 - avgEnergy) / 10) * 18 +
      ((10 - avgSleep) / 10) * 18 +
      ((10 - avgMood) / 10) * 8 +
      clamp(moodTrendPenalty * 2.5, 0, 12)
    ),
    0,
    100
  );

  if (score >= 70) {
    return {
      score,
      level: 'High',
      explanation: 'Your recent pattern shows sustained pressure, lower reserves, and fatigue signals that can point toward active burnout risk. Recovery and boundary protection deserve immediate space.'
    };
  }

  if (score >= 40) {
    return {
      score,
      level: 'Moderate',
      explanation: 'You are carrying meaningful strain. Stress and workload are starting to compete with sleep, mood, and energy stability.'
    };
  }

  return {
    score,
    level: 'Low',
    explanation: 'Your current pattern suggests manageable demand with enough emotional and physical reserve to stay grounded.'
  };
}

export function detectEmotionalPatterns(entries: CheckInEntry[]): Pattern[] {
  if (entries.length < 3) {
    return [
      {
        title: 'Gathering Patterns',
        description: 'Complete at least 3 check-ins to unlock personalized pattern detection across sleep, stress, workload, and mood.',
        type: 'neutral'
      }
    ];
  }

  const recent = entries.slice(-14);
  const patterns: Pattern[] = [];

  const lowSleep = recent.filter((entry) => entry.sleepQuality <= 4);
  if (lowSleep.length >= 2 && average(lowSleep.map((entry) => entry.moodIntensity)) <= 5.5) {
    patterns.push({
      title: 'Low Sleep → Lower Mood',
      description: 'When sleep quality dips, your mood intensity and energy tend to drop soon after.',
      type: 'warning'
    });
  }

  const highWorkload = recent.filter((entry) => entry.workload >= 7);
  if (highWorkload.length >= 2 && average(highWorkload.map((entry) => entry.stress)) >= 6.5) {
    patterns.push({
      title: 'Work Pressure → Stress Spike',
      description: 'Heavier workload entries are consistently landing alongside higher stress readings.',
      type: 'warning'
    });
  }

  const rested = recent.filter((entry) => entry.sleepQuality >= 7);
  if (rested.length >= 2 && average(rested.map((entry) => entry.energy)) >= 6.5) {
    patterns.push({
      title: 'Better Sleep → Higher Energy',
      description: 'On days with stronger sleep quality, your energy and focus show a noticeable lift.',
      type: 'positive'
    });
  }

  const lowSocialBattery = recent.filter((entry) => entry.socialBattery <= 4);
  if (lowSocialBattery.length >= 2) {
    patterns.push({
      title: 'Social Drain Notice',
      description: 'Several recent check-ins show your social battery running low. Gentle connection and recovery time may help.',
      type: 'neutral'
    });
  }

  const triggers: Record<string, number[]> = {};
  recent.forEach((entry) => {
    entry.triggers.forEach((trigger) => {
      if (!triggers[trigger]) triggers[trigger] = [];
      triggers[trigger].push(entry.stress);
    });
  });

  Object.entries(triggers).forEach(([trigger, stresses]) => {
    if (stresses.length >= 2 && average(stresses) >= 7) {
      patterns.push({
        title: `Trigger Pattern: ${trigger}`,
        description: `“${trigger}” has appeared repeatedly alongside elevated stress in your recent logs.`,
        type: 'warning'
      });
    }
  });

  const bestTime = ['Morning', 'Afternoon', 'Evening']
    .map((timeOfDay) => ({
      timeOfDay,
      average: average(recent.filter((entry) => entry.timeOfDay === timeOfDay).map((entry) => entry.moodIntensity))
    }))
    .sort((a, b) => b.average - a.average)[0];

  if (bestTime && bestTime.average) {
    patterns.push({
      title: `${bestTime.timeOfDay} Window`,
      description: `Your ${bestTime.timeOfDay.toLowerCase()} check-ins currently show the most stable or positive mood scores.`,
      type: 'positive'
    });
  }

  return patterns.slice(0, 6);
}

export function generateMoodForecast(entries: CheckInEntry[]): Forecast {
  if (!entries.length) {
    return {
      prediction: 'Calm / Neutral',
      confidence: 'Medium',
      rationale: 'There is not enough personal history yet, so the forecast is using a gentle baseline.',
      copingSuggestions: [
        'Try a first check-in to start your personal mood map',
        'Take one slow grounding breath before the next task',
        'Write a short journal note about what you need today'
      ]
    };
  }

  const recent = entries.slice(-7);
  const latest = recent[recent.length - 1];
  const sameTimeEntries = recent.filter((entry) => entry.timeOfDay === latest.timeOfDay);
  const sameWeekdayEntries = recent.filter((entry) => weekdayKey(entry.date) === weekdayKey(latest.date));

  const recentMood = average(recent.map((entry) => moodValence(entry.mood)));
  const sameTimeMood = average(sameTimeEntries.map((entry) => moodValence(entry.mood))) || recentMood;
  const sameWeekdayMood = average(sameWeekdayEntries.map((entry) => moodValence(entry.mood))) || recentMood;
  const sleepEffect = latest.sleepQuality >= 7 ? 1.2 : latest.sleepQuality <= 4 ? -1.4 : 0;
  const stressEffect = latest.stress >= 7 ? -1.5 : latest.stress <= 3 ? 0.9 : 0;
  const energyEffect = latest.energy >= 7 ? 1 : latest.energy <= 4 ? -1.2 : 0;

  const blended = recentMood * 0.45 + sameTimeMood * 0.25 + sameWeekdayMood * 0.15 + 5 * 0.15 + sleepEffect + stressEffect + energyEffect;

  if (blended >= 7.2) {
    return {
      prediction: 'Balanced / Calm',
      confidence: recent.length >= 4 ? 'High' : 'Medium',
      rationale: 'Recent trend, sleep quality, and your usual time-of-day pattern suggest a steadier emotional window ahead.',
      copingSuggestions: [
        'Protect the rhythm that is already helping you feel steady',
        'Use gratitude or affirmations to reinforce the calmer baseline',
        'Pair your next focus block with pure tones or soft rain audio'
      ]
    };
  }

  if (blended >= 5.2) {
    return {
      prediction: 'Tender / Manageable',
      confidence: 'Medium',
      rationale: 'Your data suggests you may stay functional but sensitive. Stress may rise if demands stack too quickly.',
      copingSuggestions: [
        'Choose lower-friction tasks first to protect momentum',
        'Use a brief breathing reset before transitions',
        'Keep hydration, food, and sleep support simple and consistent'
      ]
    };
  }

  return {
    prediction: 'Strained / Low Reserve',
    confidence: recent.length >= 4 ? 'High' : 'Medium',
    rationale: 'Lower energy, weaker sleep, or higher stress in your recent pattern point toward reduced emotional reserve.',
    copingSuggestions: [
      'Scale expectations down and focus on essentials only',
      'Use grounding, PMR, or a self-compassion break today',
      'Consider quieter environments and lighter social demand'
    ]
  };
}

export function calculateBalanceScore(entries: CheckInEntry[]): BalanceScoreResult {
  if (!entries.length) {
    return { score: 72, label: 'Settling In' };
  }

  const latest = entries[entries.length - 1];
  const baseMood = ((moodValence(latest.mood) + latest.moodIntensity) / 20) * 35;
  const stressSupport = ((10 - latest.stress) / 10) * 25;
  const energySupport = (latest.energy / 10) * 20;
  const sleepSupport = (latest.sleepQuality / 10) * 20;

  const score = clamp(Math.round(baseMood + stressSupport + energySupport + sleepSupport), 0, 100);

  if (score >= 80) return { score, label: 'Thriving' };
  if (score >= 65) return { score, label: 'Steady' };
  if (score >= 45) return { score, label: 'Tender' };
  return { score, label: 'Overextended' };
}

export const guidedJournalPrompts = [
  'What is asking for gentleness in you today?',
  'What drained you recently, and what helped even a little?',
  'If your nervous system could speak, what would it ask for right now?',
  'What boundary would protect your peace this week?',
  'Describe one tiny moment of beauty or relief you noticed today.',
  'What value do you want to live from, even in a hard season?',
  'What have you survived that deserves more compassion than criticism?'
];

export const affirmationCards = [
  'Peace is allowed to arrive slowly.',
  'I can soften without losing my strength.',
  'My body deserves rest that is not earned by exhaustion.',
  'I am allowed to move at the speed of healing.',
  'A small act of care still counts as care.',
  'I do not have to solve everything tonight.',
  'With each breath, I make a little more room for calm.'
];
