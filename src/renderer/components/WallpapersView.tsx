import React, { useState, useEffect } from 'react';

interface Display {
  id: string;
  index: number;
  name: string;
  resolution: string;
  isMain: boolean;
}

interface WallpaperPreviewModalProps {
  wallpaperPath: string;
  onClose: () => void;
  onApply: (path: string, displayIndex?: number) => void;
  displays: Display[];
  selectedDisplay: number | null;
}

const WallpaperPreviewModal: React.FC<WallpaperPreviewModalProps> = ({
  wallpaperPath,
  onClose,
  onApply,
  displays,
  selectedDisplay,
}) => {
  const handleApply = async () => {
    await onApply(wallpaperPath, selectedDisplay || undefined);
    onClose();
  };

  const getApplyButtonText = () => {
    if (selectedDisplay === null) {
      return displays.length > 1 ? 'Apply to All Displays' : 'Apply Wallpaper';
    }
    const display = displays.find(d => d.index === selectedDisplay);
    return display ? `Apply to ${display.name}` : 'Apply Wallpaper';
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content wallpaper-preview-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Wallpaper Preview</h2>
          <button className="close-button" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="wallpaper-preview-container">
          <img
            src={`local-file://${wallpaperPath}`}
            alt="Wallpaper preview"
            className="wallpaper-preview-image"
          />
        </div>

        <div className="modal-actions">
          <button className="secondary-button" onClick={onClose}>
            Cancel
          </button>
          <button className="primary-button" onClick={handleApply}>
            {getApplyButtonText()}
          </button>
        </div>
      </div>
    </div>
  );
};

interface WallpaperSchedule {
  timeStart: string;
  timeEnd: string;
  wallpaperPath: string;
  name?: string;
}

interface ScheduleModalProps {
  wallpapers: WallpaperItem[];
  currentSchedules: WallpaperSchedule[];
  onClose: () => void;
  onSave: (schedules: WallpaperSchedule[]) => void;
}

