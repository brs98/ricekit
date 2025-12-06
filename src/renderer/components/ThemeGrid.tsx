import { useState, useEffect } from 'react';
import { Theme } from '../../shared/types';
import { ThemeCard } from './ThemeCard';
import { ThemeDetailModal } from './ThemeDetailModal';

interface ThemeGridProps {
  searchQuery?: string;
  filterMode?: 'all' | 'light' | 'dark' | 'favorites';
  onEditTheme?: (theme: Theme) => void;
}

export function ThemeGrid({ searchQuery = '', filterMode = 'all', onEditTheme }: ThemeGridProps) {
  const [themes, setThemes] = useState<Theme[]>([]);
  const [currentTheme, setCurrentTheme] = useState<string>('');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTheme, setSelectedTheme] = useState<Theme | null>(null);

  // Load themes on mount
  useEffect(() => {
    loadThemes();
    loadPreferences();
  }, []);

  const loadThemes = async () => {
    try {
      setLoading(true);
      const themeList = await window.electronAPI.listThemes();
      setThemes(themeList);

      // Get current theme from state
      const state = await window.electronAPI.getState();
      setCurrentTheme(state.currentTheme);

      setError(null);
    } catch (err) {
      console.error('Failed to load themes:', err);
      setError('Failed to load themes. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadPreferences = async () => {
    try {
      const prefs = await window.electronAPI.getPreferences();
      setFavorites(prefs.favorites);
    } catch (err) {
      console.error('Failed to load preferences:', err);
    }
  };

  const handleApplyTheme = async (themeName: string) => {
    try {
      await window.electronAPI.applyTheme(themeName);
      setCurrentTheme(themeName);

      // Update recent themes in preferences
      const prefs = await window.electronAPI.getPreferences();
      const recentThemes = [themeName, ...prefs.recentThemes.filter(t => t !== themeName)].slice(0, 10);
      await window.electronAPI.setPreferences({ ...prefs, recentThemes });
    } catch (err) {
      console.error('Failed to apply theme:', err);
      alert('Failed to apply theme. Please try again.');
    }
  };

  const handleToggleFavorite = async (themeName: string) => {
    try {
      const prefs = await window.electronAPI.getPreferences();
      const newFavorites = favorites.includes(themeName)
        ? favorites.filter(f => f !== themeName)
        : [...favorites, themeName];

      setFavorites(newFavorites);
      await window.electronAPI.setPreferences({ ...prefs, favorites: newFavorites });
    } catch (err) {
      console.error('Failed to update favorites:', err);
    }
  };

  const handleDeleteTheme = async (themeName: string) => {
    try {
      await window.electronAPI.deleteTheme(themeName);
      // Reload themes to update the grid
      await loadThemes();
      // Remove from favorites if it was favorited
      if (favorites.includes(themeName)) {
        const prefs = await window.electronAPI.getPreferences();
        const newFavorites = favorites.filter(f => f !== themeName);
        setFavorites(newFavorites);
        await window.electronAPI.setPreferences({ ...prefs, favorites: newFavorites });
      }
    } catch (err) {
      console.error('Failed to delete theme:', err);
      alert(err instanceof Error ? err.message : 'Failed to delete theme. Please try again.');
    }
  };

  const handleDuplicateTheme = async (themeName: string) => {
    try {
      await window.electronAPI.duplicateTheme(themeName);
      // Reload themes to show the new duplicate
      await loadThemes();
    } catch (err) {
      console.error('Failed to duplicate theme:', err);
      alert('Failed to duplicate theme. Please try again.');
    }
  };

  // Filter themes based on search and filter mode
  const filteredThemes = themes.filter((theme) => {
    // Search filter
    const matchesSearch = theme.metadata.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         theme.metadata.description.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    // Mode filter
    switch (filterMode) {
      case 'light':
        return theme.isLight;
      case 'dark':
        return !theme.isLight;
      case 'favorites':
        return favorites.includes(theme.name);
      default:
        return true;
    }
  });

  if (loading) {
    return (
      <div className="theme-grid-loading">
        <div className="loading-spinner"></div>
        <p>Loading themes...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="theme-grid-error">
        <p className="error-message">{error}</p>
        <button onClick={loadThemes} className="retry-btn">Retry</button>
      </div>
    );
  }

  if (filteredThemes.length === 0) {
    return (
      <div className="theme-grid-empty">
        <p>No themes found matching your filters.</p>
        {filterMode !== 'all' && (
          <p className="text-sm text-gray-500">Try changing your filter or search query.</p>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="theme-grid">
        {filteredThemes.map((theme) => (
          <ThemeCard
            key={theme.name}
            theme={theme}
            isActive={currentTheme === theme.name}
            onApply={handleApplyTheme}
            onToggleFavorite={handleToggleFavorite}
            isFavorite={favorites.includes(theme.name)}
            onClick={() => setSelectedTheme(theme)}
          />
        ))}
      </div>

      {selectedTheme && (
        <ThemeDetailModal
          theme={selectedTheme}
          isActive={currentTheme === selectedTheme.name}
          onClose={() => setSelectedTheme(null)}
          onApply={handleApplyTheme}
          onToggleFavorite={handleToggleFavorite}
          onEdit={onEditTheme ? () => onEditTheme(selectedTheme) : undefined}
          onDelete={handleDeleteTheme}
          onDuplicate={handleDuplicateTheme}
          isFavorite={favorites.includes(selectedTheme.name)}
        />
      )}
    </>
  );
}
