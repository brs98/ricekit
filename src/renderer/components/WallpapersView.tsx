import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/renderer/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/renderer/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/renderer/components/ui/select';
import { Button } from '@/renderer/components/ui/button';
import { Input } from '@/renderer/components/ui/input';
import { Label } from '@/renderer/components/ui/label';
import { Switch } from '@/renderer/components/ui/switch';

interface Display {
  id: string;
  index: number;
  name: string;
  resolution: string;
  isMain: boolean;
}

interface WallpaperPreviewModalProps {
  wallpaperPath: string;
  onClose: () => void;
  onApply: (path: string, displayIndex?: number) => void;
  displays: Display[];
  selectedDisplay: number | null;
}

const WallpaperPreviewModal: React.FC<WallpaperPreviewModalProps> = ({
  wallpaperPath,
  onClose,
  onApply,
  displays,
  selectedDisplay,
}) => {
  const handleApply = async () => {
    await onApply(wallpaperPath, selectedDisplay || undefined);
    onClose();
  };

  const getApplyButtonText = () => {
    if (selectedDisplay === null) {
      return displays.length > 1 ? 'Apply to All Displays' : 'Apply Wallpaper';
    }
    const display = displays.find(d => d.index === selectedDisplay);
    return display ? `Apply to ${display.name}` : 'Apply Wallpaper';
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>Wallpaper Preview</DialogTitle>
        </DialogHeader>

        <div className="wallpaper-preview-container">
          <img
            src={`local-file://${wallpaperPath}`}
            alt="Wallpaper preview"
            className="wallpaper-preview-image rounded-lg"
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleApply}>
            {getApplyButtonText()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

interface WallpaperSchedule {
  timeStart: string;
  timeEnd: string;
  wallpaperPath: string;
  name?: string;
}

interface ScheduleModalProps {
  wallpapers: WallpaperItem[];
  currentSchedules: WallpaperSchedule[];
  onClose: () => void;
  onSave: (schedules: WallpaperSchedule[]) => void;
}

const ScheduleModal: React.FC<ScheduleModalProps> = ({ wallpapers, currentSchedules, onClose, onSave }) => {
  const [schedules, setSchedules] = useState<WallpaperSchedule[]>(currentSchedules);

  const addSchedule = () => {
    setSchedules([
      ...schedules,
      {
        timeStart: '06:00',
        timeEnd: '12:00',
        wallpaperPath: wallpapers[0]?.original || '',
        name: 'Morning',
      },
    ]);
  };

  const updateSchedule = (index: number, field: keyof WallpaperSchedule, value: string) => {
    const updated = [...schedules];
    updated[index] = { ...updated[index], [field]: value };
    setSchedules(updated);
  };

  const removeSchedule = (index: number) => {
    setSchedules(schedules.filter((_, i) => i !== index));
  };

  const getWallpaperName = (path: string) => {
    const fileName = path.split('/').pop() || 'Unknown';
    return fileName.replace(/\.[^.]+$/, '').replace(/-/g, ' ');
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Wallpaper Schedule</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Set different wallpapers for different times of day. Schedules are checked every minute.
          </p>

          {schedules.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No schedules yet. Click "Add Schedule" to create one.
            </div>
          )}

          {schedules.map((schedule, index) => (
            <div
              key={index}
              className="p-4 rounded-lg border border-border bg-muted/50 space-y-3"
            >
              <div className="flex gap-2">
                <Input
                  placeholder="Schedule name (e.g., Morning)"
                  value={schedule.name || ''}
                  onChange={(e) => updateSchedule(index, 'name', e.target.value)}
                  className="flex-1"
                />
                <Button variant="outline" onClick={() => removeSchedule(index)}>
                  Remove
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Start Time</Label>
                  <Input
                    type="time"
                    value={schedule.timeStart}
                    onChange={(e) => updateSchedule(index, 'timeStart', e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">End Time</Label>
                  <Input
                    type="time"
                    value={schedule.timeEnd}
                    onChange={(e) => updateSchedule(index, 'timeEnd', e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Wallpaper</Label>
                <Select
                  value={schedule.wallpaperPath}
                  onValueChange={(value) => updateSchedule(index, 'wallpaperPath', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {wallpapers.map((wallpaper) => (
                      <SelectItem key={wallpaper.original} value={wallpaper.original}>
                        {getWallpaperName(wallpaper.original)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ))}

          <Button
            variant="outline"
            onClick={addSchedule}
            className="w-full"
          >
            + Add Schedule
          </Button>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => onSave(schedules)}>
            Save Schedules
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

interface WallpaperItem {
  original: string;
  thumbnail: string;
}

export const WallpapersView: React.FC = () => {
  const [wallpapers, setWallpapers] = useState<WallpaperItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedWallpaper, setSelectedWallpaper] = useState<string | null>(null);
  const [currentTheme, setCurrentTheme] = useState<string>('');
  const [displays, setDisplays] = useState<Display[]>([]);
  const [selectedDisplay, setSelectedDisplay] = useState<number | null>(null);
  const [dynamicWallpaperEnabled, setDynamicWallpaperEnabled] = useState(false);
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [schedules, setSchedules] = useState<WallpaperSchedule[]>([]);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [wallpaperToDelete, setWallpaperToDelete] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    loadWallpapers();
    loadDisplays();
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const prefs = await window.electronAPI.getPreferences();
      setDynamicWallpaperEnabled(prefs.dynamicWallpaper?.enabled || false);
      setScheduleEnabled(prefs.wallpaperSchedule?.enabled || false);
      setSchedules(prefs.wallpaperSchedule?.schedules || []);
    } catch (err) {
      console.error('Error loading preferences:', err);
    }
  };

  const toggleDynamicWallpaper = async () => {
    try {
      const prefs = await window.electronAPI.getPreferences();
      const newValue = !dynamicWallpaperEnabled;

      await window.electronAPI.setPreferences({
        ...prefs,
        dynamicWallpaper: {
          enabled: newValue,
        },
      });

      setDynamicWallpaperEnabled(newValue);
    } catch (err) {
      console.error('Error toggling dynamic wallpaper:', err);
      setError('Failed to update dynamic wallpaper setting.');
    }
  };

  const toggleSchedule = async () => {
    try {
      const prefs = await window.electronAPI.getPreferences();
      const newValue = !scheduleEnabled;

      await window.electronAPI.setPreferences({
        ...prefs,
        wallpaperSchedule: {
          enabled: newValue,
          schedules: schedules,
        },
      });

      setScheduleEnabled(newValue);
    } catch (err) {
      console.error('Error toggling wallpaper schedule:', err);
      setError('Failed to update wallpaper schedule setting.');
    }
  };

  const saveSchedules = async (newSchedules: WallpaperSchedule[]) => {
    try {
      const prefs = await window.electronAPI.getPreferences();

      await window.electronAPI.setPreferences({
        ...prefs,
        wallpaperSchedule: {
          enabled: scheduleEnabled,
          schedules: newSchedules,
        },
      });

      setSchedules(newSchedules);
      setShowScheduleModal(false);
    } catch (err) {
      console.error('Error saving wallpaper schedules:', err);
      setError('Failed to save wallpaper schedules.');
    }
  };

  const loadDisplays = async () => {
    try {
      const displayList = await window.electronAPI.getDisplays();
      setDisplays(displayList);
    } catch (err) {
      console.error('Error loading displays:', err);
      // Default to single display on error
      setDisplays([{
        id: 'display-0-0',
        index: 1,
        name: 'Display 1',
        resolution: 'Unknown',
        isMain: true,
      }]);
    }
  };

  const loadWallpapers = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get current theme
      const state = await window.electronAPI.getState();
      setCurrentTheme(state.currentTheme);

      // Load wallpapers with thumbnails for better performance
      const wallpaperItems = await window.electronAPI.listWallpapersWithThumbnails(state.currentTheme);
      setWallpapers(wallpaperItems);
    } catch (err) {
      console.error('Error loading wallpapers:', err);
      setError('Failed to load wallpapers. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyWallpaper = async (wallpaperPath: string, displayIndex?: number) => {
    try {
      await window.electronAPI.applyWallpaper(wallpaperPath, displayIndex);
    } catch (err) {
      console.error('Error applying wallpaper:', err);
      setError('Failed to apply wallpaper. Please try again.');
    }
  };

  const handleAddWallpapers = async () => {
    if (!currentTheme || isAdding) return;

    try {
      setIsAdding(true);
      const result = await window.electronAPI.addWallpapers(currentTheme);

      if (result.added.length > 0) {
        // Reload wallpapers to show the new ones
        await loadWallpapers();
      }

      if (result.errors.length > 0) {
        setError(`Some wallpapers failed to add: ${result.errors.join(', ')}`);
      }
    } catch (err) {
      console.error('Error adding wallpapers:', err);
      setError('Failed to add wallpapers. Please try again.');
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveWallpaper = async (wallpaperPath: string) => {
    try {
      await window.electronAPI.removeWallpaper(wallpaperPath);
      setWallpaperToDelete(null);
      // Reload wallpapers to reflect the removal
      await loadWallpapers();
    } catch (err) {
      console.error('Error removing wallpaper:', err);
      setError('Failed to remove wallpaper. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="wallpapers-view">
        <div className="wallpapers-header">
          <h1>Wallpapers</h1>
          <p>Loading wallpapers for {currentTheme}...</p>
        </div>
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="wallpapers-view">
        <div className="wallpapers-header">
          <h1>Wallpapers</h1>
          <p className="error-message">{error}</p>
        </div>
        <Button variant="outline" onClick={loadWallpapers}>
          Retry
        </Button>
      </div>
    );
  }

  if (wallpapers.length === 0) {
    return (
      <div className="wallpapers-view">
        <div className="wallpapers-header">
          <h1>Wallpapers</h1>
          <p>Current theme: <strong>{currentTheme}</strong></p>
        </div>
        <div className="empty-state">
          <p>No wallpapers available for this theme.</p>
          <p className="empty-state-hint">
            Add wallpapers to get started.
          </p>
          <Button
            onClick={handleAddWallpapers}
            disabled={isAdding}
            className="mt-4"
          >
            {isAdding ? 'Adding...' : '+ Add Wallpapers'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="wallpapers-view">
      <div className="wallpapers-header">
        <div>
          <h1>Wallpapers</h1>
          <p>
            Current theme: <strong>{currentTheme}</strong> • {wallpapers.length}{' '}
            {wallpapers.length === 1 ? 'wallpaper' : 'wallpapers'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary border border-border">
            <Label
              htmlFor="dynamic-wallpaper-toggle"
              className="text-sm font-medium cursor-pointer select-none"
            >
              Dynamic Wallpaper
            </Label>
            <Switch
              id="dynamic-wallpaper-toggle"
              checked={dynamicWallpaperEnabled}
              onCheckedChange={toggleDynamicWallpaper}
              aria-label="Toggle dynamic wallpaper"
            />
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary border border-border">
            <Label
              htmlFor="schedule-wallpaper-toggle"
              className="text-sm font-medium cursor-pointer select-none"
            >
              Scheduling
            </Label>
            <Switch
              id="schedule-wallpaper-toggle"
              checked={scheduleEnabled}
              onCheckedChange={toggleSchedule}
              aria-label="Toggle wallpaper scheduling"
            />
          </div>
          {scheduleEnabled && (
            <Button variant="outline" onClick={() => setShowScheduleModal(true)}>
              Manage Schedules {schedules.length > 0 && `(${schedules.length})`}
            </Button>
          )}
          {displays.length > 1 && (
            <div className="flex items-center gap-2">
              <Label htmlFor="display-select" className="text-sm text-muted-foreground">
                Target Display:
              </Label>
              <Select
                value={selectedDisplay?.toString() || 'all'}
                onValueChange={(value) => setSelectedDisplay(value === 'all' ? null : parseInt(value))}
              >
                <SelectTrigger id="display-select" className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Displays</SelectItem>
                  {displays.map((display) => (
                    <SelectItem key={display.id} value={display.index.toString()}>
                      {display.name} {display.isMain ? '(Main)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <Button
            onClick={handleAddWallpapers}
            disabled={isAdding}
          >
            {isAdding ? 'Adding...' : '+ Add'}
          </Button>
          <Button variant="outline" onClick={loadWallpapers}>
            ↻ Refresh
          </Button>
        </div>
      </div>

      <div className="wallpaper-gallery">
        {wallpapers.map((wallpaper, index) => {
          const fileName = wallpaper.original.split('/').pop() || 'Unknown';
          const displayName = fileName.replace(/\.[^.]+$/, '').replace(/-/g, ' ');

          return (
            <div
              key={index}
              className="wallpaper-card"
              onClick={() => setSelectedWallpaper(wallpaper.original)}
            >
              <div className="wallpaper-thumbnail">
                <img
                  src={`local-file://${wallpaper.thumbnail}`}
                  alt={displayName}
                  className="wallpaper-image"
                  loading="lazy"
                />
                <div className="wallpaper-overlay">
                  <button className="wallpaper-apply-button">Apply</button>
                  <button
                    className="wallpaper-delete-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setWallpaperToDelete(wallpaper.original);
                    }}
                    title="Remove wallpaper"
                  >
                    ✕
                  </button>
                </div>
              </div>
              <div className="wallpaper-info">
                <span className="wallpaper-name">{displayName}</span>
              </div>
            </div>
          );
        })}
      </div>

      {selectedWallpaper && (
        <WallpaperPreviewModal
          wallpaperPath={selectedWallpaper}
          onClose={() => setSelectedWallpaper(null)}
          onApply={handleApplyWallpaper}
          displays={displays}
          selectedDisplay={selectedDisplay}
        />
      )}

      {showScheduleModal && (
        <ScheduleModal
          wallpapers={wallpapers}
          currentSchedules={schedules}
          onClose={() => setShowScheduleModal(false)}
          onSave={saveSchedules}
        />
      )}

      <AlertDialog open={!!wallpaperToDelete} onOpenChange={(open) => !open && setWallpaperToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Wallpaper</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this wallpaper?
              <br />
              <span className="font-medium">{wallpaperToDelete?.split('/').pop()}</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => wallpaperToDelete && handleRemoveWallpaper(wallpaperToDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
