import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { RosieAuthProvider, useRosieAuth } from './RosieAuthContext';
import { RosieAuth } from './RosieAuth';
import { RosieOnboarding } from './RosieOnboarding';
import { RosieTimeline } from './RosieTimeline';
import { RosieChat } from './RosieChat';
import { RosieDiscover } from './RosieDiscover';
import { RosieHome } from './RosieHome';
import { RosieHeader, TimePeriod, getTimePeriod, getGreeting } from './RosieHeader';
import { RosieQuickLog, TimerActionEvent } from './RosieQuickLog';
import { RosieProfile } from './RosieProfile';
import { RosieData, BabyProfile, TimelineEvent, ChatMessage, ActiveTimer, GrowthMeasurement, UserSettings } from './types';
import { getStoredData, saveData, clearData } from './storage';
import { getDevelopmentalInfo } from './developmentalData';
import { getSmartDefaults } from './contextEngine';
import { getWeeklySummary, getPersonalizedBaselines, getCorrelationInsights, getIsThisNormalQuestions } from './analyticsEngine';
import { fetchEvents, addEvent, deleteEvent as deleteEventFromDB } from './supabaseEvents';
import { fetchSettings, saveSettings } from './supabaseSettings';
import { fetchGrowthMeasurements, addGrowthMeasurement, deleteGrowthMeasurement } from './supabaseGrowth';
import './rosie.css';

// Helper to generate UUID (fallback for browsers without crypto.randomUUID)
const generateUUID = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback for older browsers
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

