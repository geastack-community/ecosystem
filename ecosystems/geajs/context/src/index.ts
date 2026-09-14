import { Component, GEA_PARENT_COMPONENT, GEA_STORE_ROOT, Store } from '@geajs/core'

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

function normalizeKey(obj: any): object {
  return obj?.[GEA_STORE_ROOT] ?? obj
}

export function withContextProvider<TBase extends Constructor<Component>>(
  Base: TBase
): TBase & Constructor<ContextProviderMixin> {
  class ContextProvider extends Base implements ContextProviderMixin {
    provideContext<T extends Store>(context: GeaContext<T>, store: T): T {
      const key = normalizeKey(this)
      let stores = contextRegistry.get(key)
      if (!stores) {
        stores = new Map<symbol, Store>()
        contextRegistry.set(key, stores)
      }
      stores.set(context.id, store)
      return store
    }

    override dispose(...args: any[]) {
      contextRegistry.delete(normalizeKey(this))
      if (typeof super.dispose === 'function') {
        (super.dispose as Function)(...args)
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
    const key = normalizeKey(current)
    const stores = contextRegistry.get(key)
    if (stores?.has(context.id)) {
      return stores.get(context.id) as T
    }
    current = current[GEA_PARENT_COMPONENT]
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