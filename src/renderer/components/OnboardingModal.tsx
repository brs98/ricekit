import { useState, useEffect, useCallback } from 'react';
import type { Theme, AppInfo } from '../../shared/types';
import {
  Check,
  Sparkles,
  Target,
  RefreshCw,
  Zap,
  SkipForward,
  ExternalLink,
  AlertCircle,
  Copy,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
} from '@/renderer/components/ui/dialog';
import { Button } from '@/renderer/components/ui/button';
import { CodePreview } from './CodePreview';
import { getImportStatement, getSetupInstructions } from '../utils/appSetupInfo';
import { emitThemeApplied } from '../hooks/useThemeSelfStyling';

interface OnboardingModalProps {
  onComplete: () => void;
}

type OnboardingStep =
  | 'welcome'
  | 'theme-selection'
  | 'app-detection'
  | 'app-walkthrough'
  | 'complete';

type AppResult = 'configured' | 'skipped';

const STEP_LABELS = ['Welcome', 'Choose Theme', 'Configure Apps'];

// --- Sub-components ---

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
  const previewColors = [
    colors.background,
    colors.red,
    colors.green,
    colors.yellow,
    colors.blue,
    colors.magenta,
  ];

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

function AppStatusBadge({ status }: { status: 'needs-setup' | 'configured' | 'skipped' }) {
  switch (status) {
    case 'needs-setup':
      return (
        <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400">
          Needs setup
        </span>
      );
    case 'configured':
      return (
        <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-green-500/15 text-green-600 dark:text-green-400">
          Configured
        </span>
      );
    case 'skipped':
      return (
        <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
          Skipped
        </span>
      );
  }
}

// --- Main component ---

