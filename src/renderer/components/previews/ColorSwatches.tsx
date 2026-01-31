import type { ThemeColors } from '../../../shared/types';

interface ColorSwatchesProps {
  colors: ThemeColors;
  onClick?: (colorKey: keyof ThemeColors) => void;
  showLabels?: boolean;
  className?: string;
}

const formatColorName = (key: string): string => {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
};

// Main UI colors
const mainColorKeys: (keyof ThemeColors)[] = [
  'background', 'foreground', 'cursor', 'selection', 'accent', 'border',
];

// ANSI colors (normal)
const ansiColorKeys: (keyof ThemeColors)[] = [
  'black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white',
];

// ANSI colors (bright)
const brightColorKeys: (keyof ThemeColors)[] = [
  'brightBlack', 'brightRed', 'brightGreen', 'brightYellow',
  'brightBlue', 'brightMagenta', 'brightCyan', 'brightWhite',
];

export function ColorSwatches({ colors, onClick, showLabels = true, className = '' }: ColorSwatchesProps) {
  const isClickable = Boolean(onClick);

  const handleSwatchClick = (colorKey: keyof ThemeColors) => (e: React.MouseEvent) => {
    e.stopPropagation();
    onClick?.(colorKey);
  };

  return (
    <div className={`color-swatches space-y-3 ${className}`}>
      {/* Main colors */}
      <div className="flex gap-2 flex-wrap">
        {mainColorKeys.map((key) => (
          <div key={key} className="text-center">
            <div
              className={`w-10 h-10 rounded-[6px] border border-border/50 transition-transform ${
                isClickable ? 'cursor-pointer hover:scale-110 hover:shadow-md' : ''
              }`}
              style={{ backgroundColor: colors[key] }}
              title={formatColorName(key)}
              onClick={isClickable ? handleSwatchClick(key) : undefined}
              role={isClickable ? 'button' : undefined}
              tabIndex={isClickable ? 0 : undefined}
            />
            {showLabels && (
              <div className="text-[10px] text-muted-foreground mt-1 truncate w-10">
                {formatColorName(key).split(' ')[0]}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ANSI normal colors */}
      <div className="flex gap-1">
        {ansiColorKeys.map((key) => (
          <div
            key={key}
            className={`w-6 h-6 rounded-[4px] border border-border/30 transition-transform ${
              isClickable ? 'cursor-pointer hover:scale-110 hover:shadow-md' : ''
            }`}
            style={{ backgroundColor: colors[key] }}
            title={formatColorName(key)}
            onClick={isClickable ? handleSwatchClick(key) : undefined}
            role={isClickable ? 'button' : undefined}
            tabIndex={isClickable ? 0 : undefined}
          />
        ))}
      </div>

      {/* ANSI bright colors */}
      <div className="flex gap-1">
        {brightColorKeys.map((key) => (
          <div
            key={key}
            className={`w-6 h-6 rounded-[4px] border border-border/30 transition-transform ${
              isClickable ? 'cursor-pointer hover:scale-110 hover:shadow-md' : ''
            }`}
            style={{ backgroundColor: colors[key] }}
            title={formatColorName(key)}
            onClick={isClickable ? handleSwatchClick(key) : undefined}
            role={isClickable ? 'button' : undefined}
            tabIndex={isClickable ? 0 : undefined}
          />
        ))}
      </div>
    </div>
  );
}

export { mainColorKeys, ansiColorKeys, brightColorKeys, formatColorName };
