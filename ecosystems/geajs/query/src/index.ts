import { Store } from '@geajs/core';

const queryCache = new Map<string, { data: unknown; updateAt: number }>();
const queryInstances = new Map<string, Set<GeaQuery<unknown>>>();
const fetchPromises = new Map<string, Promise<unknown>>();
const staleTimers = new Map<string, ReturnType<typeof setTimeout>>();

export interface GeaQueryOptions {
    enabled?: boolean;
    staleTime?: number;
    refetchOnWindowFocus?: boolean;
    refetchInterval?: number;
}

export class GeaQuery<T = unknown> extends Store {
    data: T | null = null;
    isLoading = false;
    error: Error | null = null;
    isStale = true;

    private queryKey: string;
    private queryFn: () => Promise<T>;
    private options: Required<GeaQueryOptions>;
    private pollingIntervalId: any = null;
    private focusListener: (() => void) | null = null;

    constructor(queryKey: string, queryFn: () => Promise<T>, options: GeaQueryOptions = {}) {
        super();
        this.queryKey = queryKey;
        this.queryFn = queryFn;

        this.options = {
            enabled: options.enabled ?? true,
            staleTime: options.staleTime ?? 0,
            refetchOnWindowFocus: options.refetchOnWindowFocus ?? true,
            refetchInterval: options.refetchInterval ?? 0
        };

        if (!queryInstances.has(queryKey)) {
            queryInstances.set(queryKey, new Set());
        }
        queryInstances.get(queryKey)!.add(this);

        this.init();
    }

    private init() {
        const cached = queryCache.get(this.queryKey);
        if (cached) {
            this.data = cached.data as T;
            const age = Date.now() - cached.updateAt;
            this.isStale = age > this.options.staleTime;
        }

        if (this.options.enabled) {
            if (this.isStale || !cached) {
                this.fetch();
            } else {
                this.scheduleStaleTransition();
            }

            if (this.options.refetchOnWindowFocus) {
                this.setupFocusListener();
            }
            if (this.options.refetchInterval > 0) {
                this.startPolling();
            }
        }
    }

    async fetch(silent = false): Promise<void> {
        const instances = queryInstances.get(this.queryKey);
        const existing = fetchPromises.get(this.queryKey);

        if (existing) {
            if (!silent && !this.data) {
                this.isLoading = true;
                this.error = null;
            }
            try {
                await existing;
            } catch {}
            return;
        }

        if (!silent && !this.data) {
            instances?.forEach(ins => {
                ins.isLoading = true;
                ins.error = null;
            });
        }

        const promise = this.queryFn();
        fetchPromises.set(this.queryKey, promise);

        try {
            const freshData = await promise;

            queryCache.set(this.queryKey, {
                data: freshData,
                updateAt: Date.now()
            });

            const currentInstances = queryInstances.get(this.queryKey);
            if (currentInstances) {
                currentInstances.forEach((instance) => {
                    instance.data = freshData;
                    instance.isLoading = false;
                    instance.error = null;
                    instance.isStale = false;
                    instance.scheduleStaleTransition();
                });
            }
        } catch (err) {
            const currentInstances = queryInstances.get(this.queryKey);
            if (currentInstances) {
                currentInstances.forEach((instance) => {
                    instance.error = err as Error;
                    instance.isLoading = false;
                });
            }
        } finally {
            fetchPromises.delete(this.queryKey);
        }
    }

    private scheduleStaleTransition() {
        const existing = staleTimers.get(this.queryKey);
        if (existing) {
            clearTimeout(existing);
            staleTimers.delete(this.queryKey);
        }

        const cached = queryCache.get(this.queryKey);
        if (!cached) return;

        const { staleTime } = this.options;
        if (!isFinite(staleTime) || staleTime <= 0) {
            return;
        }

        const age = Date.now() - cached.updateAt;
        const remainingTime = Math.max(0, staleTime - age);

        const timer = setTimeout(() => {
            const instances = queryInstances.get(this.queryKey);
            instances?.forEach(ins => {
                ins.isStale = true;
            });
            staleTimers.delete(this.queryKey);
        }, remainingTime);
        staleTimers.set(this.queryKey, timer);
    }

    private setupFocusListener() {
        if (this.focusListener) return;
        this.focusListener = () => {
            if (document.visibilityState === 'visible') {
                const cached = queryCache.get(this.queryKey);
                if (!cached || (Date.now() - cached.updateAt > this.options.staleTime)) {
                    this.fetch(true);
                }
            }
        };
        window.addEventListener('visibilitychange', this.focusListener);
    }

    private startPolling() {
        if (this.pollingIntervalId) return;
        this.pollingIntervalId = setInterval(() => {
            this.fetch(true);
        }, this.options.refetchInterval);
    }

    public destroy() {
        if (this.focusListener) {
            window.removeEventListener('visibilitychange', this.focusListener);
            this.focusListener = null;
        }

        if (this.pollingIntervalId) {
            clearInterval(this.pollingIntervalId);
            this.pollingIntervalId = null;
        }

        const instanceSet = queryInstances.get(this.queryKey);
        if (instanceSet) {
            instanceSet.delete(this);
            if (instanceSet.size === 0) {
                queryInstances.delete(this.queryKey);
                fetchPromises.delete(this.queryKey);

                const staleTimer = staleTimers.get(this.queryKey);
                if (staleTimer) {
                    clearTimeout(staleTimer);
                    staleTimers.delete(this.queryKey);
                }
            }
        }
    }
}

export function withQuery<T extends new (...args: any) => any>(Base: T) {
    return class extends Base {
        _managedQueries: GeaQuery[] = [];

        createQuery<TData>(queryKey: string, queryFn: () => Promise<TData>, options?: GeaQueryOptions): GeaQuery<TData> {
            const query = new GeaQuery(queryKey, queryFn, options);
            this._managedQueries.push(query);
            return query;
        }

        dispose() {
            this._managedQueries.forEach(query => query.destroy());
            this._managedQueries = [];
            
            if ('prototype' in Base && typeof Base.prototype.dispose === 'function') {
                super.dispose();
            } else if (typeof super.dispose === 'function') {
                super.dispose();
            }
        }
    };
}

export function _clearQueryCache() {
    queryCache.clear();
    queryInstances.clear();
    fetchPromises.clear();
    staleTimers.forEach(timer => clearTimeout(timer));
    staleTimers.clear();
}