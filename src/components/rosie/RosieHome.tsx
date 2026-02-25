import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { TimelineEvent, BabyProfile, DevelopmentalInfo, CatchUpData, WeatherData } from './types';
import { TimePeriod } from './RosieHeader';
import { getTodayEvents, getTodayStats, getExpectedValues, getSmartPromptData, getProactiveAlerts } from './contextEngine';
import { getTodaysActivities, getWeatherLabel } from './dailyActivities';
import { getMilestonesForCatchUp, getMilestonesForAge } from './milestoneData';
import { RosieMilestoneBrowser } from './RosieMilestoneBrowser';
import { getInsightsForWeek, ExpertInsight } from './expertInsights';
import { WeeklySummary, IsThisNormalQuestion, CorrelationInsight } from './analyticsEngine';

// Catch-up quiz topic definitions
const CATCHUP_TOPICS = [
  { id: 'feeding', label: 'Feeding', sub: 'Breast, bottle, solids, or combo?' },
  { id: 'sleep', label: 'Sleep', sub: 'Nap count, bedtime, night wakes' },
  { id: 'milestones', label: 'Milestones', sub: '' }, // sub set dynamically with baby name
  { id: 'concerns', label: 'Your concerns', sub: 'Anything you\'re wondering about?' },
] as const;

type CatchUpTopic = typeof CATCHUP_TOPICS[number]['id'];

interface RosieHomeProps {
  timeline: TimelineEvent[];
  baby: BabyProfile;
  developmentalInfo: DevelopmentalInfo;
  timePeriod: TimePeriod;
  lastFeedSide?: string;
  catchUpData?: CatchUpData;
  weeklySummary?: WeeklySummary | null;
  correlationInsights?: CorrelationInsight[];
  isThisNormalQuestions?: IsThisNormalQuestion[];
  weather?: WeatherData | null;
  onOpenQuickLog: (type: 'feed' | 'sleep' | 'diaper') => void;
  onNavigateTab: (tab: 'timeline' | 'discover') => void;
  onUpdateCatchUp?: (data: Partial<CatchUpData>) => Promise<{ success: boolean; error?: string }>;
  onAskRosie?: (message: string) => void;
}

