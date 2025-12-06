import { useState, useEffect } from 'react';
import { Theme, ThemeMetadata, ThemeColors } from '../../shared/types';

interface ThemeEditorProps {
  initialTheme?: ThemeMetadata;
  sourceTheme?: Theme;  // Optional: full theme object to check if built-in
  onSave?: () => void;
  onCancel?: () => void;
}

const defaultColors: ThemeColors = {
  background: '#1a1b26',
  foreground: '#c0caf5',
  cursor: '#c0caf5',
  selection: '#283457',
  black: '#15161e',
  red: '#f7768e',
  green: '#9ece6a',
  yellow: '#e0af68',
  blue: '#7aa2f7',
  magenta: '#bb9af7',
  cyan: '#7dcfff',
  white: '#a9b1d6',
  brightBlack: '#414868',
  brightRed: '#f7768e',
  brightGreen: '#9ece6a',
  brightYellow: '#e0af68',
  brightBlue: '#7aa2f7',
  brightMagenta: '#bb9af7',
  brightCyan: '#7dcfff',
  brightWhite: '#c0caf5',
  accent: '#7aa2f7',
  border: '#414868',
};

// Preset color schemes
const presetSchemes: { [key: string]: { name: string; colors: ThemeColors } } = {
  tokyoNight: {
    name: 'Tokyo Night (Dark)',
    colors: defaultColors, // Already defined as Tokyo Night
  },
  catppuccinMocha: {
    name: 'Catppuccin Mocha (Dark)',
    colors: {
      background: '#1e1e2e',
      foreground: '#cdd6f4',
      cursor: '#f5e0dc',
      selection: '#585b70',
      black: '#45475a',
      red: '#f38ba8',
      green: '#a6e3a1',
      yellow: '#f9e2af',
      blue: '#89b4fa',
      magenta: '#f5c2e7',
      cyan: '#94e2d5',
      white: '#bac2de',
      brightBlack: '#585b70',
      brightRed: '#f38ba8',
      brightGreen: '#a6e3a1',
      brightYellow: '#f9e2af',
      brightBlue: '#89b4fa',
      brightMagenta: '#f5c2e7',
      brightCyan: '#94e2d5',
      brightWhite: '#a6adc8',
      accent: '#89b4fa',
      border: '#585b70',
    },
  },
  catppuccinLatte: {
    name: 'Catppuccin Latte (Light)',
    colors: {
      background: '#eff1f5',
      foreground: '#4c4f69',
      cursor: '#dc8a78',
      selection: '#bcc0cc',
      black: '#5c5f77',
      red: '#d20f39',
      green: '#40a02b',
      yellow: '#df8e1d',
      blue: '#1e66f5',
      magenta: '#ea76cb',
      cyan: '#179299',
      white: '#acb0be',
      brightBlack: '#6c6f85',
      brightRed: '#d20f39',
      brightGreen: '#40a02b',
      brightYellow: '#df8e1d',
      brightBlue: '#1e66f5',
      brightMagenta: '#ea76cb',
      brightCyan: '#179299',
      brightWhite: '#bcc0cc',
      accent: '#1e66f5',
      border: '#bcc0cc',
    },
  },
  nord: {
    name: 'Nord (Dark)',
    colors: {
      background: '#2e3440',
      foreground: '#d8dee9',
      cursor: '#d8dee9',
      selection: '#4c566a',
      black: '#3b4252',
      red: '#bf616a',
      green: '#a3be8c',
      yellow: '#ebcb8b',
      blue: '#81a1c1',
      magenta: '#b48ead',
      cyan: '#88c0d0',
      white: '#e5e9f0',
      brightBlack: '#4c566a',
      brightRed: '#bf616a',
      brightGreen: '#a3be8c',
      brightYellow: '#ebcb8b',
      brightBlue: '#81a1c1',
      brightMagenta: '#b48ead',
      brightCyan: '#8fbcbb',
      brightWhite: '#eceff4',
      accent: '#88c0d0',
      border: '#4c566a',
    },
  },
  gruvboxDark: {
    name: 'Gruvbox (Dark)',
    colors: {
      background: '#282828',
      foreground: '#ebdbb2',
      cursor: '#ebdbb2',
      selection: '#504945',
      black: '#282828',
      red: '#cc241d',
      green: '#98971a',
      yellow: '#d79921',
      blue: '#458588',
      magenta: '#b16286',
      cyan: '#689d6a',
      white: '#a89984',
      brightBlack: '#928374',
      brightRed: '#fb4934',
      brightGreen: '#b8bb26',
      brightYellow: '#fabd2f',
      brightBlue: '#83a598',
      brightMagenta: '#d3869b',
      brightCyan: '#8ec07c',
      brightWhite: '#ebdbb2',
      accent: '#d79921',
      border: '#504945',
    },
  },
  dracula: {
    name: 'Dracula (Dark)',
    colors: {
      background: '#282a36',
      foreground: '#f8f8f2',
      cursor: '#f8f8f2',
      selection: '#44475a',
      black: '#21222c',
      red: '#ff5555',
      green: '#50fa7b',
      yellow: '#f1fa8c',
      blue: '#bd93f9',
      magenta: '#ff79c6',
      cyan: '#8be9fd',
      white: '#f8f8f2',
      brightBlack: '#6272a4',
      brightRed: '#ff6e6e',
      brightGreen: '#69ff94',
      brightYellow: '#ffffa5',
      brightBlue: '#d6acff',
      brightMagenta: '#ff92df',
      brightCyan: '#a4ffff',
      brightWhite: '#ffffff',
      accent: '#bd93f9',
      border: '#44475a',
    },
  },
};

