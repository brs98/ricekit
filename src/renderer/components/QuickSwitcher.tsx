import { useState, useEffect, useMemo } from 'react';
import { Star } from 'lucide-react';
import { Theme, Preferences, State } from '../../shared/types';
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from '@/renderer/components/ui/command';
import { emitThemeApplied, useThemeSelfStyling } from '../hooks/useThemeSelfStyling';

// Color swatches component for theme preview
function ThemeColorSwatches({ colors }: { colors: Theme['metadata']['colors'] }) {
  const previewColors = [
    colors.background,
    colors.red,
    colors.green,
    colors.yellow,
    colors.blue,
    colors.magenta,
  ];

  return (
    <div className="flex gap-1 mt-1">
      {previewColors.map((color, i) => (
        <div
          key={i}
          className="w-4 h-4 rounded-[3px] border border-border/50"
          style={{ backgroundColor: color }}
        />
      ))}
    </div>
  );
}

export function QuickSwitcher() {
  const [themes, setThemes] = useState<Theme[]>([]);
  const [preferences, setPreferences] = useState<Preferences | null>(null);
  const [state, setState] = useState<State | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Apply the current theme's colors to the QuickSwitcher UI
  useThemeSelfStyling();

  // Load themes, preferences, and state
  useEffect(() => {
    async function loadData() {
      try {
        const [themesData, prefsData, stateData] = await Promise.all([
          window.electronAPI.listThemes(),
          window.electronAPI.getPreferences(),
          window.electronAPI.getState(),
        ]);
        setThemes(themesData);
        setPreferences(prefsData);
        setState(stateData);
        setIsLoading(false);
      } catch (error) {
        console.error('Failed to load data for quick switcher:', error);
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  // Handle escape key to close
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        window.electronAPI.closeQuickSwitcher();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Extract primitives from preferences to avoid object reference comparison issues
  // This ensures useMemo only recalculates when the actual data changes
  const favoritesList = preferences?.favorites;
  const recentThemesList = preferences?.recentThemes;

  // Filter and sort themes (memoized to avoid recomputation on every render)
  const filteredThemes = useMemo(() => {
    if (!favoritesList || !recentThemesList) return { favorites: [], others: [] };

    // Apply search filter (fuzzy search)
    let filtered = themes;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = themes.filter(theme => {
        const name = theme.metadata.name.toLowerCase();
        const description = theme.metadata.description.toLowerCase();
        const author = theme.metadata.author.toLowerCase();

        // Simple fuzzy search: check if all query characters appear in order
        let queryIndex = 0;
        const searchText = `${name} ${description} ${author}`;
        for (const char of searchText) {
          if (char === query[queryIndex]) {
            queryIndex++;
          }
          if (queryIndex === query.length) {
            return true;
          }
        }
        return false;
      });
    }

    // Sort: favorites first, then recent, then alphabetically
    // Use toSorted() to avoid mutating the original array (React state immutability)
    const favoritesSet = new Set(favoritesList);
    const recentThemesSet = new Set(recentThemesList);

    const sorted = filtered.toSorted((a, b) => {
      const aIsFavorite = favoritesSet.has(a.metadata.name) || favoritesSet.has(a.name);
      const bIsFavorite = favoritesSet.has(b.metadata.name) || favoritesSet.has(b.name);
      const aIsRecent = recentThemesSet.has(a.name);
      const bIsRecent = recentThemesSet.has(b.name);

      if (aIsFavorite && !bIsFavorite) return -1;
      if (!aIsFavorite && bIsFavorite) return 1;

      if (aIsRecent && !bIsRecent) return -1;
      if (!aIsRecent && bIsRecent) return 1;
      if (aIsRecent && bIsRecent) {
        const aIndex = recentThemesList.indexOf(a.name);
        const bIndex = recentThemesList.indexOf(b.name);
        return aIndex - bIndex;
      }

      return a.metadata.name.localeCompare(b.metadata.name);
    });

    // Split into favorites and others
    const favorites = sorted.filter(theme =>
      favoritesSet.has(theme.metadata.name) || favoritesSet.has(theme.name)
    );
    const others = sorted.filter(theme =>
      !favoritesSet.has(theme.metadata.name) && !favoritesSet.has(theme.name)
    );

    return { favorites, others };
  }, [themes, favoritesList, recentThemesList, searchQuery]);

  // Apply theme
  async function handleApplyTheme(themeName: string) {
    try {
      await window.electronAPI.applyTheme(themeName);
      // Update the app's own UI with the new theme colors
      emitThemeApplied();
      window.electronAPI.closeQuickSwitcher();
    } catch (error) {
      console.error('Failed to apply theme:', error);
    }
  }

  const { favorites, others } = filteredThemes;
  const hasResults = favorites.length > 0 || others.length > 0;

  if (isLoading) {
    return (
      <div className="h-screen w-screen bg-popover flex items-center justify-center">
        <div className="text-muted-foreground">Loading themes...</div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-popover">
      <Command
        className="rounded-none border-none h-full"
        filter={() => 1} // Disable built-in filter, we use custom fuzzy search
      >
        <CommandInput
          placeholder="Search themes..."
          value={searchQuery}
          onValueChange={setSearchQuery}
          className="h-12"
        />
        <CommandList className="max-h-[calc(100vh-96px)]">
          <CommandEmpty>No themes found matching &quot;{searchQuery}&quot;</CommandEmpty>

          {/* Favorites Section */}
          {favorites.length > 0 && (
            <CommandGroup heading="Favorites">
              {favorites.map((theme) => {
                const isCurrent = state?.currentTheme === theme.name;

                return (
                  <CommandItem
                    key={theme.name}
                    value={theme.name}
                    onSelect={() => handleApplyTheme(theme.name)}
                    className="flex flex-col items-start py-3 px-3 cursor-pointer"
                  >
                    <div className="flex items-center gap-2 w-full">
                      <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                      <span className="font-medium">{theme.metadata.name}</span>
                      {isCurrent && (
                        <span className="ml-auto text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                          Current
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 pl-6">
                      {theme.metadata.description}
                    </p>
                    <div className="pl-6">
                      <ThemeColorSwatches colors={theme.metadata.colors} />
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          )}

          {/* All Themes Section */}
          {others.length > 0 && (
            <CommandGroup heading={favorites.length > 0 ? "All Themes" : undefined}>
              {others.map((theme) => {
                const isCurrent = state?.currentTheme === theme.name;
                const isRecent = preferences?.recentThemes.includes(theme.name);

                return (
                  <CommandItem
                    key={theme.name}
                    value={theme.name}
                    onSelect={() => handleApplyTheme(theme.name)}
                    className="flex flex-col items-start py-3 px-3 cursor-pointer"
                  >
                    <div className="flex items-center gap-2 w-full">
                      <span className="font-medium">{theme.metadata.name}</span>
                      {isRecent && (
                        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                          Recent
                        </span>
                      )}
                      {isCurrent && (
                        <span className="ml-auto text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                          Current
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {theme.metadata.description}
                    </p>
                    <ThemeColorSwatches colors={theme.metadata.colors} />
                  </CommandItem>
                );
              })}
            </CommandGroup>
          )}
        </CommandList>

        {/* Footer with keyboard hints */}
        {hasResults && (
          <div className="flex items-center justify-center gap-4 px-4 py-2 border-t border-border text-xs text-muted-foreground">
            <span>
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">↑↓</kbd>
              {' '}Navigate
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">↵</kbd>
              {' '}Apply
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">esc</kbd>
              {' '}Close
            </span>
          </div>
        )}
      </Command>
    </div>
  );
}
