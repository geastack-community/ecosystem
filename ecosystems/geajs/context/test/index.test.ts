import { describe, it, expect } from 'vitest'
import { Component, Store } from '@geajs/core'
import {
  createContext,
  withContextProvider,
  injectContext,
} from '../src/index'

class TestStore extends Store {
  count = 0
  increment() {
    this.count++
  }
}

function setupTestComponents() {
  const TestContext = createContext<TestStore>();

  class ParentComponent extends withContextProvider(Component) {
    store = this.provideContext(TestContext, new TestStore())
  }

  class ChildComponent extends Component {
    get store(): TestStore {
      return injectContext(this, TestContext)
    }
  }

  return { TestContext, ParentComponent, ChildComponent }
}

describe('GeaContext', () => {
  it('should successfully retrieve the context provided by the parent component in the child component', () => {
    const { ParentComponent, ChildComponent } = setupTestComponents();

    const parent = new ParentComponent();
    const child = new ChildComponent();

    ;(child as any).parent = parent;

    expect(child.store).toBeDefined();
    expect(child.store.count).toBe(0);

    child.store.increment();
    expect(parent.store.count).toBe(1);
  })

  it('should retrieve independent context instances when multiple parent instances exist', () => {
    const { ParentComponent, ChildComponent } = setupTestComponents();

    const parent1 = new ParentComponent();
    const child1 = new ChildComponent();
    (child1 as any).parent = parent1;

    const parent2 = new ParentComponent();
    const child2 = new ChildComponent();
    (child2 as any).parent = parent2;

    child1.store.increment();

    expect(child1.store.count).toBe(1);
    expect(child2.store.count).toBe(0);
    expect(child1.store).not.toBe(child2.store);
  })

  it('should traverse up the parent tree to find the context in deeply nested structures', () => {
    const { ParentComponent, ChildComponent } = setupTestComponents();

    class MiddleComponent extends Component {};

    const parent = new ParentComponent();
    const middle = new MiddleComponent();
    const child = new ChildComponent();

    (middle as any).parent = parent;
    (child as any).parent = middle;

    expect(child.store).toBe(parent.store);
  })

  it('should return defaultValue if specified when context is not found', () => {
    const defaultStore = new TestStore();
    defaultStore.count = 999;
    const TestContextWithDefault = createContext<TestStore>(defaultStore);

    class OrphanChild extends Component {
      get store(): TestStore {
        return injectContext(this, TestContextWithDefault)
      }
    }

    const child = new OrphanChild();
    expect(child.store.count).toBe(999);
  })

  it('should throw an error if context is not found and no defaultValue is provided', () => {
    const UnprovidedContext = createContext<TestStore>();

    class OrphanChild extends Component {
      get store(): TestStore {
        return injectContext(this, UnprovidedContext)
      }
    }

    const child = new OrphanChild();
    expect(() => child.store).toThrowError(/Could not find provided context/);
  })

  it('should properly remove context from registry on dispose() execution to prevent memory leaks', () => {
    const { ParentComponent, ChildComponent } = setupTestComponents();

    const parent = new ParentComponent();
    const child = new ChildComponent();
    (child as any).parent = parent;

    expect(child.store).toBeDefined();

    parent.dispose();

    expect(() => child.store).toThrowError(/Could not find provided context/);
  })
})