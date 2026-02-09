import { useEffect, useState } from 'react';
import type { AppInfo, PluginStatus } from '../../shared/types';
import { SetupWizardModal } from './SetupWizardModal';
import { PluginSettingsDialog } from './PluginSettingsDialog';
import { Switch } from '@/renderer/components/ui/switch';
import { Button } from '@/renderer/components/ui/button';
import { RefreshCw, Settings } from 'lucide-react';

interface Item {
  name: string;
  displayName: string;
  kind: 'plugin' | 'app';
  description: string;
}

const ITEMS: readonly Item[] = [
  { name: 'sketchybar', displayName: 'SketchyBar', kind: 'plugin', description: 'Highly customizable macOS status bar replacement' },
  { name: 'aerospace', displayName: 'AeroSpace', kind: 'plugin', description: 'Tiling window manager with themed borders' },
  { name: 'tmux', displayName: 'tmux', kind: 'plugin', description: 'Terminal multiplexer with themed status bar' },
  { name: 'neovim', displayName: 'Neovim', kind: 'app', description: 'Extensible text editor' },
  { name: 'wezterm', displayName: 'WezTerm', kind: 'app', description: 'GPU-accelerated terminal emulator' },
] as const;

const ALL_ITEM_NAMES = ITEMS.map(i => i.name);

