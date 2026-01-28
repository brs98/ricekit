import { useState, useEffect } from 'react';
import { Theme, AppInfo } from '../../shared/types';
import { Check, Sparkles, Target, RefreshCw, Zap } from 'lucide-react';
import {
  Dialog,
  DialogContent,
} from '@/renderer/components/ui/dialog';
import { Button } from '@/renderer/components/ui/button';
import { Checkbox } from '@/renderer/components/ui/checkbox';
import { emitThemeApplied } from '../hooks/useThemeSelfStyling';

interface OnboardingModalProps {
  onComplete: () => void;
}

type OnboardingStep = 'welcome' | 'theme-selection' | 'app-configuration' | 'complete';

const STEP_LABELS = ['Welcome', 'Choose Theme', 'Configure Apps'];

// Progress indicator component
function StepIndicator({ currentIndex }: { currentIndex: number }) {
  return (
    <div className="bg-muted px-8 py-4">
      <div className="flex items-center justify-between mb-2">
        {STEP_LABELS.map((_, idx) => (
          <div key={idx} className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors duration-200 ${
                idx <= currentIndex
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-muted-foreground'
              }`}
            >
              {idx < currentIndex ? <Check className="h-4 w-4" /> : idx + 1}
            </div>
            {idx < 2 && (
              <div
                className={`w-20 h-1 mx-2 rounded transition-colors duration-200 ${
                  idx < currentIndex ? 'bg-primary' : 'bg-secondary'
                }`}
              />
            )}
          </div>
        ))}
      </div>
      <div className="flex justify-between text-xs">
        {STEP_LABELS.map((label, idx) => (
          <span
            key={idx}
            className={`transition-colors duration-200 ${
              idx <= currentIndex ? 'font-medium text-primary' : 'text-muted-foreground'
            }`}
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

// Theme selection card
function ThemeCard({
  theme,
  isSelected,
  onSelect,
}: {
  theme: Theme;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const colors = theme.metadata.colors;
  const previewColors = [colors.background, colors.red, colors.green, colors.yellow, colors.blue, colors.magenta];

  return (
    <button
      onClick={onSelect}
      className={`p-4 rounded-[10px] border-2 text-left transition-all duration-200 ${
        isSelected
          ? 'border-primary bg-primary/5'
          : 'border-border hover:border-muted-foreground/30'
      }`}
    >
      <div className="font-medium mb-2">{theme.metadata.name}</div>
      <div className="flex gap-1 mb-2">
        {previewColors.map((color, idx) => (
          <div
            key={idx}
            className="w-7 h-7 rounded-[4px] border border-border/50"
            style={{ backgroundColor: color }}
          />
        ))}
      </div>
      <div className="text-xs text-muted-foreground">
        {theme.isLight ? 'Light theme' : 'Dark theme'}
      </div>
    </button>
  );
}

// App configuration item
function AppConfigItem({
  app,
  isSelected,
  onToggle,
}: {
  app: AppInfo;
  isSelected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className={`w-full p-4 rounded-[10px] border text-left transition-all duration-200 ${
        isSelected
          ? 'border-primary bg-primary/5'
          : 'border-border hover:border-muted-foreground/30'
      }`}
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="font-medium">{app.displayName}</div>
          <div className="text-sm text-muted-foreground capitalize">
            {app.category}
            {app.isConfigured && ' · Already configured'}
          </div>
        </div>
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onToggle()}
          className="pointer-events-none"
        />
      </div>
    </button>
  );
}

export function OnboardingModal({ onComplete }: OnboardingModalProps) {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('welcome');
  const [themes, setThemes] = useState<Theme[]>([]);
  const [selectedTheme, setSelectedTheme] = useState<string>('tokyo-night');
  const [apps, setApps] = useState<AppInfo[]>([]);
  const [selectedApps, setSelectedApps] = useState<string[]>([]);

  // Load themes and apps on mount
  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const loadedThemes = await window.electronAPI.listThemes();
      setThemes(loadedThemes);

      const detectedApps = await window.electronAPI.detectApps();
      setApps(detectedApps);

      // Pre-select installed apps that aren't configured yet
      const installedApps = detectedApps
        .filter(app => app.isInstalled && !app.isConfigured)
        .map(app => app.name);
      setSelectedApps(installedApps);
    } catch (error: unknown) {
      console.error('Failed to load onboarding data:', error);
    }
  }

  function handleNext() {
    if (currentStep === 'welcome') {
      setCurrentStep('theme-selection');
    } else if (currentStep === 'theme-selection') {
      setCurrentStep('app-configuration');
    } else if (currentStep === 'app-configuration') {
      setCurrentStep('complete');
      finishOnboarding();
    }
  }

  function handleBack() {
    if (currentStep === 'app-configuration') {
      setCurrentStep('theme-selection');
    } else if (currentStep === 'theme-selection') {
      setCurrentStep('welcome');
    }
  }

  async function finishOnboarding() {
    try {
      // Apply the selected theme
      if (selectedTheme) {
        await window.electronAPI.applyTheme(selectedTheme);
        // Update the app's own UI with the new theme colors
        emitThemeApplied();
      }

      // Setup selected applications
      for (const appName of selectedApps) {
        try {
          await window.electronAPI.setupApp(appName);
        } catch (error: unknown) {
          console.error(`Failed to setup ${appName}:`, error);
        }
      }

      // Mark onboarding as completed
      const prefs = await window.electronAPI.getPreferences();
      await window.electronAPI.setPreferences({
        ...prefs,
        onboardingCompleted: true,
      });

      // Close the onboarding modal
      setTimeout(() => {
        onComplete();
      }, 2000); // Show completion message for 2 seconds
    } catch (error: unknown) {
      console.error('Failed to complete onboarding:', error);
    }
  }

  function toggleApp(appName: string) {
    setSelectedApps(prev =>
      prev.includes(appName)
        ? prev.filter(name => name !== appName)
        : [...prev, appName]
    );
  }

  const stepIndex = ['welcome', 'theme-selection', 'app-configuration'].indexOf(currentStep);
  const installedApps = apps.filter(app => app.isInstalled);

  return (
    <Dialog open={true} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-[750px] p-0 gap-0 overflow-hidden">
        {/* Progress indicator */}
        {currentStep !== 'complete' && <StepIndicator currentIndex={stepIndex} />}

        {/* Content */}
        <div className="p-8">
          {/* Welcome Step */}
          {currentStep === 'welcome' && (
            <div className="text-center">
              <h2 className="text-3xl font-bold mb-4">Welcome to Flowstate!</h2>
              <p className="text-lg text-muted-foreground mb-6">
                Unified theming for all your favorite applications
              </p>
              <div className="text-left space-y-4 mb-8">
                <div className="flex items-start">
                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 mr-4">
                    <Sparkles size={20} />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">One Theme, Everywhere</h3>
                    <p className="text-sm text-muted-foreground">
                      Apply a consistent color scheme across terminals, editors, and more with a single click.
                    </p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 mr-4">
                    <Target size={20} />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Beautiful Themes</h3>
                    <p className="text-sm text-muted-foreground">
                      Choose from 11 carefully crafted themes, or create your own custom theme.
                    </p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 mr-4">
                    <RefreshCw size={20} />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Automatic Switching</h3>
                    <p className="text-sm text-muted-foreground">
                      Automatically switch between light and dark themes based on system appearance or schedule.
                    </p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 mr-4">
                    <Zap size={20} />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Quick Access</h3>
                    <p className="text-sm text-muted-foreground">
                      Use the quick switcher (Cmd+Shift+T) to change themes from anywhere.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Theme Selection Step */}
          {currentStep === 'theme-selection' && (
            <div>
              <h2 className="text-2xl font-bold mb-2">Choose Your Initial Theme</h2>
              <p className="text-muted-foreground mb-6">
                Select a theme to get started. You can always change this later.
              </p>
              <div className="grid grid-cols-2 gap-4 max-h-96 overflow-y-auto pr-2">
                {themes.map((theme) => (
                  <ThemeCard
                    key={theme.name}
                    theme={theme}
                    isSelected={selectedTheme === theme.name}
                    onSelect={() => setSelectedTheme(theme.name)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* App Configuration Step */}
          {currentStep === 'app-configuration' && (
            <div>
              <h2 className="text-2xl font-bold mb-2">Configure Applications</h2>
              <p className="text-muted-foreground mb-6">
                Select which applications you&apos;d like Flowstate to configure. We&apos;ll automatically set them up to use your themes.
              </p>
              <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                {installedApps.map((app) => (
                  <AppConfigItem
                    key={app.name}
                    app={app}
                    isSelected={selectedApps.includes(app.name)}
                    onToggle={() => toggleApp(app.name)}
                  />
                ))}
                {installedApps.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No supported applications detected. You can configure them later from the Apps section.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Complete Step */}
          {currentStep === 'complete' && (
            <div className="text-center py-8">
              <div className="w-20 h-20 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
                <Check className="h-10 w-10" />
              </div>
              <h2 className="text-2xl font-bold mb-2">You&apos;re All Set!</h2>
              <p className="text-muted-foreground mb-4">
                Your theme has been applied and your applications have been configured.
              </p>
              <p className="text-sm text-muted-foreground">
                Explore the app to discover more themes and features!
              </p>
            </div>
          )}
        </div>

        {/* Navigation buttons */}
        {currentStep !== 'complete' && (
          <div className="bg-muted px-8 py-4 flex justify-between">
            <Button
              variant="ghost"
              onClick={handleBack}
              disabled={currentStep === 'welcome'}
            >
              Back
            </Button>
            <Button onClick={handleNext}>
              {currentStep === 'app-configuration' ? 'Finish' : 'Next'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
