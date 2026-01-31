import type { ThemeColors } from '../../../shared/types';

interface TerminalPreviewProps {
  colors: ThemeColors;
  onClick?: (colorKey: keyof ThemeColors) => void;
  className?: string;
}

export function TerminalPreview({ colors, onClick, className = '' }: TerminalPreviewProps) {
  const isClickable = Boolean(onClick);

  const handleAreaClick = (colorKey: keyof ThemeColors) => (e: React.MouseEvent) => {
    e.stopPropagation();
    onClick?.(colorKey);
  };

  return (
    <div
      className={`terminal-preview rounded-[10px] p-4 font-mono text-sm border ${className}`}
      style={{
        backgroundColor: colors.background,
        color: colors.foreground,
        borderColor: colors.border,
      }}
      onClick={isClickable ? handleAreaClick('background') : undefined}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
    >
      <div>
        <span
          style={{ color: colors.green }}
          className={isClickable ? 'cursor-pointer hover:underline' : ''}
          onClick={isClickable ? handleAreaClick('green') : undefined}
        >
          ➜
        </span>
        <span
          style={{ color: colors.cyan }}
          className={isClickable ? 'cursor-pointer hover:underline' : ''}
          onClick={isClickable ? handleAreaClick('cyan') : undefined}
        >
          {' ~/projects'}
        </span>
        <span
          style={{ color: colors.blue }}
          className={isClickable ? 'cursor-pointer hover:underline' : ''}
          onClick={isClickable ? handleAreaClick('blue') : undefined}
        >
          {' git:('}
        </span>
        <span
          style={{ color: colors.red }}
          className={isClickable ? 'cursor-pointer hover:underline' : ''}
          onClick={isClickable ? handleAreaClick('red') : undefined}
        >
          main
        </span>
        <span
          style={{ color: colors.blue }}
          className={isClickable ? 'cursor-pointer hover:underline' : ''}
          onClick={isClickable ? handleAreaClick('blue') : undefined}
        >
          )
        </span>
        <span
          className={isClickable ? 'cursor-pointer hover:underline' : ''}
          onClick={isClickable ? handleAreaClick('foreground') : undefined}
        >
          {' $ ls -la'}
        </span>
      </div>
      <div
        style={{ color: colors.blue }}
        className={isClickable ? 'cursor-pointer hover:underline' : ''}
        onClick={isClickable ? handleAreaClick('blue') : undefined}
      >
        drwxr-xr-x  10 user  staff   320 Dec  6 10:00 .
      </div>
      <div
        style={{ color: colors.green }}
        className={isClickable ? 'cursor-pointer hover:underline' : ''}
        onClick={isClickable ? handleAreaClick('green') : undefined}
      >
        -rw-r--r--   1 user  staff   150 Dec  6 10:00 README.md
      </div>
      <div
        style={{ color: colors.cyan }}
        className={isClickable ? 'cursor-pointer hover:underline' : ''}
        onClick={isClickable ? handleAreaClick('cyan') : undefined}
      >
        drwxr-xr-x   8 user  staff   256 Dec  6 09:30 src
      </div>
      <div>
        <span
          style={{ color: colors.green }}
          className={isClickable ? 'cursor-pointer hover:underline' : ''}
          onClick={isClickable ? handleAreaClick('green') : undefined}
        >
          ➜
        </span>
        <span
          style={{ color: colors.cyan }}
          className={isClickable ? 'cursor-pointer hover:underline' : ''}
          onClick={isClickable ? handleAreaClick('cyan') : undefined}
        >
          {' ~/projects'}
        </span>
        <span> $ </span>
        <span
          className="inline-block w-2 h-4 animate-pulse cursor-pointer"
          style={{ backgroundColor: colors.cursor }}
          onClick={isClickable ? handleAreaClick('cursor') : undefined}
        />
      </div>
    </div>
  );
}
