import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  BarChart2,
  Bell,
  BookOpen,
  ChevronDown,
  ChevronRight,
  Download,
  Flame,
  Heart,
  Home,
  Mic,
  Moon,
  PlusCircle,
  ShieldAlert,
  Sparkles,
  Trash2,
  User,
  Volume2,
  VolumeX
} from 'lucide-react';
import {
  CheckInEntry,
  JournalEntry,
  calculateBalanceScore,
  calculateBurnoutScore,
  detectEmotionalPatterns,
  generateMoodForecast,
  guidedJournalPrompts,
  affirmationCards
} from './engines';
import {
  playBinauralBeats,
  playPureTone,
  playRainNoise,
  playTimerCompletionSound,
  stopAudio
} from './audio';
import {
  ToolDefinition,
  advancedGroups,
  advancedTools,
  clinicalTools,
  doctorTools,
  lifestyleTools
} from './tools';
import { cn } from './utils/cn';

type Tab = 'home' | 'journal' | 'checkin' | 'insights' | 'profile';
type Panel = 'weeklyReport' | 'achievements' | 'patterns' | 'calendar' | 'affirmations' | 'doctorLibrary' | null;
type JournalMode = 'free' | 'prompt' | 'voice';

interface ProfileSettings {
  name: string;
  reminderTime: string;
  panicPin: string;
}

interface BreathingSession {
  id: string;
  startedAt: string;
  duration: number;
  sound: string;
  completed: boolean;
}

interface SavedReport {
  id: string;
  createdAt: string;
  summary: string;
  balance: number;
  burnoutLevel: string;
  highlights: string[];
}

const moodOptions = [
  { label: 'Exhausted', emoji: '😵‍💫', accent: 'from-rose-300/60 to-orange-200/50' },
  { label: 'Stressy', emoji: '😟', accent: 'from-fuchsia-300/60 to-violet-200/50' },
  { label: 'Okay', emoji: '🙂', accent: 'from-sky-300/60 to-cyan-200/50' },
  { label: 'Calm', emoji: '😌', accent: 'from-emerald-300/60 to-cyan-200/50' },
  { label: 'Inspired', emoji: '🤩', accent: 'from-violet-300/60 to-pink-200/50' }
] as const;

const tagOptions = ['Rest', 'Nature', 'Exercise', 'Connection', 'Boundaries', 'Focus', 'Medication', 'Hydration', 'Work', 'Quiet'];
const triggerOptions = ['Workload', 'Conflict', 'Sleep loss', 'News', 'Money', 'Health', 'Crowds', 'Overthinking', 'Good sleep', 'Support'];
const breathingOptions = [60, 120, 180];
const stars = Array.from({ length: 36 }, (_, index) => ({
  id: index,
  left: `${(index * 17) % 100}%`,
  top: `${(index * 23) % 100}%`,
  size: 2 + (index % 3),
  delay: `${(index % 8) * 0.5}s`,
  duration: `${3 + (index % 5)}s`
}));

const initialCheckIn: Partial<CheckInEntry> = {
  mood: 'Calm',
  timeOfDay: 'Morning',
  moodIntensity: 6,
  stress: 4,
  energy: 6,
  sleepQuality: 7,
  workload: 5,
  focus: 6,
  socialBattery: 5,
  tags: [],
  triggers: [],
  notes: ''
};

function loadLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function formatDate(value: string, config?: Intl.DateTimeFormatOptions) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, config ?? { month: 'short', day: 'numeric' }).format(parsed);
}

function formatDayKey(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toISOString().slice(0, 10);
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 18) return 'Good Afternoon';
  return 'Good Evening';
}

function detectVoiceEmotion(text: string) {
  const source = text.toLowerCase();
  if (/(calm|peace|gentle|soft|grounded|steady)/.test(source)) return 'calm';
  if (/(sad|cry|lonely|grief|empty|hurt)/.test(source)) return 'sad';
  if (/(anxious|nervous|panic|worry|overwhelmed|scared)/.test(source)) return 'anxious';
  if (/(angry|mad|frustrated|furious|irritated)/.test(source)) return 'angry';
  if (/(tired|drained|exhausted|burned out|fatigue)/.test(source)) return 'tired';
  if (/(happy|joy|relief|hopeful|grateful|light)/.test(source)) return 'happy';
  return 'neutral';
}

function computeStreak(entries: CheckInEntry[]) {
  if (!entries.length) return 0;
  const days = Array.from(new Set(entries.map((entry) => formatDayKey(entry.date)))).sort();
  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let index = 0; index < 365; index += 1) {
    const current = new Date(today);
    current.setDate(today.getDate() - index);
    const key = current.toISOString().slice(0, 10);
    if (days.includes(key)) streak += 1;
    else if (index === 0) continue;
    else break;
  }

  return streak;
}

function summarizeRecord(record: Record<string, unknown>) {
  const entries = Object.entries(record)
    .filter(([key]) => key !== 'date')
    .slice(0, 3)
    .map(([key, value]) => {
      if (typeof value === 'boolean') return value ? key : null;
      return String(value);
    })
    .filter(Boolean);
  return entries.join(' • ') || 'Saved entry';
}

function buildAchievements(
  entries: CheckInEntry[],
  journals: JournalEntry[],
  breathingSessions: BreathingSession[],
  toolRecords: Record<string, Record<string, unknown>[]>,
  reports: SavedReport[]
) {
  const toolSaveCount = Object.values(toolRecords).reduce((sum, list) => sum + list.length, 0);
  return [
    {
      id: 'first_checkin',
      icon: '🌙',
      title: 'First Light',
      description: 'Saved your first mood check-in.',
      unlocked: entries.length >= 1
    },
    {
      id: 'three_days',
      icon: '✨',
      title: 'Pattern Starter',
      description: 'Logged at least 3 check-ins to unlock deeper insights.',
      unlocked: entries.length >= 3
    },
    {
      id: 'week_streak',
      icon: '🔥',
      title: 'Seven-Day Orbit',
      description: 'Maintained a 7-day check-in streak.',
      unlocked: computeStreak(entries) >= 7
    },
    {
      id: 'first_journal',
      icon: '📖',
      title: 'Open Pages',
      description: 'Saved your first journal entry.',
      unlocked: journals.length >= 1
    },
    {
      id: 'breathing',
      icon: '🫧',
      title: 'Breath Keeper',
      description: 'Completed 3 breathing sessions.',
      unlocked: breathingSessions.filter((item) => item.completed).length >= 3
    },
    {
      id: 'toolkit',
      icon: '🛠️',
      title: 'Healing Toolkit',
      description: 'Saved 5 total tool entries.',
      unlocked: toolSaveCount >= 5
    },
    {
      id: 'report',
      icon: '📊',
      title: 'Insight Archivist',
      description: 'Saved your first weekly report snapshot.',
      unlocked: reports.length >= 1
    }
  ];
}

function GlassCard({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn('glass-card rounded-[30px] p-5 md:p-6', className)}>{children}</div>;
}

