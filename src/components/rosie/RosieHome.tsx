import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { TimelineEvent, BabyProfile, DevelopmentalInfo } from './types';
import { TimePeriod } from './RosieHeader';
import { getActionCards, getInsightsForCarousel, getTodayEvents, getTodayStats, getExpectedValues } from './contextEngine';
import { getNormalRangesForAge } from './reassuranceMessages';

interface RosieHomeProps {
  timeline: TimelineEvent[];
  baby: BabyProfile;
  developmentalInfo: DevelopmentalInfo;
  timePeriod: TimePeriod;
  lastFeedSide?: string;
  onOpenQuickLog: (type: 'feed' | 'sleep' | 'diaper') => void;
  onNavigateTab: (tab: 'timeline' | 'development') => void;
}

// Mini progress ring component
const MiniRing: React.FC<{
  value: number;
  max: number;
  color: string;
  label: string;
  displayValue: string;
}> = ({ value, max, color, label, displayValue }) => {
  const size = 72;
  const strokeWidth = 7;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(value / (max || 1), 1);
  const offset = circumference * (1 - progress);

  return (
    <div className="rosie-home-stat-ring">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          opacity={0.12}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 0.6s cubic-bezier(0.05, 0.7, 0.1, 1)' }}
        />
      </svg>
      <div className="rosie-home-stat-ring-center">
        <div className="rosie-home-stat-ring-value">{displayValue}</div>
        <div className="rosie-home-stat-ring-label">{label}</div>
      </div>
    </div>
  );
};

