import React, { useState, useEffect } from 'react';

interface WallpaperPreviewModalProps {
  wallpaperPath: string;
  onClose: () => void;
  onApply: (path: string) => void;
}

const WallpaperPreviewModal: React.FC<WallpaperPreviewModalProps> = ({
  wallpaperPath,
  onClose,
  onApply,
}) => {
  const handleApply = async () => {
    await onApply(wallpaperPath);
    onClose();
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
            Apply Wallpaper
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

  useEffect(() => {
    loadWallpapers();
  }, []);

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

  const handleApplyWallpaper = async (wallpaperPath: string) => {
    try {
      await window.electronAPI.applyWallpaper(wallpaperPath);
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
        <button className="refresh-button" onClick={loadWallpapers}>
          ↻ Refresh
        </button>
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
        />
      )}
    </div>
  );
};
