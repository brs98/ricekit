import { useState, useRef, useCallback } from 'react';
import type { ThemeColors, ThemeMetadata } from '../../shared/types';
import { deriveAllColors, getDefaultLockState } from '../../shared/colorDerivation';
import { TerminalPreview } from './previews/TerminalPreview';
import { CodePreview } from './previews/CodePreview';
import { ColorSwatches } from './previews/ColorSwatches';
import { Button } from '@/renderer/components/ui/button';
import { Input } from '@/renderer/components/ui/input';
import { Label } from '@/renderer/components/ui/label';
import { Palette, Wand2 } from 'lucide-react';

interface ThemePreviewProps {
  /** The auto-generated theme colors */
  colors: ThemeColors;
  /** The original image data URL for "pick background" feature */
  imageDataUrl?: string;
  /** Suggested name (e.g., from filename) */
  suggestedName?: string;
  /** Called when user clicks "Use Theme" with the final theme name */
  onUseTheme: (metadata: ThemeMetadata) => void;
  /** Called when user clicks "Customize" to enter edit mode */
  onCustomize: (colors: ThemeColors, imageDataUrl?: string, themeName?: string) => void;
  /** Called when user regenerates theme with new background anchor */
  onRegenerateTheme?: (colors: ThemeColors) => void;
  /** Called when user clicks back/cancel */
  onBack: () => void;
}

export function ThemePreview({
  colors: initialColors,
  imageDataUrl,
  suggestedName = 'My Theme',
  onUseTheme,
  onCustomize,
  onRegenerateTheme,
  onBack,
}: ThemePreviewProps) {
  const [colors, setColors] = useState<ThemeColors>(initialColors);
  const [themeName, setThemeName] = useState(suggestedName);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const handleUseTheme = async () => {
    if (!themeName.trim()) {
      return;
    }

    setSaving(true);
    try {
      const metadata: ThemeMetadata = {
        name: themeName.trim(),
        colors,
        colorLocks: getDefaultLockState(), // All derived colors will auto-calculate
      };
      await onUseTheme(metadata);
    } finally {
      setSaving(false);
    }
  };

  const handleCustomize = () => {
    onCustomize(colors, imageDataUrl, themeName);
  };

  const handlePickBackground = () => {
    if (imageDataUrl) {
      setShowImagePicker(true);
    }
  };

  const handleImageClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pixel = ctx.getImageData(x, y, 1, 1).data;
    const r = pixel[0] ?? 0;
    const g = pixel[1] ?? 0;
    const b = pixel[2] ?? 0;
    const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;

    // Use the picked color as background anchor and regenerate theme
    const newColors = deriveAllColors(
      {
        ...colors,
        background: hex,
        // Adjust black to be similar to background for dark themes
        black: hex,
      },
      getDefaultLockState(),
      colors
    );

    setColors(newColors);
    setShowImagePicker(false);
    onRegenerateTheme?.(newColors);
  }, [colors, onRegenerateTheme]);

  const handleImageLoad = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;

    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(img, 0, 0);
    }
  }, []);

  return (
    <div className="theme-preview-container">
      <div className="theme-preview-content">
        {/* Preview Section */}
        <div className="theme-preview-panels">
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground">Terminal</h3>
            <TerminalPreview colors={colors} />
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground">Code</h3>
            <CodePreview colors={colors} />
          </div>
        </div>

        {/* Color Palette */}
        <div className="space-y-4 mt-6">
          <h3 className="text-sm font-medium text-muted-foreground">Color Palette</h3>
          <ColorSwatches colors={colors} showLabels />
        </div>

        {/* Pick Background Link */}
        {imageDataUrl && (
          <button
            type="button"
            onClick={handlePickBackground}
            className="mt-6 text-sm text-primary hover:text-primary/80 flex items-center gap-2 transition-colors"
          >
            <Wand2 size={14} />
            Not quite right? Pick a different background from the image
          </button>
        )}
      </div>

      {/* Action Bar */}
      <div className="theme-preview-actions">
        <div className="flex-1">
          <Label htmlFor="theme-name" className="sr-only">Theme Name</Label>
          <Input
            id="theme-name"
            value={themeName}
            onChange={(e) => setThemeName(e.target.value)}
            placeholder="Enter theme name..."
            className="max-w-xs"
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onBack}>
            Cancel
          </Button>
          <Button variant="secondary" onClick={handleCustomize}>
            <Palette size={16} className="mr-2" />
            Customize
          </Button>
          <Button onClick={handleUseTheme} disabled={saving || !themeName.trim()}>
            {saving ? 'Saving...' : 'Use Theme'}
          </Button>
        </div>
      </div>

      {/* Image Picker Overlay */}
      {showImagePicker && imageDataUrl && (
        <div
          className="image-picker-overlay"
          onClick={() => setShowImagePicker(false)}
        >
          <div
            className="image-picker-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="image-picker-header">
              <h3 className="text-lg font-semibold">Pick Background Color</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Click anywhere on the image to use that color as the background
              </p>
            </div>
            <div className="image-picker-canvas-container">
              <img
                ref={imageRef}
                src={imageDataUrl}
                alt="Source"
                className="hidden"
                onLoad={handleImageLoad}
              />
              <canvas
                ref={canvasRef}
                onClick={handleImageClick}
                className="image-picker-canvas"
              />
            </div>
            <div className="image-picker-footer">
              <Button variant="outline" onClick={() => setShowImagePicker(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
