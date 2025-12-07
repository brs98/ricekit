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
            src={`file://${wallpaperPath}`}
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

export const WallpapersView: React.FC = () => {
  const [wallpapers, setWallpapers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedWallpaper, setSelectedWallpaper] = useState<string | null>(null);
  const [currentTheme, setCurrentTheme] = useState<string>('');
  const [displays, setDisplays] = useState<Display[]>([]);
  const [selectedDisplay, setSelectedDisplay] = useState<number | null>(null);
  const [dynamicWallpaperEnabled, setDynamicWallpaperEnabled] = useState(false);

  useEffect(() => {
    loadWallpapers();
    loadDisplays();
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const prefs = await window.electronAPI.getPreferences();
      setDynamicWallpaperEnabled(prefs.dynamicWallpaper?.enabled || false);
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

      // Load wallpapers for current theme
      const wallpaperPaths = await window.electronAPI.listWallpapers(state.currentTheme);
      setWallpapers(wallpaperPaths);
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
            Wallpapers should be placed in the theme's <code>wallpapers/</code> directory.
          </p>
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
          <button className="refresh-button" onClick={loadWallpapers}>
            ↻ Refresh
          </button>
        </div>
      </div>

      <div className="wallpaper-gallery">
        {wallpapers.map((wallpaperPath, index) => {
          const fileName = wallpaperPath.split('/').pop() || 'Unknown';
          const displayName = fileName.replace(/\.[^.]+$/, '').replace(/-/g, ' ');

          return (
            <div
              key={index}
              className="wallpaper-card"
              onClick={() => setSelectedWallpaper(wallpaperPath)}
            >
              <div className="wallpaper-thumbnail">
                <img
                  src={`file://${wallpaperPath}`}
                  alt={displayName}
                  className="wallpaper-image"
                />
                <div className="wallpaper-overlay">
                  <button className="wallpaper-apply-button">Apply</button>
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
    </div>
  );
};
