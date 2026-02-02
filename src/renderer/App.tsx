import { useState, useEffect, lazy, Suspense } from 'react';
import { Toaster } from 'sonner';
import './App.css';
import { ThemeGrid } from './components/ThemeGrid';
import type { Theme, ThemeColors, ThemeMetadata, SortMode, FilterMode } from '../shared/types';
import { isSortMode } from '../shared/validation';
import { StarterPickerModal, type StarterType, type ImageThemeResult } from './components/StarterPickerModal';

// Lazy load heavy components for better initial bundle size
const ThemeEditor = lazy(() => import('./components/ThemeEditor').then(m => ({ default: m.ThemeEditor })));
const ThemePreview = lazy(() => import('./components/ThemePreview').then(m => ({ default: m.ThemePreview })));
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
import { Palette, AppWindow, Image, Settings, Star, Download, Search, ArrowUpDown, Plus, ArrowLeft } from 'lucide-react';

function App() {
  const [activeView, setActiveView] = useState('themes');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [sortMode, setSortMode] = useState<SortMode>('default');
  const [editorTheme, setEditorTheme] = useState<Theme | undefined>(undefined);
  // Check hash synchronously to avoid rendering full app then switching
  const [isQuickSwitcher] = useState(() => window.location.hash === '#/quick-switcher');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showImportUrlModal, setShowImportUrlModal] = useState(false);
  const [importUrl, setImportUrl] = useState('');
  const [importing, setImporting] = useState(false);
  const [stateRestored, setStateRestored] = useState(false);
  // Editor mode: 'off' = showing grid, 'editing' = editing existing theme, 'creating' = creating new theme, 'preview' = preview auto-generated theme
  const [editorMode, setEditorMode] = useState<'off' | 'editing' | 'creating' | 'preview'>('off');
  const [showStarterModal, setShowStarterModal] = useState(false);
  const [editorStarterType, setEditorStarterType] = useState<StarterType>('blank');
  const [editorPresetKey, setEditorPresetKey] = useState<string | undefined>(undefined);
  // For preview mode: auto-generated theme colors and source image
  const [previewColors, setPreviewColors] = useState<ThemeColors | undefined>(undefined);
  const [previewImageDataUrl, setPreviewImageDataUrl] = useState<string | undefined>(undefined);
  const [previewSuggestedName, setPreviewSuggestedName] = useState<string | undefined>(undefined);
  const [previewIsLight, setPreviewIsLight] = useState<boolean>(false);

  // Apply the current theme's colors to the app's own UI
  useThemeSelfStyling();

  // Initialize main window (onboarding + UI state restore)
  // Skip for quick switcher window
  useEffect(() => {
    if (isQuickSwitcher) return;

    // Parallelize independent async operations for faster startup
    Promise.all([
      checkOnboardingStatus(),
      restoreUIState(),
    ]).catch(error => {
      console.error('Failed to initialize app:', error);
    });
  }, [isQuickSwitcher]);

  async function checkOnboardingStatus() {
    try {
      const prefs = await window.electronAPI.getPreferences();
      if (!prefs.onboardingCompleted) {
        setShowOnboarding(true);
      }
    } catch (error: unknown) {
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
    } catch (error: unknown) {
      console.error('Failed to restore UI state:', error);
    } finally {
      // Mark as restored regardless of whether we found saved state
      setStateRestored(true);
    }
  }

  function handleOnboardingComplete() {
    setShowOnboarding(false);
  }

  function handleStarterSelect(starterType: StarterType, presetKey?: string, imageResult?: ImageThemeResult) {
    setEditorStarterType(starterType);
    setEditorPresetKey(presetKey);
    setEditorTheme(undefined); // Clear any existing theme being edited

    // If we got an image result, go to preview mode instead of editor
    if (starterType === 'image' && imageResult) {
      setPreviewColors(imageResult.colors);
      setPreviewImageDataUrl(imageResult.imageDataUrl);
      setPreviewSuggestedName(imageResult.suggestedName);
      setPreviewIsLight(imageResult.isLight);
      setEditorMode('preview');
    } else {
      setEditorMode('creating');
    }
    setShowStarterModal(false);
  }

  // Handle "Use Theme" from preview - save and return to grid
  async function handlePreviewUseTheme(metadata: ThemeMetadata, isLight?: boolean) {
    try {
      await window.electronAPI.createTheme(metadata, previewImageDataUrl, isLight);
      handleEditorBack();
      // Optionally apply the theme immediately
      const themeDirName = metadata.name.toLowerCase().replace(/[^a-z0-9-]/g, '-');
      await window.electronAPI.applyTheme(themeDirName);
    } catch (error: unknown) {
      console.error('Failed to create theme:', error);
      alert('Failed to save theme. Please try again.');
    }
  }

  // Handle "Customize" from preview - go to editor with the colors
  function handlePreviewCustomize(colors: ThemeColors, imageDataUrl?: string, themeName?: string) {
    // Set up state to pass colors to editor
    setPreviewColors(colors);
    setPreviewImageDataUrl(imageDataUrl);
    if (themeName) {
      setPreviewSuggestedName(themeName);
    }
    setEditorMode('creating');
  }

  function handleEditorBack() {
    setEditorMode('off');
    setEditorTheme(undefined);
    setEditorStarterType('blank');
    setEditorPresetKey(undefined);
    setPreviewColors(undefined);
    setPreviewImageDataUrl(undefined);
    setPreviewSuggestedName(undefined);
    setPreviewIsLight(false);
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
      {/* Toast notifications */}
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: 'rgb(var(--card))',
            color: 'rgb(var(--foreground))',
            border: '1px solid rgb(var(--border))',
          },
        }}
      />

      {/* Onboarding modal */}
      {showOnboarding && (
        <Suspense fallback={null}>
          <OnboardingModal onComplete={handleOnboardingComplete} />
        </Suspense>
      )}

      {/* New Theme Starter Picker Modal */}
      <StarterPickerModal
        open={showStarterModal}
        onOpenChange={setShowStarterModal}
        onSelect={handleStarterSelect}
      />

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
              Enter the URL of a theme file (.zip or .ricekit) to import it.
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
          <h1 className="text-lg font-semibold tracking-tight">Ricekit</h1>
        </div>
        <nav className="sidebar-nav">
          <button
            className={`nav-item ${activeView === 'themes' ? 'active' : ''}`}
            onClick={() => {
              setActiveView('themes');
              setEditorMode('off');
            }}
          >
            <Palette size={20} /> Themes
          </button>
          <button
            className={`nav-item ${activeView === 'apps' ? 'active' : ''}`}
            onClick={() => setActiveView('apps')}
          >
            <AppWindow size={20} /> Apps
          </button>
          <button
            className={`nav-item ${activeView === 'wallpapers' ? 'active' : ''}`}
            onClick={() => setActiveView('wallpapers')}
          >
            <Image size={20} /> Wallpapers
          </button>
          <button
            className={`nav-item ${activeView === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveView('settings')}
          >
            <Settings size={20} /> Settings
          </button>
        </nav>
        <div className="sidebar-footer">
          <span className="version-text">v1.0.0</span>
        </div>
      </div>
      <div className="main-content">
        <div className="content-header">
          {/* Editor/Preview mode header with back button */}
          {activeView === 'themes' && editorMode !== 'off' ? (
            <div className="flex items-center gap-3">
              <button
                onClick={handleEditorBack}
                className="p-2 rounded-lg hover:bg-accent transition-colors"
                title="Back to themes"
              >
                <ArrowLeft size={20} />
              </button>
              <h2 className="text-2xl font-bold tracking-tight">
                {editorMode === 'preview'
                  ? 'Preview Theme'
                  : editorMode === 'creating'
                    ? 'New Theme'
                    : `Edit: ${editorTheme?.metadata.name ?? 'Theme'}`}
              </h2>
            </div>
          ) : (
            <h2 className="text-2xl font-bold capitalize tracking-tight">{activeView}</h2>
          )}
          {activeView === 'themes' && editorMode === 'off' && (
            <div className="theme-controls">
              {/* Search input with icon */}
              <div className="search-wrapper">
                <Search size={16} className="search-icon" />
                <input
                  type="text"
                  placeholder="Search themes..."
                  className="search-input"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Filter row with chips on left, sort on right */}
              <div className="filter-row">
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
                    <Star size={12} className="inline-block mr-1" /> Favorites
                  </button>
                </div>

                <div className="filter-actions">
                  <div className="sort-wrapper">
                    <ArrowUpDown size={14} className="sort-icon" />
                    <select
                      className="sort-dropdown"
                      value={sortMode}
                      onChange={(e) => {
                        if (isSortMode(e.target.value)) {
                          setSortMode(e.target.value);
                        }
                      }}
                      title="Sort themes"
                    >
                      <option value="default">Default</option>
                      <option value="name-asc">A-Z</option>
                      <option value="name-desc">Z-A</option>
                      <option value="recent">Recent</option>
                    </select>
                  </div>
                  <button
                    className="filter-chip import-url-button"
                    onClick={() => setShowImportUrlModal(true)}
                    title="Import theme from URL"
                  >
                    <Download size={14} />
                  </button>
                  <Button
                    onClick={() => setShowStarterModal(true)}
                    size="sm"
                    className="ml-2"
                  >
                    <Plus size={14} className="mr-1" />
                    New Theme
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="content-body">
          {/* View container with key for transition animation */}
          <div className="view-container" key={`${activeView}-${editorMode}`}>
            {activeView === 'themes' && editorMode === 'off' && (
              <ThemeGrid
                searchQuery={searchQuery}
                filterMode={filterMode}
                sortMode={sortMode}
                onEditTheme={(theme) => {
                  setEditorTheme(theme);
                  setEditorMode('editing');
                }}
              />
            )}
            {/* Lazy-loaded views wrapped in Suspense */}
            <Suspense fallback={<div className="view-loading">Loading view...</div>}>
              {activeView === 'themes' && editorMode === 'preview' && previewColors && (
                <ThemePreview
                  colors={previewColors}
                  imageDataUrl={previewImageDataUrl}
                  suggestedName={previewSuggestedName}
                  isLight={previewIsLight}
                  onUseTheme={handlePreviewUseTheme}
                  onCustomize={handlePreviewCustomize}
                  onBack={handleEditorBack}
                />
              )}
              {activeView === 'themes' && (editorMode === 'creating' || editorMode === 'editing') && (
                <ThemeEditor
                  initialTheme={editorTheme?.metadata}
                  sourceTheme={editorTheme}
                  mode={editorMode === 'creating' ? 'create' : 'edit'}
                  starterType={editorStarterType}
                  presetKey={editorPresetKey}
                  initialColors={previewColors}
                  initialName={previewSuggestedName}
                  imageDataUrl={previewImageDataUrl}
                  onSave={handleEditorBack}
                  onSaveAndApply={handleEditorBack}
                  onBack={handleEditorBack}
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
    </div>
  );
}

export default App;
