import { describe, expect, it } from 'vitest';
import { createToggleButtonView } from '../src/ui';

class MockNode {
  public textContent = '';
}

class MockButton {
  public icon = new MockNode();
  public label = new MockNode();
  public attributes: Record<string, string> = {};
  public attributeWrites = 0;

  public querySelector(selector: string): MockNode | null {
    if (selector === '.btn-icon') return this.icon;
    if (selector === '.btn-label') return this.label;
    return null;
  }

  public setAttribute(name: string, value: string): void {
    this.attributes[name] = value;
    this.attributeWrites++;
  }
}

const NORMAL = { icon: '⏸', label: 'PAUSE' };
const TOGGLED = { icon: '▶', label: 'PLAY' };

describe('createToggleButtonView', () => {
  it('switches icon, label and aria-pressed with the toggled state', () => {
    const button = new MockButton();
    const view = createToggleButtonView(button as unknown as HTMLElement, NORMAL, TOGGLED);

    view.setToggled(true);
    expect(button.icon.textContent).toBe('▶');
    expect(button.label.textContent).toBe('PLAY');
    expect(button.attributes['aria-pressed']).toBe('true');

    view.setToggled(false);
    expect(button.icon.textContent).toBe('⏸');
    expect(button.label.textContent).toBe('PAUSE');
    expect(button.attributes['aria-pressed']).toBe('false');
  });

  it('only touches the DOM when the state changes', () => {
    const button = new MockButton();
    const view = createToggleButtonView(button as unknown as HTMLElement, NORMAL, TOGGLED);

    view.setToggled(true);
    view.setToggled(true);
    view.setToggled(true);
    expect(button.attributeWrites).toBe(1);

    view.setToggled(false);
    expect(button.attributeWrites).toBe(2);
  });

  it('does not throw when the button or its children are missing', () => {
    expect(() => {
      const view = createToggleButtonView(null, NORMAL, TOGGLED);
      view.setToggled(true);
      view.setToggled(false);
    }).not.toThrow();

    const bare = { querySelector: () => null, setAttribute: () => undefined };
    expect(() => {
      const view = createToggleButtonView(bare as unknown as HTMLElement, NORMAL, TOGGLED);
      view.setToggled(true);
    }).not.toThrow();
  });
});
