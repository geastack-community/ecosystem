import { ComponentConstructor, CreatorName, Disposable, MixinConstructor } from '@geastack-community/utils';

function nativeOnly(name: string): never {
    throw new Error(
        `@geastack-community/webview ${name} is native-only and must be lowered by @geastack-community/webview/geatsc-plugin.`,
    );
}

/**
 * A web view (WebView2 on Windows, WKWebView on macOS) hosted inside a window of a Gea app.
 *
 * Native handle: the compiler lowers every use through `@geastack-community/webview/geatsc-plugin`,
 * so the bodies below only run (and throw) when the code is not compiled natively.
 */
export class GeaWebView {
    /**
     * @param parentHandle `0`: the app's own window, on every platform. A non-zero value hosts the
     * control in a specific view: on Windows the HWND of a window such as a `WinView`'s `handle`
     * (from `@geastack/windows/Controls`), on macOS an `NSView*`.
     */
    constructor(parentHandle: number) {
        nativeOnly('new GeaWebView');
    }
    /** Navigates to `url`. A call made while the control is still being created is applied once it is ready. */
    navigate(url: string): void {
        return nativeOnly('GeaWebView.navigate');
    }
    /** Positions the control inside its parent's client area, in the parent's pixels. */
    setFrame(x: number, y: number, width: number, height: number): void {
        return nativeOnly('GeaWebView.setFrame');
    }
    /** Closes the control. Safe to call more than once. */
    destroy(): void {
        return nativeOnly('GeaWebView.destroy');
    }
}

export interface GeaWebViewOptions {
    /**
     * `0` (the default) means "the app's own window" on every platform; the native backends resolve it,
     * so callers never branch on the platform. Pass a non-zero value only to host the control in a
     * specific child view.
     */
    parentHandle?: number;
    /** Navigated to as soon as the control is created. */
    url?: string;
    /** Initial position in the parent's pixels. When omitted the control fills its parent. */
    frame?: { x: number; y: number; width: number; height: number };
}

const creator = 'createWebView';

export type WithWebViewMixin<K extends string = typeof creator> = {
    [P in CreatorName<K, typeof creator>]: (
        options?: GeaWebViewOptions
    ) => GeaWebView;
} & Disposable;

/** @internal */
export const managedWebViews = Symbol("managedWebViews");

export function withWebView<
    TBase extends ComponentConstructor,
    K extends string = typeof creator
>(
    Base: TBase,
    creatorName: K = creator as K
) {
    const Derived = class extends Base implements Disposable {
        /** @internal */
        [managedWebViews]: GeaWebView[] = [];

        [creatorName](options?: GeaWebViewOptions): GeaWebView {
            const webView = new GeaWebView(options?.parentHandle ?? 0);
            if (options?.frame) {
                webView.setFrame(options.frame.x, options.frame.y, options.frame.width, options.frame.height);
            }
            if (options?.url) {
                webView.navigate(options.url);
            }
            this[managedWebViews].push(webView);
            return webView;
        }

        dispose() {
            this[managedWebViews].forEach(webView => webView.destroy());
            this[managedWebViews] = [];

            super.dispose();
        }
    };

    return Derived as unknown as MixinConstructor<TBase, WithWebViewMixin<K>>;
}