function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h3 className="text-[13px] font-semibold uppercase tracking-[0.25em] text-slate-200/90">{title}</h3>
      {action ? (
        <button type="button" onClick={onAction} className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-200/80 transition hover:text-white">
          {action}
        </button>
      ) : null}
    </div>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [openPanel, setOpenPanel] = useState<Panel>(null);
  const [selectedTool, setSelectedTool] = useState<ToolDefinition | null>(null);
  const [openAdvancedGroup, setOpenAdvancedGroup] = useState<string | null>('mindfulness');

  const [entries, setEntries] = useState<CheckInEntry[]>(() => loadLocal('stellar_entries', []));
  const [journals, setJournals] = useState<JournalEntry[]>(() => loadLocal('stellar_journals', []));
  const [toolRecords, setToolRecords] = useState<Record<string, Record<string, unknown>[]>>(() => loadLocal('stellar_tools', {}));
  const [reports, setReports] = useState<SavedReport[]>(() => loadLocal('stellar_reports', []));
  const [breathingSessions, setBreathingSessions] = useState<BreathingSession[]>(() => loadLocal('stellar_breathing', []));
  const [profile, setProfile] = useState<ProfileSettings>(() => loadLocal('stellar_profile', { name: 'Friend', reminderTime: '09:00', panicPin: '2468' }));

  const [checkInStep, setCheckInStep] = useState(1);
  const [newEntry, setNewEntry] = useState<Partial<CheckInEntry>>(initialCheckIn);

  const [journalMode, setJournalMode] = useState<JournalMode>('free');
  const [journalText, setJournalText] = useState('');
  const [promptIndex, setPromptIndex] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [journalFilter, setJournalFilter] = useState<'all' | 'free' | 'prompt' | 'voice'>('all');
  const recognitionRef = useRef<any>(null);

  const [activeSound, setActiveSound] = useState<'binaural' | 'pure' | 'rain' | null>(null);
  const [soundVolume, setSoundVolume] = useState(0.35);
  const [breathingDuration, setBreathingDuration] = useState(60);
  const [breathingSecondsLeft, setBreathingSecondsLeft] = useState(60);
  const [isBreathing, setIsBreathing] = useState(false);
  const [breathingPhase, setBreathingPhase] = useState<'Inhale' | 'Hold' | 'Exhale'>('Inhale');

  const [notificationPermission, setNotificationPermission] = useState<'unsupported' | 'default' | 'granted' | 'denied'>(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
    return Notification.permission;
  });
  const [panicLocked, setPanicLocked] = useState(false);
  const [calculatorInput, setCalculatorInput] = useState('0');
  const [affirmationReflection, setAffirmationReflection] = useState('');

  const allTools = useMemo(() => [...clinicalTools, ...lifestyleTools, ...doctorTools, ...advancedTools], []);
  const burnout = useMemo(() => calculateBurnoutScore(entries), [entries]);
  const patterns = useMemo(() => detectEmotionalPatterns(entries), [entries]);
  const forecast = useMemo(() => generateMoodForecast(entries), [entries]);
  const balance = useMemo(() => calculateBalanceScore(entries), [entries]);
  const streak = useMemo(() => computeStreak(entries), [entries]);
  const achievements = useMemo(() => buildAchievements(entries, journals, breathingSessions, toolRecords, reports), [entries, journals, breathingSessions, toolRecords, reports]);

  const latestEntry = entries[entries.length - 1];
  const latestJournal = journals[0];
  const recentEntries = [...entries].slice(-7);
  const filteredJournals = journals.filter((entry) => journalFilter === 'all' || entry.type === journalFilter);
  const emergencyContacts = toolRecords.emergency_contacts ?? [];
  const savedSafetyPlans = toolRecords.safety_plan ?? [];

  const weeklyStats = useMemo(() => {
    const slice = entries.slice(-7);
    if (!slice.length) {
      return { avgStress: 0, avgEnergy: 0, avgSleep: 0, avgWorkload: 0, avgMood: 0 };
    }

    const total = slice.reduce(
      (acc, entry) => {
        acc.avgStress += entry.stress;
        acc.avgEnergy += entry.energy;
        acc.avgSleep += entry.sleepQuality;
        acc.avgWorkload += entry.workload;
        acc.avgMood += entry.moodIntensity;
        return acc;
      },
      { avgStress: 0, avgEnergy: 0, avgSleep: 0, avgWorkload: 0, avgMood: 0 }
    );

    return {
      avgStress: Number((total.avgStress / slice.length).toFixed(1)),
      avgEnergy: Number((total.avgEnergy / slice.length).toFixed(1)),
      avgSleep: Number((total.avgSleep / slice.length).toFixed(1)),
      avgWorkload: Number((total.avgWorkload / slice.length).toFixed(1)),
      avgMood: Number((total.avgMood / slice.length).toFixed(1))
    };
  }, [entries]);

  useEffect(() => {
    localStorage.setItem('stellar_entries', JSON.stringify(entries));
  }, [entries]);

  useEffect(() => {
    localStorage.setItem('stellar_journals', JSON.stringify(journals));
  }, [journals]);

  useEffect(() => {
    localStorage.setItem('stellar_tools', JSON.stringify(toolRecords));
  }, [toolRecords]);

  useEffect(() => {
    localStorage.setItem('stellar_reports', JSON.stringify(reports));
  }, [reports]);

  useEffect(() => {
    localStorage.setItem('stellar_breathing', JSON.stringify(breathingSessions));
  }, [breathingSessions]);

  useEffect(() => {
    localStorage.setItem('stellar_profile', JSON.stringify(profile));
  }, [profile]);

  useEffect(() => {
    localStorage.setItem(
      'stellar_achievements',
      JSON.stringify(achievements.filter((item) => item.unlocked).map((item) => item.id))
    );
  }, [achievements]);

  useEffect(() => {
    if (!('SpeechRecognition' in window) && !('webkitSpeechRecognition' in window)) return;
    const Recognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new Recognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.onresult = (event: any) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        transcript += event.results[i][0].transcript;
      }
      setJournalText(transcript.trim());
    };
    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition;

    return () => {
      try {
        recognition.stop();
      } catch {
        // noop
      }
    };
  }, []);

  useEffect(() => {
    if (!activeSound) return undefined;
    if (activeSound === 'binaural') playBinauralBeats(200, 7, soundVolume);
    if (activeSound === 'pure') playPureTone(432, soundVolume);
    if (activeSound === 'rain') playRainNoise(soundVolume);
    return undefined;
  }, [activeSound, soundVolume]);

  useEffect(() => () => stopAudio(), []);

  useEffect(() => {
    if (!isBreathing) return undefined;
    const interval = window.setInterval(() => {
      setBreathingSecondsLeft((previous) => {
        if (previous <= 1) {
          window.clearInterval(interval);
          setIsBreathing(false);
          playTimerCompletionSound();
          setBreathingSessions((current) => [
            {
              id: crypto.randomUUID(),
              startedAt: new Date().toISOString(),
              duration: breathingDuration,
              sound: activeSound ?? 'silent',
              completed: true
            },
            ...current
          ]);
          return 0;
        }
        return previous - 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [isBreathing, breathingDuration, activeSound]);

  useEffect(() => {
    const elapsed = breathingDuration - breathingSecondsLeft;
    const cycle = ['Inhale', 'Hold', 'Exhale'] as const;
    setBreathingPhase(cycle[Math.floor(elapsed / 4) % cycle.length]);
  }, [breathingSecondsLeft, breathingDuration]);

  useEffect(() => {
    if (!('Notification' in window)) return undefined;
    const interval = window.setInterval(() => {
      const now = new Date();
      const hhmm = now.toTimeString().slice(0, 5);
      const dayKey = now.toISOString().slice(0, 10);
      const lastSent = localStorage.getItem('stellar_last_reminder');
      if (hhmm === profile.reminderTime && lastSent !== dayKey) {
        localStorage.setItem('stellar_last_reminder', dayKey);
        if (Notification.permission === 'granted') {
          new Notification('Stellar Calm Reminder', {
            body: 'Pause, breathe, and complete a gentle mood check-in.',
            silent: false
          });
        }
      }
    }, 30000);

    return () => window.clearInterval(interval);
  }, [profile.reminderTime]);

  const handleToggleListening = () => {
    if (!recognitionRef.current) {
      window.alert('Speech recognition is only available in supported browsers like Chrome or Safari.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    setJournalMode('voice');
    setJournalText('');
    recognitionRef.current.start();
    setIsListening(true);
  };

  const handleNotificationRequest = async () => {
    if (!('Notification' in window)) {
      setNotificationPermission('unsupported');
      return;
    }
    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
  };

  const sendTestNotification = async () => {
    if (!('Notification' in window)) {
      setNotificationPermission('unsupported');
      return;
    }

    let permission = Notification.permission;
    if (permission !== 'granted') {
      permission = await Notification.requestPermission();
      setNotificationPermission(permission);
    }

    if (permission === 'granted') {
      new Notification('Stellar Calm', {
        body: 'Your test reminder arrived. Local notifications work best while the app is open.',
        silent: false
      });
    }
  };

  const handleSoundToggle = (sound: 'binaural' | 'pure' | 'rain') => {
    if (activeSound === sound) {
      stopAudio();
      setActiveSound(null);
      return;
    }
    setActiveSound(sound);
  };

  const handleStartBreathing = () => {
    setBreathingSecondsLeft(breathingDuration);
    setIsBreathing(true);
    setBreathingPhase('Inhale');
  };

  const handleStopBreathing = () => {
    setIsBreathing(false);
    setBreathingSecondsLeft(breathingDuration);
  };

  const handleSaveCheckIn = () => {
    const completeEntry: CheckInEntry = {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      timeOfDay: (newEntry.timeOfDay as CheckInEntry['timeOfDay']) || 'Morning',
      mood: newEntry.mood || 'Calm',
      moodIntensity: newEntry.moodIntensity || 5,
      stress: newEntry.stress || 5,
      energy: newEntry.energy || 5,
      sleepQuality: newEntry.sleepQuality || 5,
      workload: newEntry.workload || 5,
      focus: newEntry.focus || 5,
      socialBattery: newEntry.socialBattery || 5,
      tags: newEntry.tags || [],
      triggers: newEntry.triggers || [],
      notes: newEntry.notes || ''
    };

    setEntries((current) => [...current, completeEntry]);
    setNewEntry(initialCheckIn);
    setCheckInStep(1);
    setActiveTab('home');
    playTimerCompletionSound();
  };

  const handleSaveJournal = () => {
    const text = journalText.trim();
    if (!text) return;

    const content = journalMode === 'prompt'
      ? `Prompt: ${guidedJournalPrompts[promptIndex]}\n\n${text}`
      : text;

    const entry: JournalEntry = {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      type: journalMode,
      content,
      emotionDetected: detectVoiceEmotion(text)
    };

    setJournals((current) => [entry, ...current]);
    setJournalText('');
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const handleDeleteJournal = (id: string) => {
    setJournals((current) => current.filter((entry) => entry.id !== id));
  };

  const handleSaveTool = (tool: ToolDefinition, form: HTMLFormElement) => {
    const formData = new FormData(form);
    const payload: Record<string, unknown> = { date: new Date().toISOString() };
    tool.fields.forEach((field) => {
      if (field.type === 'checkbox') payload[field.name] = formData.get(field.name) === 'on';
      else payload[field.name] = String(formData.get(field.name) ?? '');
    });

    setToolRecords((current) => ({
      ...current,
      [tool.id]: [payload, ...(current[tool.id] ?? [])]
    }));
    setSelectedTool(null);
  };

  const openTool = (tool: ToolDefinition) => {
    if (tool.id === 'mood_calendar') {
      setOpenPanel('calendar');
      return;
    }
    if (tool.id === 'affirmations') {
      setOpenPanel('affirmations');
      return;
    }
    setSelectedTool(tool);
  };

  const saveWeeklyReport = () => {
    const report: SavedReport = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      summary: entries.length
        ? `This week your average mood was ${weeklyStats.avgMood}/10 with stress at ${weeklyStats.avgStress}/10 and energy at ${weeklyStats.avgEnergy}/10.`
        : 'No mood data yet. Your first report will unlock after your first saved check-in.',
      balance: balance.score,
      burnoutLevel: burnout.level,
      highlights: patterns.map((pattern) => pattern.title).slice(0, 3)
    };
    setReports((current) => [report, ...current]);
  };

  const exportData = () => {
    const payload = {
      profile,
      entries,
      journals,
      reports,
      breathingSessions,
      toolRecords,
      exportedAt: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'stellar-calm-export.json';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const clearAllData = () => {
    if (!window.confirm('Clear all local data from this device? This cannot be undone.')) return;
    const keys = [
      'stellar_entries',
      'stellar_journals',
      'stellar_tools',
      'stellar_reports',
      'stellar_breathing',
      'stellar_profile',
      'stellar_achievements',
      'stellar_last_reminder'
    ];
    keys.forEach((key) => localStorage.removeItem(key));
    setEntries([]);
    setJournals([]);
    setToolRecords({});
    setReports([]);
    setBreathingSessions([]);
    setProfile({ name: 'Friend', reminderTime: '09:00', panicPin: '2468' });
    setJournalText('');
    setNewEntry(initialCheckIn);
    setOpenPanel(null);
    setSelectedTool(null);
  };

  const handleCalculatorPress = (value: string) => {
    if (value === 'C') {
      setCalculatorInput('0');
      return;
    }
    const next = calculatorInput === '0' ? value : `${calculatorInput}${value}`;
    setCalculatorInput(next);
    if (next === profile.panicPin) {
      setPanicLocked(false);
      setCalculatorInput('0');
    }
  };

  if (panicLocked) {
    return (
      <div className="min-h-screen bg-slate-950 px-5 py-10 text-white">
        <div className="mx-auto max-w-sm rounded-[32px] border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-xl">
          <div className="mb-2 text-center text-sm tracking-[0.3em] text-slate-400">CALCULATOR</div>
          <div className="mb-6 rounded-[24px] border border-emerald-400/20 bg-black/40 p-5 text-right font-mono text-4xl text-emerald-300">
            {calculatorInput}
          </div>
          <div className="grid grid-cols-3 gap-3">
            {['7', '8', '9', '4', '5', '6', '1', '2', '3', 'C', '0', '='].map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => handleCalculatorPress(item)}
                className="rounded-[22px] bg-white/10 py-4 text-lg font-semibold text-white transition hover:bg-white/15"
              >
                {item}
              </button>
            ))}
          </div>
          <p className="mt-6 text-center text-xs leading-relaxed text-slate-400">
            Calculator disguise active. Enter your panic PIN to return.
          </p>
        </div>
      </div>
    );
  }

  const renderHome = () => (
    <div className="space-y-5 pt-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.35em] text-sky-100/70">
            {new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date())}
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-white">
            {getGreeting()}, {profile.name}
          </h1>
          <p className="mt-2 max-w-md text-sm text-slate-300/90">A quiet star-lit place to log your mood, recover your balance, and protect your peace.</p>
        </div>
        <button
          type="button"
          onClick={() => setActiveTab('profile')}
          className="flex h-14 w-14 items-center justify-center rounded-full border border-white/30 bg-white/10 text-lg font-semibold text-white shadow-[0_12px_35px_rgba(110,120,255,0.25)] backdrop-blur-xl"
        >
          {profile.name.slice(0, 1).toUpperCase()}
        </button>
      </div>

      <GlassCard className="overflow-hidden bg-gradient-to-br from-white/18 via-white/13 to-sky-200/8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[13px] font-semibold uppercase tracking-[0.28em] text-slate-100/85">Emotional Balance Score</p>
            <div className="mt-5 flex items-end gap-4">
              <span className="text-7xl font-semibold leading-none text-white">{balance.score}</span>
              <span className="mb-2 rounded-full border border-white/20 bg-white/15 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-violet-100">
                {balance.label}
              </span>
            </div>
            <p className="mt-4 text-xs font-medium uppercase tracking-[0.25em] text-slate-200/70">Rolling check-in balance</p>
          </div>
          <Moon className="mt-1 h-7 w-7 text-violet-100/80" />
        </div>
        <div className="mt-6 h-2 rounded-full bg-white/12">
          <div className="h-2 rounded-full bg-gradient-to-r from-violet-300 via-cyan-200 to-pink-200 shadow-[0_0_20px_rgba(184,166,255,0.65)]" style={{ width: `${balance.score}%` }} />
        </div>
      </GlassCard>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: 'Daily Check-in', icon: '📝', onClick: () => setActiveTab('checkin') },
          { label: isBreathing ? 'Stop Breathing' : 'Breathing', icon: '🫧', onClick: () => (isBreathing ? handleStopBreathing() : handleStartBreathing()) },
          { label: 'Weekly Report', icon: '📊', onClick: () => setOpenPanel('weeklyReport') },
          { label: 'Achievements', icon: '🏆', onClick: () => setOpenPanel('achievements') }
        ].map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={item.onClick}
            className="soft-button rounded-[24px] p-4 text-left"
          >
            <div className="mb-3 text-2xl">{item.icon}</div>
            <div className="text-sm font-semibold text-white">{item.label}</div>
          </button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <GlassCard className="md:col-span-2">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="mb-2 flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.22em] text-slate-100/90">
                <AlertCircle className="h-4 w-4 text-rose-200" /> Burnout Risk
              </div>
              <h2 className="text-3xl font-semibold text-white">{burnout.level}</h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-200/85">{burnout.explanation}</p>
            </div>
            <span className="rounded-full border border-white/20 bg-white/15 px-3 py-1 text-xs font-semibold text-white/90">{burnout.score}/100</span>
          </div>
          <div className="mt-5 h-2 rounded-full bg-white/10">
            <div className={cn(
              'h-2 rounded-full transition-all',
              burnout.level === 'High' && 'bg-gradient-to-r from-rose-300 to-fuchsia-300',
              burnout.level === 'Moderate' && 'bg-gradient-to-r from-amber-200 to-orange-300',
              burnout.level === 'Low' && 'bg-gradient-to-r from-emerald-200 to-cyan-200'
            )} style={{ width: `${burnout.score}%` }} />
          </div>
        </GlassCard>

        <GlassCard>
          <div className="mb-2 flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.22em] text-slate-100/90">
            <Flame className="h-4 w-4 text-orange-200" /> Streak
          </div>
          <div className="text-5xl font-semibold text-white">{streak}</div>
          <p className="mt-2 text-sm text-slate-200/80">Consecutive days of showing up for yourself.</p>
        </GlassCard>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <GlassCard>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="mb-2 flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.22em] text-slate-100/90">
                <Sparkles className="h-4 w-4 text-cyan-100" /> Mood Forecast
              </div>
              <h2 className="text-2xl font-semibold text-white">{forecast.prediction}</h2>
              <p className="mt-2 text-sm text-slate-200/85">Confidence: {forecast.confidence}</p>
              <p className="mt-4 text-sm leading-relaxed text-slate-200/80">{forecast.rationale}</p>
            </div>
          </div>
        </GlassCard>

        <GlassCard>
          <SectionHeader title="Detected Patterns" action="View" onAction={() => setOpenPanel('patterns')} />
          <div className="space-y-3">
            {patterns.slice(0, 3).map((pattern) => (
              <div key={pattern.title} className="rounded-[22px] border border-white/10 bg-white/6 p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-white">{pattern.title}</p>
                  <span className={cn(
                    'rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]',
                    pattern.type === 'positive' && 'bg-emerald-200/20 text-emerald-100',
                    pattern.type === 'warning' && 'bg-rose-200/20 text-rose-100',
                    pattern.type === 'neutral' && 'bg-white/10 text-slate-200'
                  )}>
                    {pattern.type}
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-200/75">{pattern.description}</p>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      <GlassCard>
        <SectionHeader title="Personalized Coping Suggestions" action="Patterns" onAction={() => setOpenPanel('patterns')} />
        <div className="space-y-3">
          {forecast.copingSuggestions.map((suggestion) => (
            <div key={suggestion} className="flex items-center gap-3 rounded-[22px] border border-white/10 bg-white/6 p-3 text-sm text-slate-100/90">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/12 text-lg">⭐</div>
              <span>{suggestion}</span>
            </div>
          ))}
        </div>
      </GlassCard>

      <GlassCard className="bg-gradient-to-br from-white/16 via-violet-200/10 to-cyan-200/8">
        <SectionHeader title="Breathing & Sound Therapy" />
        <div className="grid gap-4 md:grid-cols-[1.3fr_1fr]">
          <div>
            <div className="relative flex min-h-[200px] items-center justify-center rounded-[28px] border border-white/10 bg-[#0b1230]/40 p-5">
              <div className="absolute h-36 w-36 rounded-full bg-gradient-to-br from-cyan-200/60 via-violet-200/35 to-pink-200/45 blur-2xl" />
              <div className={cn('relative flex h-36 w-36 items-center justify-center rounded-full border border-white/30 bg-white/10 text-center transition-all duration-[4000ms]', isBreathing ? 'scale-110' : 'scale-95')}>
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-100/80">{breathingPhase}</p>
                  <p className="mt-2 text-4xl font-semibold text-white">{isBreathing ? breathingSecondsLeft : breathingDuration}s</p>
                </div>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {breathingOptions.map((seconds) => (
                <button
                  key={seconds}
                  type="button"
                  onClick={() => {
                    setBreathingDuration(seconds);
                    setBreathingSecondsLeft(seconds);
                  }}
                  className={cn('rounded-full px-4 py-2 text-sm font-semibold transition', breathingDuration === seconds ? 'bg-white text-slate-950' : 'bg-white/10 text-white hover:bg-white/15')}
                >
                  {seconds}s reset
                </button>
              ))}
            </div>
            <div className="mt-4 flex gap-3">
              <button type="button" onClick={isBreathing ? handleStopBreathing : handleStartBreathing} className="primary-button flex-1">
                {isBreathing ? 'Stop session' : 'Start breathing'}
              </button>
              <button type="button" onClick={() => setActiveTab('checkin')} className="soft-button px-5 py-3 text-sm font-semibold text-white">
                Check-in
              </button>
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-white/6 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-white">Audio modes</p>
              <button type="button" onClick={() => { stopAudio(); setActiveSound(null); }} className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold text-slate-100">
                Stop audio
              </button>
            </div>
            <div className="space-y-3">
              {[
                { id: 'binaural' as const, title: 'Binaural Beats', subtitle: 'Headphones recommended' },
                { id: 'pure' as const, title: 'Pure Tones', subtitle: '432Hz calming tone' },
                { id: 'rain' as const, title: 'Nature Noise', subtitle: 'Soft rain ambience' }
              ].map((sound) => (
                <button
                  key={sound.id}
                  type="button"
                  onClick={() => handleSoundToggle(sound.id)}
                  className={cn('flex w-full items-center justify-between rounded-[20px] border px-4 py-3 text-left transition', activeSound === sound.id ? 'border-cyan-100/40 bg-white/16' : 'border-white/10 bg-white/6 hover:bg-white/10')}
                >
                  <div>
                    <div className="text-sm font-semibold text-white">{sound.title}</div>
                    <div className="text-xs text-slate-200/70">{sound.subtitle}</div>
                  </div>
                  {activeSound === sound.id ? <Volume2 className="h-4 w-4 text-cyan-100" /> : <VolumeX className="h-4 w-4 text-slate-200/60" />}
                </button>
              ))}
            </div>
            <div className="mt-4">
              <div className="mb-2 text-xs uppercase tracking-[0.2em] text-slate-200/70">Volume</div>
              <input type="range" min={0.05} max={0.8} step={0.05} value={soundVolume} onChange={(event) => setSoundVolume(Number(event.target.value))} className="app-range w-full" />
            </div>
            <p className="mt-4 text-xs leading-relaxed text-slate-300/75">
              Breathing sessions, audio choices, and completion chimes are saved locally on this device.
            </p>
          </div>
        </div>
      </GlassCard>

      <GlassCard>
        <SectionHeader title="Quick Links" />
        <div className="grid grid-cols-3 gap-3">
          {[
            { title: 'Weekly Report', icon: '📘', onClick: () => setOpenPanel('weeklyReport') },
            { title: 'Achievements', icon: '🏆', onClick: () => setOpenPanel('achievements') },
            { title: 'Patterns', icon: '📈', onClick: () => setOpenPanel('patterns') }
          ].map((item) => (
            <button key={item.title} type="button" onClick={item.onClick} className="rounded-[22px] border border-white/10 bg-white/8 p-4 text-left transition hover:bg-white/12">
              <div className="mb-2 text-2xl">{item.icon}</div>
              <p className="text-sm font-semibold text-white">{item.title}</p>
            </button>
          ))}
        </div>
      </GlassCard>

      <div className="grid gap-4 md:grid-cols-2">
        <GlassCard>
          <SectionHeader title="Recent reflection" />
          {latestJournal ? (
            <div className="rounded-[24px] border border-white/10 bg-white/8 p-4">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-slate-300/70">
                <span>Journal</span>
                <span>•</span>
                <span>{formatDate(latestJournal.date, { month: 'short', day: 'numeric' })}</span>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-white/90">{latestJournal.content.slice(0, 160)}{latestJournal.content.length > 160 ? '…' : ''}</p>
            </div>
          ) : (
            <div className="rounded-[24px] border border-dashed border-white/15 bg-white/6 p-5 text-sm text-slate-300/75">Your most recent journal reflection will appear here.</div>
          )}
        </GlassCard>

        <GlassCard>
          <SectionHeader title="Latest check-in" />
          {latestEntry ? (
            <div className="space-y-3">
              <div className="rounded-[24px] border border-white/10 bg-white/8 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs uppercase tracking-[0.18em] text-slate-300/70">{formatDate(latestEntry.date, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</div>
                    <div className="mt-2 text-2xl font-semibold text-white">{latestEntry.mood}</div>
                  </div>
                  <div className="rounded-full bg-white/10 px-3 py-1 text-sm font-semibold text-white">{latestEntry.timeOfDay}</div>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-sm text-slate-200/80">
                  <div className="rounded-[18px] bg-white/8 p-3">Stress {latestEntry.stress}</div>
                  <div className="rounded-[18px] bg-white/8 p-3">Energy {latestEntry.energy}</div>
                  <div className="rounded-[18px] bg-white/8 p-3">Sleep {latestEntry.sleepQuality}</div>
                </div>
              </div>
              <p className="text-xs text-slate-300/65">Recent check-ins saved: {recentEntries.length}</p>
            </div>
          ) : (
            <div className="rounded-[24px] border border-dashed border-white/15 bg-white/6 p-5 text-sm text-slate-300/75">Save your first check-in to build the timeline.</div>
          )}
        </GlassCard>
      </div>

      <GlassCard>
        <SectionHeader title="Recovery & Clinical Tools" />
        <div className="grid gap-3 sm:grid-cols-2">
          {clinicalTools.map((tool) => (
            <button key={tool.id} type="button" onClick={() => openTool(tool)} className="tool-tile">
              <span className="text-lg">{tool.id === 'cbt_thought_record' ? '🧠' : tool.id === 'grounding_54321' ? '🌬️' : tool.id === 'pmr' ? '🫶' : tool.id === 'self_compassion_break' ? '💜' : tool.id === 'worry_time' ? '🫙' : '🛡️'}</span>
              <span className="font-semibold text-white">{tool.title}</span>
              <ChevronRight className="ml-auto h-4 w-4 text-slate-200/60" />
            </button>
          ))}
        </div>
      </GlassCard>

      <GlassCard>
        <SectionHeader title="Wellness & Lifestyle" />
        <div className="grid gap-3 sm:grid-cols-2">
          {lifestyleTools.map((tool) => (
            <button key={tool.id} type="button" onClick={() => openTool(tool)} className="tool-tile">
              <span className="text-lg">{tool.id === 'gratitude_log' ? '🙏' : tool.id === 'sleep_tracker' ? '🌙' : tool.id === 'medication_tracker' ? '💊' : tool.id === 'social_connection' ? '🤝' : tool.id === 'energy_budget' ? '⚡' : tool.id === 'affirmations' ? '💬' : tool.id === 'mood_calendar' ? '🗓️' : tool.id === 'daily_wellness_score' ? '📎' : '☎️'}</span>
              <span className="font-semibold text-white">{tool.title}</span>
              <ChevronRight className="ml-auto h-4 w-4 text-slate-200/60" />
            </button>
          ))}
        </div>
      </GlassCard>

      <GlassCard>
        <SectionHeader title="Advanced Healing Tools" />
        <div className="space-y-3">
          {Object.entries(advancedGroups).map(([groupKey, label]) => {
            const groupTools = advancedTools.filter((tool) => tool.group === groupKey);
            const isOpen = openAdvancedGroup === groupKey;
            return (
              <div key={groupKey} className="rounded-[24px] border border-white/10 bg-white/6 p-3">
                <button type="button" onClick={() => setOpenAdvancedGroup(isOpen ? null : groupKey)} className="flex w-full items-center justify-between gap-3 rounded-[20px] px-1 py-2 text-left">
                  <div>
                    <p className="text-sm font-semibold text-white">{label}</p>
                    <p className="text-xs text-slate-300/70">Tap to open the tool list inline</p>
                  </div>
                  <ChevronDown className={cn('h-5 w-5 text-slate-200/70 transition', isOpen && 'rotate-180')} />
                </button>
                {isOpen ? (
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {groupTools.map((tool) => (
                      <button key={tool.id} type="button" onClick={() => openTool(tool)} className="tool-tile min-h-[56px]">
                        <span className="font-medium text-white">{tool.title}</span>
                        <ChevronRight className="ml-auto h-4 w-4 text-slate-200/60" />
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </GlassCard>

      <GlassCard>
        <SectionHeader title="Hidden / Doctor-Prescribed Tools" action="Open library" onAction={() => setOpenPanel('doctorLibrary')} />
        <p className="text-sm leading-relaxed text-slate-200/80">
          PHQ-9, GAD-7, Cognitive Distortions, Behavioral Activation, Hydration, Sunlight, DBT Skills, Boundaries, Somatic Pain Map, Behavioral Experiment, Self-Care Checklist, Relapse Prevention, Digital Wellbeing, Forgiveness Work, and Meaning Reflection are implemented and routed here.
        </p>
      </GlassCard>
    </div>
  );

  const renderCheckIn = () => (
    <div className="space-y-5 pt-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight text-white">Check-in</h1>
          <p className="mt-1 text-sm font-semibold uppercase tracking-[0.24em] text-slate-200/70">Step {checkInStep} of 3</p>
        </div>
        <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white shadow-[0_12px_35px_rgba(255,255,255,0.08)]">
          <Heart className="h-6 w-6" />
        </div>
      </div>
      <div className="h-2 rounded-full bg-white/10">
        <div className="h-2 rounded-full bg-gradient-to-r from-violet-300 via-fuchsia-200 to-cyan-200" style={{ width: `${(checkInStep / 3) * 100}%` }} />
      </div>

      {checkInStep === 1 ? (
        <>
          <GlassCard>
            <p className="mb-5 text-center text-xl font-semibold text-white">How are you feeling right now?</p>
            <div className="grid gap-4 sm:grid-cols-2">
              {moodOptions.map((mood) => (
                <button
                  key={mood.label}
                  type="button"
                  onClick={() => setNewEntry((current) => ({ ...current, mood: mood.label }))}
                  className={cn('rounded-[30px] border p-6 text-center transition', newEntry.mood === mood.label ? 'border-white/30 bg-white text-slate-950 shadow-[0_18px_50px_rgba(255,255,255,0.2)]' : 'border-white/10 bg-white/8 text-white hover:bg-white/12')}
                >
                  <div className="text-5xl">{mood.emoji}</div>
                  <div className="mt-4 text-xl font-semibold tracking-wide">{mood.label}</div>
                </button>
              ))}
            </div>
          </GlassCard>

          <GlassCard>
            <SectionHeader title="Time of day" />
            <div className="grid grid-cols-3 gap-3">
              {(['Morning', 'Afternoon', 'Evening'] as const).map((time) => (
                <button
                  key={time}
                  type="button"
                  onClick={() => setNewEntry((current) => ({ ...current, timeOfDay: time }))}
                  className={cn('rounded-full px-4 py-3 text-sm font-semibold transition', newEntry.timeOfDay === time ? 'bg-white text-slate-950' : 'bg-white/10 text-white hover:bg-white/15')}
                >
                  {time}
                </button>
              ))}
            </div>
            <div className="mt-5">
              <div className="mb-2 flex items-center justify-between text-sm text-slate-200/80">
                <span>Mood intensity</span>
                <span>{newEntry.moodIntensity}/10</span>
              </div>
              <input
                type="range"
                min={1}
                max={10}
                value={newEntry.moodIntensity}
                onChange={(event) => setNewEntry((current) => ({ ...current, moodIntensity: Number(event.target.value) }))}
                className="app-range w-full"
              />
            </div>
          </GlassCard>
        </>
      ) : null}

      {checkInStep === 2 ? (
        <GlassCard>
          <div className="space-y-6">
            {[
              { label: 'Stress', key: 'stress' as const, icon: '❗' },
              { label: 'Energy', key: 'energy' as const, icon: '⚡' },
              { label: 'Sleep quality', key: 'sleepQuality' as const, icon: '🌙' },
              { label: 'Workload', key: 'workload' as const, icon: '📚' },
              { label: 'Focus', key: 'focus' as const, icon: '🧠' },
              { label: 'Social battery', key: 'socialBattery' as const, icon: '👥' }
            ].map((item) => (
              <div key={item.key}>
                <div className="mb-2 flex items-center justify-between text-sm font-semibold text-white">
                  <span>{item.icon} {item.label}</span>
                  <span>{newEntry[item.key]}/10</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={newEntry[item.key] as number}
                  onChange={(event) => setNewEntry((current) => ({ ...current, [item.key]: Number(event.target.value) }))}
                  className="app-range w-full"
                />
              </div>
            ))}
          </div>
        </GlassCard>
      ) : null}

      {checkInStep === 3 ? (
        <GlassCard>
          <div className="space-y-6">
            <div>
              <div className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-slate-200/75">Tags</div>
              <div className="flex flex-wrap gap-2">
                {tagOptions.map((tag) => {
                  const selected = (newEntry.tags ?? []).includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setNewEntry((current) => ({
                        ...current,
                        tags: selected ? (current.tags ?? []).filter((item) => item !== tag) : [...(current.tags ?? []), tag]
                      }))}
                      className={cn('rounded-full px-4 py-2 text-sm font-semibold transition', selected ? 'bg-white text-slate-950' : 'bg-white/10 text-white hover:bg-white/15')}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-slate-200/75">Triggers / causes</div>
              <div className="flex flex-wrap gap-2">
                {triggerOptions.map((trigger) => {
                  const selected = (newEntry.triggers ?? []).includes(trigger);
                  return (
                    <button
                      key={trigger}
                      type="button"
                      onClick={() => setNewEntry((current) => ({
                        ...current,
                        triggers: selected ? (current.triggers ?? []).filter((item) => item !== trigger) : [...(current.triggers ?? []), trigger]
                      }))}
                      className={cn('rounded-full px-4 py-2 text-sm font-semibold transition', selected ? 'bg-white text-slate-950' : 'bg-white/10 text-white hover:bg-white/15')}
                    >
                      {trigger}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="mb-3 block text-sm font-semibold uppercase tracking-[0.2em] text-slate-200/75">Notes</label>
              <textarea
                rows={5}
                value={newEntry.notes}
                onChange={(event) => setNewEntry((current) => ({ ...current, notes: event.target.value }))}
                placeholder="What happened, what helped, and what do you need next?"
                className="app-textarea"
              />
            </div>
          </div>
        </GlassCard>
      ) : null}

      <div className="flex gap-3">
        {checkInStep > 1 ? (
          <button type="button" onClick={() => setCheckInStep((current) => current - 1)} className="soft-button px-5 py-3 text-sm font-semibold text-white">
            Back
          </button>
        ) : null}
        {checkInStep < 3 ? (
          <button type="button" onClick={() => setCheckInStep((current) => current + 1)} className="primary-button flex-1">
            Continue
          </button>
        ) : (
          <button type="button" onClick={handleSaveCheckIn} className="primary-button flex-1">
            Save check-in
          </button>
        )}
      </div>
    </div>
  );

  const renderJournal = () => (
    <div className="space-y-5 pt-6">
      <div>
        <h1 className="text-4xl font-semibold tracking-tight text-white">Journal</h1>
        <p className="mt-2 text-sm text-slate-300/85">Free writing, guided prompts, and voice journaling live privately on your device.</p>
      </div>

      <GlassCard>
        <div className="grid grid-cols-3 gap-2 rounded-[22px] bg-white/8 p-2">
          {([
            ['free', 'Free writing'],
            ['prompt', 'Prompt'],
            ['voice', 'Voice']
          ] as const).map(([mode, label]) => (
            <button
              key={mode}
              type="button"
              onClick={() => setJournalMode(mode)}
              className={cn('rounded-[18px] px-3 py-3 text-sm font-semibold transition', journalMode === mode ? 'bg-white text-slate-950' : 'text-white hover:bg-white/10')}
            >
              {label}
            </button>
          ))}
        </div>

        {journalMode === 'prompt' ? (
          <div className="mt-4 rounded-[24px] border border-white/10 bg-white/8 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs uppercase tracking-[0.22em] text-slate-200/70">Guided prompt</div>
                <p className="mt-2 text-base leading-relaxed text-white">{guidedJournalPrompts[promptIndex]}</p>
              </div>
              <button type="button" onClick={() => setPromptIndex((current) => (current + 1) % guidedJournalPrompts.length)} className="rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white">
                New prompt
              </button>
            </div>
          </div>
        ) : null}

        <div className="mt-4">
          <textarea
            rows={7}
            value={journalText}
            onChange={(event) => setJournalText(event.target.value)}
            placeholder={journalMode === 'voice' ? 'Tap the mic and speak your thoughts...' : 'Write freely. Nothing leaves this device unless you export it.'}
            className="app-textarea"
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button type="button" onClick={handleToggleListening} className={cn('flex items-center gap-2 rounded-full px-4 py-3 text-sm font-semibold transition', isListening ? 'bg-rose-200 text-rose-950' : 'bg-white/10 text-white hover:bg-white/15')}>
            <Mic className="h-4 w-4" />
            {isListening ? 'Stop listening' : 'Start voice journaling'}
          </button>
          <button type="button" onClick={handleSaveJournal} className="primary-button">
            Save entry
          </button>
          <div className="text-xs text-slate-300/70">Emotion detection label: {detectVoiceEmotion(journalText)}</div>
        </div>
      </GlassCard>

      <GlassCard>
        <SectionHeader title="Saved journal history" />
        <div className="mb-4 flex flex-wrap gap-2">
          {(['all', 'free', 'prompt', 'voice'] as const).map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setJournalFilter(filter)}
              className={cn('rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition', journalFilter === filter ? 'bg-white text-slate-950' : 'bg-white/10 text-white hover:bg-white/15')}
            >
              {filter}
            </button>
          ))}
        </div>
        <div className="space-y-3">
          {filteredJournals.length ? filteredJournals.map((entry) => (
            <div key={entry.id} className="rounded-[24px] border border-white/10 bg-white/8 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-100">{entry.type}</span>
                    <span className="rounded-full bg-cyan-100/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-100">{entry.emotionDetected}</span>
                  </div>
                  <p className="mt-3 text-sm text-slate-300/80">{formatDate(entry.date, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</p>
                </div>
                <button type="button" onClick={() => handleDeleteJournal(entry.id)} className="rounded-full border border-white/10 bg-white/10 p-2 text-slate-100 transition hover:bg-rose-200 hover:text-rose-950">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-white/90">{entry.content}</p>
            </div>
          )) : <div className="rounded-[24px] border border-dashed border-white/15 bg-white/6 p-6 text-sm text-slate-300/75">No journal entries yet. Start with free writing, a prompt, or voice journaling.</div>}
        </div>
      </GlassCard>
    </div>
  );

  const renderInsights = () => (
    <div className="space-y-5 pt-6">
      <div>
        <h1 className="text-4xl font-semibold tracking-tight text-white">Insights</h1>
        <p className="mt-2 text-sm text-slate-300/85">Burnout prediction, pattern detection, balance scoring, risk indicators, and report snapshots.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <GlassCard>
          <div className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-200/75">Balance score</div>
          <div className="mt-3 text-5xl font-semibold text-white">{balance.score}</div>
          <p className="mt-2 text-sm text-slate-200/80">{balance.label}</p>
        </GlassCard>
        <GlassCard>
          <div className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-200/75">Burnout prediction</div>
          <div className="mt-3 text-5xl font-semibold text-white">{burnout.score}</div>
          <p className="mt-2 text-sm text-slate-200/80">{burnout.level} risk</p>
        </GlassCard>
        <GlassCard>
          <div className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-200/75">Forecast</div>
          <div className="mt-3 text-2xl font-semibold text-white">{forecast.prediction}</div>
          <p className="mt-2 text-sm text-slate-200/80">{forecast.confidence} confidence</p>
        </GlassCard>
      </div>

      <GlassCard>
        <SectionHeader title="Risk indicators" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {[
            ['Stress', weeklyStats.avgStress],
            ['Energy', weeklyStats.avgEnergy],
            ['Sleep', weeklyStats.avgSleep],
            ['Workload', weeklyStats.avgWorkload],
            ['Mood', weeklyStats.avgMood]
          ].map(([label, value]) => (
            <div key={label} className="rounded-[22px] border border-white/10 bg-white/6 p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-slate-200/65">{label}</div>
              <div className="mt-2 text-3xl font-semibold text-white">{value}</div>
              <div className="mt-3 h-2 rounded-full bg-white/10">
                <div className="h-2 rounded-full bg-gradient-to-r from-cyan-200 to-violet-200" style={{ width: `${Math.min(100, Number(value) * 10)}%` }} />
              </div>
            </div>
          ))}
        </div>
      </GlassCard>

      <GlassCard>
        <SectionHeader title="Pattern cards" action="Weekly report" onAction={() => setOpenPanel('weeklyReport')} />
        <div className="space-y-3">
          {patterns.map((pattern) => (
            <div key={pattern.title} className="rounded-[24px] border border-white/10 bg-white/8 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold text-white">{pattern.title}</p>
                <span className={cn(
                  'rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]',
                  pattern.type === 'positive' && 'bg-emerald-200/20 text-emerald-100',
                  pattern.type === 'warning' && 'bg-rose-200/20 text-rose-100',
                  pattern.type === 'neutral' && 'bg-white/10 text-slate-200'
                )}>
                  {pattern.type}
                </span>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-slate-200/85">{pattern.description}</p>
            </div>
          ))}
        </div>
      </GlassCard>

      <GlassCard>
        <SectionHeader title="Forecast / emotional insights" />
        <p className="text-sm leading-relaxed text-slate-200/85">{forecast.rationale}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {forecast.copingSuggestions.map((item) => (
            <div key={item} className="rounded-[22px] border border-white/10 bg-white/8 p-4 text-sm text-white">
              {item}
            </div>
          ))}
        </div>
      </GlassCard>

      <GlassCard>
        <SectionHeader title="Weekly report access" />
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={saveWeeklyReport} className="primary-button">Save report snapshot</button>
          <button type="button" onClick={() => setOpenPanel('weeklyReport')} className="soft-button px-5 py-3 text-sm font-semibold text-white">View saved reports</button>
        </div>
      </GlassCard>
    </div>
  );

  const renderProfile = () => (
    <div className="space-y-5 pt-6">
      <div>
        <h1 className="text-4xl font-semibold tracking-tight text-white">Profile</h1>
        <p className="mt-2 text-sm text-slate-300/85">Local-only settings, reminders, safety controls, shortcuts, export, and privacy tools.</p>
      </div>

      <GlassCard>
        <SectionHeader title="Name / profile" />
        <input value={profile.name} onChange={(event) => setProfile((current) => ({ ...current, name: event.target.value || 'Friend' }))} className="app-input" placeholder="Your name" />
      </GlassCard>

      <GlassCard>
        <SectionHeader title="Notifications" />
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-200/70">Reminder time</label>
            <input type="time" value={profile.reminderTime} onChange={(event) => setProfile((current) => ({ ...current, reminderTime: event.target.value }))} className="app-input" />
          </div>
          <div className="rounded-[24px] border border-white/10 bg-white/6 p-4">
            <div className="text-xs uppercase tracking-[0.2em] text-slate-200/70">Permission state</div>
            <div className="mt-2 text-xl font-semibold text-white">{notificationPermission}</div>
            <p className="mt-2 text-sm text-slate-200/75">Browser reminders work best while this app is open. They are not full backend push notifications yet.</p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <button type="button" onClick={handleNotificationRequest} className="soft-button flex items-center gap-2 px-5 py-3 text-sm font-semibold text-white"><Bell className="h-4 w-4" /> Request permission</button>
          <button type="button" onClick={sendTestNotification} className="primary-button">Send test notification</button>
        </div>
      </GlassCard>

      <GlassCard>
        <SectionHeader title="Shortcuts" />
        <div className="grid gap-3 sm:grid-cols-2">
          <button type="button" onClick={() => setOpenPanel('achievements')} className="tool-tile"><span>🏆</span><span className="font-semibold text-white">Achievements</span><ChevronRight className="ml-auto h-4 w-4 text-slate-200/60" /></button>
          <button type="button" onClick={() => setOpenPanel('calendar')} className="tool-tile"><span>🗓️</span><span className="font-semibold text-white">Mood Calendar</span><ChevronRight className="ml-auto h-4 w-4 text-slate-200/60" /></button>
          <button type="button" onClick={() => setSelectedTool(allTools.find((tool) => tool.id === 'emergency_contacts') ?? null)} className="tool-tile"><span>☎️</span><span className="font-semibold text-white">Emergency Contacts</span><ChevronRight className="ml-auto h-4 w-4 text-slate-200/60" /></button>
          <button type="button" onClick={() => setSelectedTool(allTools.find((tool) => tool.id === 'safety_plan') ?? null)} className="tool-tile"><span>🛡️</span><span className="font-semibold text-white">Safety Plan</span><ChevronRight className="ml-auto h-4 w-4 text-slate-200/60" /></button>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-[22px] border border-white/10 bg-white/8 p-4 text-sm text-slate-100">Saved emergency contacts: <span className="font-semibold text-white">{emergencyContacts.length}</span></div>
          <div className="rounded-[22px] border border-white/10 bg-white/8 p-4 text-sm text-slate-100">Saved safety plans: <span className="font-semibold text-white">{savedSafetyPlans.length}</span></div>
        </div>
      </GlassCard>

      <GlassCard>
        <SectionHeader title="Panic mode" />
        <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <label className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-200/70">Calculator PIN</label>
            <input value={profile.panicPin} onChange={(event) => setProfile((current) => ({ ...current, panicPin: event.target.value.replace(/\D/g, '').slice(0, 8) || '2468' }))} className="app-input" placeholder="Enter PIN" />
            <p className="mt-2 text-sm text-slate-300/75">Panic mode opens a calculator-style hidden lock screen until the PIN is entered.</p>
          </div>
          <button type="button" onClick={() => setPanicLocked(true)} className="soft-button flex items-center gap-2 px-5 py-3 text-sm font-semibold text-white"><ShieldAlert className="h-4 w-4" /> Activate panic mode</button>
        </div>
      </GlassCard>

      <GlassCard>
        <SectionHeader title="Data controls" />
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={exportData} className="soft-button flex items-center gap-2 px-5 py-3 text-sm font-semibold text-white"><Download className="h-4 w-4" /> Export data</button>
          <button type="button" onClick={clearAllData} className="rounded-full border border-rose-200/20 bg-rose-200/10 px-5 py-3 text-sm font-semibold text-rose-100 transition hover:bg-rose-200 hover:text-rose-950">Clear all data</button>
        </div>
      </GlassCard>

      <GlassCard>
        <SectionHeader title="Privacy note" />
        <p className="text-sm leading-relaxed text-slate-200/80">
          Everything in Stellar Calm is stored locally in your browser: check-ins, journals, reports, breathing sessions, advanced healing tools, profile settings, safety plans, and reminders. Notifications are browser-local, not full always-on push notifications.
        </p>
      </GlassCard>
    </div>
  );

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#050816] text-white">
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_top,_rgba(139,168,255,0.35),_transparent_28%),radial-gradient(circle_at_20%_40%,_rgba(155,124,255,0.22),_transparent_30%),radial-gradient(circle_at_80%_65%,_rgba(132,233,255,0.15),_transparent_25%),linear-gradient(180deg,_#071023_0%,_#0c1633_35%,_#091124_100%)]" />
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {stars.map((star) => (
          <span
            key={star.id}
            className="twinkle-star"
            style={{ left: star.left, top: star.top, width: star.size, height: star.size, animationDelay: star.delay, animationDuration: star.duration }}
          />
        ))}
        <div className="orb orb-one" />
        <div className="orb orb-two" />
        <div className="orb orb-three" />
      </div>

      <div className="relative z-10 mx-auto min-h-screen max-w-6xl px-4 pb-32 md:px-6">
        <div className="mx-auto max-w-4xl">
          <div className="flex items-center justify-between gap-3 pt-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/8 px-4 py-2 text-sm text-slate-100/90 backdrop-blur-xl">
              <Sparkles className="h-4 w-4 text-cyan-100" /> Stellar Calm
            </div>
            <button type="button" onClick={() => setPanicLocked(true)} className="inline-flex items-center gap-2 rounded-full border border-rose-200/20 bg-rose-200/10 px-4 py-2 text-sm font-semibold text-rose-100 backdrop-blur-xl transition hover:bg-rose-200 hover:text-rose-950">
              <ShieldAlert className="h-4 w-4" /> Panic Mode
            </button>
          </div>

          {activeTab === 'home' ? renderHome() : null}
          {activeTab === 'checkin' ? renderCheckIn() : null}
          {activeTab === 'journal' ? renderJournal() : null}
          {activeTab === 'insights' ? renderInsights() : null}
          {activeTab === 'profile' ? renderProfile() : null}
        </div>
      </div>

      <div className="fixed bottom-4 left-1/2 z-30 w-[min(94%,540px)] -translate-x-1/2">
        <div className="relative rounded-[34px] border border-white/15 bg-[rgba(244,240,255,0.12)] px-4 pb-3 pt-4 shadow-[0_25px_60px_rgba(6,10,30,0.45)] backdrop-blur-2xl">
          <div className="grid grid-cols-5 items-end">
            {[
              { id: 'home' as const, label: 'Home', icon: <Home className="h-5 w-5" /> },
              { id: 'journal' as const, label: 'Journal', icon: <BookOpen className="h-5 w-5" /> },
              { id: 'checkin' as const, label: 'Check-in', icon: <PlusCircle className="h-6 w-6" />, center: true },
              { id: 'insights' as const, label: 'Insights', icon: <BarChart2 className="h-5 w-5" /> },
              { id: 'profile' as const, label: 'Profile', icon: <User className="h-5 w-5" /> }
            ].map((item) => item.center ? (
              <div key={item.id} className="flex justify-center">
                <button
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className="-mt-10 flex h-20 w-20 items-center justify-center rounded-full border-4 border-white/90 bg-[#24163f] text-white shadow-[0_20px_45px_rgba(82,51,143,0.55)] transition hover:scale-[1.02]"
                >
                  {item.icon}
                </button>
              </div>
            ) : (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={cn('flex flex-col items-center gap-1 px-2 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] transition', activeTab === item.id ? 'text-white' : 'text-slate-200/55 hover:text-white')}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {openPanel ? (
        <div className="fixed inset-0 z-40 bg-[#050816]/75 p-4 backdrop-blur-xl">
          <div className="mx-auto mt-8 max-w-3xl rounded-[32px] border border-white/15 bg-[#0c1430]/92 p-5 shadow-[0_30px_80px_rgba(0,0,0,0.45)] md:p-6">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-semibold text-white">
                  {openPanel === 'weeklyReport' && 'Weekly Report'}
                  {openPanel === 'achievements' && 'Achievements'}
                  {openPanel === 'patterns' && 'Detected Patterns'}
                  {openPanel === 'calendar' && 'Mood Calendar'}
                  {openPanel === 'affirmations' && 'Affirmations'}
                  {openPanel === 'doctorLibrary' && 'Doctor-Prescribed Tools'}
                </h2>
                <p className="mt-1 text-sm text-slate-300/80">Private, local-first, and fully integrated into your wellness dashboard.</p>
              </div>
              <button type="button" onClick={() => setOpenPanel(null)} className="rounded-full border border-white/10 bg-white/10 p-2 text-white transition hover:bg-white/15">
                <ArrowLeft className="h-5 w-5" />
              </button>
            </div>

            {openPanel === 'weeklyReport' ? (
              <div className="space-y-4">
                <GlassCard className="bg-white/8 p-4 md:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="text-xs uppercase tracking-[0.2em] text-slate-200/70">Current summary</div>
                      <p className="mt-3 text-base leading-relaxed text-white">
                        {entries.length
                          ? `Over your latest logs, mood averaged ${weeklyStats.avgMood}/10, stress averaged ${weeklyStats.avgStress}/10, and energy averaged ${weeklyStats.avgEnergy}/10.`
                          : 'You have not saved enough check-ins yet to generate a personalized weekly summary.'}
                      </p>
                    </div>
                    <button type="button" onClick={saveWeeklyReport} className="primary-button">Save snapshot</button>
                  </div>
                </GlassCard>
                <div className="space-y-3">
                  {reports.length ? reports.map((report) => (
                    <div key={report.id} className="rounded-[24px] border border-white/10 bg-white/8 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-white">{formatDate(report.createdAt, { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                          <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-300/70">Balance {report.balance} • Burnout {report.burnoutLevel}</p>
                        </div>
                      </div>
                      <p className="mt-3 text-sm text-slate-200/80">{report.summary}</p>
                      {report.highlights.length ? <p className="mt-3 text-xs text-slate-300/65">Highlights: {report.highlights.join(' • ')}</p> : null}
                    </div>
                  )) : <div className="rounded-[24px] border border-dashed border-white/15 bg-white/6 p-6 text-sm text-slate-300/75">No reports saved yet.</div>}
                </div>
              </div>
            ) : null}

            {openPanel === 'achievements' ? (
              <div className="grid gap-3 md:grid-cols-2">
                {achievements.map((achievement) => (
                  <div key={achievement.id} className={cn('rounded-[24px] border p-4', achievement.unlocked ? 'border-cyan-100/25 bg-white/10' : 'border-white/10 bg-white/5')}>
                    <div className="flex items-center gap-3">
                      <div className="text-3xl">{achievement.icon}</div>
                      <div>
                        <p className="font-semibold text-white">{achievement.title}</p>
                        <p className="text-sm text-slate-300/80">{achievement.description}</p>
                      </div>
                    </div>
                    <div className="mt-4 text-xs uppercase tracking-[0.18em] text-slate-300/70">{achievement.unlocked ? 'Unlocked' : 'Locked'}</div>
                  </div>
                ))}
              </div>
            ) : null}

            {openPanel === 'patterns' ? (
              <div className="space-y-3">
                {patterns.map((pattern) => (
                  <div key={pattern.title} className="rounded-[24px] border border-white/10 bg-white/8 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold text-white">{pattern.title}</p>
                      <span className="rounded-full bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-100">{pattern.type}</span>
                    </div>
                    <p className="mt-3 text-sm text-slate-200/85">{pattern.description}</p>
                  </div>
                ))}
              </div>
            ) : null}

            {openPanel === 'calendar' ? (
              <div className="space-y-4">
                <div className="grid grid-cols-7 gap-2 text-center text-xs uppercase tracking-[0.16em] text-slate-300/60">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => <div key={day}>{day}</div>)}
                </div>
                <div className="grid grid-cols-7 gap-2">
                  {Array.from({ length: 28 }, (_, index) => {
                    const date = new Date();
                    date.setDate(date.getDate() - (27 - index));
                    const key = date.toISOString().slice(0, 10);
                    const entry = [...entries].reverse().find((item) => formatDayKey(item.date) === key);
                    const mood = entry?.mood ?? '';
                    const tone = mood === 'Calm' ? 'bg-emerald-200/30' : mood === 'Inspired' ? 'bg-violet-200/35' : mood === 'Okay' ? 'bg-cyan-200/30' : mood === 'Stressy' ? 'bg-rose-200/30' : mood === 'Exhausted' ? 'bg-orange-200/30' : 'bg-white/6';
                    return (
                      <div key={key} className={cn('flex aspect-square flex-col items-center justify-center rounded-[18px] border border-white/10 text-xs text-white', tone)}>
                        <span>{date.getDate()}</span>
                        <span className="mt-1 text-[10px] opacity-80">{entry ? mood.slice(0, 2) : '·'}</span>
                      </div>
                    );
                  })}
                </div>
                <GlassCard className="bg-white/8 p-4 md:p-5">
                  <div className="text-sm leading-relaxed text-slate-200/85">
                    Mood calendar entries are powered by your real saved check-ins. Each marked day reflects your logged mood for that date.
                  </div>
                </GlassCard>
              </div>
            ) : null}

            {openPanel === 'affirmations' ? (
              <div className="space-y-4">
                <div className="grid gap-3 md:grid-cols-2">
                  {affirmationCards.map((card) => (
                    <button key={card} type="button" onClick={() => setAffirmationReflection(card)} className="rounded-[24px] border border-white/10 bg-white/8 p-4 text-left text-sm leading-relaxed text-white transition hover:bg-white/12">
                      {card}
                    </button>
                  ))}
                </div>
                <div>
                  <label className="mb-3 block text-sm font-semibold uppercase tracking-[0.2em] text-slate-200/75">Chosen affirmation</label>
                  <textarea rows={4} value={affirmationReflection} onChange={(event) => setAffirmationReflection(event.target.value)} className="app-textarea" />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (!affirmationReflection.trim()) return;
                    setToolRecords((current) => ({
                      ...current,
                      affirmations: [
                        { date: new Date().toISOString(), affirmation: affirmationReflection },
                        ...(current.affirmations ?? [])
                      ]
                    }));
                    setOpenPanel(null);
                    setAffirmationReflection('');
                  }}
                  className="primary-button"
                >
                  Save affirmation
                </button>
              </div>
            ) : null}

            {openPanel === 'doctorLibrary' ? (
              <div className="grid gap-3 md:grid-cols-2">
                {doctorTools.map((tool) => (
                  <button key={tool.id} type="button" onClick={() => { setOpenPanel(null); setSelectedTool(tool); }} className="tool-tile">
                    <span>{tool.title}</span>
                    <ChevronRight className="ml-auto h-4 w-4 text-slate-200/60" />
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {selectedTool ? (
        <div className="fixed inset-0 z-50 bg-[#050816]/80 p-4 backdrop-blur-xl">
          <div className="mx-auto mt-6 max-w-2xl rounded-[32px] border border-white/15 bg-[#0c1430]/95 p-5 shadow-[0_30px_80px_rgba(0,0,0,0.45)] md:p-6">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-slate-300/70">{selectedTool.category} tool</div>
                <h2 className="mt-2 text-2xl font-semibold text-white">{selectedTool.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-300/80">{selectedTool.description}</p>
              </div>
              <button type="button" onClick={() => setSelectedTool(null)} className="rounded-full border border-white/10 bg-white/10 p-2 text-white transition hover:bg-white/15">
                <ArrowLeft className="h-5 w-5" />
              </button>
            </div>

            {selectedTool.id === 'sound_therapy' ? (
              <div className="mb-4 grid gap-3 md:grid-cols-3">
                {[
                  ['binaural', 'Binaural Beats'],
                  ['pure', 'Pure Tones'],
                  ['rain', 'Nature Noise']
                ].map(([id, label]) => (
                  <button key={id} type="button" onClick={() => handleSoundToggle(id as 'binaural' | 'pure' | 'rain')} className={cn('rounded-[22px] border px-4 py-3 text-sm font-semibold transition', activeSound === id ? 'border-cyan-100/40 bg-white/15 text-white' : 'border-white/10 bg-white/8 text-slate-100')}>{label}</button>
                ))}
              </div>
            ) : null}

            <form onSubmit={(event) => { event.preventDefault(); handleSaveTool(selectedTool, event.currentTarget); }} className="space-y-4">
              {selectedTool.fields.map((field) => (
                <label key={field.name} className="block">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-200/70">{field.label}</span>
                  {field.type === 'textarea' ? (
                    <textarea name={field.name} required rows={4} className="app-textarea" />
                  ) : field.type === 'select' ? (
                    <select name={field.name} className="app-input" defaultValue={field.options?.[0]}>
                      {field.options?.map((option) => <option key={option} value={option}>{option}</option>)}
                    </select>
                  ) : field.type === 'checkbox' ? (
                    <span className="inline-flex items-center gap-3 rounded-[20px] border border-white/10 bg-white/8 px-4 py-4 text-sm text-white">
                      <input name={field.name} type="checkbox" className="h-4 w-4" /> Mark complete
                    </span>
                  ) : (
                    <input name={field.name} type={field.type} required className="app-input" />
                  )}
                </label>
              ))}
              <button type="submit" className="primary-button w-full">Save tool entry</button>
            </form>

            <div className="mt-5 rounded-[24px] border border-white/10 bg-white/6 p-4">
              <div className="mb-3 text-xs uppercase tracking-[0.2em] text-slate-200/70">Recent entries</div>
              <div className="space-y-2">
                {(toolRecords[selectedTool.id] ?? []).slice(0, 3).map((record, index) => (
                  <div key={`${selectedTool.id}-${index}`} className="rounded-[18px] bg-white/8 px-3 py-2 text-sm text-slate-100/85">
                    {summarizeRecord(record)}
                  </div>
                ))}
                {!(toolRecords[selectedTool.id] ?? []).length ? <div className="text-sm text-slate-300/70">No saved entries yet.</div> : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
