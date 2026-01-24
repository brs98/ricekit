import { useEffect, useState } from 'react';
import type { AppInfo } from '../../shared/types';
import { SetupWizardModal } from './SetupWizardModal';
import { Switch } from '@/renderer/components/ui/switch';
import { Button } from '@/renderer/components/ui/button';
import { PluginCard } from './PluginCard';
import {
  Monitor,
  FileText,
  Terminal,
  Rocket,
  Cpu,
  MessageCircle,
  LayoutGrid,
  Package,
  RefreshCw,
  Plug,
} from 'lucide-react';

// Plugin definitions for auto-setup, organized by category
const PLUGIN_CATEGORIES = [
  {
    name: 'Status Bars',
    plugins: [
      {
        name: 'sketchybar',
        displayName: 'SketchyBar',
        description: 'Highly customizable macOS status bar replacement',
      },
    ],
  },
  {
    name: 'Window Management',
    plugins: [
      {
        name: 'aerospace',
        displayName: 'AeroSpace',
        description: 'Tiling window manager with themed borders',
      },
    ],
  },
  {
    name: 'CLI Tools',
    plugins: [
      {
        name: 'starship',
        displayName: 'Starship',
        description: 'Cross-shell prompt with git integration',
      },
      {
        name: 'tmux',
        displayName: 'tmux',
        description: 'Terminal multiplexer with themed status bar',
      },
      {
        name: 'bat',
        displayName: 'bat',
        description: 'Syntax-highlighted cat replacement',
      },
      {
        name: 'delta',
        displayName: 'delta',
        description: 'Themed git diff viewer',
      },
    ],
  },
];

