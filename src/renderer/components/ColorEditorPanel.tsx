import { useState, useEffect, useRef, useCallback } from 'react';
import type { ThemeColors, DerivedColorKey } from '../../shared/types';
import {
  hexToRgb,
  rgbToHsl,
  hslToHex,
  isValidHexColor,
  type HSL,
} from '../../shared/colorUtils';
import {
  isBaseColor,
  isDerivedColor,
  getDerivationDescription,
} from '../../shared/colorDerivation';
import { Button } from '@/renderer/components/ui/button';
import { Input } from '@/renderer/components/ui/input';
import { Label } from '@/renderer/components/ui/label';
import { X, ChevronDown, ChevronUp, RotateCcw } from 'lucide-react';
import { formatColorName } from './previews/ColorSwatches';

interface ColorEditorPanelProps {
  colorKey: keyof ThemeColors;
  colorValue: string;
  /** For base colors, which derived colors will be affected */
  affectedColors?: DerivedColorKey[];
  /** For derived colors, is it currently auto-linked? */
  isAutoLinked?: boolean;
  onColorChange: (colorKey: keyof ThemeColors, value: string) => void;
  /** For derived colors, reset to auto-calculated value */
  onResetToAuto?: (colorKey: DerivedColorKey) => void;
  onClose: () => void;
}

// Mapping from base colors to their affected derived colors
const baseColorAffects: Partial<Record<keyof ThemeColors, DerivedColorKey[]>> = {
  background: ['selection', 'border'],
  foreground: ['cursor', 'border'],
  blue: ['accent', 'brightBlue'],
  black: ['brightBlack'],
  red: ['brightRed'],
  green: ['brightGreen'],
  yellow: ['brightYellow'],
  magenta: ['brightMagenta'],
  cyan: ['brightCyan'],
  white: ['brightWhite'],
};

