import { Theme } from '../../shared/types';
import { Star, Check } from 'lucide-react';
import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
} from '@/renderer/components/ui/card';
import { Button } from '@/renderer/components/ui/button';

interface ThemeCardProps {
  theme: Theme;
  isActive: boolean;
  onApply: (themeName: string) => void;
  onToggleFavorite?: (themeName: string) => void;
  isFavorite?: boolean;
  onClick?: () => void;
}

export function ThemeCard({ theme, isActive, onApply, onToggleFavorite, isFavorite, onClick }: ThemeCardProps) {
  const { metadata, name, isLight } = theme;
  const colors = metadata.colors;

  // Select 6 representative colors for the preview
  const previewColors = [
    colors.background,
    colors.foreground,
    colors.accent,
    colors.blue,
    colors.green,
    colors.red,
  ];

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick?.();
    }
  };

  return (
    <Card
      className={`relative overflow-hidden cursor-pointer transition-all duration-200 ease-out hover:scale-[1.02] hover:shadow-lg hover:shadow-foreground/5 ${
        isActive ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''
      }`}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      tabIndex={onClick ? 0 : undefined}
      role={onClick ? 'button' : undefined}
      aria-label={onClick ? `View ${metadata.name} theme details` : undefined}
    >
      {/* Favorite toggle - positioned top-right */}
      {onToggleFavorite && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 h-8 w-8 z-10 opacity-60 hover:opacity-100 transition-opacity"
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(name);
          }}
          aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          <Star
            className={`h-4 w-4 ${
              isFavorite ? 'fill-yellow-500 text-yellow-500' : 'text-muted-foreground'
            }`}
          />
        </Button>
      )}

      <CardHeader className="pb-2 pr-10">
        <h3 className="text-base font-semibold truncate">{metadata.name}</h3>
      </CardHeader>

      <CardContent className="pb-3">
        {/* Gradient bar preview using theme colors */}
        <div
          className="h-3 rounded-full mb-3 overflow-hidden"
          style={{
            background: `linear-gradient(to right, ${previewColors.join(', ')})`
          }}
        />
        {/* Color swatches row */}
        <div className="flex gap-2">
          {previewColors.map((color, index) => (
            <div
              key={index}
              className="flex-1 h-8 rounded-md border border-border/30 transition-transform duration-150"
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
        </div>
      </CardContent>

      <CardFooter className="pt-0 flex items-center justify-between">
        <span
          className={`text-[10px] font-medium px-2 py-0.5 rounded-full uppercase tracking-wide ${
            isLight
              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
              : 'bg-slate-500/10 text-slate-600 dark:text-slate-400'
          }`}
        >
          {isLight ? 'Light' : 'Dark'}
        </span>
        {isActive ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md bg-primary/10 text-primary">
            <Check className="h-3.5 w-3.5" />
            Active
          </span>
        ) : (
          <Button
            size="sm"
            variant="default"
            onClick={(e) => {
              e.stopPropagation();
              onApply(name);
            }}
            className="h-7"
          >
            Apply
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
