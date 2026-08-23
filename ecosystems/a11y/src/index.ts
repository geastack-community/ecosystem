import { Store } from '@geajs/core';

export interface GeaA11yOptions {
    trapFocus?: boolean;
    autoFocus?: boolean;
    restoreFocus?: boolean;
    onEscape?: (e: KeyboardEvent) => void;
}


const trapStack: GeaA11y[] = [];


let politeLiveRegion: HTMLElement | null = null;
let assertiveLiveRegion: HTMLElement | null = null;

function getLiveRegion(politeness: 'polite' | 'assertive'): HTMLElement {
    const isAssertive = politeness === 'assertive';
    let region = isAssertive ? assertiveLiveRegion : politeLiveRegion;

    if (!region || !document.body.contains(region)) {
        region = document.createElement('div');
        region.setAttribute('aria-live', politeness);
        region.setAttribute('aria-atomic', 'true');
        
        
        Object.assign(region.style, {
            position: 'absolute',
            width: '1px',
            height: '1px',
            padding: '0',
            margin: '-1px',
            overflow: 'hidden',
            clip: 'rect(0, 0, 0, 0)',
            whiteSpace: 'nowrap',
            border: '0'
        });

        document.body.appendChild(region);
        if (isAssertive) assertiveLiveRegion = region;
        else politeLiveRegion = region;
    }

    return region;
}

export class GeaA11y extends Store {
    isTrapped = false;
    srMessage = ""; 
    srPoliteness: 'polite' | 'assertive' = 'polite';

    private rootElement: HTMLElement | null = null;
    private options: Required<Omit<GeaA11yOptions, 'onEscape'>> & { onEscape?: (e: KeyboardEvent) => void };
    private keydownListener: ((e: KeyboardEvent) => void) | null = null;
    private focusinListener: ((e: FocusEvent) => void) | null = null;
    private previousFocusedElement: HTMLElement | null = null;

    constructor(options: GeaA11yOptions = {}) {
        super();
        this.options = {
            trapFocus: options.trapFocus ?? false,
            autoFocus: options.autoFocus ?? true,
            restoreFocus: options.restoreFocus ?? true,
            onEscape: options.onEscape
        };
    }

    public init(element: HTMLElement) {
        this.rootElement = element;

        if (this.options.trapFocus) {
            this.activateTrap();
        }
    }

    public announce(message: string, politeness: 'polite' | 'assertive' = 'polite') {
        this.srPoliteness = politeness;
        this.srMessage = message;

        const region = getLiveRegion(politeness);
        
        
        region.textContent = '';
        setTimeout(() => {
            region.textContent = message;
        }, 50);
    }

    public activateTrap() {
        if (!this.rootElement || this.isTrapped) return;

        if (this.options.restoreFocus) {
            this.previousFocusedElement = document.activeElement as HTMLElement;
        }

        this.isTrapped = true;

        
        if (!trapStack.includes(this)) {
            trapStack.push(this);
        }

        if (this.options.autoFocus) {
            this.focusFirstElement();
        }

        this.setupEventListeners();
    }

    public deactivateTrap() {
        if (!this.isTrapped) return;

        this.isTrapped = false;

        
        const index = trapStack.indexOf(this);
        if (index !== -1) {
            trapStack.splice(index, 1);
        }

        this.removeEventListeners();

        if (this.options.restoreFocus && this.previousFocusedElement) {
            this.previousFocusedElement.focus();
            this.previousFocusedElement = null;
        }
    }

    private setupEventListeners() {
        if (this.keydownListener || !this.rootElement) return;

        const isTopTrap = () => trapStack[trapStack.length - 1] === this;

        
        this.keydownListener = (e: KeyboardEvent) => {
            
            if (!this.isTrapped || !isTopTrap()) return;

            
            if (e.key === 'Escape' || e.key === 'Esc') {
                if (this.options.onEscape) {
                    this.options.onEscape(e);
                }
                return;
            }

            if (e.key !== 'Tab') return;

            const focusables = this.getFocusableElements();
            if (focusables.length === 0) {
                e.preventDefault();
                return;
            }

            const first = focusables[0];
            const last = focusables[focusables.length - 1];
            const active = document.activeElement;

            if (e.shiftKey && active === first) {
                last.focus();
                e.preventDefault();
            } else if (!e.shiftKey && active === last) {
                first.focus();
                e.preventDefault();
            }
        };

        
        this.focusinListener = (e: FocusEvent) => {
            if (!this.isTrapped || !isTopTrap() || !this.rootElement) return;

            const target = e.target as Node | null;
            if (target && !this.rootElement.contains(target)) {
                this.focusFirstElement();
            }
        };

        document.addEventListener('keydown', this.keydownListener, true);
        document.addEventListener('focusin', this.focusinListener, true);
    }

    private removeEventListeners() {
        if (this.keydownListener) {
            document.removeEventListener('keydown', this.keydownListener, true);
            this.keydownListener = null;
        }
        if (this.focusinListener) {
            document.removeEventListener('focusin', this.focusinListener, true);
            this.focusinListener = null;
        }
    }

    private getFocusableElements(): HTMLElement[] {
        if (!this.rootElement) return [];
        const selector = 'a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), iframe, object, embed, [tabindex]:not([tabindex="-1"]), [contenteditable]';
        return Array.from(this.rootElement.querySelectorAll<HTMLElement>(selector))
            .filter(el => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length));
    }

    private focusFirstElement() {
        const focusable = this.getFocusableElements();
        if (focusable.length > 0) {
            focusable[0].focus();
        } else if (this.rootElement) {
            this.rootElement.setAttribute('tabindex', '-1');
            this.rootElement.focus();
        }
    }

    public destroy() {
        this.deactivateTrap();
        this.rootElement = null;
    }
}

export function withA11y<T extends new (...args: any) => any>(Base: T) {
    return class extends Base {
        _managedA11yInstances: GeaA11y[] = [];

        createA11y(options?: GeaA11yOptions): GeaA11y {
            const a11y = new GeaA11y(options);
            this._managedA11yInstances.push(a11y);
            return a11y;
        }

        dispose() {
            this._managedA11yInstances.forEach(instance => instance.destroy());
            this._managedA11yInstances = [];

            if ('prototype' in Base && typeof (Base.prototype as any).dispose === 'function') {
                super.dispose();
            } else if (typeof super.dispose === 'function') {
                super.dispose();
            }
        }
    };
}

export function _clearA11yGlobalState() {
    while (trapStack.length > 0) {
        const trap = trapStack.pop();
        if (trap) {
            trap.deactivateTrap();
        }
    }

    if (politeLiveRegion && document.body.contains(politeLiveRegion)) {
        document.body.removeChild(politeLiveRegion);
        politeLiveRegion = null;
    }
    if (assertiveLiveRegion && document.body.contains(assertiveLiveRegion)) {
        document.body.removeChild(assertiveLiveRegion);
        assertiveLiveRegion = null;
    }
}