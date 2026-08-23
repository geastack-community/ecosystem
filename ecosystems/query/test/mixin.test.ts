// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { withQuery, _clearQueryCache } from '../src/index';

class MockComponent {
    dispose() {}
}

describe('withQuery Mixin', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        _clearQueryCache();
    });

    it('When `dispose()` is called, all managed queries are destroyed.', async () => {
        const MixedComponent = withQuery(MockComponent);
        const instance = new MixedComponent();

        const queryFn = vi.fn().mockResolvedValue('polling-data');
        
        const query = instance.createQuery('polling-key', queryFn, {
            refetchInterval: 5000
        });

        await vi.advanceTimersByTimeAsync(0); 
        expect(queryFn).toHaveBeenCalledTimes(1);

        await vi.advanceTimersByTimeAsync(5000);
        expect(queryFn).toHaveBeenCalledTimes(2);

        instance.dispose();

        await vi.advanceTimersByTimeAsync(5000);
        expect(queryFn).toHaveBeenCalledTimes(2);
    });
});