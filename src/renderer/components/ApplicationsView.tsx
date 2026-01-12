import { useEffect, useState } from 'react';
import type { AppInfo } from '../../shared/types';
import { SetupWizardModal } from './SetupWizardModal';
import { Switch } from '@/renderer/components/ui/switch';
import { Button } from '@/renderer/components/ui/button';
import { PluginCard } from './PluginCard';

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
    switch (category) {
      case 'terminal':
        return '💻';
      case 'editor':
        return '📝';
      case 'cli':
        return '⚙️';
      case 'launcher':
        return '🚀';
      case 'system':
        return '🖥️';
      case 'communication':
        return '💬';
      case 'tiling':
        return '🪟';
      default:
        return '📦';
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
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Detecting installed applications...</p>
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
          🔄 Refresh
        </Button>
      </div>

      {/* Plugins Section - Auto-setup with presets */}
      <div className="plugins-section">
        <div className="plugins-header">
          <h3 className="section-title">
            <span className="category-icon">🔌</span>
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
                        <h4 className="app-name">{app.displayName}</h4>
                        {app.isInstalled && (
                          <Switch
                            checked={enabledApps.length === 0 || enabledApps.includes(app.name)}
                            onCheckedChange={() => handleToggleApp(app.name)}
                            aria-label={`Enable ${app.displayName}`}
                          />
                        )}
                      </div>
                      <div className="app-badges">
                        {app.isInstalled ? (
                          <span className="badge badge-installed">✓ Installed</span>
                        ) : (
                          <span className="badge badge-not-found">Not Found</span>
                        )}
                        {app.isInstalled && (
                          <>
                            {app.isConfigured ? (
                              <span className="badge badge-configured">Configured</span>
                            ) : (
                              <span className="badge badge-needs-setup">Needs Setup</span>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    <div className="app-card-body">
                      <p className="app-config-path">
                        <span className="config-label">Config:</span> {app.configPath}
                      </p>
                    </div>

                    <div className="app-card-actions">
                      {app.isInstalled && !app.isConfigured && (
                        <Button onClick={() => setSetupApp(app)}>
                          Setup Integration
                        </Button>
                      )}
                      {app.isInstalled && app.isConfigured && (
                        <>
                          <Button
                            variant="outline"
                            onClick={() => setSetupApp(app)}
                            title="View setup instructions"
                          >
                            Setup Guide
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => handleViewConfig(app.configPath)}
                          >
                            View Config
                          </Button>
                          <Button
                            onClick={() => handleRefreshApp(app.name)}
                            disabled={refreshingApp === app.name}
                          >
                            {refreshingApp === app.name ? 'Refreshing...' : 'Refresh'}
                          </Button>
                        </>
                      )}
                      {!app.isInstalled && (
                        <Button variant="secondary" disabled>
                          Not Installed
                        </Button>
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
