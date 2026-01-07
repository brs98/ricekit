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
      className={`relative overflow-hidden cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 ${
        isActive ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''
      }`}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      tabIndex={onClick ? 0 : undefined}
      role={onClick ? 'button' : undefined}
      aria-label={onClick ? `View ${metadata.name} theme details` : undefined}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold truncate pr-2">{metadata.name}</h3>
          {onToggleFavorite && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
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
        </div>
      </CardHeader>

      <CardContent className="pb-3">
        <div className="flex gap-1.5">
          {previewColors.map((color, index) => (
            <div
              key={index}
              className="w-8 h-8 rounded-[6px] border border-border/50 transition-transform duration-150 hover:scale-105"
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
        </div>
      </CardContent>

      <CardFooter className="pt-0 flex items-center justify-between">
        <span
          className={`text-xs px-2 py-0.5 rounded-full ${
            isLight
              ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
              : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
          }`}
        >
          {isLight ? 'Light' : 'Dark'}
        </span>
        <Button
          size="sm"
          variant={isActive ? 'secondary' : 'default'}
          onClick={(e) => {
            e.stopPropagation();
            onApply(name);
          }}
          disabled={isActive}
          className="h-7"
        >
          {isActive ? (
            <>
              <Check className="h-3 w-3 mr-1" />
              Active
            </>
          ) : (
            'Apply'
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