export function ApplicationsView() {
  const [apps, setApps] = useState<AppInfo[]>([]);
  const [pluginStatuses, setPluginStatuses] = useState<Record<string, PluginStatus>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [setupApp, setSetupApp] = useState<AppInfo | null>(null);
  const [enabledApps, setEnabledApps] = useState<string[]>([]);
  const [refreshingApp, setRefreshingApp] = useState<string | null>(null);
  const [settingsPlugin, setSettingsPlugin] = useState<string | null>(null);
  const [installingPlugin, setInstallingPlugin] = useState<string | null>(null);

  useEffect(() => {
    loadAll();
    loadPreferences();
  }, []);

  const loadAll = async () => {
    try {
      setLoading(true);
      setError(null);

      const pluginNames = ITEMS.filter(i => i.kind === 'plugin').map(i => i.name);

      const [detectedApps, ...statuses] = await Promise.all([
        window.electronAPI.detectApps(),
        ...pluginNames.map(name => window.electronAPI.getPluginStatus(name)),
      ]);

      setApps(detectedApps);

      const statusMap: Record<string, PluginStatus> = {};
      pluginNames.forEach((name, i) => {
        statusMap[name] = statuses[i];
      });
      setPluginStatuses(statusMap);
    } catch (err: unknown) {
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
    } catch (err: unknown) {
      console.error('Failed to load preferences:', err);
      setEnabledApps([]);
    }
  };

  const handleToggleApp = async (appName: string) => {
    try {
      const isCurrentlyEnabled = enabledApps.length === 0 || enabledApps.includes(appName);
      let newEnabledApps: string[];

      if (enabledApps.length === 0) {
        // First toggle — initialize with ALL item names minus the toggled one
        newEnabledApps = ALL_ITEM_NAMES.filter(name => name !== appName);
      } else if (isCurrentlyEnabled) {
        newEnabledApps = enabledApps.filter(name => name !== appName);
      } else {
        newEnabledApps = [...enabledApps, appName];
      }

      setEnabledApps(newEnabledApps);

      const prefs = await window.electronAPI.getPreferences();
      prefs.enabledApps = newEnabledApps;
      await window.electronAPI.setPreferences(prefs);
    } catch (err: unknown) {
      console.error('Failed to toggle app:', err);
      loadPreferences();
    }
  };

  const handleViewConfig = async (configPath: string) => {
    try {
      await window.electronAPI.openPath(configPath);
    } catch (err: unknown) {
      console.error('Failed to open config file:', err);
      setError('Failed to open config file. It may not exist yet.');
    }
  };

  const handleRefreshApp = async (appName: string) => {
    try {
      setRefreshingApp(appName);
      await window.electronAPI.refreshApp(appName);
    } catch (err: unknown) {
      console.error('Failed to refresh app:', err);
      setError(`Failed to refresh ${appName}. The app may not be running.`);
    } finally {
      setRefreshingApp(null);
    }
  };

  const handleInstallPlugin = async (appName: string) => {
    try {
      setInstallingPlugin(appName);
      setError(null);
      await window.electronAPI.installPlugin(appName);
      // Reload plugin status after install
      const newStatus = await window.electronAPI.getPluginStatus(appName);
      setPluginStatuses(prev => ({ ...prev, [appName]: newStatus }));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
    } finally {
      setInstallingPlugin(null);
    }
  };

  // Lookup helpers
  const getAppInfo = (name: string): AppInfo | undefined => apps.find(a => a.name === name);
  const getPluginStatus = (name: string): PluginStatus | undefined => pluginStatuses[name];

  const isItemInstalled = (item: Item): boolean => {
    if (item.kind === 'plugin') {
      return getPluginStatus(item.name)?.isInstalled ?? false;
    }
    return getAppInfo(item.name)?.isInstalled ?? false;
  };

  const installedCount = ITEMS.filter(isItemInstalled).length;

  // Settings dialog item
  const settingsItem = ITEMS.find(i => i.name === settingsPlugin);

  if (loading) {
    return (
      <div className="apps-view">
        <div className="apps-header">
          <div className="flex flex-col gap-2 flex-1">
            <div className="h-4 w-96 bg-muted rounded animate-pulse" />
          </div>
          <div className="h-9 w-24 bg-muted rounded-lg animate-pulse" />
        </div>

        <div className="unified-cards">
          {ITEMS.map((item, i) => (
            <div
              key={item.name}
              className="unified-card"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="h-4 w-24 bg-muted rounded animate-pulse" />
              <div className="flex-1" />
              <div className="h-6 w-16 bg-muted rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error && apps.length === 0 && Object.keys(pluginStatuses).length === 0) {
    return (
      <div className="apps-view">
        <div className="error-state">
          <p className="error-message">{error}</p>
          <Button variant="outline" onClick={loadAll}>
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
          Configure which applications should use Ricekit themes.
          Detected: {installedCount} / {ITEMS.length} installed
        </p>
        <Button variant="outline" onClick={loadAll}>
          <RefreshCw size={14} className="mr-1" /> Refresh
        </Button>
      </div>

      {error && (
        <div className="px-6">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      <div className="unified-cards">
        {ITEMS.map((item) => {
          const installed = isItemInstalled(item);
          const isEnabled = enabledApps.length === 0 || enabledApps.includes(item.name);

          if (item.kind === 'plugin') {
            const status = getPluginStatus(item.name);
            return (
              <div
                key={item.name}
                className={`unified-card ${!installed ? 'not-installed' : ''}`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm font-semibold truncate">{item.displayName}</span>
                  {installed ? (
                    <span className="badge badge-installed">Installed</span>
                  ) : (
                    <span className="badge badge-not-found">Not Found</span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 ml-auto shrink-0">
                  {installed ? (
                    <>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        onClick={() => handleRefreshApp(item.name)}
                        disabled={refreshingApp === item.name}
                        title="Refresh"
                      >
                        <RefreshCw size={14} className={refreshingApp === item.name ? 'animate-spin' : ''} />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        onClick={() => setSettingsPlugin(item.name)}
                        title="Plugin settings"
                      >
                        <Settings size={14} />
                      </Button>
                      <Switch
                        checked={isEnabled}
                        onCheckedChange={() => handleToggleApp(item.name)}
                        aria-label={`Enable ${item.displayName}`}
                      />
                    </>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => handleInstallPlugin(item.name)}
                      disabled={installingPlugin === item.name}
                    >
                      {installingPlugin === item.name ? 'Installing...' : 'Install'}
                    </Button>
                  )}
                </div>
              </div>
            );
          }

          // App kind
          const appInfo = getAppInfo(item.name);
          return (
            <div
              key={item.name}
              className={`unified-card ${!installed ? 'not-installed' : ''}`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm font-semibold truncate">{item.displayName}</span>
                {!installed && (
                  <span className="badge badge-not-found">Not Found</span>
                )}
                {installed && appInfo && !appInfo.hasRicekitIntegration && (
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400">
                    Setup
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5 ml-auto shrink-0">
                {installed && appInfo && !appInfo.hasRicekitIntegration && (
                  <Button size="sm" onClick={() => setSetupApp(appInfo)}>
                    Setup
                  </Button>
                )}
                {installed && appInfo?.hasRicekitIntegration && (
                  <>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setSetupApp(appInfo)}
                      title="View setup instructions"
                    >
                      Guide
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => appInfo.configPath && handleViewConfig(appInfo.configPath)}
                    >
                      Config
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0"
                      onClick={() => handleRefreshApp(item.name)}
                      disabled={refreshingApp === item.name}
                    >
                      <RefreshCw size={14} className={refreshingApp === item.name ? 'animate-spin' : ''} />
                    </Button>
                  </>
                )}
                {installed && (
                  <Switch
                    checked={isEnabled}
                    onCheckedChange={() => handleToggleApp(item.name)}
                    aria-label={`Enable ${item.displayName}`}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {installedCount === 0 && (
        <div className="empty-state">
          <p>No supported applications detected.</p>
          <p className="empty-state-hint">
            Install terminal emulators, editors, or CLI tools to use Ricekit.
          </p>
        </div>
      )}

      {setupApp && (
        <SetupWizardModal
          app={setupApp}
          onClose={() => setSetupApp(null)}
          onSetupComplete={() => {
            setSetupApp(null);
            loadAll();
          }}
        />
      )}

      {settingsPlugin && settingsItem && (
        <PluginSettingsDialog
          appName={settingsPlugin}
          displayName={settingsItem.displayName}
          open={true}
          onOpenChange={(open) => { if (!open) setSettingsPlugin(null); }}
          onStatusChange={loadAll}
        />
      )}
    </div>
  );
}