export const RosieHome: React.FC<RosieHomeProps> = ({
  timeline,
  baby,
  developmentalInfo,
  timePeriod,
  lastFeedSide,
  onOpenQuickLog,
  onNavigateTab,
}) => {
  const actionCards = useMemo(
    () => getActionCards(timeline, lastFeedSide),
    [timeline, lastFeedSide]
  );

  const insights = useMemo(
    () => getInsightsForCarousel(developmentalInfo, baby.name, 5),
    [developmentalInfo, baby.name]
  );

  // Carousel state
  const [currentInsight, setCurrentInsight] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const autoPlayRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const touchStartRef = useRef<number>(0);

  // Auto-advance carousel every 5 seconds
  const startAutoPlay = useCallback(() => {
    if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    if (insights.length <= 1) return;
    autoPlayRef.current = setInterval(() => {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentInsight(prev => (prev + 1) % insights.length);
        setIsTransitioning(false);
      }, 200);
    }, 5000);
  }, [insights.length]);

  useEffect(() => {
    startAutoPlay();
    return () => { if (autoPlayRef.current) clearInterval(autoPlayRef.current); };
  }, [startAutoPlay]);

  const goToInsight = useCallback((index: number) => {
    if (index === currentInsight) return;
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentInsight(index);
      setIsTransitioning(false);
    }, 200);
    startAutoPlay(); // Reset timer on manual interaction
  }, [currentInsight, startAutoPlay]);

  // Swipe support
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartRef.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const diff = touchStartRef.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      const nextIndex = diff > 0
        ? (currentInsight + 1) % insights.length
        : (currentInsight - 1 + insights.length) % insights.length;
      goToInsight(nextIndex);
    }
  }, [currentInsight, insights.length, goToInsight]);

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

  const babyAgeWeeks = useMemo(() => {
    const birth = new Date(baby.birthDate);
    const now = new Date();
    return Math.floor((now.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24 * 7));
  }, [baby.birthDate]);

  const normalRanges = useMemo(
    () => getNormalRangesForAge(babyAgeWeeks),
    [babyAgeWeeks]
  );

  // Format sleep minutes for display
  const sleepDisplay = useMemo(() => {
    const h = Math.floor(todayStats.sleepMinutes / 60);
    const m = todayStats.sleepMinutes % 60;
    if (h > 0 && m > 0) return `${h}h${m}m`;
    if (h > 0) return `${h}h`;
    return `${m}m`;
  }, [todayStats.sleepMinutes]);

  return (
    <div className="rosie-home">
      {/* Quick Log Action Cards */}
      <section className="rosie-home-section">
        <div className="rosie-home-section-header">
          <h2 className="rosie-home-section-title">Quick Log</h2>
        </div>
        <div className="rosie-home-action-cards">
          {actionCards.map(card => (
            <button
              key={card.type}
              className="rosie-home-action-card"
              onClick={() => onOpenQuickLog(card.type)}
            >
              <div
                className="rosie-home-card-accent"
                style={{ background: `linear-gradient(90deg, ${card.gradientFrom}, ${card.gradientTo})` }}
              />
              <div className="rosie-home-card-icon">{card.icon}</div>
              <div className="rosie-home-card-label">{card.label}</div>
              <div className="rosie-home-card-value" style={{ color: card.color }}>
                {card.timeAgo}
              </div>
              <div className="rosie-home-card-detail">{card.detail}</div>
              <div
                className="rosie-home-card-action"
                style={{ background: card.actionBg }}
              >
                {card.actionLabel}
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* This Week Carousel */}
      <section className="rosie-home-section">
        <div className="rosie-home-section-header">
          <h2 className="rosie-home-section-title">This Week</h2>
          <button
            className="rosie-home-section-link"
            onClick={() => onNavigateTab('development')}
          >
            More →
          </button>
        </div>
        <div
          className="rosie-home-insight-carousel"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <div className={`rosie-home-insight-card ${isTransitioning ? 'transitioning' : ''}`}>
            <div className="rosie-home-insight-cat">
              {insights[currentInsight]?.icon} {insights[currentInsight]?.weekLabel} · {insights[currentInsight]?.category}
            </div>
            <div className="rosie-home-insight-text">
              {insights[currentInsight]?.text}
            </div>
            <button
              className="rosie-home-insight-more"
              onClick={() => onNavigateTab('development')}
            >
              Read more →
            </button>
          </div>
          {insights.length > 1 && (
            <div className="rosie-home-carousel-dots">
              {insights.map((_, i) => (
                <button
                  key={i}
                  className={`rosie-home-carousel-dot ${i === currentInsight ? 'active' : ''}`}
                  onClick={() => goToInsight(i)}
                  aria-label={`Go to insight ${i + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Today's Stats */}
      <section className="rosie-home-section">
        <div className="rosie-home-section-header">
          <h2 className="rosie-home-section-title">Today's Stats</h2>
        </div>
        <div className="rosie-home-stats-rings">
          <MiniRing
            value={todayStats.feedCount}
            max={expected.feeds}
            color="#FF9500"
            label="Feeds"
            displayValue={String(todayStats.feedCount)}
          />
          <MiniRing
            value={todayStats.sleepMinutes}
            max={expected.sleepMinutes}
            color="#B57BEC"
            label="Sleep"
            displayValue={sleepDisplay}
          />
          <MiniRing
            value={todayStats.diaperCount}
            max={expected.diapers}
            color="#30D158"
            label="Diapers"
            displayValue={String(todayStats.diaperCount)}
          />
        </div>
        <div className="rosie-home-normal">
          <div className="rosie-home-normal-title">
            What's normal at {babyAgeWeeks} weeks
          </div>
          <div className="rosie-home-normal-items">
            <div className="rosie-home-normal-item">
              <span className="rosie-home-normal-range" style={{ color: '#FF9500' }}>
                {normalRanges.feeds.range}
              </span>
              <span className="rosie-home-normal-label">{normalRanges.feeds.label}</span>
            </div>
            <div className="rosie-home-normal-item">
              <span className="rosie-home-normal-range" style={{ color: '#B57BEC' }}>
                {normalRanges.sleep.range}
              </span>
              <span className="rosie-home-normal-label">{normalRanges.sleep.label}</span>
            </div>
            <div className="rosie-home-normal-item">
              <span className="rosie-home-normal-range" style={{ color: '#30D158' }}>
                {normalRanges.diapers.range}
              </span>
              <span className="rosie-home-normal-label">{normalRanges.diapers.label}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Today's Events */}
      <section className="rosie-home-section">
        <div className="rosie-home-section-header">
          <h2 className="rosie-home-section-title">Today</h2>
          <button
            className="rosie-home-section-link"
            onClick={() => onNavigateTab('timeline')}
          >
            All →
          </button>
        </div>
        {todayEvents.length === 0 ? (
          <div className="rosie-home-empty">
            No events yet today. Tap a card above to get started.
          </div>
        ) : (
          <div className="rosie-home-events">
            {todayEvents.map(event => (
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
    </div>
  );
};

export default RosieHome;
