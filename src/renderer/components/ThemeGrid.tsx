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
      <div className="theme-grid-skeleton">
        {/* Skeleton cards */}
        {[...Array(8)].map((_, i) => (
          <div key={i} className="skeleton-card">
            <div className="skeleton-header">
              <div className="skeleton-title"></div>
              <div className="skeleton-icon"></div>
            </div>
            <div className="skeleton-gradient"></div>
            <div className="skeleton-swatches">
              {[...Array(6)].map((_, j) => (
                <div key={j} className="skeleton-swatch"></div>
              ))}
            </div>
            <div className="skeleton-footer">
              <div className="skeleton-badge"></div>
              <div className="skeleton-button"></div>
            </div>
          </div>
        ))}
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
        <div className="empty-state-icon">
          {filterMode === 'favorites' ? (
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground/50">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
            </svg>
          ) : searchQuery ? (
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground/50">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.3-4.3"></path>
            </svg>
          ) : (
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground/50">
              <circle cx="13.5" cy="6.5" r="0.5" fill="currentColor"></circle>
              <circle cx="17.5" cy="10.5" r="0.5" fill="currentColor"></circle>
              <circle cx="8.5" cy="7.5" r="0.5" fill="currentColor"></circle>
              <circle cx="6.5" cy="12.5" r="0.5" fill="currentColor"></circle>
              <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.555C21.965 6.012 17.461 2 12 2z"></path>
            </svg>
          )}
        </div>
        <p className="text-base font-medium text-foreground/80">
          {filterMode === 'favorites'
            ? 'No favorites yet'
            : searchQuery
            ? `No results for "${searchQuery}"`
            : 'No themes found'}
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          {filterMode === 'favorites'
            ? 'Star themes you love to find them here'
            : searchQuery
            ? 'Try a different search term'
            : filterMode !== 'all'
            ? `No ${filterMode} themes match your criteria`
            : 'Check back later or create your own'}
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Result count */}
      <div className="theme-grid-header">
        <span className="text-sm text-muted-foreground">
          {filteredAndSortedThemes.length} {filteredAndSortedThemes.length === 1 ? 'theme' : 'themes'}
          {filterMode !== 'all' && ` · ${filterMode}`}
          {searchQuery && ` · "${searchQuery}"`}
        </span>
      </div>

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
