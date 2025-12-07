import { useState, useEffect, useRef } from 'react';

interface ShortcutRecorderProps {
  value: string;
  onChange: (shortcut: string) => void;
  placeholder?: string;
}

/**
 * Converts a keyboard shortcut string to macOS symbol format
 * Example: "Cmd+Shift+T" -> "⌘⇧T"
 */
function formatShortcutWithSymbols(shortcut: string): string {
  if (!shortcut) return '';

  const symbolMap: Record<string, string> = {
    'Cmd': '⌘',
    'Command': '⌘',
    'Shift': '⇧',
    'Alt': '⌥',
    'Option': '⌥',
    'Ctrl': '⌃',
    'Control': '⌃',
    'Enter': '↩',
    'Return': '↩',
    'Delete': '⌫',
    'Backspace': '⌫',
    'Esc': '⎋',
    'Escape': '⎋',
    'Tab': '⇥',
    'Space': '␣',
    'Up': '↑',
    'Down': '↓',
    'Left': '←',
    'Right': '→'
  };

  // Split by + and map each part
  const parts = shortcut.split('+');
  let result = '';

  for (const part of parts) {
    const trimmed = part.trim();
    if (symbolMap[trimmed]) {
      result += symbolMap[trimmed];
    } else {
      // For regular keys, just append them (they're already uppercase)
      result += trimmed;
    }
  }

  return result;
}

export function ShortcutRecorder({ value, onChange, placeholder = 'Press keys...' }: ShortcutRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [currentKeys, setCurrentKeys] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isRecording) {
      window.addEventListener('keydown', handleKeyDown);
      window.addEventListener('keyup', handleKeyUp);
      window.addEventListener('blur', handleBlur);

      return () => {
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
        window.removeEventListener('blur', handleBlur);
      };
    }
  }, [isRecording, currentKeys]);

  function handleKeyDown(e: KeyboardEvent) {
    e.preventDefault();
    e.stopPropagation();

    const keys: string[] = [];

    // Add modifiers
    if (e.metaKey) keys.push('Cmd');
    if (e.ctrlKey) keys.push('Ctrl');
    if (e.altKey) keys.push('Alt');
    if (e.shiftKey) keys.push('Shift');

    // Add main key (if not a modifier)
    const mainKey = e.key;
    if (!['Meta', 'Control', 'Alt', 'Shift'].includes(mainKey)) {
      // Convert key to proper format
      let formattedKey = mainKey;

      // Handle special keys
      if (mainKey === ' ') formattedKey = 'Space';
      else if (mainKey === 'Escape') formattedKey = 'Esc';
      else if (mainKey.length === 1) formattedKey = mainKey.toUpperCase();

      keys.push(formattedKey);
    }

    setCurrentKeys(keys);
  }

  function handleKeyUp(e: KeyboardEvent) {
    e.preventDefault();
    e.stopPropagation();

    // Only finalize if we have a complete shortcut (at least one modifier + one key)
    if (currentKeys.length >= 2) {
      const shortcut = currentKeys.join('+');
      onChange(shortcut);
      setIsRecording(false);
      setCurrentKeys([]);
      inputRef.current?.blur();
    } else {
      // If only modifiers were pressed, don't save
      setCurrentKeys([]);
    }
  }

  function handleBlur() {
    setIsRecording(false);
    setCurrentKeys([]);
  }

  function startRecording() {
    setIsRecording(true);
    setCurrentKeys([]);
  }

  function clearShortcut(e: React.MouseEvent) {
    e.stopPropagation();
    onChange('');
  }

  // Format the display value with macOS symbols
  const displayValue = isRecording
    ? (currentKeys.length > 0 ? formatShortcutWithSymbols(currentKeys.join('+')) : 'Press keys...')
    : (value ? formatShortcutWithSymbols(value) : placeholder);

  return (
    <div className="shortcut-recorder">
      <input
        ref={inputRef}
        type="text"
        className={`shortcut-input ${isRecording ? 'recording' : ''}`}
        value={displayValue}
        onFocus={startRecording}
        readOnly
        placeholder={placeholder}
      />
      {value && !isRecording && (
        <button
          className="shortcut-clear-button"
          onClick={clearShortcut}
          title="Clear shortcut"
        >
          ×
        </button>
      )}
    </div>
  );
}
