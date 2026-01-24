import { useState, useEffect, useCallback } from 'react';
import type { PluginStatus, PluginConfig, PresetInfo, FontStatus } from '../../shared/types';
import { AlertTriangle, XCircle } from 'lucide-react';
import { Button } from './ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';

interface PluginCardProps {
  appName: string;
  displayName: string;
  description: string;
  onStatusChange?: () => void;
}

// Plugins that require Nerd Fonts for icons
const NERD_FONT_PLUGINS = ['sketchybar'];

export function PluginCard({
  appName,
  displayName,
  description,
  onStatusChange,
}: PluginCardProps) {
  const [status, setStatus] = useState<PluginStatus | null>(null);
  const [config, setConfig] = useState<PluginConfig | null>(null);
  const [presets, setPresets] = useState<PresetInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [installing, setInstalling] = useState(false);
  const [applyingPreset, setApplyingPreset] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // Font installation dialog state
  const [fontStatus, setFontStatus] = useState<FontStatus | null>(null);
  const [showFontDialog, setShowFontDialog] = useState(false);
  const [installingFont, setInstallingFont] = useState(false);
  const [pendingPreset, setPendingPreset] = useState<string | null>(null);

  // Backup restore state
  const [hasBackup, setHasBackup] = useState(false);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const loadPluginData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statusData, configData, presetsData, backupExists] = await Promise.all([
        window.electronAPI.getPluginStatus(appName),
        window.electronAPI.getPluginConfig(appName),
        window.electronAPI.listPresets(appName),
        window.electronAPI.hasPluginBackup(appName),
      ]);

      setStatus(statusData);
      setConfig(configData);
      setPresets(presetsData);
      setSelectedPreset(configData?.preset || '');
      setHasBackup(backupExists);
    } catch (err) {
      console.error(`Failed to load plugin data for ${appName}:`, err);
      setError('Failed to load plugin data');
    } finally {
      setLoading(false);
    }
  }, [appName]);

  useEffect(() => {
    loadPluginData();
  }, [loadPluginData]);

  async function handleInstall() {
    setInstalling(true);
    setError(null);
    try {
      await window.electronAPI.installPlugin(appName);
      await loadPluginData();
      onStatusChange?.();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
    } finally {
      setInstalling(false);
    }
  }

  async function handlePresetChange(presetName: string) {
    // Check if this plugin requires Nerd Fonts
    if (NERD_FONT_PLUGINS.includes(appName)) {
      try {
        const fontStatusData = await window.electronAPI.getFontStatus();
        setFontStatus(fontStatusData);

        if (!fontStatusData.hasNerdFont) {
          // Show font installation dialog
          setPendingPreset(presetName);
          setShowFontDialog(true);
          return;
        }
      } catch (err) {
        console.warn('Failed to check font status:', err);
        // Continue anyway - the preset will use fallback icons
      }
    }

    // Apply the preset
    await applyPreset(presetName);
  }

  async function applyPreset(presetName: string) {
    setApplyingPreset(true);
    setError(null);
    try {
      await window.electronAPI.setPreset(appName, presetName);
      setSelectedPreset(presetName);
      setConfig((prev) => (prev ? { ...prev, mode: 'preset', preset: presetName } : null));

      // Refresh the plugin to apply the new config
      await window.electronAPI.refreshApp(appName);
      onStatusChange?.();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
    } finally {
      setApplyingPreset(false);
    }
  }

  async function handleInstallFont() {
    setInstallingFont(true);
    setError(null);
    try {
      const result = await window.electronAPI.installNerdFont();
      if (result.success) {
        // Update font status
        const newFontStatus = await window.electronAPI.getFontStatus();
        setFontStatus(newFontStatus);
        setShowFontDialog(false);

        // Apply the pending preset
        if (pendingPreset) {
          await applyPreset(pendingPreset);
          setPendingPreset(null);
        }
      } else {
        setError(result.error || 'Failed to install font');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
    } finally {
      setInstallingFont(false);
    }
  }

  async function handleSkipFontInstall() {
    setShowFontDialog(false);
    // Apply preset anyway - will use fallback icons
    if (pendingPreset) {
      await applyPreset(pendingPreset);
      setPendingPreset(null);
    }
  }

  async function handleRestoreBackup() {
    setRestoring(true);
    setError(null);
    try {
      const result = await window.electronAPI.restorePluginBackup(appName);
      if (result.success) {
        setShowRestoreDialog(false);
        // Refresh the plugin to apply the restored config
        await window.electronAPI.refreshApp(appName);
        await loadPluginData();
        onStatusChange?.();
      } else {
        setError(result.error || 'Failed to restore backup');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
    } finally {
      setRestoring(false);
    }
  }

  async function handleSwitchToCustom() {
    setError(null);
    try {
      await window.electronAPI.resetPluginToCustom(appName);
      setConfig((prev) => (prev ? { ...prev, mode: 'custom', preset: undefined } : null));
      setSelectedPreset('');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
    }
  }

  async function handleRefresh() {
    setError(null);
    try {
      await window.electronAPI.refreshApp(appName);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
    }
  }

  if (loading) {
    return (
      <div className="plugin-card">
        <div className="plugin-card-header">
          <div className="plugin-name-row">
            <h4 className="plugin-name">{displayName}</h4>
            <div className="h-5 w-20 bg-muted rounded animate-pulse" />
          </div>
          <div className="h-3 w-full bg-muted rounded animate-pulse mt-2" />
        </div>
        <div className="plugin-card-body">
          <div className="plugin-config">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-3 w-12 bg-muted rounded animate-pulse" />
              <div className="h-4 w-24 bg-muted rounded animate-pulse" />
            </div>
            <div className="h-9 w-full bg-muted rounded-md animate-pulse" />
          </div>
        </div>
        <div className="plugin-card-actions">
          <div className="h-9 w-20 bg-muted rounded-md animate-pulse" />
          <div className="h-9 w-28 bg-muted rounded-md animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className={`plugin-card ${!status?.isInstalled ? 'not-installed' : ''}`}>
      <div className="plugin-card-header">
        <div className="plugin-name-row">
          <h4 className="plugin-name">{displayName}</h4>
          {status?.isInstalled ? (
            <span className="badge badge-installed">Installed</span>
          ) : (
            <span className="badge badge-not-found">Not Installed</span>
          )}
        </div>
        <p className="plugin-description">{description}</p>
      </div>

      <div className="plugin-card-body">
        {status?.isInstalled ? (
          <div className="plugin-config">
            {/* Mode indicator */}
            <div className="plugin-mode">
              <span className="mode-label">Mode:</span>
              <span className={`mode-value ${config?.mode === 'preset' ? 'preset' : 'custom'}`}>
                {config?.mode === 'preset' ? `Preset (${config.preset})` : 'Custom'}
              </span>
            </div>

            {/* Preset selector */}
            {presets.length > 0 && (
              <div className="preset-selector">
                <label className="preset-label">Select Preset</label>
                <Select
                  value={selectedPreset}
                  onValueChange={handlePresetChange}
                  disabled={applyingPreset}
                >
                  <SelectTrigger className="preset-trigger">
                    <SelectValue placeholder="Choose a preset..." />
                  </SelectTrigger>
                  <SelectContent>
                    {presets.map((preset) => (
                      <SelectItem key={preset.name} value={preset.name}>
                        <div className="preset-option">
                          <span className="preset-name">{preset.displayName}</span>
                          <span className="preset-description">{preset.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Existing config warning */}
            {status.hasExistingConfig && config?.mode !== 'preset' && (
              <div className="config-warning">
                <AlertTriangle size={14} className="warning-icon shrink-0" />
                <span>
                  Existing config detected. Applying a preset will back up your current config.
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="plugin-not-installed">
            <p>{displayName} is not installed.</p>
            <p className="install-hint">Click Install to set it up via Homebrew.</p>
          </div>
        )}

        {error && (
          <div className="plugin-error">
            <XCircle size={14} className="error-icon shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      <div className="plugin-card-actions">
        {status?.isInstalled ? (
          <>
            <Button variant="outline" onClick={handleRefresh} disabled={applyingPreset || restoring}>
              Refresh
            </Button>
            {config?.mode === 'preset' && (
              <Button variant="outline" onClick={handleSwitchToCustom} disabled={restoring}>
                Custom Mode
              </Button>
            )}
            {hasBackup && (
              <Button
                variant="outline"
                onClick={() => setShowRestoreDialog(true)}
                disabled={restoring}
              >
                Restore Backup
              </Button>
            )}
          </>
        ) : (
          <Button onClick={handleInstall} disabled={installing}>
            {installing ? 'Installing...' : 'Install'}
          </Button>
        )}
      </div>

      {/* Font Installation Dialog */}
      <AlertDialog open={showFontDialog} onOpenChange={setShowFontDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Nerd Font Required</AlertDialogTitle>
            <AlertDialogDescription>
              {displayName} presets use icons from Nerd Fonts. For the best experience,
              we recommend installing <strong>{fontStatus?.recommendedFont || 'Hack Nerd Font'}</strong>.
              <br /><br />
              This will be installed via Homebrew. You can also skip this and use basic text icons instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleSkipFontInstall} disabled={installingFont}>
              Skip (Use Fallback)
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleInstallFont} disabled={installingFont}>
              {installingFont ? 'Installing...' : 'Install Font'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Restore Backup Dialog */}
      <AlertDialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore Original Configuration?</AlertDialogTitle>
            <AlertDialogDescription>
              This will restore your original {displayName} configuration from before MacTheme was applied.
              <br /><br />
              Your current MacTheme preset configuration will be replaced with your backed-up config.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={restoring}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRestoreBackup} disabled={restoring}>
              {restoring ? 'Restoring...' : 'Restore Backup'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
