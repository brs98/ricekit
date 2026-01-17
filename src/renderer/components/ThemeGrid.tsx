import { useState, useEffect, useMemo } from 'react';
import { Theme } from '../../shared/types';
import { ThemeCard } from './ThemeCard';
import { ThemeDetailModal } from './ThemeDetailModal';
import { showErrorAlert } from '../utils/errorDisplay';
import { emitThemeApplied } from '../hooks/useThemeSelfStyling';

interface ThemeGridProps {
  searchQuery?: string;
  filterMode?: 'all' | 'light' | 'dark' | 'favorites';
  sortMode?: 'default' | 'name-asc' | 'name-desc' | 'recent';
  onEditTheme?: (theme: Theme) => void;
}

export function ThemeGrid({ searchQuery = '', filterMode = 'all', sortMode = 'default', onEditTheme }: ThemeGridProps) {
  const [themes, setThemes] = useState<Theme[]>([]);
  const [currentTheme, setCurrentTheme] = useState<string>('');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [recentThemes, setRecentThemes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTheme, setSelectedTheme] = useState<Theme | null>(null);

  // Load themes, state, and preferences in parallel on mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const loadStart = performance.now();

      // Parallelize all independent data fetches
      const [themeList, state, prefs] = await Promise.all([
        window.electronAPI.listThemes(),
        window.electronAPI.getState(),
        window.electronAPI.getPreferences(),
      ]);

      const loadEnd = performance.now();
      const loadTime = loadEnd - loadStart;

      console.log(`✅ Performance: Loaded ${themeList.length} themes in ${loadTime.toFixed(2)}ms`);

      if (loadTime > 5000) {
        console.warn(`⚠️  Performance Warning: Theme loading took ${loadTime.toFixed(2)}ms (target: <5000ms)`);
      }

      setThemes(themeList);
      setCurrentTheme(state.currentTheme);
      setFavorites(prefs.favorites);
      setRecentThemes(prefs.recentThemes || []);
      setError(null);
    } catch (err) {
      console.error('Failed to load themes:', err);
      setError('Failed to load themes. Please try again.');
    } finally {
      setLoading(false);
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

      // Update the app's own UI with the new theme colors
      emitThemeApplied();
    } catch (err) {
      console.error('Failed to apply theme:', err);
      showErrorAlert(err);
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
      await loadData();
      // Remove from favorites if it was favorited
      if (favorites.includes(themeName)) {
        const prefs = await window.electronAPI.getPreferences();
        const newFavorites = favorites.filter(f => f !== themeName);
        setFavorites(newFavorites);
        await window.electronAPI.setPreferences({ ...prefs, favorites: newFavorites });
      }
    } catch (err) {
      console.error('Failed to delete theme:', err);
      showErrorAlert(err);
    }
  };

  const handleDuplicateTheme = async (themeName: string) => {
    try {
      await window.electronAPI.duplicateTheme(themeName);
      // Reload themes to show the new duplicate
      await loadData();
    } catch (err) {
      console.error('Failed to duplicate theme:', err);
      showErrorAlert(err);
    }
  };

  // Filter and sort themes based on search, filter mode, and sort mode (memoized)
  const filteredAndSortedThemes = useMemo(() => {
    // Create Sets for O(1) lookups instead of O(n) array.includes()
    const favoritesSet = new Set(favorites);
    const recentThemesMap = new Map(recentThemes.map((name, index) => [name, index]));

    return themes
      .filter((theme) => {
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
            return favoritesSet.has(theme.name);
          default:
            return true;
        }
      })
      .sort((a, b) => {
        switch (sortMode) {
          case 'name-asc':
            return a.metadata.name.toLowerCase().localeCompare(b.metadata.name.toLowerCase());
          case 'name-desc':
            return b.metadata.name.toLowerCase().localeCompare(a.metadata.name.toLowerCase());
          case 'recent': {
            const aIndex = recentThemesMap.get(a.name) ?? -1;
            const bIndex = recentThemesMap.get(b.name) ?? -1;

            // If neither is in recent themes, maintain current order
            if (aIndex === -1 && bIndex === -1) return 0;

            // If only one is in recent themes, prioritize that one
            if (aIndex === -1) return 1;
            if (bIndex === -1) return -1;

            // Both are in recent themes, sort by recency (lower index = more recent)
            return aIndex - bIndex;
          }
          default:
            // Default order (as loaded from file system)
            return 0;
        }
      });
  }, [themes, searchQuery, filterMode, sortMode, favorites, recentThemes]);

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
        <button onClick={loadData} className="retry-btn">Retry</button>
      </div>
    );
  }

  if (filteredAndSortedThemes.length === 0) {
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
        {filteredAndSortedThemes.map((theme) => (
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
