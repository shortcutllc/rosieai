import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { BabyProfile } from './types';
import { getMilestoneGroups, getCategoryInfo, MilestoneDefinition, MilestoneGroup } from './milestoneData';
import { fetchMilestones, upsertMilestone, deleteMilestone } from './supabaseMilestones';
import { useRosieAuth } from './RosieAuthContext';

interface RosieMilestoneBrowserProps {
  isOpen: boolean;
  onClose: () => void;
  baby: BabyProfile;
  ageInWeeks: number;
}

export const RosieMilestoneBrowser: React.FC<RosieMilestoneBrowserProps> = ({
  isOpen,
  onClose,
  baby,
  ageInWeeks,
}) => {
  const { user } = useRosieAuth();

  // Track which milestones are marked as done (milestone_id → true)
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  // Track which groups are expanded/collapsed
  const [collapsedGroups, setCollapsedGroups] = useState<Set<number>>(new Set());

  // Get milestone groups
  const groups: MilestoneGroup[] = useMemo(() => getMilestoneGroups(), []);

  // Total counts
  const totalMilestones = useMemo(() => groups.reduce((sum, g) => sum + g.milestones.length, 0), [groups]);
  const completedCount = completedIds.size;

  // Determine which group is "current" based on baby age
  const currentGroupIndex = useMemo(() => {
    for (let i = groups.length - 1; i >= 0; i--) {
      if (ageInWeeks >= groups[i].ageRangeWeeks[0]) return i;
    }
    return 0;
  }, [ageInWeeks, groups]);

  // Initialize collapsed state: past groups collapsed, current+future expanded
  useEffect(() => {
    if (isOpen) {
      const collapsed = new Set<number>();
      groups.forEach((_, i) => {
        if (i < currentGroupIndex) collapsed.add(i);
      });
      setCollapsedGroups(collapsed);
    }
  }, [isOpen, currentGroupIndex, groups]);

  // Fetch saved milestone records when modal opens
  useEffect(() => {
    if (!isOpen) return;

    if (!user?.id || !baby.id) {
      // No auth — just show milestones without saved state
      setLoading(false);
      return;
    }

    setLoading(true);
    fetchMilestones(user.id, baby.id)
      .then(records => {
        const doneSet = new Set<string>();
        records.forEach(r => {
          if (r.status === 'done') doneSet.add(r.milestoneId);
        });
        setCompletedIds(doneSet);
      })
      .catch(() => {
        // Table may not exist yet — continue without saved state
      })
      .finally(() => {
        setLoading(false);
      });
  }, [isOpen, user?.id, baby.id]);

  // Toggle a milestone
  const handleToggle = useCallback(async (milestoneId: string) => {
    const wasDone = completedIds.has(milestoneId);

    // Optimistic update — always works locally
    setCompletedIds(prev => {
      const next = new Set(prev);
      if (wasDone) {
        next.delete(milestoneId);
      } else {
        next.add(milestoneId);
      }
      return next;
    });

    // Persist to Supabase if authenticated
    if (!user?.id || !baby.id) return;

    try {
      if (wasDone) {
        const result = await deleteMilestone(milestoneId, user.id, baby.id);
        if (!result.success) {
          // Revert on failure
          setCompletedIds(prev => { const next = new Set(prev); next.add(milestoneId); return next; });
        }
      } else {
        const result = await upsertMilestone(milestoneId, 'done', user.id, baby.id);
        if (!result.success) {
          // Revert on failure
          setCompletedIds(prev => { const next = new Set(prev); next.delete(milestoneId); return next; });
        }
      }
    } catch {
      // Supabase may not have the table — keep local state
    }
  }, [user?.id, baby.id, completedIds]);

  // Toggle group collapse
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

  if (!isOpen) return null;

  const progressPercent = totalMilestones > 0 ? Math.round((completedCount / totalMilestones) * 100) : 0;

  return createPortal(
    <div className="rosie-modal-overlay rosie-milestone-overlay" onClick={onClose}>
      <div
        className="rosie-modal rosie-modal-milestone-browser"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="rosie-modal-header">
          <h2 className="rosie-modal-title">{baby.name}'s Milestones</h2>
          <button className="rosie-modal-close" onClick={onClose}>×</button>
        </div>

        {/* Scrollable content */}
        <div className="rosie-modal-content">
          {/* Progress summary */}
          <div className="rosie-milestone-progress-summary">
            <div className="rosie-milestone-progress-text">
              <span className="rosie-milestone-progress-count">{completedCount}</span>
              <span className="rosie-milestone-progress-label"> of {totalMilestones} milestones</span>
            </div>
            <div className="rosie-milestone-progress-bar">
              <div
                className="rosie-milestone-progress-fill"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {loading ? (
            <div className="rosie-milestone-loading">Loading milestones...</div>
          ) : (
            /* Age-grouped sections */
            groups.map((group, groupIndex) => {
              const isCollapsed = collapsedGroups.has(groupIndex);
              const isCurrent = groupIndex === currentGroupIndex;
              const groupDone = group.milestones.filter(m => completedIds.has(m.id)).length;

              return (
                <div key={groupIndex} className="rosie-milestone-group">
                  <button
                    className={`rosie-milestone-group-header ${isCurrent ? 'current' : ''}`}
                    onClick={() => toggleGroup(groupIndex)}
                  >
                    <div className="rosie-milestone-group-label">
                      <span className="rosie-milestone-group-title">{group.label}</span>
                      {isCurrent && <span className="rosie-milestone-group-badge">Current</span>}
                    </div>
                    <div className="rosie-milestone-group-meta">
                      <span className="rosie-milestone-group-count">{groupDone}/{group.milestones.length}</span>
                      <span className={`rosie-milestone-group-chevron ${isCollapsed ? '' : 'expanded'}`}>›</span>
                    </div>
                  </button>

                  {!isCollapsed && (
                    <div className="rosie-milestone-group-items">
                      {group.milestones.map(milestone => (
                        <MilestoneRow
                          key={milestone.id}
                          milestone={milestone}
                          isDone={completedIds.has(milestone.id)}
                          onToggle={handleToggle}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

// Separate row component to avoid re-renders of the whole list
const MilestoneRow: React.FC<{
  milestone: MilestoneDefinition;
  isDone: boolean;
  onToggle: (id: string) => void;
}> = React.memo(({ milestone, isDone, onToggle }) => {
  const categoryInfo = getCategoryInfo(milestone.category);

  return (
    <button
      className={`rosie-milestone-row ${isDone ? 'done' : ''}`}
      onClick={() => onToggle(milestone.id)}
    >
      <div className="rosie-milestone-dot" style={{ background: categoryInfo.color }} />
      <div className="rosie-milestone-info">
        <div className="rosie-milestone-title">{milestone.title}</div>
        <div className="rosie-milestone-desc">{milestone.description}</div>
      </div>
      <div className={`rosie-milestone-check ${isDone ? 'checked' : ''}`}>
        {isDone && '✓'}
      </div>
    </button>
  );
});

export default RosieMilestoneBrowser;
