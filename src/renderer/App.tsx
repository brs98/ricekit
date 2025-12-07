import { useState, useEffect } from 'react';
import './App.css';
import { ThemeGrid } from './components/ThemeGrid';
import { ThemeEditor } from './components/ThemeEditor';
import { ApplicationsView } from './components/ApplicationsView';
import { WallpapersView } from './components/WallpapersView';
import { SettingsView } from './components/SettingsView';
import { QuickSwitcher } from './components/QuickSwitcher';
import { OnboardingModal } from './components/OnboardingModal';
import { Theme } from '../shared/types';

type FilterMode = 'all' | 'light' | 'dark' | 'favorites';

function App() {
  const [activeView, setActiveView] = useState('themes');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [editorTheme, setEditorTheme] = useState<Theme | undefined>(undefined);
  const [isQuickSwitcher, setIsQuickSwitcher] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Detect if this is the quick switcher window and check onboarding status
  useEffect(() => {
    const hash = window.location.hash;
    if (hash === '#/quick-switcher') {
      setIsQuickSwitcher(true);
    } else {
      // Check if onboarding needs to be shown
      checkOnboardingStatus();
    }
  }, []);

  async function checkOnboardingStatus() {
    try {
      const prefs = await window.electronAPI.getPreferences();
      if (!prefs.onboardingCompleted) {
        setShowOnboarding(true);
      }
    } catch (error) {
      console.error('Failed to check onboarding status:', error);
    }
  }

  function handleOnboardingComplete() {
    setShowOnboarding(false);
  }

  // If this is the quick switcher, render only that component
  if (isQuickSwitcher) {
    return <QuickSwitcher />;
  }

  return (
    <div className="app">
      {/* Onboarding modal */}
      {showOnboarding && <OnboardingModal onComplete={handleOnboardingComplete} />}

      <div className="sidebar">
        <div className="sidebar-header">
          <h1 className="text-lg font-semibold">MacTheme</h1>
        </div>
        <nav className="sidebar-nav">
          <button
            className={`nav-item ${activeView === 'themes' ? 'active' : ''}`}
            onClick={() => setActiveView('themes')}
          >
            🎨 Themes
          </button>
          <button
            className={`nav-item ${activeView === 'editor' ? 'active' : ''}`}
            onClick={() => setActiveView('editor')}
          >
            ✏️ Editor
          </button>
          <button
            className={`nav-item ${activeView === 'apps' ? 'active' : ''}`}
            onClick={() => setActiveView('apps')}
          >
            📱 Apps
          </button>
          <button
            className={`nav-item ${activeView === 'wallpapers' ? 'active' : ''}`}
            onClick={() => setActiveView('wallpapers')}
          >
            🖼️ Wallpapers
          </button>
          <button
            className={`nav-item ${activeView === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveView('settings')}
          >
            ⚙️ Settings
          </button>
        </nav>
      </div>
      <div className="main-content">
        <div className="content-header">
          <h2 className="text-2xl font-bold capitalize">{activeView}</h2>
          {activeView === 'themes' && (
            <div className="theme-controls">
              <input
                type="text"
                placeholder="Search themes..."
                className="search-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <div className="filter-chips">
                <button
                  className={`filter-chip ${filterMode === 'all' ? 'active' : ''}`}
                  onClick={() => setFilterMode('all')}
                >
                  All
                </button>
                <button
                  className={`filter-chip ${filterMode === 'light' ? 'active' : ''}`}
                  onClick={() => setFilterMode('light')}
                >
                  Light
                </button>
                <button
                  className={`filter-chip ${filterMode === 'dark' ? 'active' : ''}`}
                  onClick={() => setFilterMode('dark')}
                >
                  Dark
                </button>
                <button
                  className={`filter-chip ${filterMode === 'favorites' ? 'active' : ''}`}
                  onClick={() => setFilterMode('favorites')}
                >
                  ★ Favorites
                </button>
              </div>
            </div>
          )}
        </div>
        <div className="content-body">
          {activeView === 'themes' && (
            <ThemeGrid
              searchQuery={searchQuery}
              filterMode={filterMode}
              onEditTheme={(theme) => {
                setEditorTheme(theme);
                setActiveView('editor');
              }}
            />
          )}
          {activeView === 'editor' && (
            <ThemeEditor
              initialTheme={editorTheme?.metadata}
              sourceTheme={editorTheme}
              onSave={() => {
                setActiveView('themes');
                setEditorTheme(undefined);
              }}
              onCancel={() => {
                setActiveView('themes');
                setEditorTheme(undefined);
              }}
            />
          )}
          {activeView === 'apps' && (
            <ApplicationsView />
          )}
          {activeView === 'wallpapers' && (
            <WallpapersView />
          )}
          {activeView === 'settings' && (
            <SettingsView />
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
