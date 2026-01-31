import { useState, useEffect, useRef, useCallback } from 'react';
import { type Theme, type ThemeMetadata, type ThemeColors, type ColorLockState, type DerivedColorKey, type StrictOmit, typedKeys } from '../../shared/types';
import { toHex } from '../../shared/colorUtils';
import {
  deriveAllColors,
  getDefaultLockState,
  isBaseColor,
  isDerivedColor,
} from '../../shared/colorDerivation';
import { validateColorJson, type ValidationResult } from '../../shared/themeColorValidator';
import { Check, AlertTriangle, X, ChevronRight } from 'lucide-react';
import { Button } from '@/renderer/components/ui/button';
import { Input } from '@/renderer/components/ui/input';
import { Label } from '@/renderer/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/renderer/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/renderer/components/ui/dialog';

// Import shared preview components
import { TerminalPreview } from './previews/TerminalPreview';
import { CodePreview } from './previews/CodePreview';
import { ColorSwatches } from './previews/ColorSwatches';
import { ColorEditorPanel } from './ColorEditorPanel';

type StarterType = 'preset' | 'image' | 'blank';

interface ThemeEditorProps {
  initialTheme?: ThemeMetadata;
  sourceTheme?: Theme;
  mode: 'edit' | 'create';
  starterType?: StarterType;
  presetKey?: string;
  /** Optional colors to start with (e.g., from preview customize flow) */
  initialColors?: ThemeColors;
  /** Optional source image data URL to save as wallpaper when creating theme */
  imageDataUrl?: string;
  onSave?: () => void;
  onSaveAndApply?: () => void;
  onBack?: () => void;
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
const presetSchemes: Record<string, { name: string; colors: ThemeColors }> = {
  tokyoNight: {
    name: 'Tokyo Night (Dark)',
    colors: defaultColors,
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
  colors: defaultColors,
};

export function ThemeEditor({
  initialTheme,
  sourceTheme,
  mode,
  starterType,
  presetKey,
  initialColors,
  imageDataUrl,
  onSave,
  onSaveAndApply,
  onBack,
}: ThemeEditorProps) {
  // Initialize metadata based on mode, starter type, and initial colors
  const getInitialMetadata = (): ThemeMetadata => {
    if (initialTheme) return initialTheme;
    if (initialColors) return { name: 'New Theme', colors: initialColors };
    if (mode === 'create' && starterType === 'preset' && presetKey && presetSchemes[presetKey]) {
      return { name: 'New Theme', colors: { ...presetSchemes[presetKey].colors } };
    }
    return defaultMetadata;
  };

  const [metadata, setMetadata] = useState<ThemeMetadata>(getInitialMetadata);
  const [saving, setSaving] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showSaveAsDialog, setShowSaveAsDialog] = useState(false);
  const [newThemeName, setNewThemeName] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [pasteInput, setPasteInput] = useState('');
  const [pasteValidation, setPasteValidation] = useState<ValidationResult>({
    isValid: false,
    validColors: {},
    invalidColors: [],
    message: '',
    status: 'empty',
  });

  // Color editor panel state
  const [selectedColorKey, setSelectedColorKey] = useState<keyof ThemeColors | null>(null);

  // Lock state for derived colors (true = manually set, false = auto-calculated)
  const [colorLocks, setColorLocks] = useState<ColorLockState>(() =>
    initialTheme?.colorLocks || getDefaultLockState()
  );

  // Refs to track latest values for stable callbacks
  const metadataRef = useRef(metadata);
  const colorLocksRef = useRef(colorLocks);

  // Keep refs in sync with state
  useEffect(() => {
    metadataRef.current = metadata;
  }, [metadata]);

  useEffect(() => {
    colorLocksRef.current = colorLocks;
  }, [colorLocks]);

  // Update when initialTheme changes
  useEffect(() => {
    if (initialTheme) {
      setMetadata(initialTheme);
      if (initialTheme.colorLocks) {
        setColorLocks(initialTheme.colorLocks);
      } else if (sourceTheme) {
        // Existing theme without lock state - treat all derived colors as locked
        const allLocked: ColorLockState = {
          brightBlack: true,
          brightRed: true,
          brightGreen: true,
          brightYellow: true,
          brightBlue: true,
          brightMagenta: true,
          brightCyan: true,
          brightWhite: true,
          cursor: true,
          selection: true,
          border: true,
          accent: true,
        };
        setColorLocks(allLocked);
      } else {
        setColorLocks(getDefaultLockState());
      }
    }
  }, [initialTheme, sourceTheme]);

  // Validate paste input as it changes
  useEffect(() => {
    setPasteValidation(validateColorJson(pasteInput));
  }, [pasteInput]);

  // Apply pasted colors to the theme
  const handleApplyPastedColors = useCallback(() => {
    if (!pasteValidation.isValid) return;

    const currentMetadata = metadataRef.current;
    const currentLocks = colorLocksRef.current;

    const newLocks: ColorLockState = { ...currentLocks };
    const providedColorKeys = typedKeys(pasteValidation.validColors);

    for (const key of providedColorKeys) {
      if (key in newLocks) {
        (newLocks as Record<string, boolean>)[key] = true;
      }
    }

    const newColors = deriveAllColors(
      { ...currentMetadata.colors, ...pasteValidation.validColors },
      newLocks,
      currentMetadata.colors
    );

    setMetadata({ ...currentMetadata, colors: newColors, colorLocks: newLocks });
    setColorLocks(newLocks);
    setHasChanges(true);
    setPasteInput('');
  }, [pasteValidation]);

  // Handle color click from preview components
  const handleColorClick = useCallback((colorKey: keyof ThemeColors) => {
    setSelectedColorKey(colorKey);
  }, []);

  // Handle color change from ColorEditorPanel
  const handleColorChange = useCallback((colorKey: keyof ThemeColors, value: string) => {
    const convertedHex = toHex(value);
    if (!convertedHex) return;

    const currentMetadata = metadataRef.current;
    const currentLocks = colorLocksRef.current;

    // If editing a derived color, auto-lock it (unlink from base)
    let newLocks = currentLocks;
    if (isDerivedColor(colorKey) && !currentLocks[colorKey as DerivedColorKey]) {
      newLocks = { ...currentLocks, [colorKey]: true };
      setColorLocks(newLocks);
    }

    // Update the color
    const newBaseColors = {
      ...currentMetadata.colors,
      [colorKey]: convertedHex,
    };

    // If this is a base color, recalculate derived colors
    if (isBaseColor(colorKey)) {
      const recalculated = deriveAllColors(newBaseColors, newLocks, currentMetadata.colors);
      setMetadata({
        ...currentMetadata,
        colors: recalculated,
        colorLocks: newLocks,
      });
    } else {
      setMetadata({
        ...currentMetadata,
        colors: newBaseColors,
        colorLocks: newLocks,
      });
    }
    setHasChanges(true);
  }, []);

  // Reset derived color to auto-calculated
  const handleResetToAuto = useCallback((colorKey: DerivedColorKey) => {
    const currentMetadata = metadataRef.current;
    const currentLocks = colorLocksRef.current;

    const newLocks = { ...currentLocks, [colorKey]: false };
    setColorLocks(newLocks);

    // Recalculate the color
    const recalculated = deriveAllColors(currentMetadata.colors, newLocks, currentMetadata.colors);
    setMetadata({
      ...currentMetadata,
      colors: recalculated,
      colorLocks: newLocks,
    });
    setHasChanges(true);
  }, []);

  const updateMetadataField = (field: keyof StrictOmit<ThemeMetadata, 'colors'>, value: string) => {
    setMetadata({
      ...metadata,
      [field]: value,
    });
    setHasChanges(true);
  };

  const handleSave = async (andApply = false) => {
    if (sourceTheme && !sourceTheme.isCustom) {
      setShowSaveAsDialog(true);
      return;
    }

    try {
      setSaving(true);
      if (initialTheme && sourceTheme?.isCustom) {
        await window.electronAPI.updateTheme(initialTheme.name, metadata);
        if (andApply) {
          await window.electronAPI.applyTheme(initialTheme.name);
        }
      } else {
        await window.electronAPI.createTheme(metadata, imageDataUrl);
        if (andApply) {
          const themeDirName = metadata.name.toLowerCase().replace(/[^a-z0-9-]/g, '-');
          await window.electronAPI.applyTheme(themeDirName);
        }
      }
      setHasChanges(false);
      if (andApply && onSaveAndApply) {
        onSaveAndApply();
      } else if (onSave) {
        onSave();
      }
    } catch (error: unknown) {
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
      const newMetadata: ThemeMetadata = {
        ...metadata,
        name: newThemeName.trim(),
      };
      await window.electronAPI.createTheme(newMetadata, imageDataUrl);
      setHasChanges(false);
      setShowSaveAsDialog(false);
      setNewThemeName('');
      if (onSave) onSave();
    } catch (error: unknown) {
      console.error('Failed to save theme:', error);
      alert('Failed to save theme. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (hasChanges) {
      setShowCancelConfirm(true);
      return;
    }

    if (onBack) {
      onBack();
    } else {
      setMetadata(initialTheme || defaultMetadata);
      setHasChanges(false);
    }
  };

  const confirmCancel = () => {
    setShowCancelConfirm(false);
    setHasChanges(false);
    if (onBack) {
      onBack();
    } else {
      setMetadata(initialTheme || defaultMetadata);
    }
  };

  return (
    <div className="theme-editor-simplified">
      {/* Main preview area */}
      <div className="theme-editor-main">
        {/* Theme Name */}
        <div className="mb-6">
          <Label htmlFor="theme-name" className="text-sm font-medium">Theme Name</Label>
          <Input
            id="theme-name"
            value={metadata.name}
            onChange={(e) => updateMetadataField('name', e.target.value)}
            placeholder="My Custom Theme"
            className="mt-2 text-base max-w-md"
          />
        </div>

        {/* Preview Panels */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground">Terminal Preview</h3>
            <TerminalPreview
              colors={metadata.colors}
              onClick={handleColorClick}
            />
          </div>
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground">Code Preview</h3>
            <CodePreview
              colors={metadata.colors}
              onClick={handleColorClick}
            />
          </div>
        </div>

        {/* Color Swatches */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Color Palette</h3>
          <p className="text-xs text-muted-foreground mb-3">
            Click any color to edit it
          </p>
          <ColorSwatches
            colors={metadata.colors}
            onClick={handleColorClick}
            showLabels
          />
        </div>

        {/* Advanced Section - JSON Import */}
        <details className="editor-section mb-6">
          <summary className="editor-section-header">
            <ChevronRight size={14} className="editor-section-chevron" />
            <span>Advanced</span>
            <span className="text-[10px] text-muted-foreground ml-auto">JSON import</span>
          </summary>
          <div className="editor-section-content space-y-3">
            <textarea
              placeholder='{"background": "#1a1b26", ...}'
              className="w-full h-20 font-mono text-xs rounded-md border border-input bg-transparent px-3 py-2 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
              value={pasteInput}
              onChange={(e) => setPasteInput(e.target.value)}
            />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-h-[20px]">
                {pasteValidation.status === 'valid' && (
                  <span className="text-green-500 text-xs flex items-center gap-1">
                    <Check size={12} /> {pasteValidation.message}
                  </span>
                )}
                {pasteValidation.status === 'warning' && (
                  <span className="text-yellow-500 text-xs flex items-center gap-1">
                    <AlertTriangle size={12} /> {pasteValidation.message}
                  </span>
                )}
                {pasteValidation.status === 'error' && (
                  <span className="text-red-500 text-xs flex items-center gap-1">
                    <X size={12} /> {pasteValidation.message}
                  </span>
                )}
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleApplyPastedColors}
                disabled={!pasteValidation.isValid}
              >
                Apply
              </Button>
            </div>
          </div>
        </details>

        {/* Actions */}
        <div className="flex gap-2 pt-4 border-t border-border">
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button variant="secondary" onClick={() => handleSave(false)} disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
          <Button onClick={() => handleSave(true)} disabled={saving}>
            {saving ? 'Saving...' : 'Save & Apply'}
          </Button>
        </div>
      </div>

      {/* Color Editor Panel (slides in from right) */}
      {selectedColorKey && (
        <ColorEditorPanel
          colorKey={selectedColorKey}
          colorValue={metadata.colors[selectedColorKey]}
          isAutoLinked={isDerivedColor(selectedColorKey) && !colorLocks[selectedColorKey as DerivedColorKey]}
          onColorChange={handleColorChange}
          onResetToAuto={isDerivedColor(selectedColorKey) ? handleResetToAuto : undefined}
          onClose={() => setSelectedColorKey(null)}
        />
      )}

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={showCancelConfirm} onOpenChange={setShowCancelConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard Changes?</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Are you sure you want to discard them?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Editing</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmCancel}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Discard Changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Save As Dialog */}
      <Dialog open={showSaveAsDialog} onOpenChange={setShowSaveAsDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Save as Custom Theme</DialogTitle>
            <DialogDescription>
              You&apos;re editing a built-in theme. To preserve the original, your changes will be saved as a new custom theme.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="new-theme-name">New Theme Name</Label>
            <Input
              id="new-theme-name"
              value={newThemeName}
              onChange={(e) => setNewThemeName(e.target.value)}
              placeholder={`${metadata.name} (Custom)`}
              className="mt-2"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveAsDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveAs}
              disabled={saving || !newThemeName.trim()}
            >
              {saving ? 'Saving...' : 'Save as New Theme'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
