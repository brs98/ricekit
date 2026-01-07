import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/renderer/components/ui/dialog';
import { Button } from '@/renderer/components/ui/button';

interface AboutDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AboutDialog({ isOpen, onClose }: AboutDialogProps) {
  const version = '0.1.0';
  const appName = 'MacTheme';

  const handleOpenExternal = (url: string) => {
    window.electronAPI?.openExternal(url);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>About {appName}</DialogTitle>
          <DialogDescription>
            Unified macOS theming system
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-4">
          {/* App Icon/Logo */}
          <div className="w-20 h-20">
            <svg viewBox="0 0 100 100" className="w-full h-full">
              <defs>
                <linearGradient id="themeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style={{ stopColor: '#667eea', stopOpacity: 1 }} />
                  <stop offset="100%" style={{ stopColor: '#764ba2', stopOpacity: 1 }} />
                </linearGradient>
              </defs>
              <circle cx="50" cy="50" r="45" fill="url(#themeGradient)" />
              <path
                d="M 30 40 L 40 30 L 60 30 L 70 40 L 70 60 L 60 70 L 40 70 L 30 60 Z"
                fill="white"
                opacity="0.9"
              />
              <circle cx="50" cy="50" r="8" fill="url(#themeGradient)" />
            </svg>
          </div>

          {/* App Info */}
          <div className="text-center">
            <h2 className="text-2xl font-bold">{appName}</h2>
            <p className="text-sm text-muted-foreground">Version {version}</p>
            <p className="text-sm text-muted-foreground mt-2">
              Unified macOS theming system for terminals, editors, and applications.
            </p>
          </div>

          {/* Details */}
          <div className="w-full space-y-4 text-sm">
            <div className="space-y-1">
              <h4 className="font-semibold">Credits</h4>
              <p className="text-muted-foreground">Developed by MacTheme Contributors</p>
              <p className="text-muted-foreground">Built with Electron, React, and TypeScript</p>
            </div>

            <div className="space-y-1">
              <h4 className="font-semibold">Links</h4>
              <div className="flex flex-col gap-1">
                <button
                  onClick={() => handleOpenExternal('https://github.com/mactheme/mactheme')}
                  className="text-left text-primary hover:underline"
                >
                  GitHub Repository
                </button>
                <button
                  onClick={() => handleOpenExternal('https://github.com/mactheme/mactheme/issues')}
                  className="text-left text-primary hover:underline"
                >
                  Report an Issue
                </button>
                <button
                  onClick={() => handleOpenExternal('https://github.com/mactheme/mactheme/blob/main/LICENSE')}
                  className="text-left text-primary hover:underline"
                >
                  License (MIT)
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <h4 className="font-semibold">Acknowledgments</h4>
              <p className="text-muted-foreground">
                Inspired by{' '}
                <button
                  onClick={() => handleOpenExternal('https://github.com/omarchy/linux-themes')}
                  className="text-primary hover:underline"
                >
                  Omarchy's Linux theming system
                </button>.
              </p>
              <p className="text-muted-foreground">
                Built on the shoulders of amazing open source projects.
              </p>
            </div>
          </div>

          {/* Copyright */}
          <p className="text-xs text-muted-foreground pt-2">
            © {new Date().getFullYear()} MacTheme Contributors. All rights reserved.
          </p>
        </div>

        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