const defaultMetadata: ThemeMetadata = {
  name: 'New Theme',
  author: 'Unknown',
  description: 'A custom theme',
  version: '1.0.0',
  colors: defaultColors,
};

export function ThemeEditor({ initialTheme, sourceTheme, onSave, onCancel }: ThemeEditorProps) {
  const [metadata, setMetadata] = useState<ThemeMetadata>(initialTheme || defaultMetadata);
  const [selectedColor, setSelectedColor] = useState<keyof ThemeColors | null>(null);
  const [saving, setSaving] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showSaveAsDialog, setShowSaveAsDialog] = useState(false);
  const [newThemeName, setNewThemeName] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<string>('');

  // Update when initialTheme changes
  useEffect(() => {
    if (initialTheme) {
      setMetadata(initialTheme);
    }
  }, [initialTheme]);

  const applyPreset = (presetKey: string) => {
    if (presetKey && presetSchemes[presetKey]) {
      const preset = presetSchemes[presetKey];
      setMetadata({
        ...metadata,
        colors: { ...preset.colors },
      });
      setSelectedPreset(presetKey);
    }
  };

  const updateColor = (colorKey: keyof ThemeColors, value: string) => {
    setMetadata({
      ...metadata,
      colors: {
        ...metadata.colors,
        [colorKey]: value,
      },
    });
    setHasChanges(true);
  };

  const updateMetadataField = (field: keyof Omit<ThemeMetadata, 'colors'>, value: string) => {
    setMetadata({
      ...metadata,
      [field]: value,
    });
    setHasChanges(true);
  };

  const handleSave = async () => {
    // If editing a built-in theme, show save-as dialog
    if (sourceTheme && !sourceTheme.isCustom) {
      setShowSaveAsDialog(true);
      return;
    }

    // Otherwise save directly
    try {
      setSaving(true);
      await window.electronAPI.createTheme(metadata);
      setHasChanges(false);
      if (onSave) onSave();
    } catch (error) {
      console.error('Failed to save theme:', error);
      alert('Failed to save theme. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAs = async () => {
    if (!newThemeName.trim()) {
      alert('Please enter a theme name');
      return;
    }

    try {
      setSaving(true);
      // Create a new theme with the modified colors but new name
      const newMetadata: ThemeMetadata = {
        ...metadata,
        name: newThemeName.trim(),
      };
      await window.electronAPI.createTheme(newMetadata);
      setHasChanges(false);
      setShowSaveAsDialog(false);
      setNewThemeName('');
      if (onSave) onSave();
    } catch (error) {
      console.error('Failed to save theme:', error);
      alert('Failed to save theme. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    // If there are unsaved changes, show confirmation dialog
    if (hasChanges) {
      setShowCancelConfirm(true);
      return;
    }

    // Otherwise cancel immediately
    if (onCancel) {
      onCancel();
    } else {
      // Reset to initial or default
      setMetadata(initialTheme || defaultMetadata);
      setHasChanges(false);
    }
  };

  const confirmCancel = () => {
    setShowCancelConfirm(false);
    setHasChanges(false);
    if (onCancel) {
      onCancel();
    } else {
      // Reset to initial or default
      setMetadata(initialTheme || defaultMetadata);
    }
  };

  const mainColorKeys: (keyof ThemeColors)[] = [
    'background',
    'foreground',
    'cursor',
    'selection',
    'accent',
    'border',
  ];

  const ansiColorKeys: (keyof ThemeColors)[] = [
    'black',
    'red',
    'green',
    'yellow',
    'blue',
    'magenta',
    'cyan',
    'white',
  ];

  const brightColorKeys: (keyof ThemeColors)[] = [
    'brightBlack',
    'brightRed',
    'brightGreen',
    'brightYellow',
    'brightBlue',
    'brightMagenta',
    'brightCyan',
    'brightWhite',
  ];

  const formatColorName = (key: string): string => {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (str) => str.toUpperCase())
      .trim();
  };

  const ColorInput = ({ colorKey }: { colorKey: keyof ThemeColors }) => {
    const colorValue = metadata.colors[colorKey];
    const isSelected = selectedColor === colorKey;

    return (
      <div className="color-input-item">
        <label className="color-input-label">{formatColorName(colorKey)}</label>
        <div className="color-input-controls">
          <input
            type="color"
            value={colorValue}
            onChange={(e) => updateColor(colorKey, e.target.value)}
            className="color-picker-input"
            onClick={() => setSelectedColor(colorKey)}
          />
          <input
            type="text"
            value={colorValue}
            onChange={(e) => updateColor(colorKey, e.target.value)}
            className={`color-hex-input ${isSelected ? 'selected' : ''}`}
            onFocus={() => setSelectedColor(colorKey)}
            placeholder="#000000"
            maxLength={7}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="theme-editor">
      <div className="theme-editor-sidebar">
        <div className="theme-editor-section">
          <h3 className="section-title">Start from Preset</h3>
          <div className="preset-selector">
            <select
              value={selectedPreset}
              onChange={(e) => applyPreset(e.target.value)}
              className="preset-select"
            >
              <option value="">-- Select a preset --</option>
              {Object.entries(presetSchemes).map(([key, preset]) => (
                <option key={key} value={key}>
                  {preset.name}
                </option>
              ))}
            </select>
            <p className="preset-hint">
              Choose a preset color scheme to start with, then customize colors below
            </p>
          </div>
        </div>

        <div className="theme-editor-section">
          <h3 className="section-title">Theme Information</h3>
          <div className="metadata-form">
            <div className="form-group">
              <label htmlFor="theme-name">Theme Name</label>
              <input
                id="theme-name"
                type="text"
                value={metadata.name}
                onChange={(e) => updateMetadataField('name', e.target.value)}
                className="form-input"
                placeholder="My Custom Theme"
              />
            </div>
            <div className="form-group">
              <label htmlFor="theme-author">Author</label>
              <input
                id="theme-author"
                type="text"
                value={metadata.author}
                onChange={(e) => updateMetadataField('author', e.target.value)}
                className="form-input"
                placeholder="Your Name"
              />
            </div>
            <div className="form-group">
              <label htmlFor="theme-description">Description</label>
              <textarea
                id="theme-description"
                value={metadata.description}
                onChange={(e) => updateMetadataField('description', e.target.value)}
                className="form-textarea"
                placeholder="A brief description of your theme..."
                rows={3}
              />
            </div>
            <div className="form-group">
              <label htmlFor="theme-version">Version</label>
              <input
                id="theme-version"
                type="text"
                value={metadata.version}
                onChange={(e) => updateMetadataField('version', e.target.value)}
                className="form-input"
                placeholder="1.0.0"
              />
            </div>
          </div>
        </div>

        <div className="theme-editor-section">
          <h3 className="section-title">Main Colors</h3>
          <div className="color-inputs">
            {mainColorKeys.map((key) => (
              <ColorInput key={key} colorKey={key} />
            ))}
          </div>
        </div>

        <div className="theme-editor-section">
          <h3 className="section-title">ANSI Colors</h3>
          <div className="color-inputs">
            {ansiColorKeys.map((key) => (
              <ColorInput key={key} colorKey={key} />
            ))}
          </div>
        </div>

        <div className="theme-editor-section">
          <h3 className="section-title">Bright Colors</h3>
          <div className="color-inputs">
            {brightColorKeys.map((key) => (
              <ColorInput key={key} colorKey={key} />
            ))}
          </div>
        </div>

        <div className="theme-editor-actions">
          <button onClick={handleCancel} className="btn btn-secondary">
            Cancel
          </button>
          <button onClick={handleSave} className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving...' : 'Save Theme'}
          </button>
        </div>
      </div>

      <div className="theme-editor-preview">
        <h3 className="preview-title">Live Preview</h3>

        <div className="preview-section">
          <h4 className="preview-section-title">Terminal Preview</h4>
          <div className="terminal-preview" style={{
            backgroundColor: metadata.colors.background,
            color: metadata.colors.foreground,
            borderColor: metadata.colors.border,
          }}>
            <div className="terminal-line">
              <span style={{ color: metadata.colors.green }}>➜</span>
              <span style={{ color: metadata.colors.cyan }}> ~/projects</span>
              <span style={{ color: metadata.colors.blue }}> git:(</span>
              <span style={{ color: metadata.colors.red }}>main</span>
              <span style={{ color: metadata.colors.blue }}>)</span>
              <span> $ ls -la</span>
            </div>
            <div className="terminal-line" style={{ color: metadata.colors.blue }}>
              drwxr-xr-x  10 user  staff   320 Dec  6 10:00 .
            </div>
            <div className="terminal-line" style={{ color: metadata.colors.blue }}>
              drwxr-xr-x  50 user  staff  1600 Dec  6 09:00 ..
            </div>
            <div className="terminal-line" style={{ color: metadata.colors.green }}>
              -rw-r--r--   1 user  staff   150 Dec  6 10:00 README.md
            </div>
            <div className="terminal-line" style={{ color: metadata.colors.cyan }}>
              drwxr-xr-x   8 user  staff   256 Dec  6 09:30 src
            </div>
            <div className="terminal-line">
              <span style={{ color: metadata.colors.green }}>➜</span>
              <span style={{ color: metadata.colors.cyan }}> ~/projects</span>
              <span style={{ color: metadata.colors.blue }}> git:(</span>
              <span style={{ color: metadata.colors.red }}>main</span>
              <span style={{ color: metadata.colors.blue }}>)</span>
              <span> $ </span>
              <span className="cursor-block" style={{ backgroundColor: metadata.colors.cursor }}></span>
            </div>
          </div>
        </div>

        <div className="preview-section">
          <h4 className="preview-section-title">Code Preview</h4>
          <div className="code-preview" style={{
            backgroundColor: metadata.colors.background,
            color: metadata.colors.foreground,
            borderColor: metadata.colors.border,
          }}>
            <pre>
              <code>
                <span style={{ color: metadata.colors.magenta }}>import</span>
                <span> {'{ useState }'} </span>
                <span style={{ color: metadata.colors.magenta }}>from</span>
                <span> </span>
                <span style={{ color: metadata.colors.green }}>'react'</span>
                <span>;</span>
                {'\n\n'}
                <span style={{ color: metadata.colors.magenta }}>function</span>
                <span> </span>
                <span style={{ color: metadata.colors.yellow }}>App</span>
                <span>{'() {'}</span>
                {'\n  '}
                <span style={{ color: metadata.colors.magenta }}>const</span>
                <span> [count, setCount] = </span>
                <span style={{ color: metadata.colors.cyan }}>useState</span>
                <span>(</span>
                <span style={{ color: metadata.colors.red }}>0</span>
                <span>);</span>
                {'\n  '}
                <span style={{ color: metadata.colors.magenta }}>return</span>
                <span> {'<'}div{'>'}Count: {'{'}</span>
                <span style={{ color: metadata.colors.red }}>count</span>
                <span>{'}</'}</span>
                <span>div{'>'};</span>
                {'\n}'}
              </code>
            </pre>
          </div>
        </div>

        <div className="preview-section">
          <h4 className="preview-section-title">Color Palette</h4>
          <div className="palette-preview">
            <div className="palette-row">
              {mainColorKeys.map((key) => (
                <div key={key} className="palette-item">
                  <div
                    className="palette-swatch"
                    style={{ backgroundColor: metadata.colors[key] }}
                  />
                  <div className="palette-label">{formatColorName(key)}</div>
                  <div className="palette-hex">{metadata.colors[key]}</div>
                </div>
              ))}
            </div>
            <div className="palette-row">
              {ansiColorKeys.map((key) => (
                <div key={key} className="palette-item-small">
                  <div
                    className="palette-swatch-small"
                    style={{ backgroundColor: metadata.colors[key] }}
                    title={formatColorName(key)}
                  />
                </div>
              ))}
            </div>
            <div className="palette-row">
              {brightColorKeys.map((key) => (
                <div key={key} className="palette-item-small">
                  <div
                    className="palette-swatch-small"
                    style={{ backgroundColor: metadata.colors[key] }}
                    title={formatColorName(key)}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Cancel Confirmation Dialog */}
      {showCancelConfirm && (
        <div className="modal-overlay" onClick={() => setShowCancelConfirm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Discard Changes?</h3>
              <button
                className="modal-close"
                onClick={() => setShowCancelConfirm(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <p>You have unsaved changes. Are you sure you want to discard them?</p>
            </div>
            <div className="modal-actions">
              <button
                className="btn btn-secondary"
                onClick={() => setShowCancelConfirm(false)}
              >
                Keep Editing
              </button>
              <button className="btn btn-danger" onClick={confirmCancel}>
                Discard Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save As Dialog for Built-in Themes */}
      {showSaveAsDialog && (
        <div className="modal-overlay" onClick={() => setShowSaveAsDialog(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Save as Custom Theme</h3>
              <button
                className="modal-close"
                onClick={() => setShowSaveAsDialog(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <p>
                You're editing a built-in theme. To preserve the original, your changes will be saved as a new custom theme.
              </p>
              <div className="form-group">
                <label htmlFor="new-theme-name">New Theme Name</label>
                <input
                  id="new-theme-name"
                  type="text"
                  value={newThemeName}
                  onChange={(e) => setNewThemeName(e.target.value)}
                  className="form-input"
                  placeholder={`${metadata.name} (Custom)`}
                  autoFocus
                />
              </div>
            </div>
            <div className="modal-actions">
              <button
                className="btn btn-secondary"
                onClick={() => setShowSaveAsDialog(false)}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSaveAs}
                disabled={saving || !newThemeName.trim()}
              >
                {saving ? 'Saving...' : 'Save as New Theme'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
