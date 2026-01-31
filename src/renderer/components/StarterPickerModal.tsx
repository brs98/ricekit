import { useState } from 'react';
import { Palette, Image, FileCode, ChevronRight } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/renderer/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/renderer/components/ui/select';
import { Button } from '@/renderer/components/ui/button';

export type StarterType = 'preset' | 'image' | 'blank';

interface StarterPickerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (starterType: StarterType, presetKey?: string) => void;
}

// Preset options matching ThemeEditor's presetSchemes
const presetOptions = [
  { key: 'tokyoNight', name: 'Tokyo Night (Dark)' },
  { key: 'catppuccinMocha', name: 'Catppuccin Mocha (Dark)' },
  { key: 'catppuccinLatte', name: 'Catppuccin Latte (Light)' },
  { key: 'nord', name: 'Nord (Dark)' },
  { key: 'gruvboxDark', name: 'Gruvbox (Dark)' },
  { key: 'dracula', name: 'Dracula (Dark)' },
];

interface StarterOptionProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  selected: boolean;
  onClick: () => void;
  children?: React.ReactNode;
}

function StarterOption({ icon, title, description, selected, onClick, children }: StarterOptionProps) {
  return (
    <button
      type="button"
      className={`w-full text-left p-4 rounded-lg border transition-all ${
        selected
          ? 'border-primary bg-primary/5 ring-1 ring-primary'
          : 'border-border hover:border-primary/50 hover:bg-accent/50'
      }`}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-md ${selected ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium">{title}</div>
          <div className="text-sm text-muted-foreground mt-0.5">{description}</div>
          {children && <div className="mt-3">{children}</div>}
        </div>
      </div>
    </button>
  );
}

export function StarterPickerModal({ open, onOpenChange, onSelect }: StarterPickerModalProps) {
  const [selectedType, setSelectedType] = useState<StarterType>('preset');
  const [selectedPreset, setSelectedPreset] = useState<string>(presetOptions[0]?.key ?? 'tokyoNight');

  const handleContinue = () => {
    if (selectedType === 'preset') {
      onSelect('preset', selectedPreset);
    } else {
      onSelect(selectedType);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Theme</DialogTitle>
          <DialogDescription>
            Choose how you want to start your new theme
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          <StarterOption
            icon={<Palette size={20} />}
            title="Start from Preset"
            description="Begin with a popular color scheme as your base"
            selected={selectedType === 'preset'}
            onClick={() => setSelectedType('preset')}
          >
            {selectedType === 'preset' && (
              <Select value={selectedPreset} onValueChange={setSelectedPreset}>
                <SelectTrigger className="w-full" onClick={(e) => e.stopPropagation()}>
                  <SelectValue placeholder="Select a preset..." />
                </SelectTrigger>
                <SelectContent>
                  {presetOptions.map((preset) => (
                    <SelectItem key={preset.key} value={preset.key}>
                      {preset.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </StarterOption>

          <StarterOption
            icon={<Image size={20} />}
            title="Extract from Image"
            description="Generate a color palette from your favorite wallpaper or photo"
            selected={selectedType === 'image'}
            onClick={() => setSelectedType('image')}
          />

          <StarterOption
            icon={<FileCode size={20} />}
            title="Start Blank"
            description="Start with default colors and customize everything from scratch"
            selected={selectedType === 'blank'}
            onClick={() => setSelectedType('blank')}
          />
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleContinue}>
            Continue
            <ChevronRight size={16} className="ml-1" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
