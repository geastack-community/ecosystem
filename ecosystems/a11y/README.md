# @geastack-community/a11y

The definitive, **Zero-Hooks** accessibility (a11y) and focus-management library for **Gea (`@geajs/core`)**.

Designed from the ground up to respect Gea's core philosophy: **No Hooks, pure Object-Oriented Programming (OOP), and explicit resource management.**

## Features

* **📦 Zero Hooks, 100% Gea-Idiomatic**: Built using pure JS Classes and Component Mixins. No implicit reactive magic.
* **⌨️ Robust Focus Trapping**: Locks keyboard focus within modals, dialogs, or drawers, supporting Tab and Shift+Tab looping and blocking focus escape.
* **🥞 Multi-Modal Nesting Support**: Manages a global focus stack (`trapStack`) seamlessly. Opening multiple nested dialogs or drawers won't break focus restoration or trapping.
* **🔊 Framework-Agnostic Screen Reader Announcements**: Dynamically injects and manages `aria-live` regions to reliably broadcast updates to screen readers.
* **🚪 Escape Key Handling**: Optional built-in `onEscape` callback for clean dismissal.
* **🧹 Auto-Cleanup**: Automatically tears down global event listeners, resets state, and restores focus to the previously active element upon component disposal.

## Installation

```bash
pnpm add @geastack-community/a11y

```

## Quick Start

Wrap your Gea component with the `withA11y` mixin. Use `this.createA11y` to instantiate accessibility controllers that tie their lifecycles automatically to the component's `dispose()`.

```typescript
import { Component } from '@geajs/core';
import { withA11y } from '@geastack-community/a11y';

export default class ModalDialog extends withA11y(Component) {
  private a11y!: any;

  created() {
    // 💡 Creates an a11y instance. Automatically cleaned up when the component is disposed.
    this.a11y = this.createA11y({
      trapFocus: true,
      autoFocus: true,
      restoreFocus: true,
      onEscape: () => this.closeModal()
    });
  }

  mounted() {
    const modalElement = this.el.querySelector('.modal-root') as HTMLElement;
    if (modalElement) {
      this.a11y.init(modalElement);
    }
  }

  private closeModal() {
    this.a11y.announce('Modal closed', 'polite');
    // Close logic here...
  }

  template() {
    return `
      <div class="modal-root" role="dialog" aria-modal="true">
        <h2>Accessible Dialog</h2>
        <p>Focus is safely trapped inside this modal.</p>
        <button onclick="${() => this.closeModal()}">Close</button>
      </div>
    `;
  }
}

```

## API Reference

### `withA11y(BaseComponent)`

A class mixin that extends your Gea `Component`. It injects the `createA11y` method and overrides `dispose()` to clean up all tracked accessibility instances under the hood.

### `this.createA11y(options)`

Returns an instance of `GeaA11y` that extends Gea's native `Store`.

#### Options

| Property | Type | Default | Description |
| --- | --- | --- | --- |
| `trapFocus` | `boolean` | `false` | Automatically activate the focus trap when `init()` is called. |
| `autoFocus` | `boolean` | `true` | Automatically focuses the first focusable element inside the root element when activated. |
| `restoreFocus` | `boolean` | `true` | Restores focus to the previously active element when the trap is deactivated. |
| `onEscape` | `(e: KeyboardEvent) => void` | `undefined` | Callback triggered when the `Escape` key is pressed while the trap is active. |

#### Methods

* `init(element: HTMLElement): void`
Binds the accessibility manager to the container element and initializes the trap if configured.
* `activateTrap(): void`
Manually activates the focus trap and event listeners.
* `deactivateTrap(): void`
Deactivates the focus trap, removes listeners, and restores previous focus.
* `announce(message: string, politeness?: 'polite' | 'assertive'): void`
Dispatches a screen reader announcement via a dynamically managed `aria-live` region.
* `destroy(): void`
Cleans up all listeners and resets internal states.

### Global Utilities

* `_clearA11yGlobalState(): void`
Forces the cleanup of all active traps in the stack and purges any dynamic `aria-live` elements from the DOM. Extremely useful in testing environments (e.g., Vitest `afterEach`).

## License

MIT © [KoHaRxnP](https://github.com/KoHaRxnP)