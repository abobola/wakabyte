export interface ToggleButtonFace {
  icon: string;
  label: string;
}

export interface ToggleButtonView {
  setToggled: (toggled: boolean) => void;
}

/**
 * Keeps a toggle button's icon, label and `aria-pressed` state in sync with the game state.
 * The DOM is only touched when the toggled state actually changes, and a missing button
 * (or missing icon/label child) is tolerated.
 */
export function createToggleButtonView(
  button: HTMLElement | null,
  normal: ToggleButtonFace,
  toggled: ToggleButtonFace,
): ToggleButtonView {
  const iconElement = button?.querySelector('.btn-icon') ?? null;
  const labelElement = button?.querySelector('.btn-label') ?? null;
  let current: boolean | undefined;

  return {
    setToggled: (isToggled: boolean): void => {
      if (isToggled === current) {
        return;
      }
      current = isToggled;
      const face = isToggled ? toggled : normal;
      if (iconElement) {
        iconElement.textContent = face.icon;
      }
      if (labelElement) {
        labelElement.textContent = face.label;
      }
      button?.setAttribute('aria-pressed', String(isToggled));
    },
  };
}
