export type TransitionOrigin = { x: number; y: number };

const TRANSITION_MS = 500;

function setRevealVars(origin?: TransitionOrigin) {
  const root = document.documentElement;
  const x = origin?.x ?? window.innerWidth / 2;
  const y = origin?.y ?? window.innerHeight / 2;
  const r = Math.hypot(
    Math.max(x, window.innerWidth - x),
    Math.max(y, window.innerHeight - y)
  ) + 8;

  root.style.setProperty('--theme-transition-x', `${x}px`);
  root.style.setProperty('--theme-transition-y', `${y}px`);
  root.style.setProperty('--theme-transition-r', `${r}px`);
}

function clearRevealVars() {
  const root = document.documentElement;
  root.classList.remove('theme-reveal-active');
  root.style.removeProperty('--theme-transition-x');
  root.style.removeProperty('--theme-transition-y');
  root.style.removeProperty('--theme-transition-r');
}

function fallbackCircleReveal(run: () => void, origin?: TransitionOrigin) {
  setRevealVars(origin);
  document.documentElement.classList.add('theme-reveal-active');

  const x = origin?.x ?? window.innerWidth / 2;
  const y = origin?.y ?? window.innerHeight / 2;
  const r =
    Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    ) + 8;

  const overlay = document.createElement('div');
  overlay.className = 'theme-reveal-overlay';
  overlay.style.setProperty('--theme-transition-x', `${x}px`);
  overlay.style.setProperty('--theme-transition-y', `${y}px`);
  overlay.style.setProperty('--theme-transition-r', `${r}px`);
  document.body.appendChild(overlay);

  run();

  overlay.addEventListener(
    'animationend',
    () => {
      overlay.remove();
      clearRevealVars();
    },
    { once: true }
  );
}

function withCircleReveal(run: () => void, origin?: TransitionOrigin) {
  setRevealVars(origin);
  document.documentElement.classList.add('theme-reveal-active');

  const cleanup = () => {
    window.setTimeout(clearRevealVars, TRANSITION_MS);
  };

  if (typeof document.startViewTransition === 'function') {
    document.startViewTransition(run).finished.finally(cleanup);
    return;
  }

  fallbackCircleReveal(run, origin);
}

export function applyThemeWithTransition(
  setTheme: (theme: string) => void,
  theme: string,
  origin?: TransitionOrigin
) {
  withCircleReveal(() => setTheme(theme), origin);
}

export function applyPresetWithTransition(run: () => void, origin?: TransitionOrigin) {
  withCircleReveal(run, origin);
}

export function originFromElement(el: HTMLElement): TransitionOrigin {
  const rect = el.getBoundingClientRect();
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  };
}
