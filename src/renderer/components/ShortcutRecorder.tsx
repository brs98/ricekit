import { useState, useEffect, useRef } from 'react';

interface ShortcutRecorderProps {
  value: string;
  onChange: (shortcut: string) => void;
  placeholder?: string;
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

  const displayValue = isRecording
    ? (currentKeys.length > 0 ? currentKeys.join('+') : 'Press keys...')
    : (value || placeholder);

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
