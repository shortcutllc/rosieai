import React, { useState, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ageSpecificInsights, ExpertInsight, AgeStageInsights } from './expertInsights';

interface RosieInsightsBrowserProps {
  isOpen: boolean;
  onClose: () => void;
  ageInWeeks: number;
}

// Memoized row for each insight
const InsightRow: React.FC<{
  insight: ExpertInsight;
}> = React.memo(({ insight }) => {
  const sourceIcon = insight.sourceType === 'research' ? '📊' : insight.sourceType === 'aap' ? '🏥' : '👩‍⚕️';

  return (
    <div className="rosie-insight-row">
      <div className="rosie-insight-row-topic">
        <span className="rosie-insight-row-icon">{sourceIcon}</span>
        {insight.topic}
      </div>
      <div className="rosie-insight-row-text">{insight.insight}</div>
      <div className="rosie-insight-row-source">— {insight.source}</div>
    </div>
  );
});

export const RosieInsightsBrowser: React.FC<RosieInsightsBrowserProps> = ({
  isOpen,
  onClose,
  ageInWeeks,
}) => {
  const [collapsedGroups, setCollapsedGroups] = useState<Set<number>>(new Set());

  // Find current stage index
  const currentStageIndex = useMemo(() => {
    return ageSpecificInsights.findIndex(
      s => ageInWeeks >= s.ageRange[0] && ageInWeeks <= s.ageRange[1]
    );
  }, [ageInWeeks]);

  // Initialize collapsed state: collapse past stages, expand current + future
  React.useEffect(() => {
    if (isOpen) {
      const collapsed = new Set<number>();
      ageSpecificInsights.forEach((_, i) => {
        if (i < currentStageIndex) collapsed.add(i);
      });
      setCollapsedGroups(collapsed);
    }
  }, [isOpen, currentStageIndex]);

  const toggleGroup = useCallback((index: number) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }, []);

  const totalInsights = useMemo(
    () => ageSpecificInsights.reduce((sum, s) => sum + s.insights.length, 0),
    []
  );

  if (!isOpen) return null;

  return createPortal(
    <div className="rosie-modal-overlay rosie-insight-browser-overlay" onClick={onClose}>
      <div className="rosie-modal rosie-modal-insight-browser" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="rosie-modal-header">
          <h2 className="rosie-modal-title">Expert Insights</h2>
          <button className="rosie-modal-close" onClick={onClose}>×</button>
        </div>

        {/* Content */}
        <div className="rosie-modal-content">
          <div className="rosie-insight-browser-summary">
            <div className="rosie-insight-browser-count">
              {totalInsights} research-backed insights across {ageSpecificInsights.length} stages
            </div>
          </div>

          {ageSpecificInsights.map((stage, stageIndex) => {
            const isCurrent = stageIndex === currentStageIndex;
            const isCollapsed = collapsedGroups.has(stageIndex);

            return (
              <div key={stageIndex} className="rosie-insight-group">
                <button
                  className={`rosie-insight-group-header ${isCurrent ? 'current' : ''}`}
                  onClick={() => toggleGroup(stageIndex)}
                >
                  <div className="rosie-insight-group-label">
                    <span className="rosie-insight-group-name">{stage.stageName}</span>
                    {isCurrent && <span className="rosie-insight-group-badge">Current</span>}
                  </div>
                  <div className="rosie-insight-group-meta">
                    <span className="rosie-insight-group-count">{stage.insights.length} insights</span>
                    <span className={`rosie-insight-group-chevron ${isCollapsed ? '' : 'open'}`}>›</span>
                  </div>
                </button>

                {!isCollapsed && (
                  <div className="rosie-insight-group-items">
                    {stage.insights.map((insight, i) => (
                      <InsightRow key={i} insight={insight} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>,
    document.body
  );
};