export const RosieHome: React.FC<RosieHomeProps> = ({
  timeline,
  baby,
  developmentalInfo,
  timePeriod,
  lastFeedSide,
  catchUpData,
  weeklySummary,
  correlationInsights,
  isThisNormalQuestions,
  weather,
  onOpenQuickLog,
  onNavigateTab,
  onUpdateCatchUp,
  onAskRosie,
}) => {
  const [alertDismissed, setAlertDismissed] = useState(false);
  const [celebrationDismissed, setCelebrationDismissed] = useState(false);
  const [completedActivities, setCompletedActivities] = useState<Set<string>>(new Set());
  const [activeQuiz, setActiveQuiz] = useState<CatchUpTopic | null>(null);
  const [showMilestoneBrowser, setShowMilestoneBrowser] = useState(false);

  // Expert insights carousel state
  const [currentInsightIndex, setCurrentInsightIndex] = useState(0);
  const insightTouchStartX = useRef<number>(0);
  const insightTouchEndX = useRef<number>(0);

  // Catch-up quiz local state for in-progress answers
  const [quizFeeding, setQuizFeeding] = useState<string | null>(null);
  const [quizSolids, setQuizSolids] = useState<boolean | null>(null);
  const [quizNaps, setQuizNaps] = useState<number | null>(null);
  const [quizBedtime, setQuizBedtime] = useState<string>('');
  const [quizWakings, setQuizWakings] = useState<number | null>(null);
  const [quizSleepMethod, setQuizSleepMethod] = useState<string | null>(null);
  const [quizMilestones, setQuizMilestones] = useState<Set<string>>(new Set());
  const [quizConcernText, setQuizConcernText] = useState('');

  const todayEvents = useMemo(
    () => getTodayEvents(timeline, 5),
    [timeline]
  );

  const todayStats = useMemo(
    () => getTodayStats(timeline),
    [timeline]
  );

  const expected = useMemo(
    () => getExpectedValues(baby.birthDate),
    [baby.birthDate]
  );

  const smartPrompt = useMemo(
    () => getSmartPromptData(timeline, lastFeedSide, baby.name),
    [timeline, lastFeedSide, baby.name]
  );

  const proactiveAlerts = useMemo(
    () => alertDismissed ? [] : getProactiveAlerts(timeline, developmentalInfo, baby.name, weather),
    [timeline, developmentalInfo, baby.name, alertDismissed, weather]
  );

  // Auto-flip carousel state
  const [alertIndex, setAlertIndex] = useState(0);
  const [alertDisplayedIndex, setAlertDisplayedIndex] = useState(0);
  const [alertFading, setAlertFading] = useState(false);
  const alertPauseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [alertPaused, setAlertPaused] = useState(false);
  const alertTouchStartX = useRef(0);
  const alertTouchEndX = useRef(0);

  // Reset index when alerts change
  useEffect(() => {
    setAlertIndex(0);
    setAlertDisplayedIndex(0);
  }, [proactiveAlerts.length]);

  // Two-phase crossfade: when alertIndex changes, fade out → swap → fade in
  useEffect(() => {
    if (alertIndex === alertDisplayedIndex) return;
    setAlertFading(true);
    const timer = setTimeout(() => {
      setAlertDisplayedIndex(alertIndex);
      setAlertFading(false);
    }, 200);
    return () => clearTimeout(timer);
  }, [alertIndex, alertDisplayedIndex]);

  // Auto-flip timer
  useEffect(() => {
    if (proactiveAlerts.length <= 1 || alertPaused) return;
    const interval = setInterval(() => {
      setAlertIndex(prev => (prev + 1) % proactiveAlerts.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [proactiveAlerts.length, alertPaused]);

  // Pause handler: pause for 10s then resume
  const pauseAutoFlip = useCallback(() => {
    setAlertPaused(true);
    if (alertPauseTimerRef.current) clearTimeout(alertPauseTimerRef.current);
    alertPauseTimerRef.current = setTimeout(() => setAlertPaused(false), 10000);
  }, []);

  // Cleanup pause timer on unmount
  useEffect(() => {
    return () => {
      if (alertPauseTimerRef.current) clearTimeout(alertPauseTimerRef.current);
    };
  }, []);

  const currentAlert = proactiveAlerts[alertDisplayedIndex] || null;
  const cardVariant = proactiveAlerts[0]?.variant || 'purple';

  const babyAgeWeeks = useMemo(() => {
    const birth = new Date(baby.birthDate);
    const now = new Date();
    return Math.floor((now.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24 * 7));
  }, [baby.birthDate]);

  const dailyActivities = useMemo(
    () => getTodaysActivities(babyAgeWeeks, [], 3, weather),
    [babyAgeWeeks, weather]
  );

  const weatherLabel = useMemo(
    () => getWeatherLabel(weather ?? null),
    [weather]
  );

  // Expert insights for current developmental stage
  const allInsights: ExpertInsight[] = useMemo(() => {
    return getInsightsForWeek(babyAgeWeeks);
  }, [babyAgeWeeks]);

  const nextInsight = useCallback(() => {
    setCurrentInsightIndex(prev => (prev + 1) % allInsights.length);
  }, [allInsights.length]);

  const prevInsight = useCallback(() => {
    setCurrentInsightIndex(prev => (prev - 1 + allInsights.length) % allInsights.length);
  }, [allInsights.length]);

  const handleInsightTouchStart = (e: React.TouchEvent) => {
    insightTouchStartX.current = e.touches[0].clientX;
  };
  const handleInsightTouchMove = (e: React.TouchEvent) => {
    insightTouchEndX.current = e.touches[0].clientX;
  };
  const handleInsightTouchEnd = () => {
    const diff = insightTouchStartX.current - insightTouchEndX.current;
    if (Math.abs(diff) > 50) {
      diff > 0 ? nextInsight() : prevInsight();
    }
  };

  const toggleActivity = (activityId: string) => {
    setCompletedActivities(prev => {
      const next = new Set(prev);
      if (next.has(activityId)) {
        next.delete(activityId);
      } else {
        next.add(activityId);
      }
      return next;
    });
  };

  // Catch-up quiz state
  const completedTopics = catchUpData?.completedTopics || [];
  const catchUpComplete = completedTopics.length >= 4;
  const catchUpProgress = (completedTopics.length / 4) * 100;

  const milestonesForCatchUp = useMemo(
    () => getMilestonesForCatchUp(babyAgeWeeks),
    [babyAgeWeeks]
  );

  // Milestone skill tree data (same logic as Discover tab)
  const milestoneTree = useMemo(() => {
    const { current, upcoming, past } = getMilestonesForAge(babyAgeWeeks);
    const done = past.slice(-2);
    const emerging = current.slice(0, 3);
    const next = upcoming.slice(0, 2);
    return { done, emerging, next };
  }, [babyAgeWeeks]);

  const hasMilestones = milestoneTree.done.length > 0 || milestoneTree.emerging.length > 0 || milestoneTree.next.length > 0;

  const getTopicState = (topicId: string): 'done' | 'active' | 'pending' => {
    if (completedTopics.includes(topicId)) return 'done';
    // First non-completed topic is active
    const firstIncomplete = CATCHUP_TOPICS.find(t => !completedTopics.includes(t.id));
    if (firstIncomplete && firstIncomplete.id === topicId) return 'active';
    return 'pending';
  };

  const handleSaveFeedingQuiz = useCallback(async () => {
    if (!onUpdateCatchUp || !quizFeeding) return;
    await onUpdateCatchUp({
      feedingMethod: quizFeeding as CatchUpData['feedingMethod'],
      solidFoods: quizSolids ?? false,
      completedTopics: [...completedTopics, 'feeding'],
    });
    setActiveQuiz(null);
    setQuizFeeding(null);
    setQuizSolids(null);
  }, [onUpdateCatchUp, quizFeeding, quizSolids, completedTopics]);

  const handleSaveSleepQuiz = useCallback(async () => {
    if (!onUpdateCatchUp) return;
    await onUpdateCatchUp({
      sleepBaseline: {
        napsPerDay: quizNaps ?? undefined,
        bedtime: quizBedtime || undefined,
        nightWakings: quizWakings ?? undefined,
        sleepMethod: (quizSleepMethod as 'contact' | 'crib' | 'cosleep' | 'bassinet') || undefined,
      },
      completedTopics: [...completedTopics, 'sleep'],
    });
    setActiveQuiz(null);
    setQuizNaps(null);
    setQuizBedtime('');
    setQuizWakings(null);
    setQuizSleepMethod(null);
  }, [onUpdateCatchUp, quizNaps, quizBedtime, quizWakings, quizSleepMethod, completedTopics]);

  const handleSaveMilestonesQuiz = useCallback(async () => {
    if (!onUpdateCatchUp) return;
    await onUpdateCatchUp({
      milestonesChecked: Array.from(quizMilestones),
      completedTopics: [...completedTopics, 'milestones'],
    });
    setActiveQuiz(null);
    setQuizMilestones(new Set());
  }, [onUpdateCatchUp, quizMilestones, completedTopics]);

  const handleSaveConcernsQuiz = useCallback(async () => {
    if (!onUpdateCatchUp) return;
    const newTopics = [...completedTopics, 'concerns'];
    await onUpdateCatchUp({
      parentConcernText: quizConcernText || undefined,
      completedTopics: newTopics,
      completedAt: newTopics.length >= 4 ? new Date().toISOString() : undefined,
    });
    setActiveQuiz(null);
    setQuizConcernText('');
  }, [onUpdateCatchUp, quizConcernText, completedTopics]);

  // Determine if this is a brand-new user (no events ever logged)
  const isFirstTimeUser = timeline.length === 0;

  // First-log celebration: show when user has very few events (just started tracking)
  const isFirstLogMoment = !celebrationDismissed && timeline.length > 0 && timeline.length <= 3;
  const firstEventType = isFirstLogMoment ? timeline[timeline.length - 1]?.type : null;
  const firstLogLabel = firstEventType === 'feed' ? 'First feed logged!' : firstEventType === 'sleep' ? 'First sleep logged!' : firstEventType === 'diaper' ? 'First diaper logged!' : 'First event logged!';

  // Show solids button for babies 4+ months
  const showSolids = babyAgeWeeks >= 17;

  // Format sleep minutes for compact display
  const sleepDisplay = useMemo(() => {
    const h = Math.floor(todayStats.sleepMinutes / 60);
    const m = todayStats.sleepMinutes % 60;
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    if (m > 0) return `${m}m`;
    return '0m';
  }, [todayStats.sleepMinutes]);

  // Alert variant → CSS classes
  const alertVariantClasses: Record<string, string> = {
    purple: 'rosie-proactive-alert--purple',
    orange: 'rosie-proactive-alert--orange',
    green: 'rosie-proactive-alert--green',
    blue: 'rosie-proactive-alert--blue',
  };

  return (
    <div className="rosie-home">
      {/* Empty State Welcome — first-time users */}
      {isFirstTimeUser && (
        <section className="rosie-home-section">
          <div className="rosie-empty-welcome">
            <div className="rosie-empty-welcome-emoji">💜</div>
            <div className="rosie-empty-welcome-title">Congratulations on {baby.name}!</div>
            <div className="rosie-empty-welcome-sub">
              RosieAI is here to help you through the first year. Start by logging your first event — she'll learn {baby.name}'s patterns and give you personalized guidance.
            </div>
            <div className="rosie-empty-log-options">
              <button className="rosie-empty-log-option" onClick={() => onOpenQuickLog('feed')}>
                <span className="rosie-empty-log-icon">🍼</span>
                <span className="rosie-empty-log-label">Feed</span>
              </button>
              <button className="rosie-empty-log-option" onClick={() => onOpenQuickLog('sleep')}>
                <span className="rosie-empty-log-icon">😴</span>
                <span className="rosie-empty-log-label">Sleep</span>
              </button>
              <button className="rosie-empty-log-option" onClick={() => onOpenQuickLog('diaper')}>
                <span className="rosie-empty-log-icon">🧷</span>
                <span className="rosie-empty-log-label">Diaper</span>
              </button>
            </div>
            <div className="rosie-empty-welcome-hint">Or just text RosieAI: "Fed {baby.name} at 2pm"</div>
          </div>
        </section>
      )}

      {/* First-Log Celebration — shows after first 1-3 events */}
      {isFirstLogMoment && (
        <section className="rosie-home-section">
          <div className="rosie-first-log-celebration" onClick={() => setCelebrationDismissed(true)}>
            <span className="rosie-first-log-emoji">🎉</span>
            <div className="rosie-first-log-content">
              <div className="rosie-first-log-title">{firstLogLabel}</div>
              <div className="rosie-first-log-text">You're officially tracking. RosieAI will start learning {baby.name}'s patterns from here.</div>
            </div>
          </div>
        </section>
      )}

      {/* Smart Prompt — contextual suggestion (hidden for first-time users) */}
      {!isFirstTimeUser && smartPrompt && (
        <section className="rosie-home-section">
          <div
            className="rosie-smart-prompt"
            onClick={() => onOpenQuickLog(smartPrompt.type)}
            role="button"
            tabIndex={0}
          >
            <div
              className="rosie-smart-icon"
              style={{ background: smartPrompt.iconBg }}
            >
              {smartPrompt.icon}
            </div>
            <div className="rosie-smart-content">
              <div className="rosie-smart-title">{smartPrompt.title}</div>
              <div className="rosie-smart-sub">{smartPrompt.subtitle}</div>
            </div>
            <div className="rosie-smart-arrow">›</div>
          </div>
        </section>
      )}

      {/* Proactive Alert — auto-flipping carousel */}
      {currentAlert && (
        <section className="rosie-home-section">
          <div
            className={`rosie-proactive-alert ${alertVariantClasses[cardVariant] || ''} ${currentAlert.linkToDiscover ? 'rosie-proactive-alert--clickable' : ''}`}
            onClick={currentAlert.linkToDiscover ? () => onNavigateTab('discover') : undefined}
            role={currentAlert.linkToDiscover ? 'button' : undefined}
            tabIndex={currentAlert.linkToDiscover ? 0 : undefined}
            onTouchStart={(e) => { alertTouchStartX.current = e.touches[0].clientX; }}
            onTouchMove={(e) => { alertTouchEndX.current = e.touches[0].clientX; }}
            onTouchEnd={() => {
              const delta = alertTouchStartX.current - alertTouchEndX.current;
              if (Math.abs(delta) > 50 && proactiveAlerts.length > 1) {
                if (delta > 0) {
                  setAlertIndex(prev => (prev + 1) % proactiveAlerts.length);
                } else {
                  setAlertIndex(prev => (prev - 1 + proactiveAlerts.length) % proactiveAlerts.length);
                }
                pauseAutoFlip();
              }
            }}
          >
            <div className={`rosie-alert-body ${alertFading ? 'rosie-alert-body--fading' : ''}`}>
              <div className="rosie-alert-icon">{currentAlert.icon}</div>
              <div className="rosie-alert-content">
                <div className="rosie-alert-title">{currentAlert.title}</div>
                <div className="rosie-alert-text">{currentAlert.text}</div>
                {currentAlert.source && (
                  <div className="rosie-alert-source">{currentAlert.source}</div>
                )}
                <div className="rosie-alert-actions">
                  {currentAlert.linkToDiscover ? (
                    <button
                      className="rosie-alert-link"
                      onClick={(e) => { e.stopPropagation(); onNavigateTab('discover'); }}
                    >
                      Explore more →
                    </button>
                  ) : (
                    <button
                      className="rosie-alert-dismiss"
                      onClick={(e) => { e.stopPropagation(); setAlertDismissed(true); }}
                    >
                      Got it
                    </button>
                  )}
                </div>
              </div>
            </div>
            {proactiveAlerts.length > 1 && (
              <div className="rosie-alert-dots">
                {proactiveAlerts.map((_, i) => (
                  <button
                    key={i}
                    className={`rosie-alert-dot ${i === alertIndex ? 'active' : ''}`}
                    onClick={(e) => { e.stopPropagation(); setAlertIndex(i); pauseAutoFlip(); }}
                    aria-label={`View insight ${i + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Patterns — unified weekly averages + top correlation insights */}
      {((weeklySummary && weeklySummary.hasEnoughData) || (correlationInsights && correlationInsights.length > 0)) && (
        <section className="rosie-home-section">
          <div className="rosie-home-section-header">
            <h2 className="rosie-home-section-title">Patterns</h2>
            <button
              className="rosie-home-section-link"
              onClick={() => onNavigateTab('discover')}
            >
              See all →
            </button>
          </div>
          <div className="rosie-patterns-card">
            {/* Daily averages with trends */}
            {weeklySummary && weeklySummary.hasEnoughData && (
              <div className="rosie-patterns-stats">
                <div className="rosie-patterns-stat">
                  <div className="rosie-patterns-stat-value" style={{ color: '#FF9500' }}>
                    {weeklySummary.thisWeek.feeds % 1 === 0 ? weeklySummary.thisWeek.feeds.toFixed(0) : weeklySummary.thisWeek.feeds.toFixed(1)}
                    <span className="rosie-patterns-stat-unit">/day</span>
                  </div>
                  <div className="rosie-patterns-stat-label">Feeds</div>
                  {weeklySummary.trends && weeklySummary.trends.feeds !== 0 && (
                    <div className={`rosie-patterns-stat-trend ${weeklySummary.trends.feeds > 0 ? 'up' : 'down'}`}>
                      {weeklySummary.trends.feeds > 0 ? '↑' : '↓'} {Math.abs(weeklySummary.trends.feeds)}%
                    </div>
                  )}
                </div>
                <div className="rosie-patterns-stat">
                  <div className="rosie-patterns-stat-value" style={{ color: '#B57BEC' }}>
                    {weeklySummary.thisWeek.sleepHours % 1 === 0 ? weeklySummary.thisWeek.sleepHours.toFixed(0) : weeklySummary.thisWeek.sleepHours.toFixed(1)}h
                    <span className="rosie-patterns-stat-unit">/day</span>
                  </div>
                  <div className="rosie-patterns-stat-label">Sleep</div>
                  {weeklySummary.trends && weeklySummary.trends.sleep !== 0 && (
                    <div className={`rosie-patterns-stat-trend ${weeklySummary.trends.sleep > 0 ? 'up' : 'down'}`}>
                      {weeklySummary.trends.sleep > 0 ? '↑' : '↓'} {Math.abs(weeklySummary.trends.sleep)}%
                    </div>
                  )}
                </div>
                <div className="rosie-patterns-stat">
                  <div className="rosie-patterns-stat-value" style={{ color: '#34C759' }}>
                    {weeklySummary.thisWeek.diapers % 1 === 0 ? weeklySummary.thisWeek.diapers.toFixed(0) : weeklySummary.thisWeek.diapers.toFixed(1)}
                    <span className="rosie-patterns-stat-unit">/day</span>
                  </div>
                  <div className="rosie-patterns-stat-label">Diapers</div>
                  {weeklySummary.trends && weeklySummary.trends.diapers !== 0 && (
                    <div className={`rosie-patterns-stat-trend ${weeklySummary.trends.diapers > 0 ? 'up' : 'down'}`}>
                      {weeklySummary.trends.diapers > 0 ? '↑' : '↓'} {Math.abs(weeklySummary.trends.diapers)}%
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Top pattern insights (max 2 previews) */}
            {correlationInsights && correlationInsights.length > 0 && (
              <div className="rosie-patterns-insights">
                {correlationInsights.slice(0, 2).map(insight => (
                  <div key={insight.id} className="rosie-patterns-insight-row">
                    <span className="rosie-patterns-insight-icon">{insight.icon}</span>
                    <span className="rosie-patterns-insight-title">{insight.title}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Mini Quick Log */}
      <section className="rosie-home-section">
        <div className="rosie-home-section-header">
          <h2 className="rosie-home-section-title">Log</h2>
        </div>
        <div className="rosie-mini-quick-log">
          <button
            className="rosie-mini-log-btn"
            onClick={() => onOpenQuickLog('feed')}
          >
            <span className="rosie-mini-log-emoji">🍼</span>
            Feed
          </button>
          <button
            className="rosie-mini-log-btn"
            onClick={() => onOpenQuickLog('sleep')}
          >
            <span className="rosie-mini-log-emoji">😴</span>
            Sleep
          </button>
          <button
            className="rosie-mini-log-btn"
            onClick={() => onOpenQuickLog('diaper')}
          >
            <span className="rosie-mini-log-emoji">🧷</span>
            Diaper
          </button>
          {showSolids && (
            <button
              className="rosie-mini-log-btn"
              onClick={() => onOpenQuickLog('feed')}
            >
              <span className="rosie-mini-log-emoji">🥘</span>
              Solids
            </button>
          )}
        </div>
      </section>

      {/* Today — compact stats */}
      <section className="rosie-home-section">
        <div className="rosie-home-section-header">
          <h2 className="rosie-home-section-title">Today</h2>
          <button
            className="rosie-home-section-link"
            onClick={() => onNavigateTab('timeline')}
          >
            Timeline →
          </button>
        </div>
        <div className="rosie-compact-stats">
          <div className="rosie-compact-stat">
            <div className="rosie-compact-stat-value" style={{ color: '#FF9500' }}>
              {todayStats.feedCount}
            </div>
            <div className="rosie-compact-stat-label">Feeds</div>
            <div className="rosie-compact-stat-context">of ~{expected.feeds} typical</div>
          </div>
          <div className="rosie-compact-stat">
            <div className="rosie-compact-stat-value" style={{ color: '#B57BEC' }}>
              {sleepDisplay}
            </div>
            <div className="rosie-compact-stat-label">Sleep</div>
            <div className="rosie-compact-stat-context">of ~{Math.round(expected.sleepMinutes / 60)}h typical</div>
          </div>
          <div className="rosie-compact-stat">
            <div className="rosie-compact-stat-value" style={{ color: '#34C759' }}>
              {todayStats.diaperCount}
            </div>
            <div className="rosie-compact-stat-label">Diapers</div>
            <div className="rosie-compact-stat-context">of ~{expected.diapers} typical</div>
          </div>
        </div>

        {/* Timeline events — recent activity, inside Today section */}
        {todayEvents.length > 0 && (
          <div className="rosie-home-events">
            {todayEvents.slice(0, 3).map(event => (
              <div key={event.id} className={`rosie-home-event ${event.type}`}>
                <div
                  className="rosie-home-event-bar"
                  style={{ background: event.accentColor }}
                />
                <div
                  className="rosie-home-event-icon"
                  style={{ background: event.iconBg }}
                >
                  {event.icon}
                </div>
                <div className="rosie-home-event-content">
                  <div className="rosie-home-event-title">{event.title}</div>
                  {event.detail && (
                    <div className="rosie-home-event-detail">{event.detail}</div>
                  )}
                </div>
                <div className="rosie-home-event-time">{event.time}</div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Today's Plan — age-appropriate activities */}
      {dailyActivities.length > 0 && (
        <section className="rosie-home-section">
          <div className="rosie-home-section-header">
            <h2 className="rosie-home-section-title">Today's Plan</h2>
          </div>
          <div className="rosie-daily-plan">
            {weatherLabel && (
              <div className="rosie-plan-weather-label">
                <span className="rosie-plan-weather-emoji">{weatherLabel.emoji}</span>
                {weatherLabel.text}
              </div>
            )}
            <div className="rosie-plan-header">
              <span className="rosie-plan-header-icon">🎯</span>
              <span className="rosie-plan-header-text">
                {dailyActivities.length} activities for {baby.name}
              </span>
              <span className="rosie-plan-header-sub">Week {babyAgeWeeks}</span>
            </div>
            {dailyActivities.map(activity => (
              <div
                key={activity.id}
                className="rosie-plan-item"
                onClick={() => toggleActivity(activity.id)}
                role="button"
                tabIndex={0}
              >
                <div
                  className={`rosie-plan-check ${completedActivities.has(activity.id) ? 'done' : ''}`}
                >
                  {completedActivities.has(activity.id) ? '✓' : ''}
                </div>
                <div className="rosie-plan-text">
                  <div className={`rosie-plan-activity ${completedActivities.has(activity.id) ? 'completed' : ''}`}>
                    {activity.title}
                  </div>
                  <div className="rosie-plan-activity-sub">{activity.description}</div>
                </div>
                <div className="rosie-plan-duration">{activity.duration}</div>
              </div>
            ))}
          </div>
        </section>
      )}


      {/* Milestone Skill Tree — per wireframe, between timeline and catch-up */}
      {hasMilestones && (
        <section className="rosie-home-section">
          <div className="rosie-home-section-header">
            <h2 className="rosie-home-section-title">{baby.name}'s Milestones</h2>
            <button className="rosie-home-section-link" onClick={() => setShowMilestoneBrowser(true)}>
              All →
            </button>
          </div>
          <div className="rosie-skill-tree">
            {milestoneTree.done.map((ms, i) => (
              <React.Fragment key={ms.id}>
                <div className="rosie-skill-row">
                  <div className="rosie-skill-dot done" />
                  <div className="rosie-skill-name done-text">{ms.title}</div>
                  <div className="rosie-skill-tag done">Done</div>
                </div>
                {(i < milestoneTree.done.length - 1 || milestoneTree.emerging.length > 0 || milestoneTree.next.length > 0) && (
                  <div className="rosie-skill-connector" />
                )}
              </React.Fragment>
            ))}
            {milestoneTree.emerging.map((ms, i) => (
              <React.Fragment key={ms.id}>
                <div className="rosie-skill-row">
                  <div className="rosie-skill-dot emerging" />
                  <div className="rosie-skill-name">{ms.title}</div>
                  <div className="rosie-skill-tag emerging">Emerging</div>
                </div>
                {(i < milestoneTree.emerging.length - 1 || milestoneTree.next.length > 0) && (
                  <div className="rosie-skill-connector" />
                )}
              </React.Fragment>
            ))}
            {milestoneTree.next.map((ms, i) => (
              <React.Fragment key={ms.id}>
                <div className="rosie-skill-row">
                  <div className="rosie-skill-dot next" />
                  <div className="rosie-skill-name">{ms.title}</div>
                  <div className="rosie-skill-tag next">Next</div>
                </div>
                {i < milestoneTree.next.length - 1 && (
                  <div className="rosie-skill-connector" />
                )}
              </React.Fragment>
            ))}
          </div>
        </section>
      )}

      {/* Expert Insights — swipeable card carousel */}
      {allInsights.length > 0 && (
        <section className="rosie-home-section">
          <div className="rosie-home-section-header">
            <h2 className="rosie-home-section-title">Expert Insights</h2>
          </div>
          <div
            className="tw-insight-card"
            onTouchStart={handleInsightTouchStart}
            onTouchMove={handleInsightTouchMove}
            onTouchEnd={handleInsightTouchEnd}
          >
            <div className="tw-insight-category">{allInsights[currentInsightIndex].topic}</div>
            <div className="tw-insight-text">{allInsights[currentInsightIndex].insight}</div>
            <div className="tw-insight-source">— {allInsights[currentInsightIndex].source}</div>
          </div>
          <div className="tw-carousel-dots">
            {allInsights.map((_, i) => (
              <button
                key={i}
                className={`tw-dot ${i === currentInsightIndex ? 'active' : ''}`}
                onClick={() => setCurrentInsightIndex(i)}
                aria-label={`Go to insight ${i + 1}`}
              />
            ))}
          </div>
        </section>
      )}

      {/* "Is This Normal?" — personalized FAQ cards */}
      {isThisNormalQuestions && isThisNormalQuestions.length > 0 && (
        <section className="rosie-home-section">
          <div className="rosie-home-section-header">
            <h2 className="rosie-home-section-title">Is This Normal?</h2>
          </div>
          <div className="rosie-itn-cards">
            {isThisNormalQuestions.map(q => (
              <div
                key={q.id}
                className="rosie-itn-card"
                onClick={() => onAskRosie?.(q.chatMessage)}
                role="button"
                tabIndex={0}
              >
                <div className="rosie-itn-question-row">
                  <span className="rosie-itn-icon">{q.icon}</span>
                  <span className="rosie-itn-question">{q.question}</span>
                </div>
                <div className="rosie-itn-answer">{q.answerPreview}</div>
                <div className="rosie-itn-ask-link">Ask Rosie →</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Quick Catch-Up Quiz — progressive data collection */}
      {!catchUpComplete && onUpdateCatchUp && (
        <section className="rosie-home-section">
          <div className="rosie-catchup-card">
            <div className="rosie-catchup-header">
              <span className="rosie-catchup-header-icon">🧠</span>
              <div>
                <div className="rosie-catchup-header-text">Quick Catch-Up</div>
                <div className="rosie-catchup-header-sub">Help RosieAI learn what {baby.name} can do</div>
              </div>
            </div>
            <div className="rosie-catchup-progress">
              <div
                className="rosie-catchup-progress-fill"
                style={{ width: `${catchUpProgress}%` }}
              />
            </div>
            {CATCHUP_TOPICS.map(topic => {
              const state = getTopicState(topic.id);
              const sub = topic.id === 'milestones'
                ? `Quick check of what ${baby.name}'s doing`
                : topic.sub;
              return (
                <div
                  key={topic.id}
                  className={`rosie-catchup-item ${state === 'done' ? 'done' : ''}`}
                  onClick={() => state !== 'done' && setActiveQuiz(topic.id as CatchUpTopic)}
                  role="button"
                  tabIndex={0}
                >
                  <div className={`rosie-catchup-dot ${state}`} />
                  <div className="rosie-catchup-text">
                    <div className={`rosie-catchup-label ${state === 'done' ? 'done-text' : ''}`}>
                      {topic.label}
                    </div>
                    <div className="rosie-catchup-sub">{sub}</div>
                  </div>
                  {state !== 'done' && <div className="rosie-catchup-arrow">›</div>}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ─── Catch-Up Quiz Sheets ─── */}
      {activeQuiz && (
        <div className="rosie-quiz-overlay" onClick={() => setActiveQuiz(null)}>
          <div className="rosie-quiz-sheet" onClick={e => e.stopPropagation()}>

            {/* Feeding Quiz */}
            {activeQuiz === 'feeding' && (
              <>
                <div className="rosie-quiz-header">
                  <div className="rosie-quiz-title">How do you feed {baby.name}?</div>
                  <button className="rosie-quiz-close" onClick={() => setActiveQuiz(null)}>✕</button>
                </div>
                <div className="rosie-quiz-body">
                  <div className="rosie-quiz-options">
                    {[
                      { value: 'breast', label: '🤱 Breastfeeding' },
                      { value: 'bottle', label: '🍼 Bottle (formula)' },
                      { value: 'both', label: '🔄 Combo (breast + bottle)' },
                      { value: 'pumping', label: '🫙 Pumping' },
                    ].map(opt => (
                      <button
                        key={opt.value}
                        className={`rosie-quiz-option ${quizFeeding === opt.value ? 'selected' : ''}`}
                        onClick={() => setQuizFeeding(opt.value)}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  {babyAgeWeeks >= 17 && (
                    <div className="rosie-quiz-section">
                      <div className="rosie-quiz-section-label">Started solids?</div>
                      <div className="rosie-quiz-toggle-row">
                        <button
                          className={`rosie-quiz-option small ${quizSolids === true ? 'selected' : ''}`}
                          onClick={() => setQuizSolids(true)}
                        >
                          Yes
                        </button>
                        <button
                          className={`rosie-quiz-option small ${quizSolids === false ? 'selected' : ''}`}
                          onClick={() => setQuizSolids(false)}
                        >
                          Not yet
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                <div className="rosie-quiz-footer">
                  <button
                    className="rosie-quiz-save"
                    disabled={!quizFeeding}
                    onClick={handleSaveFeedingQuiz}
                  >
                    Save
                  </button>
                </div>
              </>
            )}

            {/* Sleep Quiz */}
            {activeQuiz === 'sleep' && (
              <>
                <div className="rosie-quiz-header">
                  <div className="rosie-quiz-title">{baby.name}'s sleep</div>
                  <button className="rosie-quiz-close" onClick={() => setActiveQuiz(null)}>✕</button>
                </div>
                <div className="rosie-quiz-body">
                  <div className="rosie-quiz-section">
                    <div className="rosie-quiz-section-label">Naps per day</div>
                    <div className="rosie-quiz-options row">
                      {[1, 2, 3, 4, 5].map(n => (
                        <button
                          key={n}
                          className={`rosie-quiz-option small ${quizNaps === n ? 'selected' : ''}`}
                          onClick={() => setQuizNaps(n)}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="rosie-quiz-section">
                    <div className="rosie-quiz-section-label">Typical bedtime</div>
                    <input
                      type="time"
                      className="rosie-quiz-input"
                      value={quizBedtime}
                      onChange={e => setQuizBedtime(e.target.value)}
                    />
                  </div>
                  <div className="rosie-quiz-section">
                    <div className="rosie-quiz-section-label">Night wakings</div>
                    <div className="rosie-quiz-options row">
                      {[0, 1, 2, 3, 4].map(n => (
                        <button
                          key={n}
                          className={`rosie-quiz-option small ${quizWakings === n ? 'selected' : ''}`}
                          onClick={() => setQuizWakings(n)}
                        >
                          {n === 4 ? '4+' : n}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="rosie-quiz-section">
                    <div className="rosie-quiz-section-label">Where does {baby.name} sleep?</div>
                    <div className="rosie-quiz-options">
                      {[
                        { value: 'crib', label: 'Crib' },
                        { value: 'bassinet', label: 'Bassinet' },
                        { value: 'cosleep', label: 'Co-sleep' },
                        { value: 'contact', label: 'Contact naps' },
                      ].map(opt => (
                        <button
                          key={opt.value}
                          className={`rosie-quiz-option ${quizSleepMethod === opt.value ? 'selected' : ''}`}
                          onClick={() => setQuizSleepMethod(opt.value)}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="rosie-quiz-footer">
                  <button
                    className="rosie-quiz-save"
                    onClick={handleSaveSleepQuiz}
                  >
                    Save
                  </button>
                </div>
              </>
            )}

            {/* Milestones Quiz */}
            {activeQuiz === 'milestones' && (
              <>
                <div className="rosie-quiz-header">
                  <div className="rosie-quiz-title">What can {baby.name} do?</div>
                  <button className="rosie-quiz-close" onClick={() => setActiveQuiz(null)}>✕</button>
                </div>
                <div className="rosie-quiz-body">
                  <div className="rosie-quiz-hint">Tap everything {baby.name} can do. No pressure — skip what you're not sure about.</div>
                  <div className="rosie-quiz-milestones">
                    {milestonesForCatchUp.map(ms => (
                      <button
                        key={ms.id}
                        className={`rosie-quiz-milestone ${quizMilestones.has(ms.id) ? 'selected' : ''}`}
                        onClick={() => {
                          setQuizMilestones(prev => {
                            const next = new Set(prev);
                            if (next.has(ms.id)) next.delete(ms.id);
                            else next.add(ms.id);
                            return next;
                          });
                        }}
                      >
                        <span className="rosie-quiz-ms-icon">{ms.icon}</span>
                        <span className="rosie-quiz-ms-title">{ms.title}</span>
                        {quizMilestones.has(ms.id) && <span className="rosie-quiz-ms-check">✓</span>}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="rosie-quiz-footer">
                  <button
                    className="rosie-quiz-save"
                    onClick={handleSaveMilestonesQuiz}
                  >
                    Save ({quizMilestones.size} selected)
                  </button>
                </div>
              </>
            )}

            {/* Concerns Quiz */}
            {activeQuiz === 'concerns' && (
              <>
                <div className="rosie-quiz-header">
                  <div className="rosie-quiz-title">Anything on your mind?</div>
                  <button className="rosie-quiz-close" onClick={() => setActiveQuiz(null)}>✕</button>
                </div>
                <div className="rosie-quiz-body">
                  <div className="rosie-quiz-hint">
                    This goes straight to RosieAI — she'll remember and check in on it.
                    Totally fine to skip if nothing comes to mind.
                  </div>
                  <textarea
                    className="rosie-quiz-textarea"
                    placeholder={`E.g., "${baby.name} seems fussy after feeds" or "Is it normal that..."`}
                    value={quizConcernText}
                    onChange={e => setQuizConcernText(e.target.value)}
                    rows={4}
                  />
                </div>
                <div className="rosie-quiz-footer">
                  <button
                    className="rosie-quiz-save"
                    onClick={handleSaveConcernsQuiz}
                  >
                    {quizConcernText.trim() ? 'Save' : 'Skip for now'}
                  </button>
                </div>
              </>
            )}

          </div>
        </div>
      )}
      {/* Milestone Browser Modal */}
      <RosieMilestoneBrowser
        isOpen={showMilestoneBrowser}
        onClose={() => setShowMilestoneBrowser(false)}
        baby={baby}
        ageInWeeks={babyAgeWeeks}
      />
    </div>
  );
};

export default RosieHome;
