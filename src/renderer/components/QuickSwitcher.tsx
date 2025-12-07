import { useState, useEffect, useRef } from 'react';
import { Theme, Preferences, State } from '../../shared/types';

export function QuickSwitcher() {
  const [themes, setThemes] = useState<Theme[]>([]);
  const [preferences, setPreferences] = useState<Preferences | null>(null);
  const [state, setState] = useState<State | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const searchInputRef = useRef<HTMLInputElement>(null);

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

  // Focus search input when window opens
  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }

    // Listen for quick-switcher-opened event
    const handleOpened = () => {
      if (searchInputRef.current) {
        searchInputRef.current.focus();
      }
    };
    window.electronAPI.onQuickSwitcherOpened(handleOpened);
  }, []);

  // Filter and sort themes
  const filteredThemes = (() => {
    if (!preferences) return themes;

    let filtered = themes;

    // Apply search filter (fuzzy search)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(theme => {
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
    const favorites = new Set(preferences.favorites);
    const recentThemes = new Set(preferences.recentThemes);

    filtered.sort((a, b) => {
      const aIsFavorite = favorites.has(a.metadata.name);
      const bIsFavorite = favorites.has(b.metadata.name);
      const aIsRecent = recentThemes.has(a.metadata.name);
      const bIsRecent = recentThemes.has(b.metadata.name);

      // Favorites first
      if (aIsFavorite && !bIsFavorite) return -1;
      if (!aIsFavorite && bIsFavorite) return 1;

      // Then recent themes (in order of recency)
      if (aIsRecent && !bIsRecent) return -1;
      if (!aIsRecent && bIsRecent) return 1;
      if (aIsRecent && bIsRecent) {
        const aIndex = preferences.recentThemes.indexOf(a.metadata.name);
        const bIndex = preferences.recentThemes.indexOf(b.metadata.name);
        return aIndex - bIndex;
      }

      // Then alphabetically
      return a.metadata.name.localeCompare(b.metadata.name);
    });

    return filtered;
  })();

  // Reset selected index when search changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery]);

  // Keyboard navigation
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        window.electronAPI.closeQuickSwitcher();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, filteredThemes.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredThemes[selectedIndex]) {
          handleApplyTheme(filteredThemes[selectedIndex]);
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filteredThemes, selectedIndex]);

  // Apply theme
  async function handleApplyTheme(theme: Theme) {
    try {
      await window.electronAPI.applyTheme(theme.metadata.name);
      window.electronAPI.closeQuickSwitcher();
    } catch (error) {
      console.error('Failed to apply theme:', error);
    }
  }

  // Scroll selected item into view
  useEffect(() => {
    const selectedElement = document.querySelector('.quick-switcher-item.selected');
    if (selectedElement) {
      selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [selectedIndex]);

  if (isLoading) {
    return (
      <div className="quick-switcher">
        <div className="quick-switcher-container">
          <div className="quick-switcher-loading">Loading themes...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="quick-switcher">
      <div className="quick-switcher-container">
        <input
          ref={searchInputRef}
          type="text"
          className="quick-switcher-search"
          placeholder="Search themes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <div className="quick-switcher-list">
          {filteredThemes.length === 0 ? (
            <div className="quick-switcher-empty">
              No themes found matching "{searchQuery}"
            </div>
          ) : (
            <>
              {/* Favorites Section */}
              {(() => {
                const favoriteThemes = filteredThemes.filter(theme =>
                  preferences?.favorites.includes(theme.metadata.name)
                );
                const otherThemes = filteredThemes.filter(theme =>
                  !preferences?.favorites.includes(theme.metadata.name)
                );

                return (
                  <>
                    {favoriteThemes.length > 0 && (
                      <>
                        <div className="quick-switcher-section-header">Favorites</div>
                        {favoriteThemes.map((theme, localIndex) => {
                          const index = filteredThemes.indexOf(theme);
                          const isRecent = preferences?.recentThemes.includes(theme.metadata.name);
                          const isCurrent = state?.currentTheme === theme.metadata.name;
                          const isSelected = index === selectedIndex;

                          return (
                            <div
                              key={theme.metadata.name}
                              className={`quick-switcher-item ${isSelected ? 'selected' : ''} ${isCurrent ? 'current' : ''}`}
                              onClick={() => handleApplyTheme(theme)}
                              onMouseEnter={() => setSelectedIndex(index)}
                            >
                              <div className="quick-switcher-item-header">
                                <span className="quick-switcher-item-name">
                                  ★ {theme.metadata.name}
                                  {isCurrent && ' (current)'}
                                </span>
                              </div>
                              <div className="quick-switcher-item-description">
                                {theme.metadata.description}
                              </div>
                              <div className="quick-switcher-item-colors">
                                {[
                                  theme.metadata.colors.background,
                                  theme.metadata.colors.red,
                                  theme.metadata.colors.green,
                                  theme.metadata.colors.yellow,
                                  theme.metadata.colors.blue,
                                  theme.metadata.colors.magenta,
                                ].map((color, i) => (
                                  <div
                                    key={i}
                                    className="quick-switcher-color-swatch"
                                    style={{ backgroundColor: color }}
                                  />
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </>
                    )}

                    {/* Other Themes Section */}
                    {otherThemes.length > 0 && (
                      <>
                        {favoriteThemes.length > 0 && (
                          <div className="quick-switcher-section-header">All Themes</div>
                        )}
                        {otherThemes.map((theme, localIndex) => {
                          const index = filteredThemes.indexOf(theme);
                          const isRecent = preferences?.recentThemes.includes(theme.metadata.name);
                          const isCurrent = state?.currentTheme === theme.metadata.name;
                          const isSelected = index === selectedIndex;

                          return (
                            <div
                              key={theme.metadata.name}
                              className={`quick-switcher-item ${isSelected ? 'selected' : ''} ${isCurrent ? 'current' : ''}`}
                              onClick={() => handleApplyTheme(theme)}
                              onMouseEnter={() => setSelectedIndex(index)}
                            >
                              <div className="quick-switcher-item-header">
                                <span className="quick-switcher-item-name">
                                  {theme.metadata.name}
                                  {isCurrent && ' (current)'}
                                </span>
                                {isRecent && (
                                  <span className="quick-switcher-item-badge">Recent</span>
                                )}
                              </div>
                              <div className="quick-switcher-item-description">
                                {theme.metadata.description}
                              </div>
                              <div className="quick-switcher-item-colors">
                                {[
                                  theme.metadata.colors.background,
                                  theme.metadata.colors.red,
                                  theme.metadata.colors.green,
                                  theme.metadata.colors.yellow,
                                  theme.metadata.colors.blue,
                                  theme.metadata.colors.magenta,
                                ].map((color, i) => (
                                  <div
                                    key={i}
                                    className="quick-switcher-color-swatch"
                                    style={{ backgroundColor: color }}
                                  />
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </>
                    )}
                  </>
                );
              })()}
            </>
          )}
        </div>
        <div className="quick-switcher-footer">
          <span className="quick-switcher-hint">↑↓ Navigate</span>
          <span className="quick-switcher-hint">Enter Apply</span>
          <span className="quick-switcher-hint">Esc Close</span>
        </div>
      </div>
    </div>
  );
}
