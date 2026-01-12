import { useState, useEffect } from 'react';
import type { PluginStatus, PluginConfig, PresetInfo, FontStatus } from '../../shared/types';
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

  useEffect(() => {
    loadPluginData();
  }, [appName]);

  async function loadPluginData() {
    setLoading(true);
    setError(null);
    try {
      const [statusData, configData, presetsData] = await Promise.all([
        window.electronAPI.getPluginStatus(appName),
        window.electronAPI.getPluginConfig(appName),
        window.electronAPI.listPresets(appName),
      ]);

      setStatus(statusData);
      setConfig(configData);
      setPresets(presetsData);
      setSelectedPreset(configData?.preset || '');
    } catch (err) {
      console.error(`Failed to load plugin data for ${appName}:`, err);
      setError('Failed to load plugin data');
    } finally {
      setLoading(false);
    }
  }

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
      <div className="plugin-card loading">
        <div className="plugin-card-header">
          <h4 className="plugin-name">{displayName}</h4>
        </div>
        <div className="plugin-card-body">
          <div className="loading-spinner">
            <div className="spinner small"></div>
            <span>Loading...</span>
          </div>
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
                <span className="warning-icon">⚠️</span>
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
            <span className="error-icon">❌</span>
            <span>{error}</span>
          </div>
        )}
      </div>

      <div className="plugin-card-actions">
        {status?.isInstalled ? (
          <>
            <Button variant="outline" onClick={handleRefresh} disabled={applyingPreset}>
              Refresh
            </Button>
            {config?.mode === 'preset' && (
              <Button variant="outline" onClick={handleSwitchToCustom}>
                Custom Mode
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
    </div>
  );
}
