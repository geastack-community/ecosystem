# @geastack-community/context

The lightweight, **Zero-Hooks** dependency injection and context propagation library for **Gea (`@geajs/core`)**.

Designed from the ground up to respect Gea's core philosophy: **No Hooks, pure Object-Oriented Programming (OOP), and explicit resource management.**

## Features

* **📦 Zero Hooks, 100% Gea-Idiomatic**: Built using pure JS Classes and Component Mixins. Seamlessly integrates with Gea's class structure.
* **🌲 Hierarchical Tree Traversal**: Automatically resolves provided contexts by walking up the component parent hierarchy (`parent` / `props._parent`).
* **🔒 Isolated Context Instances**: Multiple parent instances can provide their own independent context states without cross-contamination.
* **🛡️ Safe Default Values**: Fall back to default store instances when context is requested outside a provider hierarchy.
* **🧹 Auto-Cleanup**: Context mappings in the internal registry are automatically destroyed when provider components are disposed to prevent memory leaks.

## Installation

```bash
pnpm add @geastack-community/context

```

## Quick Start

Create a context key, wrap your provider component with `withContextProvider`, and consume the context in any descendant component using `injectContext`.

### 1. Define a Context

Contexts use Gea's native `Store` to manage reactive state.

```typescript
import { Store } from '@geajs/core';
import { createContext } from '@geastack-community/context';

export class UserStore extends Store {
  name = 'Guest';

  setName(newName: string) {
    this.name = newName;
  }
}

export const UserContext = createContext<UserStore>();

```

### 2. Provide Context in a Parent Component

Wrap the parent component with `withContextProvider` and call `this.provideContext`.

```typescript
import { Component } from '@geajs/core';
import { withContextProvider } from '@geastack-community/context';
import { UserContext, UserStore } from './UserContext';

export default class ParentView extends withContextProvider(Component) {
  private userStore = this.provideContext(UserContext, new UserStore());

  template() {
    return `
      <div class="parent">
        <h2>Parent Component</h2>
        <!-- Render child components -->
      </div>
    `;
  }
}

```

### 3. Inject Context in a Child Component

Access the provided store anywhere in the child component tree using `injectContext`.

```typescript
import { Component } from '@geajs/core';
import { injectContext } from '@geastack-community/context';
import { UserContext, UserStore } from './UserContext';

export default class ChildView extends Component {
  get userStore(): UserStore {
    return injectContext(this, UserContext);
  }

  template() {
    return `
      <div class="child">
        <p>Current User: ${this.userStore.name}</p>
        <button onclick="${() => this.userStore.setName('Alice')}">
          Change Name
        </button>
      </div>
    `;
  }
}

```

## API Reference

### `createContext<T>(defaultValue?: T)`

Creates a `GeaContext<T>` key object used for providing and injecting context.

* **Parameters:**
* `defaultValue?: T`: Optional default store instance returned when no provider is found in the parent hierarchy.


* **Returns:** `GeaContext<T>`

### `withContextProvider(BaseComponent)`

A class mixin that extends your Gea `Component`. It injects the `provideContext` method and overrides `dispose()` to clean up registered contexts under the hood.

* **Methods Added:**
* `provideContext<T>(context: GeaContext<T>, store: T): T`
Associates a store instance with the specified context for this component and its descendants. Returns the provided store instance.



### `injectContext(childComponent, context)`

Traverses up the component tree starting from `childComponent` to find the nearest provided instance for `context`.

* **Parameters:**
* `childComponent: Component`: The component instance consuming the context.


* `context: GeaContext<T>`: The context object created via `createContext`.
* **Returns:** `T` (The provided store instance or `defaultValue`).
* **Throws:** `Error` if the context is not found in the hierarchy and no `defaultValue` was provided.

## License

MIT © [KoHaRxnP](https://github.com/KoHaRxnP)