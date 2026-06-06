export type MovieMemoryDeckAction = 'watched' | 'not_seen' | 'unsure';

type KeyboardEventLike = {
  altKey: boolean;
  ctrlKey: boolean;
  defaultPrevented: boolean;
  key: string;
  metaKey: boolean;
  shiftKey: boolean;
  target: EventTarget | null;
};

const DECK_CARD_IDLE_ANIMATE = { opacity: 1, x: 0, y: 0, rotate: 0, scale: 1 };
const DECK_CARD_REDUCED_EXIT_ANIMATE = { opacity: 0, x: 0, y: 0, rotate: 0, scale: 0.98 };
const DECK_CARD_EXIT_ANIMATE_BY_ACTION = {
  watched: { opacity: 0, x: 520, y: 8, rotate: 8, scale: 0.98 },
  not_seen: { opacity: 0, x: -520, y: 8, rotate: -8, scale: 0.98 },
  unsure: { opacity: 0, x: 0, y: 150, rotate: 0, scale: 0.95 },
} satisfies Record<MovieMemoryDeckAction, typeof DECK_CARD_IDLE_ANIMATE>;

const KEYBOARD_ACTION_BY_KEY: Partial<Record<string, MovieMemoryDeckAction>> = {
  ArrowLeft: 'not_seen',
  ArrowRight: 'watched',
  ArrowDown: 'unsure',
};

function isEditableKeyboardTarget(target: EventTarget | null): boolean {
  if (typeof HTMLElement === 'undefined' || !(target instanceof HTMLElement)) return false;
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable;
}

export function getDeckKeyboardAction(event: KeyboardEventLike): MovieMemoryDeckAction | null {
  if (
    event.defaultPrevented ||
    event.metaKey ||
    event.ctrlKey ||
    event.altKey ||
    event.shiftKey ||
    isEditableKeyboardTarget(event.target)
  ) {
    return null;
  }

  return KEYBOARD_ACTION_BY_KEY[event.key] ?? null;
}

export function getDeckCardAnimate(action: MovieMemoryDeckAction | null, reducedMotion: boolean) {
  if (!action) return DECK_CARD_IDLE_ANIMATE;
  return reducedMotion ? DECK_CARD_REDUCED_EXIT_ANIMATE : DECK_CARD_EXIT_ANIMATE_BY_ACTION[action];
}