export function ApplicationsView() {
  const [apps, setApps] = useState<AppInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [setupApp, setSetupApp] = useState<AppInfo | null>(null);
  const [enabledApps, setEnabledApps] = useState<string[]>([]);
  const [refreshingApp, setRefreshingApp] = useState<string | null>(null);

  useEffect(() => {
    loadApps();
    loadPreferences();
  }, []);

  const loadApps = async () => {
    try {
      setLoading(true);
      setError(null);
      const detectedApps = await window.electronAPI.detectApps();
      setApps(detectedApps);
    } catch (err) {
      console.error('Failed to load apps:', err);
      setError('Failed to detect applications');
    } finally {
      setLoading(false);
    }
  };

  const loadPreferences = async () => {
    try {
      const prefs = await window.electronAPI.getPreferences();
      setEnabledApps(prefs.enabledApps);
    } catch (err) {
      console.error('Failed to load preferences:', err);
      // Default to all apps enabled
      setEnabledApps([]);
    }
  };

  const handleToggleApp = async (appName: string) => {
    try {
      // Empty array means all apps are enabled by default
      // When an app is in the array, it's enabled; when not in array, it's disabled
      const isCurrentlyEnabled = enabledApps.length === 0 || enabledApps.includes(appName);
      let newEnabledApps: string[];

      if (enabledApps.length === 0) {
        // First toggle - initialize with all apps except the one being disabled
        newEnabledApps = apps
          .map(a => a.name)
          .filter(name => name !== appName);
      } else if (isCurrentlyEnabled) {
        // Remove from enabled list (disable app)
        newEnabledApps = enabledApps.filter(name => name !== appName);
      } else {
        // Add to enabled list (enable app)
        newEnabledApps = [...enabledApps, appName];
      }

      // Update local state immediately for responsive UI
      setEnabledApps(newEnabledApps);

      // Persist to preferences
      const prefs = await window.electronAPI.getPreferences();
      prefs.enabledApps = newEnabledApps;
      await window.electronAPI.setPreferences(prefs);
    } catch (err) {
      console.error('Failed to toggle app:', err);
      // Reload preferences to sync state
      loadPreferences();
    }
  };

  const handleViewConfig = async (configPath: string) => {
    try {
      await window.electronAPI.openPath(configPath);
    } catch (err) {
      console.error('Failed to open config file:', err);
      setError('Failed to open config file. It may not exist yet.');
    }
  };

  const handleRefreshApp = async (appName: string) => {
    try {
      setRefreshingApp(appName);
      await window.electronAPI.refreshApp(appName);
    } catch (err) {
      console.error('Failed to refresh app:', err);
      setError(`Failed to refresh ${appName}. The app may not be running.`);
    } finally {
      setRefreshingApp(null);
    }
  };

  const getCategoryIcon = (category: string) => {
    const iconProps = { size: 16, className: 'inline-block' };
    switch (category) {
      case 'terminal':
        return <Monitor {...iconProps} />;
      case 'editor':
        return <FileText {...iconProps} />;
      case 'cli':
        return <Terminal {...iconProps} />;
      case 'launcher':
        return <Rocket {...iconProps} />;
      case 'system':
        return <Cpu {...iconProps} />;
      case 'communication':
        return <MessageCircle {...iconProps} />;
      case 'tiling':
        return <LayoutGrid {...iconProps} />;
      default:
        return <Package {...iconProps} />;
    }
  };

  const getCategoryName = (category: string) => {
    switch (category) {
      case 'terminal':
        return 'Terminals';
      case 'editor':
        return 'Editors';
      case 'cli':
        return 'CLI Tools';
      case 'launcher':
        return 'Launchers';
      case 'system':
        return 'System';
      case 'communication':
        return 'Communication';
      case 'tiling':
        return 'Tiling Managers';
      default:
        return 'Other';
    }
  };

  // Group apps by category
  const groupedApps = apps.reduce((acc, app) => {
    const category = app.category;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(app);
    return acc;
  }, {} as Record<string, AppInfo[]>);

  const categories = ['terminal', 'editor', 'cli', 'launcher', 'system', 'tiling', 'communication'];

  if (loading) {
    return (
      <div className="apps-view">
        {/* Header Skeleton */}
        <div className="apps-header">
          <div className="flex flex-col gap-2 flex-1">
            <div className="h-4 w-96 bg-muted rounded animate-pulse" />
            <div className="h-3 w-48 bg-muted rounded animate-pulse opacity-60" />
          </div>
          <div className="h-9 w-24 bg-muted rounded-lg animate-pulse" />
        </div>

        {/* Plugins Section Skeleton */}
        <div className="plugins-section">
          <div className="plugins-header">
            <div className="flex items-center gap-2 mb-6">
              <div className="h-4 w-4 bg-muted rounded animate-pulse" />
              <div className="h-5 w-32 bg-muted rounded animate-pulse" />
            </div>
          </div>

          {/* Plugin Categories - 3 skeleton plugin cards */}
          {[1, 2, 3].map((categoryIndex) => (
            <div key={categoryIndex} className="plugin-category">
              <div className="h-4 w-40 bg-muted rounded animate-pulse mb-3 opacity-70" />
              <div className="plugin-cards">
                {[1, 2].map((cardIndex) => (
                  <div
                    key={cardIndex}
                    className="bg-card border border-border rounded-xl p-4 flex flex-col gap-3"
                    style={{ animationDelay: `${(categoryIndex * 2 + cardIndex) * 100}ms` }}
                  >
                    <div className="flex justify-between items-start">
                      <div className="h-5 w-32 bg-muted rounded animate-pulse" />
                      <div className="h-6 w-12 bg-muted rounded-full animate-pulse" />
                    </div>
                    <div className="h-3 w-full bg-muted rounded animate-pulse opacity-60" />
                    <div className="h-3 w-3/4 bg-muted rounded animate-pulse opacity-60" />
                    <div className="flex gap-2 mt-2">
                      <div className="h-8 w-20 bg-muted rounded-md animate-pulse" />
                      <div className="h-8 w-20 bg-muted rounded-md animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* App Categories Skeleton */}
        <div className="apps-list">
          {[1, 2, 3].map((categoryIndex) => (
            <div key={categoryIndex} className="app-category">
              {/* Category Title */}
              <div className="flex items-center gap-2 mb-3">
                <div className="h-3 w-3 bg-muted rounded animate-pulse" />
                <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                <div className="h-3 w-12 bg-muted rounded animate-pulse opacity-60" />
              </div>

              {/* App Cards Grid */}
              <div className="app-cards">
                {[1, 2, 3].map((cardIndex) => (
                  <div
                    key={cardIndex}
                    className="bg-card border border-border rounded-lg p-3 flex flex-col gap-2"
                    style={{ animationDelay: `${(categoryIndex * 3 + cardIndex) * 80}ms` }}
                  >
                    <div className="flex justify-between items-center">
                      <div className="h-4 w-28 bg-muted rounded animate-pulse" />
                      <div className="h-5 w-10 bg-muted rounded-full animate-pulse" />
                    </div>
                    <div className="h-3 w-full bg-muted rounded animate-pulse opacity-50" />
                    <div className="flex gap-2 mt-1">
                      <div className="h-7 w-16 bg-muted rounded animate-pulse" />
                      <div className="h-7 w-16 bg-muted rounded animate-pulse" />
                      <div className="h-7 w-8 bg-muted rounded animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="apps-view">
        <div className="error-state">
          <p className="error-message">{error}</p>
          <Button variant="outline" onClick={loadApps}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="apps-view">
      <div className="apps-header">
        <p className="apps-description">
          Configure which applications should use MacTheme themes.
          Detected: {apps.filter(a => a.isInstalled).length} / {apps.length} apps installed
        </p>
        <Button variant="outline" onClick={loadApps}>
          <RefreshCw size={14} className="mr-1" /> Refresh
        </Button>
      </div>

      {/* Plugins Section - Auto-setup with presets */}
      <div className="plugins-section">
        <div className="plugins-header">
          <h3 className="section-title">
            <span className="category-icon"><Plug size={16} className="inline-block" /></span>
            Plugins
            <span className="category-subtitle">(Auto-setup with presets)</span>
          </h3>
        </div>

        {PLUGIN_CATEGORIES.map((category) => (
          <div key={category.name} className="plugin-category">
            <h4 className="plugin-category-title">{category.name}</h4>
            <div className="plugin-cards">
              {category.plugins.map((plugin) => (
                <PluginCard
                  key={plugin.name}
                  appName={plugin.name}
                  displayName={plugin.displayName}
                  description={plugin.description}
                  onStatusChange={loadApps}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="apps-list">
        {categories.map((category) => {
          const categoryApps = groupedApps[category] || [];
          if (categoryApps.length === 0) return null;

          return (
            <div key={category} className="app-category">
              <h3 className="category-title">
                <span className="category-icon">{getCategoryIcon(category)}</span>
                {getCategoryName(category)}
                <span className="category-count">
                  ({categoryApps.filter(a => a.isInstalled).length}/{categoryApps.length})
                </span>
              </h3>

              <div className="app-cards">
                {categoryApps.map((app) => (
                  <div
                    key={app.name}
                    className={`app-card ${!app.isInstalled ? 'not-installed' : ''}`}
                  >
                    <div className="app-card-header">
                      <div className="app-name-row">
                        <div className="flex items-center gap-2">
                          <h4 className="app-name">{app.displayName}</h4>
                          {/* Compact status indicator */}
                          {app.isInstalled ? (
                            !app.isConfigured && (
                              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400">
                                Setup
                              </span>
                            )
                          ) : (
                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                              Not Found
                            </span>
                          )}
                        </div>
                        {app.isInstalled && (
                          <Switch
                            checked={enabledApps.length === 0 || enabledApps.includes(app.name)}
                            onCheckedChange={() => handleToggleApp(app.name)}
                            aria-label={`Enable ${app.displayName}`}
                          />
                        )}
                      </div>
                    </div>

                    {app.isInstalled && (
                      <div className="app-card-body">
                        <p className="app-config-path text-[11px] opacity-70">
                          {app.configPath}
                        </p>
                      </div>
                    )}

                    <div className="app-card-actions">
                      {app.isInstalled && !app.isConfigured && (
                        <Button size="sm" onClick={() => setSetupApp(app)}>
                          Setup Integration
                        </Button>
                      )}
                      {app.isInstalled && app.isConfigured && (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setSetupApp(app)}
                            title="View setup instructions"
                          >
                            Guide
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => app.configPath && handleViewConfig(app.configPath)}
                          >
                            Config
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRefreshApp(app.name)}
                            disabled={refreshingApp === app.name}
                          >
                            <RefreshCw size={14} className={refreshingApp === app.name ? 'animate-spin' : ''} />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {apps.filter(a => a.isInstalled).length === 0 && (
        <div className="empty-state">
          <p>No supported applications detected.</p>
          <p className="empty-state-hint">
            Install terminal emulators, editors, or CLI tools to use MacTheme.
          </p>
        </div>
      )}

      {setupApp && (
        <SetupWizardModal
          app={setupApp}
          onClose={() => setSetupApp(null)}
          onSetupComplete={() => {
            setSetupApp(null);
            loadApps(); // Refresh app list to update configured status
          }}
        />
      )}
    </div>
  );
}
