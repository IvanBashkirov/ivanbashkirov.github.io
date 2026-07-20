/* Central keyboard dispatch (§7 chart): 1/2/3/4 · j/k · Enter · E · F · S · ? · Esc */

import { isEink, isLogPage, isTyping } from './util';
import { activate, flip, isFlipped } from './nav';
import { cycleDial } from './knob';
import { toggleSound } from './snd';
import { moveCursor, openCursor } from './cursor';
import { ejectDoc } from './disk';
import { testModeClose, testModeOpen } from './konami';

const MODE_KEYS: Record<string, string> = {
  '1': 'activity',
  '2': 'projects',
  '3': 'writing',
  '4': 'notes',
};

export function initKeys(): void {
  window.addEventListener('keydown', (e) => {
    if (isTyping(e) || e.metaKey || e.ctrlKey || e.altKey) return;

    if (e.key === 'Escape') {
      if (testModeOpen()) testModeClose();
      else if (isFlipped()) flip(false);
      return;
    }

    switch (e.key.toLowerCase()) {
      case '1':
      case '2':
      case '3':
      case '4':
        if (isLogPage() && !isFlipped()) activate(MODE_KEYS[e.key]);
        break;
      case 'j':
        if (isLogPage() && !isFlipped()) moveCursor(1);
        break;
      case 'k':
        if (isLogPage() && !isFlipped()) moveCursor(-1);
        break;
      case 'enter':
        if (isLogPage() && !isFlipped() && e.target === document.body) openCursor();
        break;
      case 'e':
        if (isEink()) ejectDoc();
        break;
      case 'f':
        if (isLogPage() && !isFlipped()) cycleDial();
        break;
      case 's':
        toggleSound();
        break;
      case '?':
        flip(!isFlipped());
        break;
    }
  });
}
