import { useState, useEffect } from 'react';
import { Theme, AppInfo } from '../../shared/types';

interface OnboardingModalProps {
  onComplete: () => void;
}

type OnboardingStep = 'welcome' | 'theme-selection' | 'app-configuration' | 'complete';

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
    } catch (error) {
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
      }

      // Setup selected applications
      for (const appName of selectedApps) {
        try {
          await window.electronAPI.setupApp(appName);
        } catch (error) {
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
    } catch (error) {
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
  const totalSteps = 3;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-3xl w-full mx-4 overflow-hidden">
        {/* Progress indicator */}
        {currentStep !== 'complete' && (
          <div className="bg-gray-100 dark:bg-gray-700 px-8 py-4">
            <div className="flex items-center justify-between mb-2">
              {['Welcome', 'Choose Theme', 'Configure Apps'].map((label, idx) => (
                <div key={idx} className="flex items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      idx <= stepIndex
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    {idx + 1}
                  </div>
                  {idx < 2 && (
                    <div
                      className={`w-20 h-1 mx-2 ${
                        idx < stepIndex ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
              {['Welcome', 'Choose Theme', 'Configure Apps'].map((label, idx) => (
                <span
                  key={idx}
                  className={idx <= stepIndex ? 'font-medium text-blue-600 dark:text-blue-400' : ''}
                >
                  {label}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Content */}
        <div className="p-8">
          {currentStep === 'welcome' && (
            <div className="text-center">
              <h2 className="text-3xl font-bold mb-4">Welcome to MacTheme! 🎨</h2>
              <p className="text-lg text-gray-600 dark:text-gray-300 mb-6">
                Unified theming for all your favorite applications
              </p>
              <div className="text-left space-y-4 mb-8">
                <div className="flex items-start">
                  <div className="text-2xl mr-4">✨</div>
                  <div>
                    <h3 className="font-semibold mb-1">One Theme, Everywhere</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Apply a consistent color scheme across terminals, editors, and more with a single click.
                    </p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="text-2xl mr-4">🎯</div>
                  <div>
                    <h3 className="font-semibold mb-1">Beautiful Themes</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Choose from 11 carefully crafted themes, or create your own custom theme.
                    </p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="text-2xl mr-4">🔄</div>
                  <div>
                    <h3 className="font-semibold mb-1">Automatic Switching</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Automatically switch between light and dark themes based on system appearance or schedule.
                    </p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="text-2xl mr-4">⚡</div>
                  <div>
                    <h3 className="font-semibold mb-1">Quick Access</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Use the quick switcher (Cmd+Shift+T) to change themes from anywhere.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentStep === 'theme-selection' && (
            <div>
              <h2 className="text-2xl font-bold mb-2">Choose Your Initial Theme</h2>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                Select a theme to get started. You can always change this later.
              </p>
              <div className="grid grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                {themes.map((theme) => (
                  <div
                    key={theme.name}
                    onClick={() => setSelectedTheme(theme.name)}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedTheme === theme.name
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <div className="font-medium mb-2">{theme.metadata.name}</div>
                    <div className="flex space-x-1 mb-2">
                      {[
                        theme.metadata.colors.background,
                        theme.metadata.colors.red,
                        theme.metadata.colors.green,
                        theme.metadata.colors.yellow,
                        theme.metadata.colors.blue,
                        theme.metadata.colors.magenta,
                      ].map((color, idx) => (
                        <div
                          key={idx}
                          className="w-8 h-8 rounded"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {theme.isLight ? '☀️ Light' : '🌙 Dark'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {currentStep === 'app-configuration' && (
            <div>
              <h2 className="text-2xl font-bold mb-2">Configure Applications</h2>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                Select which applications you'd like MacTheme to configure. We'll automatically set them up to use your themes.
              </p>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {apps.filter(app => app.isInstalled).map((app) => (
                  <div
                    key={app.name}
                    onClick={() => toggleApp(app.name)}
                    className={`p-4 rounded-lg border cursor-pointer transition-all ${
                      selectedApps.includes(app.name)
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{app.displayName}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400 capitalize">
                          {app.category}
                          {app.isConfigured && ' • Already configured'}
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={selectedApps.includes(app.name)}
                        onChange={() => {}}
                        className="w-5 h-5"
                      />
                    </div>
                  </div>
                ))}
                {apps.filter(app => app.isInstalled).length === 0 && (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    No supported applications detected. You can configure them later from the Apps section.
                  </div>
                )}
              </div>
            </div>
          )}

          {currentStep === 'complete' && (
            <div className="text-center py-8">
              <div className="text-6xl mb-4">🎉</div>
              <h2 className="text-2xl font-bold mb-2">You're All Set!</h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Your theme has been applied and your applications have been configured.
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Explore the app to discover more themes and features!
              </p>
            </div>
          )}
        </div>

        {/* Navigation buttons */}
        {currentStep !== 'complete' && (
          <div className="bg-gray-50 dark:bg-gray-700 px-8 py-4 flex justify-between">
            <button
              onClick={handleBack}
              disabled={currentStep === 'welcome'}
              className="px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              Back
            </button>
            <button
              onClick={handleNext}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
            >
              {currentStep === 'app-configuration' ? 'Finish' : 'Next'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
