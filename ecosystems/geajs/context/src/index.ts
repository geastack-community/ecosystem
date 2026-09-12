import { Component, Store } from '@geajs/core'

const contextRegistry = new WeakMap<object, Map<symbol, Store>>()

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
    provideContext<T extends Store>(context: GeaContext<T>, store: T): T {
      let stores = contextRegistry.get(this)
      if (!stores) {
        stores = new Map<symbol, Store>()
        contextRegistry.set(this, stores)
      }
      stores.set(context.id, store)

      return store
    }

    override dispose(...args: any[]) {
      contextRegistry.delete(this)

      super.dispose()
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
    if (contextRegistry.has(current)) {
      const stores = contextRegistry.get(current)!
      if (stores.has(context.id)) {
        return stores.get(context.id) as T
      }
    }
    current = current.parent ?? current.props?._parent
  }

  if (context.defaultValue !== undefined) {
    return context.defaultValue
  }

  throw new Error(
    `[GeaContext] Could not find provided context for Symbol(${
      context.id.description || ''
    }) in parent tree.`
  )
}