const ScheduleModal: React.FC<ScheduleModalProps> = ({ wallpapers, currentSchedules, onClose, onSave }) => {
  const [schedules, setSchedules] = useState<WallpaperSchedule[]>(currentSchedules);

  const addSchedule = () => {
    setSchedules([
      ...schedules,
      {
        timeStart: '06:00',
        timeEnd: '12:00',
        wallpaperPath: wallpapers[0]?.original || '',
        name: 'Morning',
      },
    ]);
  };

  const updateSchedule = (index: number, field: keyof WallpaperSchedule, value: string) => {
    const updated = [...schedules];
    updated[index] = { ...updated[index], [field]: value };
    setSchedules(updated);
  };

  const removeSchedule = (index: number) => {
    setSchedules(schedules.filter((_, i) => i !== index));
  };

  const getWallpaperName = (path: string) => {
    const fileName = path.split('/').pop() || 'Unknown';
    return fileName.replace(/\.[^.]+$/, '').replace(/-/g, ' ');
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        style={{ maxWidth: '700px', maxHeight: '80vh', overflow: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>Wallpaper Schedule</h2>
          <button className="close-button" onClick={onClose}>
            ✕
          </button>
        </div>

        <div style={{ padding: '16px' }}>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
            Set different wallpapers for different times of day. Schedules are checked every minute.
          </p>

          {schedules.length === 0 && (
            <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>
              No schedules yet. Click "Add Schedule" to create one.
            </div>
          )}

          {schedules.map((schedule, index) => (
            <div
              key={index}
              style={{
                padding: '16px',
                marginBottom: '12px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                backgroundColor: 'var(--background-secondary)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                <input
                  type="text"
                  placeholder="Schedule name (e.g., Morning)"
                  value={schedule.name || ''}
                  onChange={(e) => updateSchedule(index, 'name', e.target.value)}
                  style={{
                    flex: 1,
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--background)',
                    color: 'var(--text)',
                    fontSize: '13px',
                    marginRight: '8px',
                  }}
                />
                <button
                  onClick={() => removeSchedule(index)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--background)',
                    color: 'var(--text-secondary)',
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  Remove
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={schedule.timeStart}
                    onChange={(e) => updateSchedule(index, 'timeStart', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--border)',
                      backgroundColor: 'var(--background)',
                      color: 'var(--text)',
                      fontSize: '13px',
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                    End Time
                  </label>
                  <input
                    type="time"
                    value={schedule.timeEnd}
                    onChange={(e) => updateSchedule(index, 'timeEnd', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--border)',
                      backgroundColor: 'var(--background)',
                      color: 'var(--text)',
                      fontSize: '13px',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                  Wallpaper
                </label>
                <select
                  value={schedule.wallpaperPath}
                  onChange={(e) => updateSchedule(index, 'wallpaperPath', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--background)',
                    color: 'var(--text)',
                    fontSize: '13px',
                  }}
                >
                  {wallpapers.map((wallpaper) => (
                    <option key={wallpaper.original} value={wallpaper.original}>
                      {getWallpaperName(wallpaper.original)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ))}

          <button
            onClick={addSchedule}
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: '6px',
              border: '1px solid var(--border)',
              backgroundColor: 'var(--background-secondary)',
              color: 'var(--text)',
              fontSize: '13px',
              cursor: 'pointer',
              marginTop: '8px',
            }}
          >
            + Add Schedule
          </button>
        </div>

        <div className="modal-actions">
          <button className="secondary-button" onClick={onClose}>
            Cancel
          </button>
          <button className="primary-button" onClick={() => onSave(schedules)}>
            Save Schedules
          </button>
        </div>
      </div>
    </div>
  );
};

interface WallpaperItem {
  original: string;
  thumbnail: string;
}

export const WallpapersView: React.FC = () => {
  const [wallpapers, setWallpapers] = useState<WallpaperItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedWallpaper, setSelectedWallpaper] = useState<string | null>(null);
  const [currentTheme, setCurrentTheme] = useState<string>('');
  const [displays, setDisplays] = useState<Display[]>([]);
  const [selectedDisplay, setSelectedDisplay] = useState<number | null>(null);
  const [dynamicWallpaperEnabled, setDynamicWallpaperEnabled] = useState(false);
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [schedules, setSchedules] = useState<WallpaperSchedule[]>([]);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [wallpaperToDelete, setWallpaperToDelete] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    loadWallpapers();
    loadDisplays();
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const prefs = await window.electronAPI.getPreferences();
      setDynamicWallpaperEnabled(prefs.dynamicWallpaper?.enabled || false);
      setScheduleEnabled(prefs.wallpaperSchedule?.enabled || false);
      setSchedules(prefs.wallpaperSchedule?.schedules || []);
    } catch (err) {
      console.error('Error loading preferences:', err);
    }
  };

  const toggleDynamicWallpaper = async () => {
    try {
      const prefs = await window.electronAPI.getPreferences();
      const newValue = !dynamicWallpaperEnabled;

      await window.electronAPI.setPreferences({
        ...prefs,
        dynamicWallpaper: {
          enabled: newValue,
        },
      });

      setDynamicWallpaperEnabled(newValue);
    } catch (err) {
      console.error('Error toggling dynamic wallpaper:', err);
      setError('Failed to update dynamic wallpaper setting.');
    }
  };

  const toggleSchedule = async () => {
    try {
      const prefs = await window.electronAPI.getPreferences();
      const newValue = !scheduleEnabled;

      await window.electronAPI.setPreferences({
        ...prefs,
        wallpaperSchedule: {
          enabled: newValue,
          schedules: schedules,
        },
      });

      setScheduleEnabled(newValue);
    } catch (err) {
      console.error('Error toggling wallpaper schedule:', err);
      setError('Failed to update wallpaper schedule setting.');
    }
  };

  const saveSchedules = async (newSchedules: WallpaperSchedule[]) => {
    try {
      const prefs = await window.electronAPI.getPreferences();

      await window.electronAPI.setPreferences({
        ...prefs,
        wallpaperSchedule: {
          enabled: scheduleEnabled,
          schedules: newSchedules,
        },
      });

      setSchedules(newSchedules);
      setShowScheduleModal(false);
    } catch (err) {
      console.error('Error saving wallpaper schedules:', err);
      setError('Failed to save wallpaper schedules.');
    }
  };

  const loadDisplays = async () => {
    try {
      const displayList = await window.electronAPI.getDisplays();
      setDisplays(displayList);
    } catch (err) {
      console.error('Error loading displays:', err);
      // Default to single display on error
      setDisplays([{
        id: 'display-0-0',
        index: 1,
        name: 'Display 1',
        resolution: 'Unknown',
        isMain: true,
      }]);
    }
  };

  const loadWallpapers = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get current theme
      const state = await window.electronAPI.getState();
      setCurrentTheme(state.currentTheme);

      // Load wallpapers with thumbnails for better performance
      const wallpaperItems = await window.electronAPI.listWallpapersWithThumbnails(state.currentTheme);
      setWallpapers(wallpaperItems);
    } catch (err) {
      console.error('Error loading wallpapers:', err);
      setError('Failed to load wallpapers. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyWallpaper = async (wallpaperPath: string, displayIndex?: number) => {
    try {
      await window.electronAPI.applyWallpaper(wallpaperPath, displayIndex);
    } catch (err) {
      console.error('Error applying wallpaper:', err);
      setError('Failed to apply wallpaper. Please try again.');
    }
  };

  const handleAddWallpapers = async () => {
    if (!currentTheme || isAdding) return;

    try {
      setIsAdding(true);
      const result = await window.electronAPI.addWallpapers(currentTheme);

      if (result.added.length > 0) {
        // Reload wallpapers to show the new ones
        await loadWallpapers();
      }

      if (result.errors.length > 0) {
        setError(`Some wallpapers failed to add: ${result.errors.join(', ')}`);
      }
    } catch (err) {
      console.error('Error adding wallpapers:', err);
      setError('Failed to add wallpapers. Please try again.');
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveWallpaper = async (wallpaperPath: string) => {
    try {
      await window.electronAPI.removeWallpaper(wallpaperPath);
      setWallpaperToDelete(null);
      // Reload wallpapers to reflect the removal
      await loadWallpapers();
    } catch (err) {
      console.error('Error removing wallpaper:', err);
      setError('Failed to remove wallpaper. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="wallpapers-view">
        <div className="wallpapers-header">
          <h1>Wallpapers</h1>
          <p>Loading wallpapers for {currentTheme}...</p>
        </div>
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="wallpapers-view">
        <div className="wallpapers-header">
          <h1>Wallpapers</h1>
          <p className="error-message">{error}</p>
        </div>
        <button className="retry-button" onClick={loadWallpapers}>
          Retry
        </button>
      </div>
    );
  }

  if (wallpapers.length === 0) {
    return (
      <div className="wallpapers-view">
        <div className="wallpapers-header">
          <h1>Wallpapers</h1>
          <p>Current theme: <strong>{currentTheme}</strong></p>
        </div>
        <div className="empty-state">
          <p>No wallpapers available for this theme.</p>
          <p className="empty-state-hint">
            Add wallpapers to get started.
          </p>
          <button
            className="primary-button"
            onClick={handleAddWallpapers}
            disabled={isAdding}
            style={{ marginTop: '16px' }}
          >
            {isAdding ? 'Adding...' : '+ Add Wallpapers'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="wallpapers-view">
      <div className="wallpapers-header">
        <div>
          <h1>Wallpapers</h1>
          <p>
            Current theme: <strong>{currentTheme}</strong> • {wallpapers.length}{' '}
            {wallpapers.length === 1 ? 'wallpaper' : 'wallpapers'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 12px',
              borderRadius: '8px',
              backgroundColor: 'var(--background-secondary)',
              border: '1px solid var(--border)',
            }}
          >
            <label
              htmlFor="dynamic-wallpaper-toggle"
              style={{
                fontSize: '13px',
                color: 'var(--text)',
                fontWeight: 500,
                cursor: 'pointer',
                userSelect: 'none',
              }}
            >
              Dynamic Wallpaper
            </label>
            <button
              id="dynamic-wallpaper-toggle"
              onClick={toggleDynamicWallpaper}
              style={{
                width: '40px',
                height: '22px',
                borderRadius: '11px',
                border: 'none',
                backgroundColor: dynamicWallpaperEnabled ? 'var(--accent)' : 'var(--background-tertiary)',
                position: 'relative',
                cursor: 'pointer',
                transition: 'background-color 0.2s ease',
              }}
              title={dynamicWallpaperEnabled ? 'Wallpaper changes with light/dark mode' : 'Click to enable dynamic wallpaper'}
            >
              <div
                style={{
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  backgroundColor: '#fff',
                  position: 'absolute',
                  top: '2px',
                  left: dynamicWallpaperEnabled ? '20px' : '2px',
                  transition: 'left 0.2s ease',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.3)',
                }}
              />
            </button>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 12px',
              borderRadius: '8px',
              backgroundColor: 'var(--background-secondary)',
              border: '1px solid var(--border)',
            }}
          >
            <label
              htmlFor="schedule-wallpaper-toggle"
              style={{
                fontSize: '13px',
                color: 'var(--text)',
                fontWeight: 500,
                cursor: 'pointer',
                userSelect: 'none',
              }}
            >
              Scheduling
            </label>
            <button
              id="schedule-wallpaper-toggle"
              onClick={toggleSchedule}
              style={{
                width: '40px',
                height: '22px',
                borderRadius: '11px',
                border: 'none',
                backgroundColor: scheduleEnabled ? 'var(--accent)' : 'var(--background-tertiary)',
                position: 'relative',
                cursor: 'pointer',
                transition: 'background-color 0.2s ease',
              }}
              title={scheduleEnabled ? 'Wallpaper changes based on time schedules' : 'Click to enable wallpaper scheduling'}
            >
              <div
                style={{
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  backgroundColor: '#fff',
                  position: 'absolute',
                  top: '2px',
                  left: scheduleEnabled ? '20px' : '2px',
                  transition: 'left 0.2s ease',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.3)',
                }}
              />
            </button>
          </div>
          {scheduleEnabled && (
            <button
              onClick={() => setShowScheduleModal(true)}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid var(--border)',
                backgroundColor: 'var(--background-secondary)',
                color: 'var(--text)',
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              Manage Schedules {schedules.length > 0 && `(${schedules.length})`}
            </button>
          )}
          {displays.length > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label htmlFor="display-select" style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                Target Display:
              </label>
              <select
                id="display-select"
                value={selectedDisplay || 'all'}
                onChange={(e) => setSelectedDisplay(e.target.value === 'all' ? null : parseInt(e.target.value))}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border)',
                  backgroundColor: 'var(--background)',
                  color: 'var(--text)',
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                <option value="all">All Displays</option>
                {displays.map((display) => (
                  <option key={display.id} value={display.index}>
                    {display.name} {display.isMain ? '(Main)' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}
          <button
            className="primary-button"
            onClick={handleAddWallpapers}
            disabled={isAdding}
            style={{ padding: '6px 12px', fontSize: '13px' }}
          >
            {isAdding ? 'Adding...' : '+ Add'}
          </button>
          <button className="refresh-button" onClick={loadWallpapers}>
            ↻ Refresh
          </button>
        </div>
      </div>

      <div className="wallpaper-gallery">
        {wallpapers.map((wallpaper, index) => {
          const fileName = wallpaper.original.split('/').pop() || 'Unknown';
          const displayName = fileName.replace(/\.[^.]+$/, '').replace(/-/g, ' ');

          return (
            <div
              key={index}
              className="wallpaper-card"
              onClick={() => setSelectedWallpaper(wallpaper.original)}
            >
              <div className="wallpaper-thumbnail">
                <img
                  src={`local-file://${wallpaper.thumbnail}`}
                  alt={displayName}
                  className="wallpaper-image"
                  loading="lazy"
                />
                <div className="wallpaper-overlay">
                  <button className="wallpaper-apply-button">Apply</button>
                  <button
                    className="wallpaper-delete-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setWallpaperToDelete(wallpaper.original);
                    }}
                    title="Remove wallpaper"
                  >
                    ✕
                  </button>
                </div>
              </div>
              <div className="wallpaper-info">
                <span className="wallpaper-name">{displayName}</span>
              </div>
            </div>
          );
        })}
      </div>

      {selectedWallpaper && (
        <WallpaperPreviewModal
          wallpaperPath={selectedWallpaper}
          onClose={() => setSelectedWallpaper(null)}
          onApply={handleApplyWallpaper}
          displays={displays}
          selectedDisplay={selectedDisplay}
        />
      )}

      {showScheduleModal && (
        <ScheduleModal
          wallpapers={wallpapers}
          currentSchedules={schedules}
          onClose={() => setShowScheduleModal(false)}
          onSave={saveSchedules}
        />
      )}

      {wallpaperToDelete && (
        <div className="modal-overlay" onClick={() => setWallpaperToDelete(null)}>
          <div
            className="modal-content"
            style={{ maxWidth: '400px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>Remove Wallpaper</h2>
              <button className="close-button" onClick={() => setWallpaperToDelete(null)}>
                ✕
              </button>
            </div>

            <div style={{ padding: '16px' }}>
              <p style={{ marginBottom: '8px' }}>
                Are you sure you want to remove this wallpaper?
              </p>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                {wallpaperToDelete.split('/').pop()}
              </p>
            </div>

            <div className="modal-actions">
              <button className="secondary-button" onClick={() => setWallpaperToDelete(null)}>
                Cancel
              </button>
              <button
                className="danger-button"
                onClick={() => handleRemoveWallpaper(wallpaperToDelete)}
                style={{
                  backgroundColor: '#e74c3c',
                  color: 'white',
                  border: 'none',
                }}
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
