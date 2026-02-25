import React, { useMemo, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { BabyProfile, DevelopmentalInfo, WeatherData } from './types';
import { getLeapStatus, LeapStatus, leaps, LeapInfo } from './leapData';
import { getMilestonesForAge, MilestoneDefinition } from './milestoneData';
import { RosieMilestoneBrowser } from './RosieMilestoneBrowser';
import { RosieInsightsBrowser } from './RosieInsightsBrowser';
import {
  getParentWellnessForWeek,
  getQuickWinsForWeek,
  getInsightsForWeek,
  getStageNameForWeek,
  ExpertInsight,
  QuickWin,
  ParentWellnessContent
} from './expertInsights';

interface RosieDiscoverProps {
  baby: BabyProfile;
  developmentalInfo: DevelopmentalInfo;
  weather?: WeatherData | null;
}

export const RosieDiscover: React.FC<RosieDiscoverProps> = ({ baby, developmentalInfo, weather }) => {
  const {
    weekNumber,
    ageInWeeks,
    milestones,
    whatToExpect,
    commonConcerns,
    sleepInfo,
    feedingInfo,
    upcomingChanges,
  } = developmentalInfo;

  // Leap browser state
  const [showLeapBrowser, setShowLeapBrowser] = useState(false);
  const [selectedLeap, setSelectedLeap] = useState<LeapInfo | null>(null);

  // Milestone browser state
  const [showMilestoneBrowser, setShowMilestoneBrowser] = useState(false);

  // Insights browser state
  const [showInsightsBrowser, setShowInsightsBrowser] = useState(false);

  // Expert insights carousel state
  const [currentInsightIndex, setCurrentInsightIndex] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);

  // Get age-specific expert insights for this developmental stage
  const allInsights: ExpertInsight[] = useMemo(() => {
    return getInsightsForWeek(weekNumber);
  }, [weekNumber]);

  // Get the current stage name for display
  const stageName = useMemo(() => getStageNameForWeek(weekNumber), [weekNumber]);

  // Carousel navigation
  const nextInsight = useCallback(() => {
    setCurrentInsightIndex(prev => (prev + 1) % allInsights.length);
  }, [allInsights.length]);

  const prevInsight = useCallback(() => {
    setCurrentInsightIndex(prev => (prev - 1 + allInsights.length) % allInsights.length);
  }, [allInsights.length]);

  // Touch handlers for swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    const diff = touchStartX.current - touchEndX.current;
    const threshold = 50; // minimum swipe distance

    if (Math.abs(diff) > threshold) {
      if (diff > 0) {
        nextInsight(); // Swipe left = next
      } else {
        prevInsight(); // Swipe right = previous
      }
    }
  };

  // Get leap status
  const leapStatus: LeapStatus = useMemo(() => getLeapStatus(ageInWeeks), [ageInWeeks]);

  // Helper to get leap status for any leap
  const getLeapStatusLabel = (leap: LeapInfo): { label: string; className: string } => {
    if (ageInWeeks < leap.startWeek) {
      return { label: 'Upcoming', className: 'upcoming' };
    } else if (ageInWeeks >= leap.startWeek && ageInWeeks <= leap.endWeek) {
      return { label: 'Current', className: 'current' };
    } else {
      return { label: 'Completed', className: 'completed' };
    }
  };

  // Format weeks to months display
  const formatWeeksToAge = (weeks: number): string => {
    if (weeks < 4) return `${weeks} weeks`;
    const months = Math.floor(weeks / 4.33);
    if (months < 1) return `${weeks} weeks`;
    if (months === 1) return '~1 month';
    return `~${months} months`;
  };

  // Get parent wellness content
  const wellnessContent: ParentWellnessContent | null = useMemo(
    () => getParentWellnessForWeek(weekNumber),
    [weekNumber]
  );

  // Get quick wins
  const quickWins: QuickWin[] = useMemo(
    () => getQuickWinsForWeek(weekNumber),
    [weekNumber]
  );

  // Generate a summary intro based on the week and leap status
  const getWeekIntro = (): string => {
    if (leapStatus.isInLeap && leapStatus.currentLeap) {
      if (leapStatus.leapPhase === 'peak') {
        return `${baby.name} is in the peak of Leap ${leapStatus.currentLeap.leapNumber}. Extra fussiness is completely normal right now. This will pass.`;
      } else if (leapStatus.leapPhase === 'starting') {
        return `${baby.name} may be entering Leap ${leapStatus.currentLeap.leapNumber}. Watch for extra clinginess or fussiness in the coming days.`;
      } else {
        return `${baby.name} is working through Leap ${leapStatus.currentLeap.leapNumber}. The hard part is almost over, and amazing new skills are emerging.`;
      }
    }

    if (leapStatus.isSunnyPeriod) {
      return `${baby.name} is in a "sunny" period between leaps! Enjoy this calmer time - they're consolidating new skills.`;
    }

    // Default intros by week range
    if (weekNumber <= 2) {
      return `${baby.name} is in the "newborn cocoon" phase. Focus on feeding, bonding, and rest. Everything else can wait.`;
    } else if (weekNumber <= 4) {
      return `${baby.name} is becoming more alert and may start showing social smiles soon. You're doing great.`;
    } else if (weekNumber <= 6) {
      return `This can be a challenging time with peak fussiness. Remember: this phase is temporary. You've got this.`;
    } else if (weekNumber <= 8) {
      return `${baby.name} is becoming more interactive and engaged. The hardest newborn weeks are behind you.`;
    } else if (weekNumber <= 12) {
      return `${baby.name} is approaching the end of the "fourth trimester." Patterns are emerging and things are getting easier.`;
    } else if (weekNumber <= 16) {
      return `${baby.name} may be going through a sleep regression as their brain matures. This is progress, not a setback.`;
    } else if (weekNumber <= 26) {
      return `${baby.name} is becoming more active and curious about the world. Solid foods may be on the horizon.`;
    } else if (weekNumber <= 39) {
      return `${baby.name} is likely on the move! Baby-proofing is your friend. This is such a fun age.`;
    } else {
      return `${baby.name} is approaching their first birthday! What an incredible journey you've been on together.`;
    }
  };

  // Get leap phase display
  const getLeapPhaseDisplay = (): { label: string; color: string } => {
    switch (leapStatus.leapPhase) {
      case 'starting':
        return { label: 'Leap Starting', color: 'var(--rosie-orange)' };
      case 'peak':
        return { label: 'Peak Fussiness', color: 'var(--rosie-red)' };
      case 'ending':
        return { label: 'Leap Ending', color: 'var(--rosie-green)' };
      case 'sunny':
        return { label: 'Sunny Period', color: 'var(--rosie-blue)' };
      default:
        return { label: '', color: '' };
    }
  };

  const leapPhaseDisplay = getLeapPhaseDisplay();

  // Milestone skill tree data
  const milestoneTree = useMemo(() => {
    const { current, upcoming, past } = getMilestonesForAge(ageInWeeks);
    // Show last 2 completed, all current (emerging), and first 2 upcoming
    const done = past.slice(-2);
    const emerging = current.slice(0, 3);
    const next = upcoming.slice(0, 2);
    return { done, emerging, next };
  }, [ageInWeeks]);

  // Weather-aware activity suggestion
  const weatherSuggestion = useMemo(() => {
    if (!weather) return null;
    const condition = weather.condition?.toLowerCase() || '';
    const temp = weather.temperature;

    if (condition.includes('rain') || condition.includes('storm') || condition.includes('drizzle')) {
      return {
        icon: '🌧️',
        title: 'Indoor day today',
        text: `Rain expected. Try the mirror play activity from today's plan — great for social development and no gear needed.`,
        style: 'weather' as const,
      };
    }
    if (condition.includes('snow') || condition.includes('sleet') || condition.includes('ice')) {
      return {
        icon: '❄️',
        title: 'Cozy day inside',
        text: `Snowy outside. Perfect for tummy time near a window — ${baby.name} will love watching the snow fall.`,
        style: 'weather' as const,
      };
    }
    if (temp > 90) {
      return {
        icon: '🥵',
        title: 'Too hot for outdoor play',
        text: `${temp}° today. Stay inside during peak hours. Water play in the bathtub is a great sensory activity.`,
        style: 'weather' as const,
      };
    }
    if (temp < 32) {
      return {
        icon: '🥶',
        title: 'Bundle up or stay in',
        text: `${temp}° outside. If you venture out, keep trips short. Indoor dance time is great for gross motor skills.`,
        style: 'weather' as const,
      };
    }
    if (condition.includes('clear') || condition.includes('sunny') || condition.includes('fair')) {
      return {
        icon: '☀️',
        title: 'Great day for outside time',
        text: `${temp}° and clear. A short walk or outdoor tummy time would be wonderful for ${baby.name}.`,
        style: 'weather-good' as const,
      };
    }
    if (condition.includes('cloud') || condition.includes('overcast')) {
      return {
        icon: '⛅',
        title: 'Nice for a stroller walk',
        text: `${temp}° and cloudy — perfect stroller weather. Fresh air is good for both of you.`,
        style: 'weather-good' as const,
      };
    }
    return null;
  }, [weather, baby.name]);

  return (
    <div className="rosie-development">
      {/* Week Badge — wireframe: simple inline pill */}
      <div className="tw-week-badge">
        🌱 Week {weekNumber}
        {leapStatus.isInLeap && leapStatus.currentLeap && ` · Leap ${leapStatus.currentLeap.leapNumber} in progress`}
        {leapStatus.isSunnyPeriod && leapStatus.nextLeap && ` · Leap ${leapStatus.nextLeap.leapNumber} coming soon`}
      </div>

      {/* Leap Card — wireframe: title, subtitle, progress bar, signs only */}
      {(leapStatus.isInLeap && leapStatus.currentLeap) && (
        <div className="tw-section">
          <div className="tw-card">
            <div className="tw-card-title">🧠 Leap {leapStatus.currentLeap.leapNumber} — {leapStatus.currentLeap.name}</div>
            <div className="tw-card-subtitle">{leapStatus.currentLeap.description}</div>
            <div className="tw-progress-meta">
              <span>Week {weekNumber} of {leapStatus.currentLeap.endWeek}</span>
              <span>{leapStatus.progressThroughLeap}%</span>
            </div>
            <div className="tw-progress-track">
              <div className="tw-progress-fill" style={{ width: `${leapStatus.progressThroughLeap}%` }} />
            </div>
            <div className="tw-signs-section">
              <div className="tw-signs-label">Signs You Might Notice</div>
              <ul className="tw-list">
                {leapStatus.currentLeap.signsOfLeap.map((sign, i) => (
                  <li key={i} className="purple">{sign}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Sunny Period — show next leap card preview */}
      {leapStatus.isSunnyPeriod && leapStatus.nextLeap && leapStatus.daysUntilNextLeap && (
        <div className="tw-section">
          <div className="tw-card">
            <div className="tw-card-title">🧠 Leap {leapStatus.nextLeap.leapNumber} — {leapStatus.nextLeap.name}</div>
            <div className="tw-card-subtitle">{leapStatus.nextLeap.description}</div>
            <div className="tw-progress-meta">
              <span>Starts in ~{leapStatus.daysUntilNextLeap} days</span>
              <span>☀️ Sunny period</span>
            </div>
            <div className="tw-progress-track">
              <div className="tw-progress-fill" style={{ width: '0%' }} />
            </div>
            <div className="tw-signs-section">
              <div className="tw-signs-label">Signs You Might Notice</div>
              <ul className="tw-list">
                {leapStatus.nextLeap.signsOfLeap.map((sign, i) => (
                  <li key={i} className="purple">{sign}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* No leap and no sunny period */}
      {!leapStatus.isInLeap && !leapStatus.isSunnyPeriod && (
        <div className="tw-section">
          <div className="tw-card">
            <div className="tw-card-title">🧠 Wonder Weeks</div>
            <div className="tw-card-subtitle">
              Babies go through 10 major mental "leaps" that can cause temporary fussiness followed by new skills.
            </div>
          </div>
        </div>
      )}

      {/* View All 10 Leaps — associated with leap section above */}
      <div className="tw-section" style={{ textAlign: 'center' }}>
        <button
          className="tw-leaps-link"
          onClick={() => setShowLeapBrowser(true)}
        >
          <div className="tw-leaps-link-title">📚 View All 10 Leaps</div>
          <div className="tw-leaps-link-subtitle">See the full developmental timeline</div>
        </button>
      </div>

      {/* Milestone Skill Tree */}
      {(milestoneTree.done.length > 0 || milestoneTree.emerging.length > 0 || milestoneTree.next.length > 0) && (
        <div className="tw-section">
          <div className="tw-section-hdr">
            <div className="tw-section-title">Milestones</div>
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

          {/* View All Milestones — matches leap button style */}
          <div style={{ textAlign: 'center', marginTop: '12px' }}>
            <button
              className="tw-milestones-link"
              onClick={() => setShowMilestoneBrowser(true)}
            >
              <div className="tw-milestones-link-title">🌟 View All Milestones</div>
              <div className="tw-milestones-link-subtitle">Track and check off developmental milestones</div>
            </button>
          </div>
        </div>
      )}

      {/* Weather-Aware Suggestion */}
      {weatherSuggestion ? (
        <div className="tw-section">
          <div className={`rosie-weather-alert ${weatherSuggestion.style}`}>
            <div className="rosie-weather-icon">{weatherSuggestion.icon}</div>
            <div className="rosie-weather-content">
              <div className="rosie-weather-title">{weatherSuggestion.title}</div>
              <div className="rosie-weather-text">{weatherSuggestion.text}</div>
            </div>
          </div>
        </div>
      ) : !weather ? (
        <div className="tw-section">
          <div className="rosie-weather-prompt">
            🌦️ Share your location in settings to get weather-aware activity suggestions
          </div>
        </div>
      ) : null}

      {/* For You — wireframe: section header + green wellness card */}
      {wellnessContent && (
        <div className="tw-section">
          <div className="tw-section-hdr">
            <div className="tw-section-title">For You</div>
          </div>
          <div className="tw-wellness">
            <div className="tw-card-title">💚 Not Just Baby</div>
            <div className="tw-wellness-text">
              {wellnessContent.permissionSlip}
            </div>
            <div className="tw-wellness-onething">
              <strong>One thing today:</strong> {wellnessContent.oneThingToday}
            </div>
          </div>
        </div>
      )}

      {/* Quick Wins — wireframe: section header + stacked icon+text rows */}
      {quickWins.length > 0 && (
        <div className="tw-section">
          <div className="tw-section-hdr">
            <div className="tw-section-title">Quick Wins</div>
          </div>
          {quickWins.map((win, i) => (
            <div key={i} className="tw-quickwin">
              <div className="tw-quickwin-icon">🎯</div>
              <div className="tw-quickwin-content">
                <div className="tw-quickwin-title">{win.activity}</div>
                <div className="tw-quickwin-detail">{win.duration} · {win.benefit}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* What's Typical — wireframe: section header + 2x2 info grid */}
      <div className="tw-section">
        <div className="tw-section-hdr">
          <div className="tw-section-title">What's Typical</div>
        </div>
        <div className="tw-info-grid">
          <div className="tw-info-item">
            <div className="tw-info-label">Total Sleep</div>
            <div className="tw-info-value">{sleepInfo.totalSleep}</div>
          </div>
          <div className="tw-info-item">
            <div className="tw-info-label">Naps</div>
            <div className="tw-info-value">{sleepInfo.napCount}</div>
          </div>
          <div className="tw-info-item">
            <div className="tw-info-label">Wake Window</div>
            <div className="tw-info-value">{sleepInfo.wakeWindow}</div>
          </div>
          <div className="tw-info-item">
            <div className="tw-info-label">Feeds</div>
            <div className="tw-info-value">{feedingInfo.frequency}</div>
          </div>
        </div>
      </div>

      {/* Milestones — wireframe: section header + list with green dots */}
      {milestones.length > 0 && (
        <div className="tw-section">
          <div className="tw-section-hdr">
            <div className="tw-section-title">Milestones</div>
          </div>
          <div className="tw-card">
            <ul className="tw-list">
              {milestones.map((item, i) => (
                <li key={i} className="green">{item}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Expert Insights — wireframe: section header with "All →" + gradient card + dots */}
      {allInsights.length > 0 && (
        <div className="tw-section">
          <div className="tw-section-hdr">
            <div className="tw-section-title">Expert Insights</div>
            <button className="tw-section-link" onClick={() => setShowInsightsBrowser(true)}>All →</button>
          </div>
          <div
            className="tw-insight-card"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            ref={carouselRef}
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

          {/* View All Expert Insights — matches leap/milestone button style */}
          <div style={{ textAlign: 'center', marginTop: '12px' }}>
            <button
              className="tw-insights-link"
              onClick={() => setShowInsightsBrowser(true)}
            >
              <div className="tw-insights-link-title">📊 View All Expert Insights</div>
              <div className="tw-insights-link-subtitle">Research-backed guidance for every stage</div>
            </button>
          </div>
        </div>
      )}

      {/* Common Concerns — wireframe: section header + list with orange dots */}
      {commonConcerns.length > 0 && (
        <div className="tw-section">
          <div className="tw-section-hdr">
            <div className="tw-section-title">Common Concerns</div>
          </div>
          <div className="tw-card">
            <ul className="tw-list">
              {commonConcerns.map((item, i) => (
                <li key={i} className="orange">{item}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Coming Up — wireframe: section header + card with subtitle + list */}
      {upcomingChanges.length > 0 && (
        <div className="tw-section">
          <div className="tw-section-hdr">
            <div className="tw-section-title">Coming Up</div>
          </div>
          <div className="tw-card">
            <div className="tw-card-subtitle">In the next few weeks, you can expect:</div>
            <ul className="tw-list">
              {upcomingChanges.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Leap Browser Modal — portal to body to escape transform containing block */}
      {showLeapBrowser && createPortal(
        <div className="rosie-modal-overlay" onClick={() => { setShowLeapBrowser(false); setSelectedLeap(null); }}>
          <div className="rosie-modal rosie-modal-leap-browser" onClick={e => e.stopPropagation()}>
            <div className="rosie-modal-header">
              <h2 className="rosie-modal-title">
                {selectedLeap ? `Leap ${selectedLeap.leapNumber}` : 'The 10 Wonder Weeks Leaps'}
              </h2>
              <button
                className="rosie-modal-close"
                onClick={() => { setShowLeapBrowser(false); setSelectedLeap(null); }}
              >
                ×
              </button>
            </div>

            <div className="rosie-modal-content">
              {!selectedLeap ? (
                // Leap list view
                <>
                  <p className="rosie-leap-browser-intro">
                    Based on "The Wonder Weeks" by Hetty van de Rijt & Frans Plooij.
                    Each leap represents a major shift in how your baby perceives the world.
                  </p>

                  {/* Timeline visualization */}
                  <div className="rosie-leap-timeline">
                    <div className="rosie-leap-timeline-track">
                      <div
                        className="rosie-leap-timeline-progress"
                        style={{ width: `${Math.min(100, (ageInWeeks / 76) * 100)}%` }}
                      />
                      <div
                        className="rosie-leap-timeline-marker"
                        style={{ left: `${Math.min(100, (ageInWeeks / 76) * 100)}%` }}
                      >
                        <span>Week {weekNumber}</span>
                      </div>
                    </div>
                    <div className="rosie-leap-timeline-labels">
                      <span>Birth</span>
                      <span>~20 months</span>
                    </div>
                  </div>

                  <div className="rosie-leap-list">
                    {leaps.map((leap) => {
                      const status = getLeapStatusLabel(leap);
                      return (
                        <button
                          key={leap.leapNumber}
                          className={`rosie-leap-list-item ${status.className}`}
                          onClick={() => setSelectedLeap(leap)}
                        >
                          <div className="rosie-leap-list-number">
                            {status.className === 'completed' ? '✓' : leap.leapNumber}
                          </div>
                          <div className="rosie-leap-list-info">
                            <h4 className="rosie-leap-list-name">{leap.name}</h4>
                            <p className="rosie-leap-list-weeks">
                              Weeks {leap.startWeek}–{leap.endWeek} ({formatWeeksToAge(leap.startWeek)} – {formatWeeksToAge(leap.endWeek)})
                            </p>
                          </div>
                          <div className={`rosie-leap-list-status ${status.className}`}>
                            {status.label}
                          </div>
                          <div className="rosie-leap-list-arrow">›</div>
                        </button>
                      );
                    })}
                  </div>
                </>
              ) : (
                // Selected leap detail view
                <>
                  <button
                    className="rosie-leap-back-btn"
                    onClick={() => setSelectedLeap(null)}
                  >
                    ← Back to all leaps
                  </button>

                  <div className="rosie-leap-detail">
                    <div className="rosie-leap-detail-header">
                      <div className="rosie-leap-detail-icon">🧠</div>
                      <div>
                        <h3 className="rosie-leap-detail-title">{selectedLeap.name}</h3>
                        <p className="rosie-leap-detail-subtitle">{selectedLeap.subtitle}</p>
                      </div>
                    </div>

                    <div className="rosie-leap-detail-meta">
                      <div className="rosie-leap-detail-meta-item">
                        <span className="rosie-leap-detail-meta-label">When</span>
                        <span className="rosie-leap-detail-meta-value">
                          Weeks {selectedLeap.startWeek}–{selectedLeap.endWeek}
                        </span>
                      </div>
                      <div className="rosie-leap-detail-meta-item">
                        <span className="rosie-leap-detail-meta-label">Age</span>
                        <span className="rosie-leap-detail-meta-value">
                          {formatWeeksToAge(selectedLeap.startWeek)} – {formatWeeksToAge(selectedLeap.endWeek)}
                        </span>
                      </div>
                      <div className="rosie-leap-detail-meta-item">
                        <span className="rosie-leap-detail-meta-label">Peak</span>
                        <span className="rosie-leap-detail-meta-value">
                          Week {selectedLeap.peakWeek}
                        </span>
                      </div>
                    </div>

                    <p className="rosie-leap-detail-description">{selectedLeap.description}</p>

                    <div className="rosie-leap-detail-section">
                      <h4>What Baby Is Learning</h4>
                      <ul>
                        {selectedLeap.whatBabyLearns.map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="rosie-leap-detail-section">
                      <h4>Signs You Might Notice</h4>
                      <ul>
                        {selectedLeap.signsOfLeap.map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="rosie-leap-detail-section">
                      <h4>How to Help</h4>
                      <ul>
                        {selectedLeap.howToHelp.map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="rosie-leap-detail-section rosie-leap-detail-skills">
                      <h4>New Skills After This Leap</h4>
                      <ul>
                        {selectedLeap.newSkillsAfter.map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Navigation between leaps */}
                  <div className="rosie-leap-nav">
                    {selectedLeap.leapNumber > 1 && (
                      <button
                        className="rosie-leap-nav-btn"
                        onClick={() => setSelectedLeap(leaps[selectedLeap.leapNumber - 2])}
                      >
                        ← Leap {selectedLeap.leapNumber - 1}
                      </button>
                    )}
                    {selectedLeap.leapNumber < 10 && (
                      <button
                        className="rosie-leap-nav-btn rosie-leap-nav-btn-next"
                        onClick={() => setSelectedLeap(leaps[selectedLeap.leapNumber])}
                      >
                        Leap {selectedLeap.leapNumber + 1} →
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Milestone Browser Modal */}
      <RosieMilestoneBrowser
        isOpen={showMilestoneBrowser}
        onClose={() => setShowMilestoneBrowser(false)}
        baby={baby}
        ageInWeeks={ageInWeeks}
      />

      {/* Expert Insights Browser Modal */}
      <RosieInsightsBrowser
        isOpen={showInsightsBrowser}
        onClose={() => setShowInsightsBrowser(false)}
        ageInWeeks={ageInWeeks}
      />
    </div>
  );
};

export default RosieDiscover;
