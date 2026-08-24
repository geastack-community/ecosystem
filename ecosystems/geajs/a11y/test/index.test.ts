// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GeaA11y, _clearA11yGlobalState } from '../src/index'; 

describe('GeaA11y', () => {
    let container: HTMLElement;
    let button1: HTMLButtonElement;
    let button2: HTMLButtonElement;
    let externalButton: HTMLButtonElement;

    beforeEach(() => {
        
        container = document.createElement('div');
        button1 = document.createElement('button');
        button1.textContent = 'Button 1';
        button2 = document.createElement('button');
        button2.textContent = 'Button 2';

        externalButton = document.createElement('button');
        externalButton.textContent = 'External Button';

        container.appendChild(button1);
        container.appendChild(button2);
        document.body.appendChild(container);
        document.body.appendChild(externalButton);
    });

    afterEach(() => {
        document.body.innerHTML = '';
        vi.restoreAllMocks();
    });

    it('should initialize and trap focus automatically when trapFocus is true', () => {
        externalButton.focus();
        expect(document.activeElement).toBe(externalButton);

        const a11y = new GeaA11y({ trapFocus: true, autoFocus: true });
        a11y.init(container);

        expect(a11y.isTrapped).toBe(true);
        expect(document.activeElement).toBe(button1);

        a11y.destroy();
    });

    it('should cycle focus within the trap when Tab is pressed', () => {
        const a11y = new GeaA11y({ trapFocus: true, autoFocus: true });
        a11y.init(container);

        expect(document.activeElement).toBe(button1);

        
        button2.focus();
        expect(document.activeElement).toBe(button2);

        
        const tabEvent = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
        document.dispatchEvent(tabEvent);

        expect(document.activeElement).toBe(button1);

        a11y.destroy();
    });

    it('should restore focus to the previous element upon deactivation', () => {
        externalButton.focus();
        expect(document.activeElement).toBe(externalButton);

        const a11y = new GeaA11y({ trapFocus: true, restoreFocus: true });
        a11y.init(container);

        expect(document.activeElement).toBe(button1);

        a11y.deactivateTrap();

        expect(a11y.isTrapped).toBe(false);
        expect(document.activeElement).toBe(externalButton);

        a11y.destroy();
    });

    it('should trigger onEscape callback when Escape key is pressed', () => {
        const onEscapeMock = vi.fn();
        const a11y = new GeaA11y({ trapFocus: true, onEscape: onEscapeMock });
        a11y.init(container);

        const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
        document.dispatchEvent(escapeEvent);

        expect(onEscapeMock).toHaveBeenCalledTimes(1);

        a11y.destroy();
    });

    it('should dynamically create an aria-live region and announce messages', () => {
        const a11y = new GeaA11y();
        a11y.announce('Test announcement', 'polite');

        const liveRegion = document.querySelector('[aria-live="polite"]');
        expect(liveRegion).not.toBeNull();
        
        
        return new Promise<void>((resolve) => {
            setTimeout(() => {
                expect(liveRegion?.textContent).toBe('Test announcement');
                resolve();
            }, 60);
        });
    });
});