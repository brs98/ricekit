import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/renderer/components/ui/button';

interface CodePreviewProps {
  content: string;
  label?: string;
  /** Highlight style for new/added content */
  highlight?: boolean;
  /** Max height in pixels before scrolling */
  maxHeight?: number;
  /** Show copy button */
  showCopy?: boolean;
  /** Additional class names */
  className?: string;
}

export function CodePreview({
  content,
  label,
  highlight = false,
  maxHeight = 200,
  showCopy = true,
  className,
}: CodePreviewProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <p className="text-sm text-muted-foreground">{label}</p>
      )}
      <div className="relative">
        <pre
          className={cn(
            'p-4 rounded-[8px] text-sm overflow-auto font-mono',
            highlight
              ? 'bg-primary/10 border border-primary/20'
              : 'bg-muted'
          )}
          style={{ maxHeight }}
        >
          <code className="text-foreground">{content}</code>
        </pre>
        {showCopy && (
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
        )}
      </div>
    </div>
  );
}
