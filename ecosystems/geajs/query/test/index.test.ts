// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GeaQuery, _clearQueryCache, withQuery, managedQueries } from '../src/index';

vi.mock('@geajs/core', () => {
    return {
        Store: class {},
        Component: class {
            dispose() {}
        }
    };
});

describe('GeaQuery Core', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        _clearQueryCache();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('Requests are deduplicated among instances that share the same queryKey', async () => {
        const queryFn = vi.fn().mockResolvedValue({ id: 1, name: 'Gea' });

        const query1 = new GeaQuery('user', queryFn);
        const query2 = new GeaQuery('user', queryFn);

        expect(query1.isLoading).toBe(true);
        expect(query2.isLoading).toBe(true);

        await vi.advanceTimersByTimeAsync(0);

        expect(query1.data).toEqual({ id: 1, name: 'Gea' });
        expect(query2.data).toEqual({ id: 1, name: 'Gea' });
        expect(query1.isLoading).toBe(false);
        expect(queryFn).toHaveBeenCalledTimes(1);
    });

    it('As long as it is within the `staleTime`, creating a new instance will not trigger a cache lookup or a re-fetch', async () => {
        const queryFn = vi.fn().mockResolvedValue('data');

        const query1 = new GeaQuery('cache-test', queryFn, { staleTime: 5000 });
        await vi.advanceTimersByTimeAsync(0); 

        await vi.advanceTimersByTimeAsync(3000);

        const query2 = new GeaQuery('cache-test', queryFn, { staleTime: 5000 });

        expect(query2.data).toBe('data');
        expect(query2.isStale).toBe(false);
        expect(queryFn).toHaveBeenCalledTimes(1);
    });

    it('Once the `staleTime` has elapsed, `isStale` becomes true', async () => {
        const queryFn = vi.fn().mockResolvedValue('data');
        const query = new GeaQuery('stale-test', queryFn, { staleTime: 1000 });
        
        await vi.advanceTimersByTimeAsync(0); 
        expect(query.isStale).toBe(false);

        await vi.advanceTimersByTimeAsync(1001);

        expect(query.isStale).toBe(true);
    });
});

describe('withQuery method renaming', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        _clearQueryCache();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('Uses `createQuery` as the method name by default', async () => {
        class Base {
            dispose() {}
        }
        class MyComponent extends withQuery(Base as any) {}

        const instance = new MyComponent();
        expect(typeof (instance as any).createQuery).toBe('function');

        const queryFn = vi.fn().mockResolvedValue('default-name-data');
        const query = (instance as any).createQuery('default-name', queryFn);

        await vi.advanceTimersByTimeAsync(0);
        expect(query.data).toBe('default-name-data');
    });

    it('Exposes the creator under the custom name passed as the second argument', async () => {
        class Base {
            dispose() {}
        }
        class MyComponent extends withQuery(Base as any, 'createMyQuery') {}

        const instance = new MyComponent();
        expect(typeof (instance as any).createMyQuery).toBe('function');

        const queryFn = vi.fn().mockResolvedValue('renamed-data');
        const query = (instance as any).createMyQuery('renamed', queryFn);

        await vi.advanceTimersByTimeAsync(0);
        expect(query.data).toBe('renamed-data');
    });

    it('Does not expose `createQuery` when a custom name is used', () => {
        class Base {
            dispose() {}
        }
        class MyComponent extends withQuery(Base as any, 'createMyQuery') {}

        const instance = new MyComponent();
        expect((instance as any).createQuery).toBeUndefined();
    });

    it('Two independently-named mixins applied to the same base do not collide', async () => {
        class Base {
            dispose() {}
        }
        const Mixed = withQuery(withQuery(Base as any, 'createMyQueryA'), 'createMyQueryB');
        class MyComponent extends Mixed {}

        const instance = new MyComponent();
        expect(typeof (instance as any).createMyQueryA).toBe('function');
        expect(typeof (instance as any).createMyQueryB).toBe('function');

        const queryFnA = vi.fn().mockResolvedValue('a-data');
        const queryFnB = vi.fn().mockResolvedValue('b-data');

        const queryA = (instance as any).createMyQueryA('collision-a', queryFnA);
        const queryB = (instance as any).createMyQueryB('collision-b', queryFnB);

        await vi.advanceTimersByTimeAsync(0);

        expect(queryA.data).toBe('a-data');
        expect(queryB.data).toBe('b-data');
    });

    it('`dispose` destroys queries created under a custom method name', async () => {
        class Base {
            dispose() {}
        }
        class MyComponent extends withQuery(Base as any, 'createMyQuery') {}

        const instance: any = new MyComponent();
        const queryFn = vi.fn().mockResolvedValue('dispose-data');
        const query = instance.createMyQuery('dispose-test', queryFn);

        await vi.advanceTimersByTimeAsync(0);
        const destroySpy = vi.spyOn(query, 'destroy');

        instance.dispose();

        expect(destroySpy).toHaveBeenCalledTimes(1);
        expect(instance[managedQueries]).toEqual([]);
    });
});