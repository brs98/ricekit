import { useState, useEffect } from 'react';
import { Theme } from '../../shared/types';
import { X, Check, Image as ImageIcon } from 'lucide-react';

interface ThemeDetailModalProps {
  theme: Theme;
  isActive: boolean;
  onClose: () => void;
  onApply: (themeName: string) => void;
  onToggleFavorite: (themeName: string) => void;
  onEdit?: () => void;
  onDelete?: (themeName: string) => void;
  onDuplicate?: (themeName: string) => void;
  isFavorite: boolean;
}

export function ThemeDetailModal({
  theme,
  isActive,
  onClose,
  onApply,
  onToggleFavorite,
  onEdit,
  onDelete,
  onDuplicate,
  isFavorite,
}: ThemeDetailModalProps) {
  const [copiedColor, setCopiedColor] = useState<string | null>(null);
  const [wallpapers, setWallpapers] = useState<string[]>([]);
  const [selectedWallpaper, setSelectedWallpaper] = useState<string | null>(null);
  const [wallpapersLoading, setWallpapersLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [duplicateName, setDuplicateName] = useState('');

  // Load wallpapers when modal opens
  useEffect(() => {
    loadWallpapers();
  }, [theme.name]);

  const loadWallpapers = async () => {
    try {
      setWallpapersLoading(true);
      const wallpaperList = await window.electronAPI.listWallpapers(theme.name);
      setWallpapers(wallpaperList);
    } catch (err) {
      console.error('Failed to load wallpapers:', err);
    } finally {
      setWallpapersLoading(false);
    }
  };

  const handleCopyColor = async (colorName: string, colorValue: string) => {
    try {
      await navigator.clipboard.writeText(colorValue);
      setCopiedColor(colorName);
      setTimeout(() => setCopiedColor(null), 2000);
    } catch (err) {
      console.error('Failed to copy color:', err);
    }
  };

  const handleDeleteClick = () => {
    if (theme.isCustom && onDelete) {
      setShowDeleteConfirm(true);
    }
  };

  const handleConfirmDelete = () => {
    if (onDelete) {
      onDelete(theme.name);
      setShowDeleteConfirm(false);
      onClose();
    }
  };

  const handleDuplicateClick = () => {
    if (onDuplicate) {
      setDuplicateName(`${theme.metadata.name} (Copy)`);
      setShowDuplicateDialog(true);
    }
  };

  const handleConfirmDuplicate = () => {
    if (onDuplicate && duplicateName.trim()) {
      onDuplicate(theme.name);
      setShowDuplicateDialog(false);
      onClose();
    }
  };

  const colors = theme.metadata.colors;

  // Main color palette (most important colors)
  const mainColors = [
    { name: 'Background', value: colors.background },
    { name: 'Foreground', value: colors.foreground },
    { name: 'Accent', value: colors.accent },
    { name: 'Cursor', value: colors.cursor },
    { name: 'Selection', value: colors.selection },
    { name: 'Border', value: colors.border },
  ];

  // ANSI colors
  const ansiColors = [
    { name: 'Black', value: colors.black },
    { name: 'Red', value: colors.red },
    { name: 'Green', value: colors.green },
    { name: 'Yellow', value: colors.yellow },
    { name: 'Blue', value: colors.blue },
    { name: 'Magenta', value: colors.magenta },
    { name: 'Cyan', value: colors.cyan },
    { name: 'White', value: colors.white },
  ];

  // Bright ANSI colors
  const brightColors = [
    { name: 'Bright Black', value: colors.brightBlack },
    { name: 'Bright Red', value: colors.brightRed },
    { name: 'Bright Green', value: colors.brightGreen },
    { name: 'Bright Yellow', value: colors.brightYellow },
    { name: 'Bright Blue', value: colors.brightBlue },
    { name: 'Bright Magenta', value: colors.brightMagenta },
    { name: 'Bright Cyan', value: colors.brightCyan },
    { name: 'Bright White', value: colors.brightWhite },
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2 className="modal-title">{theme.metadata.name}</h2>
            <p className="modal-subtitle">
              by {theme.metadata.author} · {theme.isLight ? 'Light' : 'Dark'} theme
            </p>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {/* Description */}
          <div className="modal-section">
            <p className="theme-description">{theme.metadata.description}</p>
          </div>

          {/* Terminal Preview */}
          <div className="modal-section">
            <h3 className="section-title">Terminal Preview</h3>
            <div
              className="terminal-preview"
              style={{
                backgroundColor: colors.background,
                color: colors.foreground,
                borderColor: colors.border,
              }}
            >
              <div className="terminal-line">
                <span style={{ color: colors.green }}>user@macbook</span>
                <span style={{ color: colors.foreground }}>:</span>
                <span style={{ color: colors.blue }}>~/projects</span>
                <span style={{ color: colors.foreground }}>$ </span>
                <span style={{ color: colors.foreground }}>git status</span>
              </div>
              <div className="terminal-line">
                <span style={{ color: colors.green }}>On branch main</span>
              </div>
              <div className="terminal-line">
                <span style={{ color: colors.cyan }}>Changes not staged for commit:</span>
              </div>
              <div className="terminal-line">
                <span style={{ color: colors.red }}>  modified:   src/main.ts</span>
              </div>
              <div className="terminal-line">
                <span style={{ color: colors.green }}>  new file:   src/utils.ts</span>
              </div>
              <div className="terminal-line">
                <span style={{ color: colors.foreground }}>$ </span>
                <span style={{ color: colors.foreground }}>npm test</span>
              </div>
              <div className="terminal-line">
                <span style={{ color: colors.green }}>✓</span>
                <span style={{ color: colors.foreground }}> All tests passed</span>
              </div>
            </div>
          </div>

          {/* Code Preview */}
          <div className="modal-section">
            <h3 className="section-title">Code Preview</h3>
            <div
              className="code-preview"
              style={{
                backgroundColor: colors.background,
                color: colors.foreground,
                borderColor: colors.border,
              }}
            >
              <div className="code-line">
                <span style={{ color: colors.magenta }}>function</span>
                <span style={{ color: colors.blue }}> greet</span>
                <span style={{ color: colors.foreground }}>(</span>
                <span style={{ color: colors.cyan }}>name</span>
                <span style={{ color: colors.foreground }}>: </span>
                <span style={{ color: colors.yellow }}>string</span>
                <span style={{ color: colors.foreground }}>) {'{'}</span>
              </div>
              <div className="code-line">
                <span style={{ color: colors.foreground }}>  </span>
                <span style={{ color: colors.magenta }}>return</span>
                <span style={{ color: colors.foreground }}> </span>
                <span style={{ color: colors.green }}>`Hello, ${'{'}name{'}'}`</span>
                <span style={{ color: colors.foreground }}>;</span>
              </div>
              <div className="code-line">
                <span style={{ color: colors.foreground }}>{'}'}</span>
              </div>
            </div>
          </div>

          {/* Wallpapers */}
          {wallpapers.length > 0 && (
            <div className="modal-section">
              <h3 className="section-title">
                <ImageIcon size={16} style={{ display: 'inline', marginRight: '8px' }} />
                Wallpapers
              </h3>
              {wallpapersLoading ? (
                <div className="wallpaper-loading">Loading wallpapers...</div>
              ) : (
                <div className="wallpaper-grid">
                  {wallpapers.map((wallpaper, index) => (
                    <div
                      key={wallpaper}
                      className="wallpaper-thumbnail"
                      onClick={() => setSelectedWallpaper(wallpaper)}
                      title="Click to preview"
                    >
                      <img
                        src={`local-file://${wallpaper}`}
                        alt={`Wallpaper ${index + 1}`}
                        className="wallpaper-thumb-img"
                      />
                      <div className="wallpaper-thumb-overlay">
                        <ImageIcon size={20} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Wallpaper Preview Modal */}
          {selectedWallpaper && (
            <div className="wallpaper-preview-overlay" onClick={() => setSelectedWallpaper(null)}>
              <div className="wallpaper-preview-content" onClick={(e) => e.stopPropagation()}>
                <button
                  className="wallpaper-preview-close"
                  onClick={() => setSelectedWallpaper(null)}
                  aria-label="Close preview"
                >
                  <X size={24} />
                </button>
                <img
                  src={`local-file://${selectedWallpaper}`}
                  alt="Wallpaper preview"
                  className="wallpaper-preview-img"
                />
              </div>
            </div>
          )}

          {/* Main Colors */}
          <div className="modal-section">
            <h3 className="section-title">Main Colors</h3>
            <div className="color-grid">
              {mainColors.map(({ name, value }) => (
                <div
                  key={name}
                  className="color-item"
                  onClick={() => handleCopyColor(name, value)}
                  title="Click to copy"
                >
                  <div className="color-swatch" style={{ backgroundColor: value }}></div>
                  <div className="color-info">
                    <div className="color-name">{name}</div>
                    <div className="color-value">
                      {value}
                      {copiedColor === name && (
                        <span className="copied-indicator">
                          <Check size={12} /> Copied!
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ANSI Colors */}
          <div className="modal-section">
            <h3 className="section-title">ANSI Colors</h3>
            <div className="color-grid">
              {ansiColors.map(({ name, value }) => (
                <div
                  key={name}
                  className="color-item"
                  onClick={() => handleCopyColor(name, value)}
                  title="Click to copy"
                >
                  <div className="color-swatch" style={{ backgroundColor: value }}></div>
                  <div className="color-info">
                    <div className="color-name">{name}</div>
                    <div className="color-value">
                      {value}
                      {copiedColor === name && (
                        <span className="copied-indicator">
                          <Check size={12} /> Copied!
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bright Colors */}
          <div className="modal-section">
            <h3 className="section-title">Bright Colors</h3>
            <div className="color-grid">
              {brightColors.map(({ name, value }) => (
                <div
                  key={name}
                  className="color-item"
                  onClick={() => handleCopyColor(name, value)}
                  title="Click to copy"
                >
                  <div className="color-swatch" style={{ backgroundColor: value }}></div>
                  <div className="color-info">
                    <div className="color-name">{name}</div>
                    <div className="color-value">
                      {value}
                      {copiedColor === name && (
                        <span className="copied-indicator">
                          <Check size={12} /> Copied!
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="modal-actions">
          <button
            className="btn-secondary"
            onClick={() => onToggleFavorite(theme.name)}
          >
            {isFavorite ? '★ Favorited' : '☆ Add to Favorites'}
          </button>
          {onDuplicate && (
            <button
              className="btn-secondary"
              onClick={handleDuplicateClick}
            >
              📋 Duplicate
            </button>
          )}
          {onEdit && (
            <button
              className="btn-secondary"
              onClick={() => {
                onEdit();
                onClose();
              }}
            >
              ✏️ Edit
            </button>
          )}
          {theme.isCustom && onDelete && (
            <button
              className="btn-danger"
              onClick={handleDeleteClick}
            >
              🗑️ Delete
            </button>
          )}
          <button
            className="btn-primary"
            onClick={() => {
              onApply(theme.name);
              onClose();
            }}
            disabled={isActive}
          >
            {isActive ? 'Currently Active' : 'Apply Theme'}
          </button>
        </div>

        {/* Delete Confirmation Dialog */}
        {showDeleteConfirm && (
          <div className="confirmation-overlay" onClick={() => setShowDeleteConfirm(false)}>
            <div className="confirmation-dialog" onClick={(e) => e.stopPropagation()}>
              <h3>Delete Theme?</h3>
              <p>
                Are you sure you want to delete <strong>{theme.metadata.name}</strong>?
                This action cannot be undone.
              </p>
              <div className="confirmation-actions">
                <button className="btn-secondary" onClick={() => setShowDeleteConfirm(false)}>
                  Cancel
                </button>
                <button className="btn-danger" onClick={handleConfirmDelete}>
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Duplicate Dialog */}
        {showDuplicateDialog && (
          <div className="confirmation-overlay" onClick={() => setShowDuplicateDialog(false)}>
            <div className="confirmation-dialog" onClick={(e) => e.stopPropagation()}>
              <h3>Duplicate Theme</h3>
              <p>Create a copy of <strong>{theme.metadata.name}</strong></p>
              <input
                type="text"
                className="dialog-input"
                value={duplicateName}
                onChange={(e) => setDuplicateName(e.target.value)}
                placeholder="New theme name"
                autoFocus
              />
              <div className="confirmation-actions">
                <button className="btn-secondary" onClick={() => setShowDuplicateDialog(false)}>
                  Cancel
                </button>
                <button
                  className="btn-primary"
                  onClick={handleConfirmDuplicate}
                  disabled={!duplicateName.trim()}
                >
                  Create Duplicate
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
