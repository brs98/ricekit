import { useState, useEffect, useCallback } from 'react';
import { Theme } from '../../shared/types';
import { Check, Image as ImageIcon, Star, Copy, Pencil, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { Button } from '@/renderer/components/ui/button';
import { Input } from '@/renderer/components/ui/input';
import { Label } from '@/renderer/components/ui/label';

interface ThemeDetailModalProps {
  theme: Theme;
  isActive: boolean;
  onClose: () => void;
  onApply: (themeName: string) => void;
  onToggleFavorite: (themeName: string) => void;
  onEdit?: () => void;
  onDelete?: (themeName: string) => void;
  onDuplicate?: (themeName: string) => void;
  isFavorite: boolean;
}

// Color swatch component for displaying a single color
function ColorSwatch({
  name,
  value,
  copiedColor,
  onCopy,
}: {
  name: string;
  value: string;
  copiedColor: string | null;
  onCopy: (name: string, value: string) => void;
}) {
  return (
    <button
      className="flex items-center gap-3 p-2 rounded-[8px] hover:bg-accent transition-colors duration-150 text-left w-full"
      onClick={() => onCopy(name, value)}
      title="Click to copy"
    >
      <div
        className="w-8 h-8 rounded-[6px] border border-border/50 shrink-0"
        style={{ backgroundColor: value }}
      />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium truncate">{name}</div>
        <div className="text-xs text-muted-foreground font-mono flex items-center gap-1">
          {value}
          {copiedColor === name && (
            <span className="text-green-500 flex items-center gap-0.5">
              <Check size={10} /> Copied!
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

export function ThemeDetailModal({
  theme,
  isActive,
  onClose,
  onApply,
  onToggleFavorite,
  onEdit,
  onDelete,
  onDuplicate,
  isFavorite,
}: ThemeDetailModalProps) {
  const [copiedColor, setCopiedColor] = useState<string | null>(null);
  const [wallpapers, setWallpapers] = useState<string[]>([]);
  const [selectedWallpaper, setSelectedWallpaper] = useState<string | null>(null);
  const [wallpapersLoading, setWallpapersLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [duplicateName, setDuplicateName] = useState('');

  const loadWallpapers = useCallback(async () => {
    try {
      setWallpapersLoading(true);
      const wallpaperList = await window.electronAPI.listWallpapers(theme.name);
      setWallpapers(wallpaperList);
    } catch (err) {
      console.error('Failed to load wallpapers:', err);
    } finally {
      setWallpapersLoading(false);
    }
  }, [theme.name]);

  // Load wallpapers when modal opens
  useEffect(() => {
    loadWallpapers();
  }, [loadWallpapers]);

  const handleCopyColor = async (colorName: string, colorValue: string) => {
    try {
      await navigator.clipboard.writeText(colorValue);
      setCopiedColor(colorName);
      setTimeout(() => setCopiedColor(null), 2000);
    } catch (err) {
      console.error('Failed to copy color:', err);
    }
  };

  const handleConfirmDelete = () => {
    if (onDelete) {
      onDelete(theme.name);
      setShowDeleteConfirm(false);
      onClose();
    }
  };

  const handleDuplicateClick = () => {
    if (onDuplicate) {
      setDuplicateName(`${theme.metadata.name} (Copy)`);
      setShowDuplicateDialog(true);
    }
  };

  const handleConfirmDuplicate = () => {
    if (onDuplicate && duplicateName.trim()) {
      onDuplicate(theme.name);
      setShowDuplicateDialog(false);
      onClose();
    }
  };

  const colors = theme.metadata.colors;

  // Main color palette (most important colors)
  const mainColors = [
    { name: 'Background', value: colors.background },
    { name: 'Foreground', value: colors.foreground },
    { name: 'Accent', value: colors.accent },
    { name: 'Cursor', value: colors.cursor },
    { name: 'Selection', value: colors.selection },
    { name: 'Border', value: colors.border },
  ];

  // ANSI colors
  const ansiColors = [
    { name: 'Black', value: colors.black },
    { name: 'Red', value: colors.red },
    { name: 'Green', value: colors.green },
    { name: 'Yellow', value: colors.yellow },
    { name: 'Blue', value: colors.blue },
    { name: 'Magenta', value: colors.magenta },
    { name: 'Cyan', value: colors.cyan },
    { name: 'White', value: colors.white },
  ];

  // Bright ANSI colors
  const brightColors = [
    { name: 'Bright Black', value: colors.brightBlack },
    { name: 'Bright Red', value: colors.brightRed },
    { name: 'Bright Green', value: colors.brightGreen },
    { name: 'Bright Yellow', value: colors.brightYellow },
    { name: 'Bright Blue', value: colors.brightBlue },
    { name: 'Bright Magenta', value: colors.brightMagenta },
    { name: 'Bright Cyan', value: colors.brightCyan },
    { name: 'Bright White', value: colors.brightWhite },
  ];

  return (
    <>
      {/* Main Theme Detail Dialog */}
      <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {theme.metadata.name}
              {isFavorite && <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />}
            </DialogTitle>
            <DialogDescription>
              by {theme.metadata.author} · {theme.isLight ? 'Light' : 'Dark'} theme
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-6 py-4">
            {/* Description */}
            <p className="text-sm text-muted-foreground">{theme.metadata.description}</p>

            {/* Terminal Preview */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Terminal Preview</h3>
              <div
                className="rounded-[10px] p-4 font-mono text-sm border"
                style={{
                  backgroundColor: colors.background,
                  color: colors.foreground,
                  borderColor: colors.border,
                }}
              >
                <div>
                  <span style={{ color: colors.green }}>user@macbook</span>
                  <span style={{ color: colors.foreground }}>:</span>
                  <span style={{ color: colors.blue }}>~/projects</span>
                  <span style={{ color: colors.foreground }}>$ git status</span>
                </div>
                <div>
                  <span style={{ color: colors.green }}>On branch main</span>
                </div>
                <div>
                  <span style={{ color: colors.cyan }}>Changes not staged for commit:</span>
                </div>
                <div>
                  <span style={{ color: colors.red }}>  modified:   src/main.ts</span>
                </div>
                <div>
                  <span style={{ color: colors.green }}>  new file:   src/utils.ts</span>
                </div>
                <div>
                  <span style={{ color: colors.foreground }}>$ npm test</span>
                </div>
                <div>
                  <span style={{ color: colors.green }}>✓</span>
                  <span style={{ color: colors.foreground }}> All tests passed</span>
                </div>
              </div>
            </div>

            {/* Code Preview */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Code Preview</h3>
              <div
                className="rounded-[10px] p-4 font-mono text-sm border"
                style={{
                  backgroundColor: colors.background,
                  color: colors.foreground,
                  borderColor: colors.border,
                }}
              >
                <div>
                  <span style={{ color: colors.magenta }}>function</span>
                  <span style={{ color: colors.blue }}> greet</span>
                  <span style={{ color: colors.foreground }}>(</span>
                  <span style={{ color: colors.cyan }}>name</span>
                  <span style={{ color: colors.foreground }}>: </span>
                  <span style={{ color: colors.yellow }}>string</span>
                  <span style={{ color: colors.foreground }}>) {'{'}</span>
                </div>
                <div>
                  <span style={{ color: colors.foreground }}>  </span>
                  <span style={{ color: colors.magenta }}>return</span>
                  <span style={{ color: colors.foreground }}> </span>
                  <span style={{ color: colors.green }}>`Hello, ${'{'}name{'}'}`</span>
                  <span style={{ color: colors.foreground }}>;</span>
                </div>
                <div>
                  <span style={{ color: colors.foreground }}>{'}'}</span>
                </div>
              </div>
            </div>

            {/* Wallpapers */}
            {wallpapers.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <ImageIcon size={14} />
                  Wallpapers
                </h3>
                {wallpapersLoading ? (
                  <div className="text-sm text-muted-foreground">Loading wallpapers...</div>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {wallpapers.map((wallpaper, index) => (
                      <button
                        key={wallpaper}
                        className="relative aspect-video rounded-[8px] overflow-hidden border border-border/50 hover:border-primary transition-colors duration-150 group"
                        onClick={() => setSelectedWallpaper(wallpaper)}
                        title="Click to preview"
                      >
                        <img
                          src={`local-file://${wallpaper}`}
                          alt={`Wallpaper ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex items-center justify-center">
                          <ImageIcon size={20} className="text-background" />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Main Colors */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Main Colors</h3>
              <div className="grid grid-cols-2 gap-1">
                {mainColors.map(({ name, value }) => (
                  <ColorSwatch
                    key={name}
                    name={name}
                    value={value}
                    copiedColor={copiedColor}
                    onCopy={handleCopyColor}
                  />
                ))}
              </div>
            </div>

            {/* ANSI Colors */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">ANSI Colors</h3>
              <div className="grid grid-cols-2 gap-1">
                {ansiColors.map(({ name, value }) => (
                  <ColorSwatch
                    key={name}
                    name={name}
                    value={value}
                    copiedColor={copiedColor}
                    onCopy={handleCopyColor}
                  />
                ))}
              </div>
            </div>

            {/* Bright Colors */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Bright Colors</h3>
              <div className="grid grid-cols-2 gap-1">
                {brightColors.map(({ name, value }) => (
                  <ColorSwatch
                    key={name}
                    name={name}
                    value={value}
                    copiedColor={copiedColor}
                    onCopy={handleCopyColor}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Modal Actions */}
          <DialogFooter className="flex-wrap gap-2 sm:justify-between border-t border-border pt-4">
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onToggleFavorite(theme.name)}
              >
                <Star className={`h-4 w-4 mr-1 ${isFavorite ? 'fill-yellow-500 text-yellow-500' : ''}`} />
                {isFavorite ? 'Favorited' : 'Favorite'}
              </Button>
              {onDuplicate && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleDuplicateClick}
                >
                  <Copy className="h-4 w-4 mr-1" />
                  Duplicate
                </Button>
              )}
              {onEdit && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    onEdit();
                    onClose();
                  }}
                >
                  <Pencil className="h-4 w-4 mr-1" />
                  Edit
                </Button>
              )}
              {theme.isCustom && onDelete && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </Button>
              )}
            </div>
            <Button
              onClick={() => {
                onApply(theme.name);
                onClose();
              }}
              disabled={isActive}
            >
              {isActive ? 'Currently Active' : 'Apply Theme'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Wallpaper Preview Dialog */}
      <Dialog open={!!selectedWallpaper} onOpenChange={(open) => !open && setSelectedWallpaper(null)}>
        <DialogContent className="sm:max-w-[90vw] sm:max-h-[90vh] p-0 overflow-hidden">
          {selectedWallpaper && (
            <img
              src={`local-file://${selectedWallpaper}`}
              alt="Wallpaper preview"
              className="w-full h-full object-contain"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation AlertDialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Theme?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{theme.metadata.name}</strong>?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Duplicate Theme Dialog */}
      <Dialog open={showDuplicateDialog} onOpenChange={setShowDuplicateDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Duplicate Theme</DialogTitle>
            <DialogDescription>
              Create a copy of <strong>{theme.metadata.name}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="duplicate-name">New theme name</Label>
            <Input
              id="duplicate-name"
              value={duplicateName}
              onChange={(e) => setDuplicateName(e.target.value)}
              placeholder="New theme name"
              className="mt-2"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDuplicateDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirmDuplicate}
              disabled={!duplicateName.trim()}
            >
              Create Duplicate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
