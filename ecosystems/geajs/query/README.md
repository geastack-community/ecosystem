# @geastack-community/query

The definitive, **Zero-Hooks** data-fetching, caching, and state-synchronization library for **Gea (`@geajs/core`)**.

Designed from the ground up to respect Gea's core philosophy: **No Hooks, pure Object-Oriented Programming (OOP), and explicit resource management.**

## Features

- **📦 Zero Hooks, 100% Gea-Idiomatic**: Built using pure JS Classes and Component Mixins. No implicit reactive magic.
- **🔄 Multi-Instance Synchronization**: Share the same `queryKey` across multiple components. Data, loading states, and errors stay perfectly synced.
- **🛡️ Race Condition & Deduplication**: Prevents duplicate network requests. If multiple components request the same key simultaneously, only one network request is made.
- **⏳ Dynamic Stale-Time Management**: Intelligently recalculates remaining cache lifetime when new components mount.
- **🧹 Auto-Cleanup**: Window focus listeners, polling intervals, and state transitions are automatically torn down when components are disposed.

## Installation

```bash
pnpm add @geastack-community/query

```

## Quick Start

Wrap your Gea component with the `withQuery` mixin. Use `this.createQuery` to instantiate reactive query stores that tie their lifecycles automatically to the component's `dispose()`.

```typescript
import { Component } from '@geajs/core';
import { withQuery } from '@geastack-community/query';

interface User {
  id: number;
  name: string;
}

export default class UserProfile extends withQuery(Component) {
  private userQuery!: any;

  created() {
    // 💡 Creates a query store. Automatically cleaned up when the component is disposed.
    this.userQuery = this.createQuery(
      'userData',
      () => fetch('/api/user').then((res) => res.json()),
      {
        staleTime: 30000,          // 30 seconds
        refetchOnWindowFocus: true, // Refetch when window regains focus
        refetchInterval: 5000       // Polling every 5 seconds (optional)
      }
    );
  }

  template() {
    if (this.userQuery.isLoading) return '<div>Loading user profile...</div>';
    if (this.userQuery.error) return '<div>Failed to load user.</div>';

    const user = this.userQuery.data as User;
    return `
      <div>
        <h1>Profile</h1>
        <p>Name: ${user.name}</p>
        <button onclick="${() => this.userQuery.fetch()}">Manual Refresh</button>
      </div>
    `;
  }
}

```

## API Reference

### `withQuery(BaseComponent)`

A class mixin that extends your Gea `Component`. It injects the `createQuery` method and overrides `dispose()` to clean up all tracked queries under the hood.

### `this.createQuery(queryKey, queryFn, options)`

Returns an instance of `GeaQuery` that extends Gea's native `Store`.

### `GeaQuery`

`GeaQuery` class can also be instantiated directly.

#### Options

| Property | Type | Default | Description |
| --- | --- | --- | --- |
| `enabled` | `boolean` | `true` | Set to `false` to disable automatic fetching on initialization. |
| `staleTime` | `number` | `0` | The time in milliseconds before data is considered stale. |
| `refetchOnWindowFocus` | `boolean` | `true` | Automatically refetches stale data when the browser window gains focus. |
| `refetchInterval` | `number` | `0` | Interval in milliseconds for background polling. Disabled if `0`. |

#### Query State Properties

Since `GeaQuery` extends `Store`, these properties are fully reactive within your component templates:

* `data: T | null`: The last successfully resolved data.
* `isLoading: boolean`: True if the network request is in-flight.
* `error: Error | null`: The error object caught during the last fetch attempt.
* `isStale: boolean`: True if the data has outlived its `staleTime`.

#### Query Methods

* `fetch(silent?: boolean): Promise<void>`
Triggers a manual refetch. Pass `true` to skip setting `isLoading = true` (useful for background updates).
* `destroy(): void`
Cleans up event listeners, intervals, and internal instance references.

## License

MIT © [KoHaRxnP](https://github.com/KoHaRxnP)
