/**
 * Test the shortcut formatting function
 */

function formatShortcutWithSymbols(shortcut) {
  if (!shortcut) return '';

  const symbolMap = {
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

// Test cases
console.log('Testing shortcut formatting function:\n');

const testCases = [
  'Cmd+Shift+T',
  'Cmd+T',
  'Ctrl+Alt+Delete',
  'Shift+Enter',
  'Cmd+Shift+P',
  'Option+Shift+K',
];

testCases.forEach(test => {
  const result = formatShortcutWithSymbols(test);
  console.log(`  "${test}" => "${result}"`);
});

console.log('\n' + '='.repeat(60));
console.log('✅ Formatting function test complete!');
console.log('='.repeat(60));
