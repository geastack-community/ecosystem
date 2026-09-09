import { Component, Store } from '@geajs/core'

const contextRegistry = new Map<string, Map<symbol, Store>>()

export interface GeaContext<T extends Store> {
  id: symbol
  defaultValue?: T
}

export function createContext<T extends Store>(defaultValue?: T): GeaContext<T> {
  return {
    id: Symbol('GeaContext'),
    defaultValue,
  }
}

type Constructor<T = {}> = new (...args: any[]) => T

export interface ContextProviderMixin {
  provideContext<T extends Store>(context: GeaContext<T>, store: T): T
}

export function withContextProvider<TBase extends Constructor<Component>>(
  Base: TBase
): TBase & Constructor<ContextProviderMixin> {
  class ContextProvider extends Base implements ContextProviderMixin {
    #providedContexts = new Map<symbol, Store>()

    provideContext<T extends Store>(context: GeaContext<T>, store: T): T {
      this.#providedContexts.set(context.id, store)

      const componentId = (this as any).id
      if (componentId) {
        if (!contextRegistry.has(componentId)) {
          contextRegistry.set(componentId, new Map())
        }
        contextRegistry.get(componentId)!.set(context.id, store)
      }

      return store
    }

    override dispose() {
      const componentId = (this as any).id
      if (componentId && contextRegistry.has(componentId)) {
        contextRegistry.delete(componentId)
      }
      this.#providedContexts.clear()

      if (typeof super.dispose === 'function') {
        super.dispose()
      }
    }
  }

  return ContextProvider as unknown as TBase & Constructor<ContextProviderMixin>
}

export function injectContext<T extends Store>(
  childComponent: Component,
  context: GeaContext<T>
): T {
  let current: any = childComponent

  while (current) {
    if (current.id && contextRegistry.has(current.id)) {
      const stores = contextRegistry.get(current.id)!
      if (stores.has(context.id)) {
        return stores.get(context.id) as T
      }
    }
    current = current.parent || current.props?._parent
  }

  if (context.defaultValue) {
    return context.defaultValue
  }

  throw new Error(
    `[GeaContext] Could not find provided context for Symbol(${
      context.id.description || ''
    }) in parent tree.`
  )
}