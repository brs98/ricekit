import { Theme } from '../../shared/types';

interface ThemeCardProps {
  theme: Theme;
  isActive: boolean;
  onApply: (themeName: string) => void;
  onToggleFavorite?: (themeName: string) => void;
  isFavorite?: boolean;
}

export function ThemeCard({ theme, isActive, onApply, onToggleFavorite, isFavorite }: ThemeCardProps) {
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

  return (
    <div className={`theme-card ${isActive ? 'active' : ''}`}>
      <div className="theme-card-header">
        <h3 className="theme-card-title">{metadata.name}</h3>
        {onToggleFavorite && (
          <button
            className={`favorite-btn ${isFavorite ? 'active' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(name);
            }}
            aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            {isFavorite ? '★' : '☆'}
          </button>
        )}
      </div>

      <div className="theme-card-colors">
        {previewColors.map((color, index) => (
          <div
            key={index}
            className="color-swatch"
            style={{ backgroundColor: color }}
            title={color}
          />
        ))}
      </div>

      <div className="theme-card-footer">
        <span className={`theme-badge ${isLight ? 'light' : 'dark'}`}>
          {isLight ? 'Light' : 'Dark'}
        </span>
        <button
          className={`apply-btn ${isActive ? 'active' : ''}`}
          onClick={() => onApply(name)}
          disabled={isActive}
        >
          {isActive ? 'Active' : 'Apply'}
        </button>
      </div>
    </div>
  );
}
