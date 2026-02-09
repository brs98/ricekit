import { useState, useEffect, useCallback } from 'react';
import type { PluginConfig, PresetInfo, FontStatus } from '../../shared/types';
import { AlertTriangle, XCircle, RefreshCw } from 'lucide-react';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';
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

interface PluginSettingsDialogProps {
  appName: string;
  displayName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusChange: () => void;
}

const NERD_FONT_PLUGINS = ['sketchybar'];

export function PluginSettingsDialog({
  appName,
  displayName,
  open,
  onOpenChange,
  onStatusChange,
}: PluginSettingsDialogProps) {
  const [config, setConfig] = useState<PluginConfig | null>(null);
  const [presets, setPresets] = useState<PresetInfo[]>([]);
  const [selectedPreset, setSelectedPreset] = useState<string>('');
  const [applyingPreset, setApplyingPreset] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
      const [configData, presetsData, backupExists] = await Promise.all([
        window.electronAPI.getPluginConfig(appName),
        window.electronAPI.listPresets(appName),
        window.electronAPI.hasPluginBackup(appName),
      ]);

      setConfig(configData);
      setPresets(presetsData);
      setSelectedPreset(configData?.preset || '');
      setHasBackup(backupExists);
    } catch (err: unknown) {
      console.error(`Failed to load plugin data for ${appName}:`, err);
      setError('Failed to load plugin data');
    } finally {
      setLoading(false);
    }
  }, [appName]);

  useEffect(() => {
    if (open) {
      loadPluginData();
    }
  }, [open, appName, loadPluginData]);

  async function handlePresetChange(presetName: string) {
    if (NERD_FONT_PLUGINS.includes(appName)) {
      try {
        const fontStatusData = await window.electronAPI.getFontStatus();
        setFontStatus(fontStatusData);

        if (!fontStatusData.hasNerdFont) {
          setPendingPreset(presetName);
          setShowFontDialog(true);
          return;
        }
      } catch (err: unknown) {
        console.warn('Failed to check font status:', err);
      }
    }

    await applyPreset(presetName);
  }

  async function applyPreset(presetName: string) {
    setApplyingPreset(true);
    setError(null);
    try {
      await window.electronAPI.setPreset(appName, presetName);
      setSelectedPreset(presetName);
      setConfig((prev) => (prev ? { ...prev, mode: 'preset', preset: presetName } : null));

      await window.electronAPI.refreshApp(appName);
      onStatusChange();
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
        const newFontStatus = await window.electronAPI.getFontStatus();
        setFontStatus(newFontStatus);
        setShowFontDialog(false);

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
        await window.electronAPI.refreshApp(appName);
        await loadPluginData();
        onStatusChange();
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{displayName} Settings</DialogTitle>
          <DialogDescription>
            Configure presets and settings for {displayName}.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <div className="h-3 w-12 bg-muted rounded animate-pulse" />
              <div className="h-4 w-24 bg-muted rounded animate-pulse" />
            </div>
            <div className="h-9 w-full bg-muted rounded-md animate-pulse" />
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {/* Mode indicator */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Mode:
              </span>
              <span
                className={`text-sm font-medium ${
                  config?.mode === 'preset' ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                {config?.mode === 'preset' ? `Preset (${config.preset})` : 'Custom'}
              </span>
            </div>

            {/* Preset selector */}
            {presets.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Select Preset
                </label>
                <Select
                  value={selectedPreset}
                  onValueChange={handlePresetChange}
                  disabled={applyingPreset}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a preset..." />
                  </SelectTrigger>
                  <SelectContent>
                    {presets.map((preset) => (
                      <SelectItem key={preset.name} value={preset.name}>
                        <div className="flex flex-col">
                          <span className="font-medium">{preset.displayName}</span>
                          <span className="text-xs text-muted-foreground">
                            {preset.description}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Config warning */}
            {config?.mode !== 'preset' && (
              <div className="flex items-start gap-2 rounded-md border border-yellow-500/20 bg-yellow-500/10 p-3 text-sm text-yellow-600 dark:text-yellow-400">
                <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                <span>
                  Existing config detected. Applying a preset will back up your current config.
                </span>
              </div>
            )}

            {/* Error display */}
            {error && (
              <div className="flex items-start gap-2 rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                <XCircle size={14} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={applyingPreset || restoring}
              >
                <RefreshCw size={14} className="mr-1.5" />
                Refresh
              </Button>
              {config?.mode === 'preset' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSwitchToCustom}
                  disabled={restoring}
                >
                  Custom Mode
                </Button>
              )}
              {hasBackup && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowRestoreDialog(true)}
                  disabled={restoring}
                >
                  Restore Backup
                </Button>
              )}
            </div>
          </div>
        )}

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
                This will restore your original {displayName} configuration from before Ricekit was applied.
                <br /><br />
                Your current Ricekit preset configuration will be replaced with your backed-up config.
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
      </DialogContent>
    </Dialog>
  );
}
