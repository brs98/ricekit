import { useState, useEffect, useRef, useCallback } from 'react';
import { Theme, ThemeMetadata, ThemeColors, ColorLockState, DerivedColorKey } from '../../shared/types';
import {
  isValidHexColor,
  toHex,
  detectColorFormat
} from '../../shared/colorUtils';
import {
  BaseColorKey,
  deriveAllColors,
  getDefaultLockState,
  getDerivationDescription,
  isBaseColor,
} from '../../shared/colorDerivation';
import { validateColorJson, ValidationResult } from '../../shared/themeColorValidator';
// node-vibrant is dynamically imported when needed (in handleImageSelected)
import { Check, AlertTriangle, X, Lock, Unlock } from 'lucide-react';
import { Button } from '@/renderer/components/ui/button';
import { Input } from '@/renderer/components/ui/input';
import { Label } from '@/renderer/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/renderer/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/renderer/components/ui/dialog';
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
  author: 'Unknown',
  description: 'A custom theme',
  version: '1.0.0',
  colors: defaultColors,
};

const formatColorName = (key: string): string => {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
};

interface ColorInputProps {
  colorKey: keyof ThemeColors;
  colorValue: string;
  isSelected: boolean;
  error?: string;
  onColorChange: (colorKey: keyof ThemeColors, value: string) => void;
  onFocus: (colorKey: keyof ThemeColors) => void;
}

function ColorInput({ colorKey, colorValue, isSelected, error, onColorChange, onFocus }: ColorInputProps) {
  const hasError = Boolean(error);

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <Label className="w-24 text-xs shrink-0">{formatColorName(colorKey)}</Label>
        <div className="flex items-center gap-2 flex-1">
          <input
            type="color"
            value={isValidHexColor(colorValue) ? colorValue : '#000000'}
            onChange={(e) => onColorChange(colorKey, e.target.value)}
            className="w-8 h-8 rounded-[4px] border border-border cursor-pointer"
            onClick={() => onFocus(colorKey)}
            disabled={!isValidHexColor(colorValue)}
          />
          <Input
            type="text"
            value={colorValue}
            onChange={(e) => onColorChange(colorKey, e.target.value)}
            className={`flex-1 font-mono text-xs h-8 ${isSelected ? 'ring-2 ring-primary' : ''} ${hasError ? 'border-destructive' : ''}`}
            onFocus={() => onFocus(colorKey)}
            placeholder="#FF5733"
          />
        </div>
      </div>
      {error && (
        <p className="text-xs text-destructive pl-24">{error}</p>
      )}
    </div>
  );
}

// Component for derived colors with lock/unlock toggle
interface DerivedColorInputProps {
  colorKey: DerivedColorKey;
  colorValue: string;
  isLocked: boolean;
  isSelected: boolean;
  error?: string;
  onColorChange: (colorKey: DerivedColorKey, value: string) => void;
  onToggleLock: (colorKey: DerivedColorKey) => void;
  onFocus: (colorKey: keyof ThemeColors) => void;
}

function DerivedColorInput({
  colorKey,
  colorValue,
  isLocked,
  isSelected,
  error,
  onColorChange,
  onToggleLock,
  onFocus,
}: DerivedColorInputProps) {
  const hasError = Boolean(error);
  const derivationHint = getDerivationDescription(colorKey);

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <Label className="w-24 text-xs shrink-0">{formatColorName(colorKey)}</Label>
        <div className="flex items-center gap-2 flex-1">
          <button
            type="button"
            onClick={() => onToggleLock(colorKey)}
            className={`w-8 h-8 rounded-[4px] border flex items-center justify-center text-sm transition-colors ${
              isLocked
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border text-muted-foreground hover:border-primary/50'
            }`}
            title={isLocked ? 'Locked (manual override) - click to auto-calculate' : 'Auto-calculated - click to lock'}
          >
            {isLocked ? <Lock size={14} /> : <Unlock size={14} />}
          </button>
          <input
            type="color"
            value={isValidHexColor(colorValue) ? colorValue : '#000000'}
            onChange={(e) => {
              if (!isLocked) onToggleLock(colorKey); // Auto-lock when manually changing
              onColorChange(colorKey, e.target.value);
            }}
            className="w-8 h-8 rounded-[4px] border border-border cursor-pointer"
            onClick={() => onFocus(colorKey)}
            disabled={!isValidHexColor(colorValue)}
          />
          <Input
            type="text"
            value={colorValue}
            onChange={(e) => {
              if (!isLocked) onToggleLock(colorKey); // Auto-lock when manually changing
              onColorChange(colorKey, e.target.value);
            }}
            className={`flex-1 font-mono text-xs h-8 ${isSelected ? 'ring-2 ring-primary' : ''} ${hasError ? 'border-destructive' : ''} ${!isLocked ? 'text-muted-foreground' : ''}`}
            onFocus={() => onFocus(colorKey)}
            placeholder="#FF5733"
            readOnly={!isLocked}
          />
        </div>
      </div>
      {!isLocked && (
        <p className="text-[10px] text-muted-foreground pl-24">{derivationHint}</p>
      )}
      {error && (
        <p className="text-xs text-destructive pl-24">{error}</p>
      )}
    </div>
  );
}