// Helper to format seconds as mm:ss or hh:mm:ss
const formatDuration = (seconds: number): string => {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// Inner component that uses auth context
const RosieAIContent: React.FC = () => {
  const { user, currentBaby, profile, loading: authLoading, signOut, updateProfile, updateBaby: updateBabyInDb, updateCatchUpData } = useRosieAuth();
  const [data, setData] = useState<RosieData | null>(null);
  const [activeTab, setActiveTab] = useState<'home' | 'timeline' | 'discover' | 'chat'>('home');
  const [showChat, setShowChat] = useState(false);
  const [previousTab, setPreviousTab] = useState<'home' | 'timeline' | 'discover'>('home');
  const [isLoading, setIsLoading] = useState(true);
  const [bannerTimerDisplay, setBannerTimerDisplay] = useState(0);
  const [showQuickLogModal, setShowQuickLogModal] = useState<'feed' | 'sleep' | 'diaper' | null>(null);
  const [modalOpenedFromChat, setModalOpenedFromChat] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [timePeriod, setTimePeriod] = useState<TimePeriod>(getTimePeriod(new Date().getHours()));
  const [showAuth, setShowAuth] = useState(false);
  const [weather, setWeather] = useState<import('./types').WeatherData | null>(null);
  const [chatInitialMessage, setChatInitialMessage] = useState<string | undefined>(undefined);

  useEffect(() => {
    const loadData = async () => {
      // If user is authenticated and has a baby, load from Supabase
      if (user && currentBaby) {
        const stored = getStoredData();

        // Set initial data immediately with local cache for fast render
        // Preserve all locally cached data (userSettings, growthMeasurements, etc.)
        const initialData: RosieData = {
          baby: {
            // Start with locally cached baby data (avatarImage, avatarType, gender, etc.)
            ...stored?.baby,
            // Override with authoritative DB fields
            name: currentBaby.name,
            birthDate: currentBaby.birthDate,
            photoUrl: currentBaby.photoUrl,
            birthWeight: currentBaby.birthWeight,
            weightUnit: currentBaby.weightUnit,
            // If DB has a photo_url and no local avatarImage, use it
            ...(currentBaby.photoUrl && !stored?.baby?.avatarImage ? {
              avatarImage: currentBaby.photoUrl,
              avatarType: 'image' as const,
            } : {}),
          },
          timeline: stored?.timeline || [],
          chatHistory: stored?.chatHistory || [],
          caregiverNotes: stored?.caregiverNotes || [],
          activeTimer: stored?.activeTimer,
          growthMeasurements: stored?.growthMeasurements || [],
          userSettings: stored?.userSettings, // Preserve user settings from local cache
        };
        setData(initialData);
        setIsLoading(false);

        // Then fetch from Supabase in background and update
        try {
          const [events, supabaseSettings, supabaseGrowth] = await Promise.all([
            fetchEvents(user.id, currentBaby.id),
            fetchSettings(user.id),
            fetchGrowthMeasurements(user.id, currentBaby.id),
          ]);

          const updatedData: RosieData = {
            ...initialData,
            // Use Supabase events if available, otherwise keep local cache
            timeline: events.length > 0 || !stored?.timeline?.length ? events : initialData.timeline,
            // Supabase settings take priority over local cache
            userSettings: supabaseSettings || initialData.userSettings,
            // Supabase growth measurements take priority over local cache
            growthMeasurements: supabaseGrowth.length > 0 || !stored?.growthMeasurements?.length
              ? supabaseGrowth
              : initialData.growthMeasurements,
          };
          setData(updatedData);
          saveData(updatedData); // Cache locally
        } catch (err) {
          console.error('Error fetching data from Supabase:', err);
          // Keep using local data on error
        }
      } else if (!authLoading && !user) {
        setShowAuth(true);
        setIsLoading(false);
      } else if (!authLoading) {
        // Fallback to local storage for non-authenticated usage
        const stored = getStoredData();
        setData(stored);
        setIsLoading(false);
      }
    };

    loadData();
  }, [user, currentBaby, authLoading]);

  // Update banner timer display every second when timer is active
  useEffect(() => {
    if (!data?.activeTimer) {
      setBannerTimerDisplay(0);
      return;
    }

    const updateDisplay = () => {
      const now = Date.now();
      const startMs = new Date(data.activeTimer!.startTime).getTime();
      const totalSeconds = Math.floor((now - startMs) / 1000);
      setBannerTimerDisplay(totalSeconds);
    };

    updateDisplay();
    const interval = setInterval(updateDisplay, 1000);
    return () => clearInterval(interval);
  }, [data?.activeTimer]);

  // Extract last feed side from most recent breast feed event
  const lastFeedSide = useMemo(() => {
    if (!data?.timeline) return undefined;
    const lastBreastFeed = data.timeline.find(
      event => event.type === 'feed' && event.feedType === 'breast' && event.feedLastSide
    );
    return lastBreastFeed?.feedLastSide;
  }, [data?.timeline]);

  // Smart defaults for quick log pre-filling
  const smartDefaults = useMemo(
    () => data?.timeline ? getSmartDefaults(data.timeline, lastFeedSide) : undefined,
    [data?.timeline, lastFeedSide]
  );

  // Developmental info (must be above early returns for hook ordering)
  const developmentalInfo = useMemo(
    () => data?.baby ? getDevelopmentalInfo(data.baby.birthDate) : null,
    [data?.baby?.birthDate]
  );

  // Multi-day analytics (must be above early returns for hook ordering)
  const weeklySummary = useMemo(
    () => (data?.timeline && data?.baby && developmentalInfo) ? getWeeklySummary(data.timeline, data.baby.birthDate, data.baby.name, developmentalInfo) : null,
    [data?.timeline, data?.baby?.birthDate, data?.baby?.name, developmentalInfo]
  );

  const baselines = useMemo(
    () => (data?.timeline && data?.baby) ? getPersonalizedBaselines(data.timeline, data.baby.birthDate, data.baby.name) : [],
    [data?.timeline, data?.baby?.birthDate, data?.baby?.name]
  );

  const correlationInsights = useMemo(
    () => (data?.timeline && developmentalInfo && data?.baby) ? getCorrelationInsights(data.timeline, developmentalInfo, data.baby.name) : [],
    [data?.timeline, developmentalInfo, data?.baby?.name]
  );

  const isThisNormalQuestions = useMemo(
    () => (data?.timeline && data?.baby && developmentalInfo) ? getIsThisNormalQuestions(data.timeline, data.baby.birthDate, data.baby.name, developmentalInfo) : [],
    [data?.timeline, data?.baby?.birthDate, data?.baby?.name, developmentalInfo]
  );

  // Timer management handlers
  const handleStartTimer = (timer: ActiveTimer) => {
    setData(prev => {
      if (!prev) return prev;
      const updated = { ...prev, activeTimer: timer };
      saveData(updated);
      return updated;
    });
  };

  const handleStopTimer = useCallback(() => {
    setData(prev => {
      if (!prev) return prev;
      const updated = { ...prev, activeTimer: undefined };
      saveData(updated);
      return updated;
    });
  }, []);

  const handleUpdateTimer = (timer: ActiveTimer) => {
    setData(prev => {
      if (!prev) return prev;
      const updated = { ...prev, activeTimer: timer };
      saveData(updated);
      return updated;
    });
  };

  const handleOnboardingComplete = (profile: BabyProfile) => {
    const newData: RosieData = {
      baby: profile,
      timeline: [],
      chatHistory: [],
      caregiverNotes: [],
    };
    saveData(newData);
    setData(newData);
  };

  const handleAddEvent = (event: Omit<TimelineEvent, 'id' | 'timestamp'>): string => {
    const newEvent: TimelineEvent = {
      ...event,
      id: generateUUID(),
      timestamp: new Date().toISOString(),
    };

    // Optimistic update - show immediately (functional to avoid stale closure)
    setData(prev => {
      if (!prev) return prev;
      const updated = { ...prev, timeline: [newEvent, ...prev.timeline] };
      saveData(updated);
      return updated;
    });

    // Save to Supabase if authenticated (fire and forget)
    if (user && currentBaby) {
      addEvent(newEvent, user.id, currentBaby.id).then(result => {
        if (!result.success) {
          console.error('Failed to save event to Supabase:', result.error);
        }
      });
    }

    return newEvent.id;
  };

  const handleDeleteEvent = async (eventId: string) => {
    // Optimistic update - remove immediately (functional to avoid stale closure)
    setData(prev => {
      if (!prev) return prev;
      const updated = { ...prev, timeline: prev.timeline.filter(e => e.id !== eventId) };
      saveData(updated);
      return updated;
    });

    // Delete from Supabase if authenticated
    if (user) {
      const result = await deleteEventFromDB(eventId, user.id);
      if (!result.success) {
        console.error('Failed to delete event from Supabase:', result.error);
      }
    }
  };

  const handleAddMessage = (message: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    if (!data) return;

    const newMessage: ChatMessage = {
      ...message,
      id: generateUUID(),
      timestamp: new Date().toISOString(),
    };

    const updatedData = {
      ...data,
      chatHistory: [...data.chatHistory, newMessage],
    };

    saveData(updatedData);
    setData(updatedData);
  };

  const handleUpdateChatHistory = (messages: ChatMessage[]) => {
    setData(prev => {
      if (!prev) return prev;
      const updated = { ...prev, chatHistory: messages };
      saveData(updated);
      return updated;
    });
  };

  // Timer action handler — injects chat messages when modal actions complete from chat context
  const handleTimerAction = (action: TimerActionEvent) => {
    if (!modalOpenedFromChat || !data) return;

    let content = '';
    let buttons: Array<{ label: string; value: string }> | undefined;

    switch (action.type) {
      case 'feed_saved':
        if (action.details.feedType === 'breast' && action.details.side) {
          const otherSide = action.details.side === 'left' ? 'right' : 'left';
          const mins = Math.ceil((action.details.duration || 0) / 60);
          content = `Got it — ${action.details.side} side logged (${mins}m). Want to start the ${otherSide} side?`;
          buttons = [
            { label: `Start ${otherSide}`, value: `start_${otherSide}_timer` },
            { label: 'All done', value: 'dismiss' },
          ];
        } else if (action.details.feedType === 'bottle') {
          const mins = Math.ceil((action.details.duration || 0) / 60);
          content = `Got it — ${action.details.amount || ''}oz bottle logged (${mins}m).`;
        } else {
          content = `Feed logged!`;
        }
        break;
      case 'feed_discarded':
        content = `Discarded. Want to start a new feed?`;
        buttons = [
          { label: 'Start a feed', value: 'restart_feed' },
          { label: 'No thanks', value: 'dismiss' },
        ];
        break;
      case 'sleep_saved': {
        const mins = Math.ceil((action.details.duration || 0) / 60);
        content = `Sleep logged — ${mins}m. Nice.`;
        break;
      }
      case 'sleep_discarded':
        content = `Discarded. Want to start tracking sleep again?`;
        buttons = [
          { label: 'Start sleep', value: 'restart_sleep' },
          { label: 'No thanks', value: 'dismiss' },
        ];
        break;
    }

    if (content) {
      const newMsg: ChatMessage = {
        id: generateUUID(),
        role: 'assistant',
        content,
        timestamp: new Date().toISOString(),
        ...(buttons ? { metadata: { wizardButtons: buttons, wizardStepField: 'timerAction' } } : {}),
      };
      handleUpdateChatHistory([...data.chatHistory, newMsg]);
    }
  };

  // Profile handlers
  const handleUpdateBaby = (baby: BabyProfile) => {
    if (!data) return;

    const updatedData = {
      ...data,
      baby,
    };

    saveData(updatedData);
    setData(updatedData);

    // Sync to Supabase (fields that have DB columns)
    if (currentBaby?.id) {
      const dbUpdates: Partial<BabyProfile> = {};
      if (baby.name !== data.baby.name) dbUpdates.name = baby.name;
      if (baby.birthDate !== data.baby.birthDate) dbUpdates.birthDate = baby.birthDate;
      // Store avatar image in photo_url column
      if (baby.avatarType === 'image' && baby.avatarImage) {
        dbUpdates.photoUrl = baby.avatarImage;
      } else if (baby.avatarType === 'emoji' && data.baby.avatarType === 'image') {
        // Switching from image to emoji — clear photo_url
        dbUpdates.photoUrl = '';
      }
      if (Object.keys(dbUpdates).length > 0) {
        updateBabyInDb(currentBaby.id, dbUpdates);
      }
    }
  };

  const handleUpdateSettings = async (settings: UserSettings) => {
    if (!data) return;

    const updatedData = {
      ...data,
      userSettings: settings,
    };

    // Optimistic update + local cache
    saveData(updatedData);
    setData(updatedData);

    // Persist to Supabase if authenticated
    if (user) {
      const result = await saveSettings(user.id, settings);
      if (!result.success) {
        console.error('Failed to save settings to Supabase:', result.error);
      }
    }
  };

  const handleAddMeasurement = async (measurement: Omit<GrowthMeasurement, 'id' | 'timestamp'>) => {
    if (!data) return;

    const newMeasurement: GrowthMeasurement = {
      ...measurement,
      id: generateUUID(),
      timestamp: new Date().toISOString(),
    };

    const updatedData = {
      ...data,
      growthMeasurements: [newMeasurement, ...(data.growthMeasurements || [])],
    };

    // Optimistic update + local cache
    saveData(updatedData);
    setData(updatedData);

    // Persist to Supabase if authenticated
    if (user && currentBaby) {
      const result = await addGrowthMeasurement(newMeasurement, user.id, currentBaby.id);
      if (!result.success) {
        console.error('Failed to save measurement to Supabase:', result.error);
      }
    }
  };

  const handleDeleteMeasurement = async (id: string) => {
    if (!data) return;

    const updatedData = {
      ...data,
      growthMeasurements: (data.growthMeasurements || []).filter(m => m.id !== id),
    };

    // Optimistic update + local cache
    saveData(updatedData);
    setData(updatedData);

    // Delete from Supabase if authenticated
    if (user) {
      const result = await deleteGrowthMeasurement(id, user.id);
      if (!result.success) {
        console.error('Failed to delete measurement from Supabase:', result.error);
      }
    }
  };

  const handleResetData = () => {
    clearData();
    setData(null);
    setShowProfile(false);
  };

  const handleSignOut = async () => {
    await signOut();
    clearData();
    setData(null);
    setShowProfile(false);
    setShowAuth(true);
  };

  // Show skeleton loading state
  if (isLoading || authLoading) {
    return (
      <div className="rosie-container">
        <div style={{ padding: '16px', maxWidth: 600, margin: '0 auto' }}>
          {/* Skeleton greeting */}
          <div className="rosie-skeleton rosie-skeleton-title" style={{ marginTop: 56, marginBottom: 8 }} />
          <div className="rosie-skeleton rosie-skeleton-text" style={{ width: '35%', marginBottom: 20 }} />
          {/* Skeleton tabs */}
          <div className="rosie-skeleton" style={{ height: 44, borderRadius: 12, marginBottom: 20 }} />
          {/* Skeleton action cards */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
            <div className="rosie-skeleton rosie-skeleton-card" style={{ flex: 1 }} />
            <div className="rosie-skeleton rosie-skeleton-card" style={{ flex: 1 }} />
            <div className="rosie-skeleton rosie-skeleton-card" style={{ flex: 1 }} />
          </div>
          {/* Skeleton insight */}
          <div className="rosie-skeleton" style={{ height: 90, borderRadius: 16, marginBottom: 20 }} />
          {/* Skeleton events */}
          <div className="rosie-skeleton rosie-skeleton-row" />
          <div className="rosie-skeleton rosie-skeleton-row" />
          <div className="rosie-skeleton rosie-skeleton-row" />
        </div>
      </div>
    );
  }

  // Show auth screen if user needs to sign in
  if (showAuth || (!user && !data?.baby)) {
    return <RosieAuth onComplete={() => setShowAuth(false)} />;
  }

  // Show onboarding if no baby data (for non-authenticated local usage)
  if (!data?.baby) {
    return (
      <RosieOnboarding
        onComplete={handleOnboardingComplete}
        onSignIn={() => setShowAuth(true)}
      />
    );
  }

  // After the early returns above, data.baby and developmentalInfo are guaranteed non-null
  const devInfo = developmentalInfo!;

  // Handle clicking on timer banner to open the appropriate modal
  const handleBannerClick = () => {
    if (data?.activeTimer) {
      setShowQuickLogModal(data.activeTimer.type === 'feed' ? 'feed' : 'sleep');
    }
  };

  return (
    <div className={`rosie-container ${timePeriod}`}>
      <RosieHeader
        baby={data.baby}
        developmentalInfo={devInfo}
        userSettings={data.userSettings}
        onTimePeriodChange={setTimePeriod}
        onWeatherChange={setWeather}
        onProfileClick={() => setShowProfile(true)}
      />

      {/* Persistent Timer Banner - shows when timer is active */}
      {data.activeTimer && (
        <div
          className={`rosie-timer-banner ${data.activeTimer.type === 'sleep' ? 'sleep' : ''}`}
          onClick={handleBannerClick}
          role="button"
          tabIndex={0}
        >
          <div className="rosie-timer-banner-content">
            <div className="rosie-timer-banner-icon">
              {data.activeTimer.type === 'feed' ? '🍼' : '💤'}
            </div>
            <div className="rosie-timer-banner-info">
              <div className="rosie-timer-banner-label">
                {data.activeTimer.type === 'feed' ? 'Feeding' : 'Sleeping'}
              </div>
              <div className="rosie-timer-banner-time">
                {formatDuration(bannerTimerDisplay)}
              </div>
              {data.activeTimer.type === 'feed' && data.activeTimer.currentSide && (
                <div className="rosie-timer-banner-detail">
                  {data.activeTimer.currentSide.charAt(0).toUpperCase() + data.activeTimer.currentSide.slice(1)} side
                </div>
              )}
            </div>
          </div>
          <button className="rosie-timer-banner-btn">
            View
          </button>
        </div>
      )}

      {/* Greeting Hero */}
      <div className="rosie-greeting-hero">
        <h1 className="rosie-greeting-hero-title">{getGreeting(timePeriod, profile?.name)}</h1>
        <p className="rosie-greeting-hero-age">
          {data.baby.name} · Week {devInfo.weekNumber} · {devInfo.ageDisplay}
        </p>
      </div>

      {/* Tab Navigation — 3 content tabs (chat is now a floating pill) */}
      <nav className="rosie-tabs">
        <button
          className={`rosie-tab ${activeTab === 'home' && !showChat ? 'active' : ''}`}
          onClick={() => { setActiveTab('home'); setShowChat(false); }}
        >
          <span className="rosie-tab-icon">🏠</span>
          <span className="rosie-tab-label">Home</span>
        </button>
        <button
          className={`rosie-tab ${activeTab === 'timeline' && !showChat ? 'active' : ''}`}
          onClick={() => { setActiveTab('timeline'); setShowChat(false); }}
        >
          <span className="rosie-tab-icon">📅</span>
          <span className="rosie-tab-label">Timeline</span>
        </button>
        <button
          className={`rosie-tab ${activeTab === 'discover' && !showChat ? 'active' : ''}`}
          onClick={() => { setActiveTab('discover'); setShowChat(false); }}
        >
          <span className="rosie-tab-icon">🧭</span>
          <span className="rosie-tab-label">Discover</span>
        </button>
      </nav>

      {/* Main Content */}
      <main className="rosie-main">
        <div key={activeTab} className="rosie-tab-content">
          {activeTab === 'home' && (
            <RosieHome
              timeline={data.timeline}
              baby={data.baby}
              developmentalInfo={devInfo}
              timePeriod={timePeriod}
              lastFeedSide={lastFeedSide}
              catchUpData={currentBaby?.catchUpData}
              weeklySummary={weeklySummary}
              correlationInsights={correlationInsights}
              isThisNormalQuestions={isThisNormalQuestions}
              weather={weather}
              onOpenQuickLog={(type) => setShowQuickLogModal(type)}
              onNavigateTab={(tab) => { setActiveTab(tab); setShowChat(false); }}
              onUpdateCatchUp={currentBaby ? (data) => updateCatchUpData(currentBaby.id, data) : undefined}
              onAskRosie={(message) => {
                setChatInitialMessage(message);
                setPreviousTab(activeTab as 'home' | 'timeline' | 'discover');
                setShowChat(true);
              }}
            />
          )}
          {activeTab === 'timeline' && (
            <RosieTimeline
              events={data.timeline}
              baby={data.baby}
              onDeleteEvent={handleDeleteEvent}
            />
          )}
          {activeTab === 'discover' && (
            <RosieDiscover
              baby={data.baby}
              developmentalInfo={devInfo}
              weather={weather}
              timeline={data.timeline}
              weeklySummary={weeklySummary}
              baselines={baselines}
              correlationInsights={correlationInsights}
            />
          )}
        </div>
      </main>

      {/* Floating "Ask Rosie" pill — enhanced with dual-purpose label + animated dots */}
      {!showChat && (
        <div className="rosie-ask-pill-container">
          <button
            className="rosie-ask-pill-v2"
            onClick={() => {
              setPreviousTab(activeTab as 'home' | 'timeline' | 'discover');
              setShowChat(true);
            }}
          >
            <div className="rosie-ask-pill-v2-icon">💜</div>
            <div className="rosie-ask-pill-v2-text">
              <span className="rosie-ask-pill-v2-title">Chat or log with Rosie</span>
              <span className="rosie-ask-pill-v2-sub">Ask anything · Quick log feed, sleep, diaper</span>
            </div>
            <div className="rosie-ask-pill-v2-dots">
              <span className="rosie-ask-pill-dot dot-feed" />
              <span className="rosie-ask-pill-dot dot-sleep" />
              <span className="rosie-ask-pill-dot dot-diaper" />
            </div>
          </button>
        </div>
      )}

      {/* Chat overlay — fullscreen takeover, rendered outside main */}
      <RosieChat
        baby={data.baby}
        messages={data.chatHistory}
        onAddMessage={handleAddMessage}
        onUpdateHistory={handleUpdateChatHistory}
        onAddEvent={handleAddEvent}
        onDeleteEvent={handleDeleteEvent}
        timeline={data.timeline}
        developmentalInfo={devInfo}
        growthMeasurements={data.growthMeasurements}
        weather={weather}
        isOpen={showChat}
        initialMessage={chatInitialMessage}
        parentName={profile?.name ?? undefined}
        lastFeedSide={lastFeedSide}
        activeTimer={data.activeTimer}
        onStartTimer={handleStartTimer}
        onOpenQuickLogModal={(type) => {
          setModalOpenedFromChat(true);
          setShowQuickLogModal(type);
        }}
        onClose={() => {
          setShowChat(false);
          setActiveTab(previousTab);
          setChatInitialMessage(undefined);
        }}
      />

      {/* Quick Log Modals — triggered from action cards, timer banner, or timeline */}
      <RosieQuickLog
        onAddEvent={handleAddEvent}
        activeTimer={data.activeTimer || null}
        onStartTimer={handleStartTimer}
        onStopTimer={handleStopTimer}
        onUpdateTimer={handleUpdateTimer}
        lastFeedSide={lastFeedSide}
        smartDefaults={smartDefaults}
        openModal={showQuickLogModal}
        onModalClose={() => {
          setModalOpenedFromChat(false);
          setShowQuickLogModal(null);
        }}
        hideBar={true}
        fromChat={modalOpenedFromChat}
        onTimerAction={handleTimerAction}
      />

      {/* Profile Modal */}
      {showProfile && (
        <RosieProfile
          baby={data.baby}
          growthMeasurements={data.growthMeasurements || []}
          userSettings={data.userSettings}
          parentName={profile?.name ?? undefined}
          onUpdateParentName={async (name: string) => {
            await updateProfile(name);
          }}
          onUpdateBaby={handleUpdateBaby}
          onUpdateSettings={handleUpdateSettings}
          onAddMeasurement={handleAddMeasurement}
          onDeleteMeasurement={handleDeleteMeasurement}
          onClose={() => setShowProfile(false)}
          onResetData={handleResetData}
          onSignOut={handleSignOut}
        />
      )}
    </div>
  );
};

// Main export wraps with auth provider
export const RosieAI: React.FC = () => {
  return (
    <RosieAuthProvider>
      <RosieAIContent />
    </RosieAuthProvider>
  );
};

export default RosieAI;
