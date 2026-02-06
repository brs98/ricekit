import { useState, useRef } from 'react';
import { Palette, Image, FileCode, ChevronRight, Loader2 } from 'lucide-react';
import type { ThemeColors } from '../../shared/types';
import { deriveAllColors, getDefaultLockState, enforceBackgroundLightness } from '../../shared/colorDerivation';
import { assignSwatchesToAnsiSlots, type SwatchInput } from '../../shared/hueMapping';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/renderer/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/renderer/components/ui/select';
import { Button } from '@/renderer/components/ui/button';

export type StarterType = 'preset' | 'image' | 'blank';

export interface ImageThemeResult {
  colors: ThemeColors;
  imageDataUrl: string;
  suggestedName: string;
  isLight: boolean;
}

interface StarterPickerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (starterType: StarterType, presetKey?: string, imageResult?: ImageThemeResult) => void;
}

// Preset options matching ThemeEditor's presetSchemes
const presetOptions = [
  { key: 'tokyoNight', name: 'Tokyo Night (Dark)' },
  { key: 'catppuccinMocha', name: 'Catppuccin Mocha (Dark)' },
  { key: 'catppuccinLatte', name: 'Catppuccin Latte (Light)' },
  { key: 'nord', name: 'Nord (Dark)' },
  { key: 'gruvboxDark', name: 'Gruvbox (Dark)' },
  { key: 'dracula', name: 'Dracula (Dark)' },
];

interface StarterOptionProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  selected: boolean;
  onClick: () => void;
  disabled?: boolean;
  children?: React.ReactNode;
}

