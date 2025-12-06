import { useState, useEffect } from 'react';
import { ThemeMetadata, ThemeColors } from '../../shared/types';

interface ThemeEditorProps {
  initialTheme?: ThemeMetadata;
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

const defaultMetadata: ThemeMetadata = {
  name: 'New Theme',
  author: 'Unknown',
  description: 'A custom theme',
  version: '1.0.0',
  colors: defaultColors,
};

export function ThemeEditor({ initialTheme, onSave, onCancel }: ThemeEditorProps) {
  const [metadata, setMetadata] = useState<ThemeMetadata>(initialTheme || defaultMetadata);
  const [selectedColor, setSelectedColor] = useState<keyof ThemeColors | null>(null);
  const [saving, setSaving] = useState(false);

  // Update when initialTheme changes
  useEffect(() => {
    if (initialTheme) {
      setMetadata(initialTheme);
    }
  }, [initialTheme]);

  const updateColor = (colorKey: keyof ThemeColors, value: string) => {
    setMetadata({
      ...metadata,
      colors: {
        ...metadata.colors,
        [colorKey]: value,
      },
    });
  };

  const updateMetadataField = (field: keyof Omit<ThemeMetadata, 'colors'>, value: string) => {
    setMetadata({
      ...metadata,
      [field]: value,
    });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await window.electronAPI.createTheme(metadata);
      if (onSave) onSave();
    } catch (error) {
      console.error('Failed to save theme:', error);
      alert('Failed to save theme. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
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
    </div>
  );
}
