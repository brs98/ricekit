import { useState, useEffect, lazy, Suspense } from 'react';
import './App.css';
import { ThemeGrid } from './components/ThemeGrid';
import { Theme } from '../shared/types';

// Lazy load heavy components for better initial bundle size
const ThemeEditor = lazy(() => import('./components/ThemeEditor').then(m => ({ default: m.ThemeEditor })));
const ApplicationsView = lazy(() => import('./components/ApplicationsView').then(m => ({ default: m.ApplicationsView })));
const WallpapersView = lazy(() => import('./components/WallpapersView').then(m => ({ default: m.WallpapersView })));
const SettingsView = lazy(() => import('./components/SettingsView').then(m => ({ default: m.SettingsView })));
const QuickSwitcher = lazy(() => import('./components/QuickSwitcher').then(m => ({ default: m.QuickSwitcher })));
const OnboardingModal = lazy(() => import('./components/OnboardingModal').then(m => ({ default: m.OnboardingModal })));
import { useThemeSelfStyling } from './hooks/useThemeSelfStyling';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/renderer/components/ui/dialog';
import { Button } from '@/renderer/components/ui/button';
import { Input } from '@/renderer/components/ui/input';

type FilterMode = 'all' | 'light' | 'dark' | 'favorites';
type SortMode = 'default' | 'name-asc' | 'name-desc' | 'recent';

function App() {
  const [activeView, setActiveView] = useState('themes');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [sortMode, setSortMode] = useState<SortMode>('default');
  const [editorTheme, setEditorTheme] = useState<Theme | undefined>(undefined);
  const [isQuickSwitcher, setIsQuickSwitcher] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showImportUrlModal, setShowImportUrlModal] = useState(false);
  const [importUrl, setImportUrl] = useState('');
  const [importing, setImporting] = useState(false);
  const [stateRestored, setStateRestored] = useState(false);

  // Apply the current theme's colors to the app's own UI
  useThemeSelfStyling();

  // Detect if this is the quick switcher window and check onboarding status
  useEffect(() => {
    const hash = window.location.hash;
    if (hash === '#/quick-switcher') {
      setIsQuickSwitcher(true);
    } else {
      // Parallelize independent async operations for faster startup
      Promise.all([
        checkOnboardingStatus(),
        restoreUIState(),
      ]).catch(error => {
        console.error('Failed to initialize app:', error);
      });
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

  async function restoreUIState() {
    try {
      const savedState = await window.electronAPI.getUIState();
      if (savedState) {
        console.log('Restoring UI state from crash recovery:', savedState);
        // Restore the saved state
        if (savedState.activeView) setActiveView(savedState.activeView);
        if (savedState.searchQuery) setSearchQuery(savedState.searchQuery);
        if (savedState.filterMode) setFilterMode(savedState.filterMode);
        if (savedState.sortMode) setSortMode(savedState.sortMode);
        if (savedState.editorTheme) setEditorTheme(savedState.editorTheme as Theme);
        console.log('UI state restored successfully');
      }
    } catch (error) {
      console.error('Failed to restore UI state:', error);
    } finally {
      // Mark as restored regardless of whether we found saved state
      setStateRestored(true);
    }
  }

  function handleOnboardingComplete() {
    setShowOnboarding(false);
  }

  // Save UI state whenever it changes (for crash recovery)
  useEffect(() => {
    // Don't save state until initial restore is complete
    if (!stateRestored) {
      return;
    }

    // Save state (debounced to avoid excessive saves)
    const timeoutId = setTimeout(() => {
      const uiState = {
        activeView,
        searchQuery,
        filterMode,
        sortMode,
        editorTheme: editorTheme ? {
          name: editorTheme.name,
          metadata: editorTheme.metadata,
        } : undefined,
      };

      window.electronAPI.saveUIState(uiState).catch((error: unknown) => {
        console.error('Failed to save UI state:', error);
      });
    }, 500); // Debounce by 500ms

    return () => clearTimeout(timeoutId);
  }, [activeView, searchQuery, filterMode, sortMode, editorTheme, stateRestored]);

  async function handleImportFromUrl() {
    if (!importUrl.trim()) {
      alert('Please enter a valid URL');
      return;
    }

    try {
      setImporting(true);
      await window.electronAPI.importThemeFromUrl(importUrl);
      alert('Theme imported successfully!');
      setShowImportUrlModal(false);
      setImportUrl('');

      // Refresh the theme grid (trigger re-render)
      window.location.reload();
    } catch (error: unknown) {
      console.error('Failed to import theme from URL:', error);
      const message = error instanceof Error ? error.message : String(error);
      alert(`Failed to import theme: ${message}`);
    } finally {
      setImporting(false);
    }
  }

  // If this is the quick switcher, render only that component
  if (isQuickSwitcher) {
    return (
      <Suspense fallback={<div className="loading-fallback">Loading...</div>}>
        <QuickSwitcher />
      </Suspense>
    );
  }

  return (
    <div className="app">
      {/* Onboarding modal */}
      {showOnboarding && (
        <Suspense fallback={null}>
          <OnboardingModal onComplete={handleOnboardingComplete} />
        </Suspense>
      )}

      {/* Import from URL modal */}
      <Dialog open={showImportUrlModal} onOpenChange={(open) => {
        if (!open) {
          setShowImportUrlModal(false);
          setImportUrl('');
        }
      }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Import Theme from URL</DialogTitle>
            <DialogDescription>
              Enter the URL of a theme file (.zip or .mactheme) to import it.
            </DialogDescription>
          </DialogHeader>
          <Input
            type="url"
            placeholder="https://example.com/mytheme.zip"
            value={importUrl}
            onChange={(e) => setImportUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleImportFromUrl()}
            autoFocus
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowImportUrlModal(false);
                setImportUrl('');
              }}
              disabled={importing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleImportFromUrl}
              disabled={importing || !importUrl.trim()}
            >
              {importing ? 'Importing...' : 'Import'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                <select
                  className="sort-dropdown"
                  value={sortMode}
                  onChange={(e) => setSortMode(e.target.value as SortMode)}
                  title="Sort themes"
                >
                  <option value="default">Default Order</option>
                  <option value="name-asc">Name (A-Z)</option>
                  <option value="name-desc">Name (Z-A)</option>
                  <option value="recent">Recently Used</option>
                </select>
                <button
                  className="filter-chip import-url-button"
                  onClick={() => setShowImportUrlModal(true)}
                  title="Import theme from URL"
                >
                  📥 Import from URL
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
              sortMode={sortMode}
              onEditTheme={(theme) => {
                setEditorTheme(theme);
                setActiveView('editor');
              }}
            />
          )}
          {/* Lazy-loaded views wrapped in Suspense */}
          <Suspense fallback={<div className="view-loading">Loading view...</div>}>
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
          </Suspense>
        </div>
      </div>
    </div>
  );
}

export default App;