export function ColorEditorPanel({
  colorKey,
  colorValue,
  isAutoLinked = false,
  onColorChange,
  onResetToAuto,
  onClose,
}: ColorEditorPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const isLocalChangeRef = useRef(false);
  const [hsl, setHsl] = useState<HSL>({ h: 0, s: 0, l: 50 });
  const [hexInput, setHexInput] = useState(colorValue);
  const [showHexInput, setShowHexInput] = useState(false);

  // Convert hex to HSL when colorValue changes (from external sources)
  useEffect(() => {
    // Skip if this change originated from our own sliders/input
    if (isLocalChangeRef.current) {
      isLocalChangeRef.current = false;
      return;
    }

    if (isValidHexColor(colorValue)) {
      const rgb = hexToRgb(colorValue);
      if (rgb) {
        setHsl(rgbToHsl(rgb));
      }
      setHexInput(colorValue);
    }
  }, [colorValue]);

  // Handle slider changes
  const handleSliderChange = useCallback((component: 'h' | 's' | 'l', value: number) => {
    const newHsl = { ...hsl, [component]: value };
    setHsl(newHsl);
    const newHex = hslToHex(newHsl);
    setHexInput(newHex);
    isLocalChangeRef.current = true; // Mark as local change to prevent useEffect sync
    onColorChange(colorKey, newHex);
  }, [hsl, colorKey, onColorChange]);

  // Handle hex input changes
  const handleHexChange = useCallback((value: string) => {
    setHexInput(value);
    if (isValidHexColor(value)) {
      const rgb = hexToRgb(value);
      if (rgb) {
        setHsl(rgbToHsl(rgb));
      }
      isLocalChangeRef.current = true; // Mark as local change to prevent useEffect sync
      onColorChange(colorKey, value);
    }
  }, [colorKey, onColorChange]);

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  const isBase = isBaseColor(colorKey);
  const isDerived = isDerivedColor(colorKey);
  const affectedColors = isBase ? baseColorAffects[colorKey] : undefined;

  return (
    <div className="color-editor-panel" ref={panelRef}>
      <div className="color-editor-panel-header">
        <h3 className="text-base font-semibold">{formatColorName(colorKey)}</h3>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded hover:bg-accent transition-colors"
          aria-label="Close"
        >
          <X size={18} />
        </button>
      </div>

      {/* Current color swatch */}
      <div
        className="color-editor-swatch"
        style={{ backgroundColor: colorValue }}
      />

      {/* HSL Sliders */}
      <div className="color-editor-sliders">
        {/* Hue slider */}
        <div className="slider-group">
          <Label className="slider-label">Hue</Label>
          <div className="slider-row">
            <input
              type="range"
              min="0"
              max="360"
              value={hsl.h}
              onChange={(e) => handleSliderChange('h', parseInt(e.target.value, 10))}
              className="slider slider-hue"
            />
            <span className="slider-value">{hsl.h}°</span>
          </div>
        </div>

        {/* Saturation slider */}
        <div className="slider-group">
          <Label className="slider-label">Saturation</Label>
          <div className="slider-row">
            <input
              type="range"
              min="0"
              max="100"
              value={hsl.s}
              onChange={(e) => handleSliderChange('s', parseInt(e.target.value, 10))}
              className="slider slider-saturation"
              style={{
                background: `linear-gradient(to right,
                  ${hslToHex({ h: hsl.h, s: 0, l: hsl.l })},
                  ${hslToHex({ h: hsl.h, s: 100, l: hsl.l })})`,
              }}
            />
            <span className="slider-value">{hsl.s}%</span>
          </div>
        </div>

        {/* Lightness slider */}
        <div className="slider-group">
          <Label className="slider-label">Lightness</Label>
          <div className="slider-row">
            <input
              type="range"
              min="0"
              max="100"
              value={hsl.l}
              onChange={(e) => handleSliderChange('l', parseInt(e.target.value, 10))}
              className="slider slider-lightness"
              style={{
                background: `linear-gradient(to right,
                  ${hslToHex({ h: hsl.h, s: hsl.s, l: 0 })},
                  ${hslToHex({ h: hsl.h, s: hsl.s, l: 50 })},
                  ${hslToHex({ h: hsl.h, s: hsl.s, l: 100 })})`,
              }}
            />
            <span className="slider-value">{hsl.l}%</span>
          </div>
        </div>
      </div>

      {/* Hex input (collapsible) */}
      <button
        type="button"
        onClick={() => setShowHexInput(!showHexInput)}
        className="hex-toggle"
      >
        <span className="font-mono text-sm">{hexInput}</span>
        {showHexInput ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {showHexInput && (
        <div className="hex-input-container">
          <Input
            type="text"
            value={hexInput}
            onChange={(e) => handleHexChange(e.target.value)}
            placeholder="#FF5733"
            className="font-mono text-sm"
          />
        </div>
      )}

      {/* Relationship hints */}
      {isBase && affectedColors && affectedColors.length > 0 && (
        <div className="color-editor-hint">
          <span className="text-xs text-muted-foreground">
            Also updates:{' '}
            {affectedColors.map((c, i) => (
              <span key={c}>
                {i > 0 && ', '}
                <span className="text-foreground">{formatColorName(c)}</span>
              </span>
            ))}
          </span>
        </div>
      )}

      {/* Derived color info */}
      {isDerived && (
        <div className="color-editor-hint">
          <span className="text-xs text-muted-foreground">
            {isAutoLinked ? (
              <>Based on: {getDerivationDescription(colorKey as DerivedColorKey)}</>
            ) : (
              <>Custom value (unlinked)</>
            )}
          </span>
        </div>
      )}

      {/* Reset to auto for derived colors */}
      {isDerived && !isAutoLinked && onResetToAuto && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onResetToAuto(colorKey as DerivedColorKey)}
          className="mt-3 w-full text-xs"
        >
          <RotateCcw size={12} className="mr-1" />
          Reset to auto-calculated
        </Button>
      )}
    </div>
  );
}
