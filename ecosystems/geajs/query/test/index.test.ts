// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GeaQuery, _clearQueryCache } from '../src/index';


vi.mock('@geajs/core', () => {
    return {
        Store: class {}
    };
});

vi.mock('@geajs/core', () => {
    return {
        Store: class {}
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