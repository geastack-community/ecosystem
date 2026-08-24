# Getting Started

`gea-query` is a lightweight, zero-dependency data-fetching and caching library designed exclusively for the Gea framework. It respects Gea's core philosophy: **Pure OOP and Explicit Resource Management (Zero-Hooks).**

## Installation

Install the package via your preferred package manager alongside `@geajs/core`:

```bash
pnpm add gea-query
```

## Basic Usage
To add query and caching capabilities to your Gea component, wrap your base component with the `withQuery` class mixin.

Here is a complete example of a Member List component fetching data asynchronously:

```typescript
import { BaseComponent } from '@geajs/core'
import { withQuery } from 'gea-query'

// 1. Extend your component using the withQuery mixin
class MemberList extends withQuery(BaseComponent) {
  constructor() {
    super()

    // 2. Register a managed query with a unique key
    this.registerQuery('fetch-members', {
      queryFn: async () => {
        const response = await fetch('[https://api.example.com/members](https://api.example.com/members)')
        if (!response.ok) throw new Error('Network response was not ok')
        return response.json()
      },
      staleTime: 1000 * 60 * 5 // Cache remains fresh for 5 minutes
    })
  }

  render() {
    // 3. Destructure the query state directly inside your render cycle
    const { data, isLoading, error } = this.getQueryState('fetch-members')

    if (isLoading) return '<div>Loading members...</div>'
    if (error) return `<div>Error: ${error.message}</div>`

    return `
      <ul>
        ${data.map(member => `<li>${member.name}</li>`).join('')}
      </ul>
    `
  }

  // 4. Safe and Explicit Lifecycle Cleanup
  override dispose() {
    // Calling super.dispose() automatically unmounts observers and halts tasks
    super.dispose() 
  }
}
```

## Why gea-query?
Traditional modern state managers rely heavily on implicit reactive hooks (like React Query or Vue Query). While powerful, those patterns break the clean, explicit, class-based architecture of Gea.

`gea-query` gives you the exact same powerful caching mechanisms (deduplication, background refetching, cache expiration) but binds them strictly to **explicit method calls and component lifecycles.**