function StarterOption({ icon, title, description, selected, onClick, disabled, children }: StarterOptionProps) {
  return (
    <button
      type="button"
      className={`w-full text-left p-4 rounded-lg border transition-all ${
        selected
          ? 'border-primary bg-primary/5 ring-1 ring-primary'
          : 'border-border hover:border-primary/50 hover:bg-accent/50'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      onClick={onClick}
      disabled={disabled}
    >
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-md ${selected ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium">{title}</div>
          <div className="text-sm text-muted-foreground mt-0.5">{description}</div>
          {children && <div className="mt-3">{children}</div>}
        </div>
      </div>
    </button>
  );
}

export function StarterPickerModal({ open, onOpenChange, onSelect }: StarterPickerModalProps) {
  const [selectedType, setSelectedType] = useState<StarterType>('preset');
  const [selectedPreset, setSelectedPreset] = useState<string>(presetOptions[0]?.key ?? 'tokyoNight');
  const [extracting, setExtracting] = useState(false);
  const [extractionMode, setExtractionMode] = useState<'dark' | 'light'>('dark');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleContinue = () => {
    if (selectedType === 'preset') {
      onSelect('preset', selectedPreset);
    } else if (selectedType === 'image') {
      // Trigger file picker for image
      fileInputRef.current?.click();
    } else {
      onSelect(selectedType);
    }
  };

  const handleImageSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    console.log('File selected:', file);
    if (!file) return;

    setExtracting(true);
    console.log('Starting color extraction...');
    try {
      // Dynamically import node-vibrant only when needed
      const vibrantModule = await import('node-vibrant/browser');
      const Vibrant = vibrantModule.Vibrant;
      console.log('Vibrant module loaded:', vibrantModule);
      console.log('Vibrant constructor:', Vibrant);

      // Use object URL for Vibrant (more reliable than data URL)
      const objectUrl = URL.createObjectURL(file);

      // Extract palette
      console.log('Extracting from objectUrl:', objectUrl);
      const palette = await Vibrant.from(objectUrl).getPalette();
      console.log('Palette extracted:', palette);

      // Clean up the object URL
      URL.revokeObjectURL(objectUrl);

      // Create data URL for the image (to pass to preview for "pick background" feature)
      const imageDataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // Build base colors from palette based on extraction mode
      const baseColors: Partial<ThemeColors> = {};
      const isLight = extractionMode === 'light';

      if (isLight) {
        // Light mode: use light colors for background, dark for foreground
        if (palette.LightVibrant) {
          baseColors.background = palette.LightVibrant.hex;
          baseColors.white = palette.LightVibrant.hex;
        } else if (palette.LightMuted) {
          baseColors.background = palette.LightMuted.hex;
          baseColors.white = palette.LightMuted.hex;
        }

        if (palette.DarkVibrant) {
          baseColors.foreground = palette.DarkVibrant.hex;
          baseColors.black = palette.DarkVibrant.hex;
        } else if (palette.DarkMuted) {
          baseColors.foreground = palette.DarkMuted.hex;
          baseColors.black = palette.DarkMuted.hex;
        }
      } else {
        // Dark mode: use dark colors for background, light for foreground (existing logic)
        if (palette.DarkVibrant) {
          baseColors.background = palette.DarkVibrant.hex;
          baseColors.black = palette.DarkVibrant.hex;
        } else if (palette.DarkMuted) {
          baseColors.background = palette.DarkMuted.hex;
          baseColors.black = palette.DarkMuted.hex;
        }

        if (palette.LightVibrant) {
          baseColors.foreground = palette.LightVibrant.hex;
          baseColors.white = palette.LightVibrant.hex;
        } else if (palette.LightMuted) {
          baseColors.foreground = palette.LightMuted.hex;
          baseColors.white = palette.LightMuted.hex;
        }
      }

      // Hue-aware ANSI color assignment
      const swatchEntries: SwatchInput[] = [];
      for (const name of ['Vibrant', 'Muted', 'DarkVibrant', 'DarkMuted', 'LightVibrant', 'LightMuted'] as const) {
        const swatch = palette[name];
        if (swatch) {
          swatchEntries.push({ hex: swatch.hex, population: swatch.population });
        }
      }

      const ansiColors = assignSwatchesToAnsiSlots(swatchEntries);
      baseColors.red = ansiColors.red;
      baseColors.green = ansiColors.green;
      baseColors.yellow = ansiColors.yellow;
      baseColors.blue = ansiColors.blue;
      baseColors.magenta = ansiColors.magenta;
      baseColors.cyan = ansiColors.cyan;

      // Enforce background lightness constraints
      // node-vibrant extracts colors relative to image content, not absolute thresholds
      // This ensures dark themes are truly dark and light themes are truly light
      if (baseColors.background) {
        baseColors.background = enforceBackgroundLightness(baseColors.background, isLight);
      }

      // Derive all colors (bright variants, selection, border, etc.)
      const fullColors = deriveAllColors(baseColors, getDefaultLockState(), undefined, isLight);

      // Generate suggested name from filename
      const suggestedName = file.name
        .replace(/\.[^/.]+$/, '') // Remove extension
        .replace(/[-_]/g, ' ')   // Replace dashes/underscores with spaces
        .replace(/\b\w/g, c => c.toUpperCase()); // Title case

      const result: ImageThemeResult = {
        colors: fullColors,
        imageDataUrl,
        suggestedName: suggestedName || 'Image Theme',
        isLight,
      };

      onSelect('image', undefined, result);
    } catch (error: unknown) {
      console.error('Error extracting colors from image:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Error details:', errorMessage);
      alert(`Failed to extract colors from image: ${errorMessage}`);
    } finally {
      setExtracting(false);
      // Reset file input so the same file can be selected again
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={extracting ? undefined : onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Theme</DialogTitle>
          <DialogDescription>
            Choose how you want to start your new theme
          </DialogDescription>
        </DialogHeader>

        {/* Hidden file input for image selection */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageSelected}
          className="hidden"
        />

        <div className="space-y-3 py-4">
          <StarterOption
            icon={<Palette size={20} />}
            title="Start from Preset"
            description="Begin with a popular color scheme as your base"
            selected={selectedType === 'preset'}
            onClick={() => setSelectedType('preset')}
            disabled={extracting}
          >
            {selectedType === 'preset' && (
              <Select value={selectedPreset} onValueChange={setSelectedPreset} disabled={extracting}>
                <SelectTrigger className="w-full" onClick={(e) => e.stopPropagation()}>
                  <SelectValue placeholder="Select a preset..." />
                </SelectTrigger>
                <SelectContent>
                  {presetOptions.map((preset) => (
                    <SelectItem key={preset.key} value={preset.key}>
                      {preset.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </StarterOption>

          <StarterOption
            icon={extracting ? <Loader2 size={20} className="animate-spin" /> : <Image size={20} />}
            title="Extract from Image"
            description={extracting ? "Extracting colors..." : "Generate a color palette from your favorite wallpaper or photo"}
            selected={selectedType === 'image'}
            onClick={() => setSelectedType('image')}
            disabled={extracting}
          >
            {selectedType === 'image' && (
              <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  className={`flex-1 px-3 py-1.5 text-sm rounded-md border transition-colors ${
                    extractionMode === 'dark'
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => setExtractionMode('dark')}
                  disabled={extracting}
                >
                  Dark
                </button>
                <button
                  type="button"
                  className={`flex-1 px-3 py-1.5 text-sm rounded-md border transition-colors ${
                    extractionMode === 'light'
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => setExtractionMode('light')}
                  disabled={extracting}
                >
                  Light
                </button>
              </div>
            )}
          </StarterOption>

          <StarterOption
            icon={<FileCode size={20} />}
            title="Start Blank"
            description="Start with default colors and customize everything from scratch"
            selected={selectedType === 'blank'}
            onClick={() => setSelectedType('blank')}
            disabled={extracting}
          />
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={extracting}>
            Cancel
          </Button>
          <Button onClick={handleContinue} disabled={extracting}>
            {extracting ? (
              <>
                <Loader2 size={16} className="mr-1 animate-spin" />
                Extracting...
              </>
            ) : (
              <>
                Continue
                <ChevronRight size={16} className="ml-1" />
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
