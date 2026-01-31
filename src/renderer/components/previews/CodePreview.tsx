import type { ThemeColors } from '../../../shared/types';

interface CodePreviewProps {
  colors: ThemeColors;
  onClick?: (colorKey: keyof ThemeColors) => void;
  className?: string;
}

export function CodePreview({ colors, onClick, className = '' }: CodePreviewProps) {
  const isClickable = Boolean(onClick);

  const handleAreaClick = (colorKey: keyof ThemeColors) => (e: React.MouseEvent) => {
    e.stopPropagation();
    onClick?.(colorKey);
  };

  return (
    <div
      className={`code-preview rounded-[10px] p-4 font-mono text-sm border ${className}`}
      style={{
        backgroundColor: colors.background,
        color: colors.foreground,
        borderColor: colors.border,
      }}
      onClick={isClickable ? handleAreaClick('background') : undefined}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
    >
      <pre className="whitespace-pre-wrap">
        <span
          style={{ color: colors.magenta }}
          className={isClickable ? 'cursor-pointer hover:underline' : ''}
          onClick={isClickable ? handleAreaClick('magenta') : undefined}
        >
          import
        </span>
        <span
          className={isClickable ? 'cursor-pointer hover:underline' : ''}
          onClick={isClickable ? handleAreaClick('foreground') : undefined}
        >
          {' { useState } '}
        </span>
        <span
          style={{ color: colors.magenta }}
          className={isClickable ? 'cursor-pointer hover:underline' : ''}
          onClick={isClickable ? handleAreaClick('magenta') : undefined}
        >
          from
        </span>
        {' '}
        <span
          style={{ color: colors.green }}
          className={isClickable ? 'cursor-pointer hover:underline' : ''}
          onClick={isClickable ? handleAreaClick('green') : undefined}
        >
          &apos;react&apos;
        </span>
        ;
        {'\n\n'}
        <span
          style={{ color: colors.magenta }}
          className={isClickable ? 'cursor-pointer hover:underline' : ''}
          onClick={isClickable ? handleAreaClick('magenta') : undefined}
        >
          function
        </span>
        {' '}
        <span
          style={{ color: colors.yellow }}
          className={isClickable ? 'cursor-pointer hover:underline' : ''}
          onClick={isClickable ? handleAreaClick('yellow') : undefined}
        >
          App
        </span>
        {'() {\n  '}
        <span
          style={{ color: colors.magenta }}
          className={isClickable ? 'cursor-pointer hover:underline' : ''}
          onClick={isClickable ? handleAreaClick('magenta') : undefined}
        >
          const
        </span>
        {' [count, setCount] = '}
        <span
          style={{ color: colors.cyan }}
          className={isClickable ? 'cursor-pointer hover:underline' : ''}
          onClick={isClickable ? handleAreaClick('cyan') : undefined}
        >
          useState
        </span>
        {'('}
        <span
          style={{ color: colors.red }}
          className={isClickable ? 'cursor-pointer hover:underline' : ''}
          onClick={isClickable ? handleAreaClick('red') : undefined}
        >
          0
        </span>
        {');\n  '}
        <span
          style={{ color: colors.magenta }}
          className={isClickable ? 'cursor-pointer hover:underline' : ''}
          onClick={isClickable ? handleAreaClick('magenta') : undefined}
        >
          return
        </span>
        {' <div>Count: {'}
        <span
          style={{ color: colors.red }}
          className={isClickable ? 'cursor-pointer hover:underline' : ''}
          onClick={isClickable ? handleAreaClick('red') : undefined}
        >
          count
        </span>
        {'}</div>;\n}'}
      </pre>
    </div>
  );
}
