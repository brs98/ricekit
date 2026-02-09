import { useState } from 'react';
import { Copy, Check, Zap, ChevronRight, ChevronDown, FileCode, FilePlus, CheckCircle2 } from 'lucide-react';
import type { AppInfo, SetupPreview } from '../../shared/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/renderer/components/ui/dialog';
import { Button } from '@/renderer/components/ui/button';
import { CodePreview } from './CodePreview';
import { getImportStatement, getSetupInstructions } from '../utils/appSetupInfo';

interface SetupWizardModalProps {
  app: AppInfo;
  onClose: () => void;
  onSetupComplete: () => void;
}

type SetupStep = 'instructions' | 'preview' | 'complete';

export function SetupWizardModal({ app, onClose, onSetupComplete }: SetupWizardModalProps) {
  const [step, setStep] = useState<SetupStep>('instructions');
  const [preview, setPreview] = useState<SetupPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showExistingConfig, setShowExistingConfig] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(getImportStatement(app.name));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error: unknown) {
      console.error('Failed to copy:', error);
    }
  };

  const handleContinueToPreview = async () => {
    try {
      setLoading(true);
      const previewResult = await window.electronAPI.previewSetupApp(app.name);
      setPreview(previewResult);
      setStep('preview');
    } catch (error: unknown) {
      console.error('Preview failed:', error);
      alert('Failed to preview setup. Please try manual setup.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmSetup = async () => {
    try {
      setLoading(true);
      await window.electronAPI.setupApp(app.name);
      setStep('complete');
    } catch (error: unknown) {
      console.error('Setup failed:', error);
      alert('Automatic setup failed. Please follow manual instructions.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyAndClose = async () => {
    const contentToCopy = preview?.snippet || preview?.newContent || getImportStatement(app.name);
    try {
      await navigator.clipboard.writeText(contentToCopy);
      onClose();
    } catch (error: unknown) {
      console.error('Failed to copy:', error);
    }
  };

  const importStatement = getImportStatement(app.name);
  const instructions = getSetupInstructions(app.name, app.configPath ?? '');
  const supportsAutomaticSetup = ['neovim', 'wezterm', 'sketchybar', 'aerospace'].includes(app.name);

  // Get action button label based on preview action
  const getActionButtonLabel = (): string => {
    if (!preview) return 'Confirm Setup';
    switch (preview.action) {
      case 'create':
        return 'Create File';
      case 'modify':
        return 'Add to Config';
      case 'already_setup':
        return 'Done';
      default:
        return 'Confirm Setup';
    }
  };

  // Count lines in existing config
  const getLineCount = (content?: string): number => {
    if (!content) return 0;
    return content.split('\n').length;
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] p-0 gap-0 overflow-hidden">
        <div className="bg-muted px-6 py-4">
          <DialogHeader>
            <DialogTitle>Setup {app.displayName}</DialogTitle>
            <DialogDescription>
              {step === 'instructions' && `Configure ${app.displayName} to use Ricekit`}
              {step === 'preview' && 'Review what will change before proceeding'}
              {step === 'complete' && 'Setup complete!'}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="p-6 overflow-y-auto max-h-[60vh]">
        {/* Step 1: Instructions */}
        {step === 'instructions' && (
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              To use Ricekit with {app.displayName}, you need to configure it to import
              theme settings from Ricekit&apos;s current theme directory.
            </p>

            {/* Import Statement */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Import Statement</h3>
              <div className="relative">
                <pre className="bg-muted p-4 rounded-[8px] text-sm overflow-x-auto font-mono">
                  <code>{importStatement}</code>
                </pre>
                <Button
                  variant="secondary"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={handleCopy}
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 mr-1" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-1" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Instructions */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Setup Instructions</h3>
              <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                {instructions.map((instruction, index) => (
                  <li key={index}>{instruction}</li>
                ))}
              </ol>
            </div>

            {/* Config Path */}
            <div className="text-sm">
              <span className="font-semibold">Config Location: </span>
              <code className="bg-muted px-2 py-1 rounded text-xs">{app.configPath}</code>
            </div>
          </div>
        )}

        {/* Step 2: Preview */}
        {step === 'preview' && preview && (
          <div className="space-y-4 py-4">
            {/* Already Setup */}
            {preview.action === 'already_setup' && (
              <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                <div>
                  <p className="font-medium text-green-600 dark:text-green-400">Already Configured</p>
                  <p className="text-sm text-muted-foreground">
                    {app.displayName} is already set up with Ricekit integration.
                  </p>
                </div>
              </div>
            )}

            {/* Create New File */}
            {preview.action === 'create' && (
              <>
                <div className="flex items-center gap-2">
                  <FilePlus className="h-5 w-5 text-primary" />
                  <span className="font-medium">This file will be created:</span>
                </div>
                <code className="block bg-muted px-3 py-2 rounded text-sm break-all">
                  {preview.configPath}
                </code>
                {preview.newContent && (
                  <CodePreview
                    content={preview.newContent}
                    highlight
                    maxHeight={250}
                  />
                )}
              </>
            )}

            {/* Modify Existing Config */}
            {preview.action === 'modify' && (
              <>
                <div className="flex items-center gap-2">
                  <FileCode className="h-5 w-5 text-primary" />
                  <span className="font-medium">{preview.instructions || 'Add this to your config:'}</span>
                </div>
                <code className="block bg-muted px-3 py-2 rounded text-sm break-all">
                  {preview.configPath}
                </code>
                {preview.snippet && (
                  <CodePreview
                    content={preview.snippet}
                    highlight
                    maxHeight={150}
                  />
                )}

                {/* Collapsible existing config preview */}
                {preview.currentContent && (
                  <div className="border rounded-lg">
                    <button
                      onClick={() => setShowExistingConfig(!showExistingConfig)}
                      className="flex items-center gap-2 w-full p-3 text-sm text-muted-foreground hover:bg-muted/50 transition-colors"
                    >
                      {showExistingConfig ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                      View existing config ({getLineCount(preview.currentContent)} lines)
                    </button>
                    {showExistingConfig && (
                      <div className="border-t">
                        <CodePreview
                          content={preview.currentContent}
                          maxHeight={200}
                          showCopy={false}
                          className="p-0 [&>div]:space-y-0 [&_pre]:rounded-none [&_pre]:border-0"
                        />
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

          </div>
        )}

        {/* Step 3: Complete */}
        {step === 'complete' && (
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
              <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
              <div>
                <p className="font-medium text-green-600 dark:text-green-400">Setup Complete</p>
                <p className="text-sm text-muted-foreground">
                  {app.displayName} has been configured to use Ricekit themes.
                </p>
              </div>
            </div>
            {preview?.configPath && (
              <div className="text-sm">
                <span className="font-semibold">Config File: </span>
                <code className="bg-muted px-2 py-1 rounded text-xs">{preview.configPath}</code>
              </div>
            )}
          </div>
        )}
        </div>

        <div className="bg-muted px-6 py-4">
        <DialogFooter className="gap-2 sm:gap-0">
          {/* Step 1: Instructions */}
          {step === 'instructions' && (
            <>
              {supportsAutomaticSetup && (
                <Button
                  onClick={handleContinueToPreview}
                  disabled={loading}
                >
                  {loading ? 'Loading...' : 'Continue'}
                  {!loading && <ChevronRight className="h-4 w-4 ml-1" />}
                </Button>
              )}
              <Button variant="outline" onClick={onClose}>
                Manual Setup
              </Button>
            </>
          )}

          {/* Step 2: Preview */}
          {step === 'preview' && preview && (
            <>
              <Button variant="outline" onClick={() => setStep('instructions')}>
                Back
              </Button>
              {preview.action !== 'already_setup' && (
                <Button variant="outline" onClick={handleCopyAndClose}>
                  <Copy className="h-4 w-4 mr-1" />
                  Copy & Do It Myself
                </Button>
              )}
              {preview.action === 'already_setup' ? (
                <Button onClick={() => { onSetupComplete(); onClose(); }}>
                  Done
                </Button>
              ) : (
                <Button onClick={handleConfirmSetup} disabled={loading}>
                  <Zap className="h-4 w-4 mr-1" />
                  {loading ? 'Setting up...' : getActionButtonLabel()}
                </Button>
              )}
            </>
          )}

          {/* Step 3: Complete */}
          {step === 'complete' && (
            <Button onClick={() => { onSetupComplete(); onClose(); }}>
              Done
            </Button>
          )}
        </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