export function OnboardingModal({ onComplete }: OnboardingModalProps) {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('welcome');
  const [themes, setThemes] = useState<Theme[]>([]);
  const [selectedTheme, setSelectedTheme] = useState<string>('tokyo-night');
  const [apps, setApps] = useState<AppInfo[]>([]);

  // App-by-app walkthrough state
  const [currentAppIndex, setCurrentAppIndex] = useState(0);
  const [appResults, setAppResults] = useState<Record<string, AppResult>>({});
  const [verifying, setVerifying] = useState(false);
  const [verificationFailed, setVerificationFailed] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [loadedThemes, detectedApps] = await Promise.all([
        window.electronAPI.listThemes(),
        window.electronAPI.detectApps(),
      ]);
      setThemes(loadedThemes);
      setApps(detectedApps);
    } catch (error: unknown) {
      console.error('Failed to load onboarding data:', error);
    }
  }

  const installedApps = apps.filter((app) => app.isInstalled);
  const manualApps = installedApps.filter((app) => !app.hasRicekitIntegration);
  const alreadyConfiguredApps = installedApps.filter((app) => app.hasRicekitIntegration);
  const currentManualApp = manualApps[currentAppIndex] as AppInfo | undefined;

  // Step index for the progress indicator (welcome=0, theme=1, apps=2)
  const stepIndex =
    currentStep === 'welcome'
      ? 0
      : currentStep === 'theme-selection'
        ? 1
        : currentStep === 'complete'
          ? 2
          : 2;

  function handleNext() {
    if (currentStep === 'welcome') {
      setCurrentStep('theme-selection');
    } else if (currentStep === 'theme-selection') {
      setCurrentStep('app-detection');
    } else if (currentStep === 'app-detection') {
      if (manualApps.length > 0) {
        setCurrentAppIndex(0);
        setVerificationFailed(false);
        setCurrentStep('app-walkthrough');
      } else {
        finishOnboarding();
      }
    }
  }

  function handleBack() {
    if (currentStep === 'theme-selection') {
      setCurrentStep('welcome');
    } else if (currentStep === 'app-detection') {
      setCurrentStep('theme-selection');
    } else if (currentStep === 'app-walkthrough') {
      setCurrentStep('app-detection');
    }
  }

  const handleVerify = useCallback(async () => {
    if (!currentManualApp) return;

    setVerifying(true);
    setVerificationFailed(false);

    try {
      const freshApps = await window.electronAPI.detectApps();
      const updated = freshApps.find((a) => a.name === currentManualApp.name);

      if (updated?.hasRicekitIntegration) {
        // Success — mark and advance
        setAppResults((prev) => ({ ...prev, [currentManualApp.name]: 'configured' }));
        // Update our local apps state with fresh data
        setApps(freshApps);

        // Brief delay for the checkmark animation, then advance
        setTimeout(() => {
          advanceToNextApp();
        }, 800);
      } else {
        setVerificationFailed(true);
      }
    } catch (error: unknown) {
      console.error('Verification failed:', error);
      setVerificationFailed(true);
    } finally {
      setVerifying(false);
    }
  }, [currentManualApp]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleSkip() {
    if (!currentManualApp) return;
    setAppResults((prev) => ({ ...prev, [currentManualApp.name]: 'skipped' }));
    advanceToNextApp();
  }

  function advanceToNextApp() {
    setVerificationFailed(false);
    setCopied(false);
    const nextIndex = currentAppIndex + 1;
    if (nextIndex < manualApps.length) {
      setCurrentAppIndex(nextIndex);
    } else {
      finishOnboarding();
    }
  }

  async function finishOnboarding() {
    setCurrentStep('complete');

    try {
      // Apply the selected theme
      if (selectedTheme) {
        await window.electronAPI.applyTheme(selectedTheme);
        emitThemeApplied();
      }

      // Mark onboarding as completed
      const prefs = await window.electronAPI.getPreferences();
      await window.electronAPI.setPreferences({
        ...prefs,
        onboardingCompleted: true,
      });

      // Auto-close after showing summary
      setTimeout(() => {
        onComplete();
      }, 3000);
    } catch (error: unknown) {
      console.error('Failed to complete onboarding:', error);
    }
  }

  async function handleCopySnippet() {
    if (!currentManualApp) return;
    try {
      await navigator.clipboard.writeText(getImportStatement(currentManualApp.name));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error: unknown) {
      console.error('Failed to copy:', error);
    }
  }

  async function handleOpenConfig() {
    if (!currentManualApp?.configPath) return;
    try {
      await window.electronAPI.openPath(currentManualApp.configPath);
    } catch (error: unknown) {
      console.error('Failed to open config:', error);
    }
  }

  // Build final summary results
  const summaryApps = installedApps.map((app) => {
    if (app.hasRicekitIntegration || appResults[app.name] === 'configured')
      return { app, result: 'configured' as const };
    if (appResults[app.name] === 'skipped') return { app, result: 'skipped' as const };
    return { app, result: 'configured' as const };
  });

  const allConfigured = summaryApps.every((s) => s.result !== 'skipped');
  const skippedCount = summaryApps.filter((s) => s.result === 'skipped').length;

  return (
    <Dialog open={true} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-[750px] p-0 gap-0 overflow-hidden">
        {/* Progress indicator */}
        {currentStep !== 'complete' && <StepIndicator currentIndex={stepIndex} />}

        {/* Walkthrough progress sub-header */}
        {currentStep === 'app-walkthrough' && currentManualApp && (
          <div className="px-8 py-2 bg-muted/50 border-b border-border text-sm text-muted-foreground flex justify-between items-center">
            <span>
              Setting up <span className="font-medium text-foreground">{currentManualApp.displayName}</span>
            </span>
            <span>
              App {currentAppIndex + 1} of {manualApps.length}
            </span>
          </div>
        )}

        {/* Content */}
        <div className="p-8">
          {/* Welcome Step */}
          {currentStep === 'welcome' && (
            <div className="text-center">
              <h2 className="text-3xl font-bold mb-4">Welcome to Ricekit!</h2>
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
                      Apply a consistent color scheme across terminals, editors, and more with a
                      single click.
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
                      Automatically switch between light and dark themes based on system appearance
                      or schedule.
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

          {/* Phase A: App Detection Summary */}
          {currentStep === 'app-detection' && (
            <div>
              <h2 className="text-2xl font-bold mb-2">Detected Applications</h2>
              <p className="text-muted-foreground mb-6">
                {installedApps.length > 0
                  ? `We found ${installedApps.length} supported app${installedApps.length === 1 ? '' : 's'}. We'll walk you through setting each one up.`
                  : 'No supported applications detected. You can configure apps later from the Applications tab.'}
              </p>

              <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
                {/* Already-configured apps */}
                {alreadyConfiguredApps.map((app) => (
                  <div
                    key={app.name}
                    className="flex items-center justify-between p-3 rounded-[10px] border border-border"
                  >
                    <div>
                      <span className="font-medium">{app.displayName}</span>
                      <span className="text-sm text-muted-foreground ml-2 capitalize">
                        {app.category}
                      </span>
                    </div>
                    <AppStatusBadge status="configured" />
                  </div>
                ))}

                {/* Apps needing setup */}
                {manualApps.map((app) => (
                  <div
                    key={app.name}
                    className="flex items-center justify-between p-3 rounded-[10px] border border-amber-500/30 bg-amber-500/5"
                  >
                    <div>
                      <span className="font-medium">{app.displayName}</span>
                      <span className="text-sm text-muted-foreground ml-2 capitalize">
                        {app.category}
                      </span>
                    </div>
                    <AppStatusBadge status="needs-setup" />
                  </div>
                ))}
              </div>

              {manualApps.length > 0 && (
                <p className="text-sm text-muted-foreground mt-4">
                  {manualApps.length} app{manualApps.length === 1 ? ' needs' : 's need'} a small
                  config snippet. We&apos;ll guide you through each one.
                </p>
              )}
            </div>
          )}

          {/* Phase B: App-by-app Walkthrough */}
          {currentStep === 'app-walkthrough' && currentManualApp && (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <h2 className="text-2xl font-bold">
                  {currentManualApp.displayName}
                </h2>
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground capitalize">
                  {currentManualApp.category}
                </span>
              </div>

              {/* Verification success state */}
              {appResults[currentManualApp.name] === 'configured' ? (
                <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                    <Check className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <p className="font-medium text-green-600 dark:text-green-400">
                      Integration detected!
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Moving to next app...
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Integration snippet */}
                  <div>
                    <h3 className="text-sm font-semibold mb-2">
                      Add this to your config:
                    </h3>
                    <CodePreview
                      content={getImportStatement(currentManualApp.name)}
                      highlight
                      maxHeight={150}
                    />
                  </div>

                  {/* Open config button */}
                  {currentManualApp.configPath && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleOpenConfig}
                      >
                        <ExternalLink className="h-4 w-4 mr-1" />
                        Open Config File
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCopySnippet}
                      >
                        {copied ? (
                          <>
                            <Check className="h-4 w-4 mr-1" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="h-4 w-4 mr-1" />
                            Copy Snippet
                          </>
                        )}
                      </Button>
                      <code className="text-[11px] text-muted-foreground bg-muted px-2 py-1 rounded truncate max-w-[250px]">
                        {currentManualApp.configPath}
                      </code>
                    </div>
                  )}

                  {/* Step-by-step instructions */}
                  <div>
                    <h3 className="text-sm font-semibold mb-2">Steps:</h3>
                    <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                      {getSetupInstructions(
                        currentManualApp.name,
                        currentManualApp.configPath ?? ''
                      ).map((instruction, idx) => (
                        <li key={idx}>{instruction}</li>
                      ))}
                    </ol>
                  </div>

                  {/* Verification failed message */}
                  {verificationFailed && (
                    <div className="flex items-start gap-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                      <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
                          We couldn&apos;t detect the integration yet.
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Make sure you&apos;ve saved the config file after adding the snippet.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Phase C: Complete / Summary */}
          {currentStep === 'complete' && (
            <div className="text-center">
              <div className="w-20 h-20 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
                <Check className="h-10 w-10" />
              </div>
              <h2 className="text-2xl font-bold mb-2">
                {allConfigured ? "You're All Set!" : 'Almost There!'}
              </h2>
              <p className="text-muted-foreground mb-6">
                {allConfigured
                  ? 'Your theme has been applied and all apps are configured.'
                  : `Your theme has been applied. ${skippedCount} app${skippedCount === 1 ? ' was' : 's were'} skipped — you can set them up anytime from the Applications tab.`}
              </p>

              {/* Per-app results */}
              {summaryApps.length > 0 && (
                <div className="space-y-2 max-h-64 overflow-y-auto text-left">
                  {summaryApps.map(({ app, result }) => (
                    <div
                      key={app.name}
                      className="flex items-center justify-between p-3 rounded-[10px] border border-border"
                    >
                      <div className="flex items-center gap-2">
                        {result === 'configured' && (
                          <Check className="h-4 w-4 text-green-500" />
                        )}
                        {result === 'skipped' && (
                          <SkipForward className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className="font-medium">{app.displayName}</span>
                      </div>
                      <AppStatusBadge status={result} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Navigation buttons */}
        {currentStep !== 'complete' && (
          <div className="bg-muted px-8 py-4 flex justify-between">
            {currentStep === 'app-walkthrough' ? (
              <>
                <Button variant="ghost" onClick={handleSkip}>
                  <SkipForward className="h-4 w-4 mr-1" />
                  {verificationFailed ? 'Skip for Now' : 'Skip'}
                </Button>
                {appResults[currentManualApp?.name ?? ''] !== 'configured' && (
                  <Button onClick={handleVerify} disabled={verifying}>
                    {verifying
                      ? 'Checking...'
                      : verificationFailed
                        ? 'Try Again'
                        : "I've Added It"}
                  </Button>
                )}
              </>
            ) : (
              <>
                <Button
                  variant="ghost"
                  onClick={handleBack}
                  disabled={currentStep === 'welcome'}
                >
                  Back
                </Button>
                <Button onClick={handleNext}>
                  {currentStep === 'app-detection'
                    ? manualApps.length > 0
                      ? 'Start Setup'
                      : 'Finish'
                    : 'Next'}
                </Button>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
