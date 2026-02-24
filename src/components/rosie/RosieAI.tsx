import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { RosieAuthProvider, useRosieAuth } from './RosieAuthContext';
import { RosieAuth } from './RosieAuth';
import { RosieOnboarding } from './RosieOnboarding';
import { RosieTimeline } from './RosieTimeline';
import { RosieChat } from './RosieChat';
import { RosieDevelopment } from './RosieDevelopment';
import { RosieHome } from './RosieHome';
import { RosieHeader, TimePeriod, getTimePeriod, getGreeting } from './RosieHeader';
import { RosieQuickLog } from './RosieQuickLog';
import { RosieProfile } from './RosieProfile';
import { RosieData, BabyProfile, TimelineEvent, ChatMessage, ActiveTimer, GrowthMeasurement, UserSettings } from './types';
import { getStoredData, saveData, clearData } from './storage';
import { getDevelopmentalInfo } from './developmentalData';
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
  const { user, currentBaby, profile, loading: authLoading, signOut, updateProfile, updateBaby: updateBabyInDb } = useRosieAuth();
  const [data, setData] = useState<RosieData | null>(null);
  const [activeTab, setActiveTab] = useState<'home' | 'timeline' | 'development' | 'chat'>('home');
  const [showChat, setShowChat] = useState(false);
  const [previousTab, setPreviousTab] = useState<'home' | 'timeline' | 'development'>('home');
  const [isLoading, setIsLoading] = useState(true);
  const [bannerTimerDisplay, setBannerTimerDisplay] = useState(0);
  const [showQuickLogModal, setShowQuickLogModal] = useState<'feed' | 'sleep' | 'diaper' | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [timePeriod, setTimePeriod] = useState<TimePeriod>(() => getTimePeriod(new Date().getHours()));
  const [showAuth, setShowAuth] = useState(false);
  const [weather, setWeather] = useState<import('./types').WeatherData | null>(null);

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
        // Not authenticated, show auth screen
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

  // Timer management handlers
  const handleStartTimer = (timer: ActiveTimer) => {
    if (!data) return;
    const updatedData = {
      ...data,
      activeTimer: timer,
    };
    saveData(updatedData);
    setData(updatedData);
  };

  const handleStopTimer = useCallback(() => {
    if (!data) return;
    const updatedData = {
      ...data,
      activeTimer: undefined,
    };
    saveData(updatedData);
    setData(updatedData);
  }, [data]);

  const handleUpdateTimer = (timer: ActiveTimer) => {
    if (!data) return;
    const updatedData = {
      ...data,
      activeTimer: timer,
    };
    saveData(updatedData);
    setData(updatedData);
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

  const handleAddEvent = async (event: Omit<TimelineEvent, 'id' | 'timestamp'>) => {
    if (!data) return;

    const newEvent: TimelineEvent = {
      ...event,
      id: generateUUID(),
      timestamp: new Date().toISOString(),
    };

    // Optimistic update - show immediately
    const updatedData = {
      ...data,
      timeline: [newEvent, ...data.timeline],
    };
    setData(updatedData);
    saveData(updatedData); // Cache locally

    // Save to Supabase if authenticated
    if (user && currentBaby) {
      const result = await addEvent(newEvent, user.id, currentBaby.id);
      if (!result.success) {
        console.error('Failed to save event to Supabase:', result.error);
        // Event is still in local state/cache, will sync later
      }
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!data) return;

    // Optimistic update - remove immediately
    const updatedData = {
      ...data,
      timeline: data.timeline.filter(event => event.id !== eventId),
    };
    setData(updatedData);
    saveData(updatedData);

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
    if (!data) return;

    const updatedData = {
      ...data,
      chatHistory: messages,
    };

    saveData(updatedData);
    setData(updatedData);
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

  const developmentalInfo = getDevelopmentalInfo(data.baby.birthDate);

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
        developmentalInfo={developmentalInfo}
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
          {data.baby.name} · Week {developmentalInfo.weekNumber} · {developmentalInfo.ageDisplay}
        </p>
      </div>

      {/* Tab Navigation */}
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
          className={`rosie-tab ${activeTab === 'development' && !showChat ? 'active' : ''}`}
          onClick={() => { setActiveTab('development'); setShowChat(false); }}
        >
          <span className="rosie-tab-icon">🌱</span>
          <span className="rosie-tab-label">This Week</span>
        </button>
        <button
          className={`rosie-tab ${showChat ? 'active' : ''}`}
          onClick={() => {
            if (!showChat) {
              setPreviousTab(activeTab === 'chat' ? 'home' : activeTab as 'home' | 'timeline' | 'development');
            }
            setShowChat(true);
          }}
        >
          <span className="rosie-tab-icon">💬</span>
          <span className="rosie-tab-label">Ask Rosie</span>
        </button>
      </nav>

      {/* Main Content */}
      <main className="rosie-main">
        <div key={activeTab} className="rosie-tab-content">
          {activeTab === 'home' && (
            <RosieHome
              timeline={data.timeline}
              baby={data.baby}
              developmentalInfo={developmentalInfo}
              timePeriod={timePeriod}
              lastFeedSide={lastFeedSide}
              onOpenQuickLog={(type) => setShowQuickLogModal(type)}
              onNavigateTab={(tab) => { setActiveTab(tab); setShowChat(false); }}
            />
          )}
          {activeTab === 'timeline' && (
            <RosieTimeline
              events={data.timeline}
              baby={data.baby}
              onDeleteEvent={handleDeleteEvent}
            />
          )}
          {activeTab === 'development' && (
            <RosieDevelopment
              baby={data.baby}
              developmentalInfo={developmentalInfo}
            />
          )}
        </div>
      </main>

      {/* Chat overlay — fullscreen takeover, rendered outside main */}
      <RosieChat
        baby={data.baby}
        messages={data.chatHistory}
        onAddMessage={handleAddMessage}
        onUpdateHistory={handleUpdateChatHistory}
        timeline={data.timeline}
        developmentalInfo={developmentalInfo}
        growthMeasurements={data.growthMeasurements}
        weather={weather}
        isOpen={showChat}
        onClose={() => {
          setShowChat(false);
          setActiveTab(previousTab);
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
        openModal={showQuickLogModal}
        onModalClose={() => setShowQuickLogModal(null)}
        hideBar={true}
      />

      {/* Profile Modal */}
      {showProfile && (
        <RosieProfile
          baby={data.baby}
          growthMeasurements={data.growthMeasurements || []}
          userSettings={data.userSettings}
          parentName={profile?.name}
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