export function ThemeEditor({ initialTheme, sourceTheme, onSave, onCancel }: ThemeEditorProps) {
  const [metadata, setMetadata] = useState<ThemeMetadata>(initialTheme || defaultMetadata);
  const [selectedColor, setSelectedColor] = useState<keyof ThemeColors | null>(null);
  const [saving, setSaving] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showSaveAsDialog, setShowSaveAsDialog] = useState(false);
  const [newThemeName, setNewThemeName] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<string>('');
  const [colorErrors, setColorErrors] = useState<{ [key in keyof ThemeColors]?: string }>({});
  const [extractingColors, setExtractingColors] = useState(false);
  // Use lazy initializer to avoid calling getDefaultLockState() on every render
  const [colorLocks, setColorLocks] = useState<ColorLockState>(() =>
    initialTheme?.colorLocks || getDefaultLockState()
  );
  const [pasteInput, setPasteInput] = useState('');
  const [pasteValidation, setPasteValidation] = useState<ValidationResult>({
    isValid: false,
    validColors: {},
    invalidColors: [],
    message: '',
    status: 'empty',
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Refs to track latest values for stable callbacks (avoids recreating callbacks on every state change)
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
      // If theme has lock state, use it; otherwise for existing themes, lock all (preserve existing colors)
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
  // Uses refs for stable callback - only depends on pasteValidation which triggers UI updates
  const handleApplyPastedColors = useCallback(() => {
    if (!pasteValidation.isValid) return;

    const currentMetadata = metadataRef.current;
    const currentLocks = colorLocksRef.current;

    // Determine which colors were explicitly provided vs which need derivation
    const newLocks: ColorLockState = { ...currentLocks };
    const providedColorKeys = Object.keys(pasteValidation.validColors) as (keyof ThemeColors)[];

    // Lock colors that were explicitly provided, unlock ones that weren't
    for (const key of providedColorKeys) {
      if (key in newLocks) {
        (newLocks as Record<string, boolean>)[key] = true;
      }
    }

    // Apply valid colors and derive the rest
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

  const applyPreset = (presetKey: string) => {
    if (presetKey && presetSchemes[presetKey]) {
      const preset = presetSchemes[presetKey];
      setMetadata({
        ...metadata,
        colors: { ...preset.colors },
      });
      setSelectedPreset(presetKey);
      setHasChanges(true);
    }
  };

  const handleImageImport = () => {
    fileInputRef.current?.click();
  };

  const handleImageSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setExtractingColors(true);
    try {
      // Dynamically import node-vibrant only when color extraction is triggered
      const { Vibrant } = await import('node-vibrant/browser');
      const imageUrl = URL.createObjectURL(file);
      const palette = await Vibrant.from(imageUrl).getPalette();
      URL.revokeObjectURL(imageUrl);

      const extractedColors: Partial<ThemeColors> = {};

      if (palette.DarkVibrant) {
        extractedColors.background = palette.DarkVibrant.hex;
        extractedColors.black = palette.DarkVibrant.hex;
      }

      if (palette.LightVibrant) {
        extractedColors.foreground = palette.LightVibrant.hex;
        extractedColors.white = palette.LightVibrant.hex;
        extractedColors.cursor = palette.LightVibrant.hex;
      }

      if (palette.Vibrant) {
        extractedColors.accent = palette.Vibrant.hex;
        extractedColors.blue = palette.Vibrant.hex;
      }

      if (palette.Muted) {
        extractedColors.selection = palette.Muted.hex;
        extractedColors.border = palette.Muted.hex;
        extractedColors.brightBlack = palette.Muted.hex;
      }

      if (palette.DarkMuted) {
        extractedColors.brightBlack = palette.DarkMuted.hex;
      }

      if (palette.LightMuted) {
        extractedColors.brightWhite = palette.LightMuted.hex;
      }

      extractedColors.red = palette.Vibrant?.hex || '#ff5555';
      extractedColors.brightRed = palette.Vibrant?.hex || '#ff6e6e';
      extractedColors.green = palette.Muted?.hex || '#50fa7b';
      extractedColors.brightGreen = palette.LightMuted?.hex || '#69ff94';
      extractedColors.yellow = palette.LightVibrant?.hex || '#f1fa8c';
      extractedColors.brightYellow = palette.LightVibrant?.hex || '#ffffa5';
      extractedColors.magenta = palette.Vibrant?.hex || '#ff79c6';
      extractedColors.brightMagenta = palette.Vibrant?.hex || '#ff92df';
      extractedColors.cyan = palette.LightVibrant?.hex || '#8be9fd';
      extractedColors.brightCyan = palette.LightVibrant?.hex || '#a4ffff';
      extractedColors.brightBlue = palette.Vibrant?.hex || '#bd93f9';

      setMetadata({
        ...metadata,
        colors: {
          ...metadata.colors,
          ...extractedColors,
        },
      });
      setHasChanges(true);
      setSelectedPreset('');

    } catch (error) {
      console.error('Error extracting colors from image:', error);
      alert('Failed to extract colors from image. Please try a different image.');
    } finally {
      setExtractingColors(false);
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  // Toggle lock state for a derived color
  // Uses refs for stable callback - no dependencies needed
  const toggleLock = useCallback((colorKey: DerivedColorKey) => {
    const currentLocks = colorLocksRef.current;
    const currentMetadata = metadataRef.current;

    const newLocked = !currentLocks[colorKey];
    const newLocks = { ...currentLocks, [colorKey]: newLocked };
    setColorLocks(newLocks);

    // If unlocking, recalculate this color from base colors
    if (!newLocked) {
      const recalculated = deriveAllColors(currentMetadata.colors, newLocks, currentMetadata.colors);
      setMetadata({
        ...currentMetadata,
        colors: recalculated,
        colorLocks: newLocks,
      });
    } else {
      setMetadata({
        ...currentMetadata,
        colorLocks: newLocks,
      });
    }
    setHasChanges(true);
  }, []);

  // Update a derived color (only when locked)
  // Uses refs for stable callback - no dependencies needed
  const updateDerivedColor = useCallback((colorKey: DerivedColorKey, value: string) => {
    const format = detectColorFormat(value);
    let hexValue = value;
    let errorMessage = '';

    if (value.trim() === '') {
      errorMessage = 'Color cannot be empty';
    } else if (format === 'invalid') {
      errorMessage = 'Invalid color format. Use hex (#FF5733), RGB (255, 87, 51), or HSL (360, 100%, 50%)';
    } else {
      const convertedHex = toHex(value);
      if (convertedHex) {
        hexValue = convertedHex;
      } else {
        errorMessage = 'Failed to convert color to hex format';
      }
    }

    const currentMetadata = metadataRef.current;
    setMetadata({
      ...currentMetadata,
      colors: {
        ...currentMetadata.colors,
        [colorKey]: hexValue,
      },
    });
    setHasChanges(true);

    if (errorMessage) {
      setColorErrors(prev => ({ ...prev, [colorKey]: errorMessage }));
    } else {
      setColorErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[colorKey];
        return newErrors;
      });
    }
  }, []);

  // Update a base color and recalculate derived colors
  // Uses refs for stable callback - no dependencies needed
  const updateColor = useCallback((colorKey: keyof ThemeColors, value: string) => {
    const format = detectColorFormat(value);
    let hexValue = value;
    let errorMessage = '';

    if (value.trim() === '') {
      errorMessage = 'Color cannot be empty';
    } else if (format === 'invalid') {
      errorMessage = 'Invalid color format. Use hex (#FF5733), RGB (255, 87, 51), or HSL (360, 100%, 50%)';
    } else {
      const convertedHex = toHex(value);
      if (convertedHex) {
        hexValue = convertedHex;
      } else {
        errorMessage = 'Failed to convert color to hex format';
      }
    }

    const currentMetadata = metadataRef.current;
    const currentLocks = colorLocksRef.current;

    // Update the color
    const newBaseColors = {
      ...currentMetadata.colors,
      [colorKey]: hexValue,
    };

    // If this is a base color, recalculate derived colors
    if (isBaseColor(colorKey)) {
      const recalculated = deriveAllColors(newBaseColors, currentLocks, currentMetadata.colors);
      setMetadata({
        ...currentMetadata,
        colors: recalculated,
        colorLocks: currentLocks,
      });
    } else {
      setMetadata({
        ...currentMetadata,
        colors: newBaseColors,
      });
    }
    setHasChanges(true);

    if (errorMessage) {
      setColorErrors(prev => ({
        ...prev,
        [colorKey]: errorMessage
      }));
    } else {
      setColorErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[colorKey];
        return newErrors;
      });
    }
  }, []);

  const updateMetadataField = (field: keyof Omit<ThemeMetadata, 'colors'>, value: string) => {
    setMetadata({
      ...metadata,
      [field]: value,
    });
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (Object.keys(colorErrors).length > 0) {
      alert('Please fix all color validation errors before saving.');
      return;
    }

    if (sourceTheme && !sourceTheme.isCustom) {
      setShowSaveAsDialog(true);
      return;
    }

    try {
      setSaving(true);
      if (initialTheme && sourceTheme?.isCustom) {
        await window.electronAPI.updateTheme(initialTheme.name, metadata);
      } else {
        await window.electronAPI.createTheme(metadata);
      }
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
    if (hasChanges) {
      setShowCancelConfirm(true);
      return;
    }

    if (onCancel) {
      onCancel();
    } else {
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
      setMetadata(initialTheme || defaultMetadata);
    }
  };

  // Base colors - the 10 colors users need to define
  const baseColorKeys: BaseColorKey[] = [
    'background', 'foreground',
    'black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white',
  ];

  // Derived colors - auto-calculated from base colors
  const derivedColorKeys: DerivedColorKey[] = [
    'accent', 'cursor', 'selection', 'border',
    'brightBlack', 'brightRed', 'brightGreen', 'brightYellow',
    'brightBlue', 'brightMagenta', 'brightCyan', 'brightWhite',
  ];

  // For preview palette display
  const mainColorKeys: (keyof ThemeColors)[] = [
    'background', 'foreground', 'cursor', 'selection', 'accent', 'border',
  ];

  const ansiColorKeys: (keyof ThemeColors)[] = [
    'black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white',
  ];

  const brightColorKeys: (keyof ThemeColors)[] = [
    'brightBlack', 'brightRed', 'brightGreen', 'brightYellow',
    'brightBlue', 'brightMagenta', 'brightCyan', 'brightWhite',
  ];

  return (
    <div className="theme-editor">
      <div className="theme-editor-sidebar">
        <div className="space-y-6">
          {/* Preset Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Start from Preset</h3>
            <Select value={selectedPreset} onValueChange={applyPreset}>
              <SelectTrigger>
                <SelectValue placeholder="Select a preset..." />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(presetSchemes).map(([key, preset]) => (
                  <SelectItem key={key} value={key}>
                    {preset.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Choose a preset color scheme to start with, then customize colors below
            </p>
          </div>

          {/* Image Import Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Import from Image</h3>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelected}
              className="hidden"
            />
            <Button
              variant="secondary"
              onClick={handleImageImport}
              disabled={extractingColors}
              className="w-full"
            >
              {extractingColors ? 'Extracting Colors...' : 'Choose Image'}
            </Button>
            <p className="text-xs text-muted-foreground">
              Select an image to extract dominant colors automatically
            </p>
          </div>

          {/* Paste Colors Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Paste Colors</h3>
            <textarea
              placeholder='{"background": "#1a1b26", "foreground": "#c0caf5", ...}'
              className="w-full h-20 font-mono text-xs rounded-[8px] border border-input bg-transparent px-3 py-2 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
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
                Apply Colors
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Copy example:</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={() => {
                  const baseExample = JSON.stringify({
                    background: "#1a1b26",
                    foreground: "#c0caf5",
                    black: "#15161e",
                    red: "#f7768e",
                    green: "#9ece6a",
                    yellow: "#e0af68",
                    blue: "#7aa2f7",
                    magenta: "#bb9af7",
                    cyan: "#7dcfff",
                    white: "#a9b1d6"
                  }, null, 2);
                  navigator.clipboard.writeText(baseExample);
                }}
              >
                Base (10)
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={() => {
                  const fullExample = JSON.stringify({
                    background: "#1a1b26",
                    foreground: "#c0caf5",
                    cursor: "#c0caf5",
                    selection: "#33467c",
                    black: "#15161e",
                    red: "#f7768e",
                    green: "#9ece6a",
                    yellow: "#e0af68",
                    blue: "#7aa2f7",
                    magenta: "#bb9af7",
                    cyan: "#7dcfff",
                    white: "#a9b1d6",
                    brightBlack: "#414868",
                    brightRed: "#f7768e",
                    brightGreen: "#9ece6a",
                    brightYellow: "#e0af68",
                    brightBlue: "#7aa2f7",
                    brightMagenta: "#bb9af7",
                    brightCyan: "#7dcfff",
                    brightWhite: "#c0caf5",
                    accent: "#7aa2f7",
                    border: "#414868"
                  }, null, 2);
                  navigator.clipboard.writeText(fullExample);
                }}
              >
                Full (22)
              </Button>
            </div>
          </div>

          {/* Theme Information Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Theme Information</h3>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="theme-name" className="text-xs">Theme Name</Label>
                <Input
                  id="theme-name"
                  value={metadata.name}
                  onChange={(e) => updateMetadataField('name', e.target.value)}
                  placeholder="My Custom Theme"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="theme-author" className="text-xs">Author</Label>
                <Input
                  id="theme-author"
                  value={metadata.author}
                  onChange={(e) => updateMetadataField('author', e.target.value)}
                  placeholder="Your Name"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="theme-description" className="text-xs">Description</Label>
                <textarea
                  id="theme-description"
                  value={metadata.description}
                  onChange={(e) => updateMetadataField('description', e.target.value)}
                  className="flex min-h-[60px] w-full rounded-[8px] border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  placeholder="A brief description..."
                  rows={2}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="theme-version" className="text-xs">Version</Label>
                <Input
                  id="theme-version"
                  value={metadata.version}
                  onChange={(e) => updateMetadataField('version', e.target.value)}
                  placeholder="1.0.0"
                />
              </div>
            </div>
          </div>

          {/* Base Colors Section - the 10 colors users define */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Base Colors</h3>
              <span className="text-xs text-muted-foreground">10 colors</span>
            </div>
            <p className="text-xs text-muted-foreground -mt-1">
              Define these colors - the rest will be auto-calculated
            </p>
            <div className="space-y-2">
              {baseColorKeys.map((key) => (
                <ColorInput
                  key={key}
                  colorKey={key}
                  colorValue={metadata.colors[key]}
                  isSelected={selectedColor === key}
                  error={colorErrors[key]}
                  onColorChange={updateColor}
                  onFocus={setSelectedColor}
                />
              ))}
            </div>
          </div>

          {/* Derived Colors Section - auto-calculated with optional override */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Derived Colors</h3>
              <span className="text-xs text-muted-foreground">12 colors</span>
            </div>
            <p className="text-xs text-muted-foreground -mt-1">
              Auto-calculated from base colors. Click lock to override.
            </p>
            <div className="space-y-2">
              {derivedColorKeys.map((key) => (
                <DerivedColorInput
                  key={key}
                  colorKey={key}
                  colorValue={metadata.colors[key]}
                  isLocked={colorLocks[key] || false}
                  isSelected={selectedColor === key}
                  error={colorErrors[key]}
                  onColorChange={updateDerivedColor}
                  onToggleLock={toggleLock}
                  onFocus={setSelectedColor}
                />
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4 border-t border-border">
            <Button variant="outline" onClick={handleCancel} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving} className="flex-1">
              {saving ? 'Saving...' : 'Save Theme'}
            </Button>
          </div>
        </div>
      </div>

      <div className="theme-editor-preview">
        <h3 className="text-lg font-semibold mb-4">Live Preview</h3>

        <div className="space-y-6">
          {/* Terminal Preview */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Terminal Preview</h4>
            <div
              className="rounded-[10px] p-4 font-mono text-sm border"
              style={{
                backgroundColor: metadata.colors.background,
                color: metadata.colors.foreground,
                borderColor: metadata.colors.border,
              }}
            >
              <div>
                <span style={{ color: metadata.colors.green }}>➜</span>
                <span style={{ color: metadata.colors.cyan }}> ~/projects</span>
                <span style={{ color: metadata.colors.blue }}> git:(</span>
                <span style={{ color: metadata.colors.red }}>main</span>
                <span style={{ color: metadata.colors.blue }}>)</span>
                <span> $ ls -la</span>
              </div>
              <div style={{ color: metadata.colors.blue }}>
                drwxr-xr-x  10 user  staff   320 Dec  6 10:00 .
              </div>
              <div style={{ color: metadata.colors.green }}>
                -rw-r--r--   1 user  staff   150 Dec  6 10:00 README.md
              </div>
              <div style={{ color: metadata.colors.cyan }}>
                drwxr-xr-x   8 user  staff   256 Dec  6 09:30 src
              </div>
              <div>
                <span style={{ color: metadata.colors.green }}>➜</span>
                <span style={{ color: metadata.colors.cyan }}> ~/projects</span>
                <span> $ </span>
                <span
                  className="inline-block w-2 h-4 animate-pulse"
                  style={{ backgroundColor: metadata.colors.cursor }}
                />
              </div>
            </div>
          </div>

          {/* Code Preview */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Code Preview</h4>
            <div
              className="rounded-[10px] p-4 font-mono text-sm border"
              style={{
                backgroundColor: metadata.colors.background,
                color: metadata.colors.foreground,
                borderColor: metadata.colors.border,
              }}
            >
              <pre className="whitespace-pre-wrap">
                <span style={{ color: metadata.colors.magenta }}>import</span>
                {' { useState } '}
                <span style={{ color: metadata.colors.magenta }}>from</span>
                {' '}
                <span style={{ color: metadata.colors.green }}>&apos;react&apos;</span>;
                {'\n\n'}
                <span style={{ color: metadata.colors.magenta }}>function</span>
                {' '}
                <span style={{ color: metadata.colors.yellow }}>App</span>
                {'() {\n  '}
                <span style={{ color: metadata.colors.magenta }}>const</span>
                {' [count, setCount] = '}
                <span style={{ color: metadata.colors.cyan }}>useState</span>
                {'('}
                <span style={{ color: metadata.colors.red }}>0</span>
                {');\n  '}
                <span style={{ color: metadata.colors.magenta }}>return</span>
                {' <div>Count: {'}
                <span style={{ color: metadata.colors.red }}>count</span>
                {'}</div>;\n}'}
              </pre>
            </div>
          </div>

          {/* Color Palette */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Color Palette</h4>
            <div className="space-y-2">
              <div className="flex gap-2 flex-wrap">
                {mainColorKeys.map((key) => (
                  <div key={key} className="text-center">
                    <div
                      className="w-10 h-10 rounded-[6px] border border-border/50"
                      style={{ backgroundColor: metadata.colors[key] }}
                      title={formatColorName(key)}
                    />
                    <div className="text-[10px] text-muted-foreground mt-1 truncate w-10">
                      {formatColorName(key).split(' ')[0]}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-1">
                {ansiColorKeys.map((key) => (
                  <div
                    key={key}
                    className="w-6 h-6 rounded-[4px] border border-border/30"
                    style={{ backgroundColor: metadata.colors[key] }}
                    title={formatColorName(key)}
                  />
                ))}
              </div>
              <div className="flex gap-1">
                {brightColorKeys.map((key) => (
                  <div
                    key={key}
                    className="w-6 h-6 rounded-[4px] border border-border/30"
                    style={{ backgroundColor: metadata.colors[key] }}
                    title={formatColorName(key)}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

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
