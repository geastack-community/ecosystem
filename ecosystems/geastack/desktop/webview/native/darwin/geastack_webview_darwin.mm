#import <AppKit/AppKit.h>
#import <WebKit/WebKit.h>
#include <dispatch/dispatch.h>

#define GEASTACK_EXPORT extern "C" __attribute__((visibility("default")))

namespace {

struct WebViewInstance {
    WKWebView* __strong webView = nil;
};

// AppKit objects must only be touched from the main thread.
template <typename Fn>
void RunOnMain(Fn&& fn) {
    if ([NSThread isMainThread]) {
        fn();
    } else {
        dispatch_sync(dispatch_get_main_queue(), ^{ fn(); });
    }
}

// parentHandle == nullptr -> use the host app's own window (key, then main,
// then the first window), because @geastack/apple does not expose a
// handle / pointer for its NSView objects.
// parentHandle != nullptr -> must be a valid NSView* supplied by the host.
NSView* ResolveParent(void* parentHandle) {
    if (parentHandle) {
        NSView* view = (__bridge NSView*)parentHandle;
        return [view isKindOfClass:[NSView class]] ? view : nil;
    }
    NSWindow* window = NSApp.keyWindow ?: NSApp.mainWindow ?: NSApp.windows.firstObject;
    return window.contentView;
}

// Public coordinates use a top-left origin (same as Win32 / the DOM).
// AppKit views are bottom-left unless the parent is flipped.
NSRect ToCocoaRect(NSView* parent, int x, int y, int width, int height) {
    CGFloat cocoaY = parent.isFlipped
        ? static_cast<CGFloat>(y)
        : parent.bounds.size.height - static_cast<CGFloat>(y) - static_cast<CGFloat>(height);
    return NSMakeRect(x, cocoaY, width, height);
}

void LoadUrl(WKWebView* webView, const char* url) {
    if (!webView || !url) return;
    NSString* urlString = [NSString stringWithUTF8String:url];
    NSURL* nsUrl = urlString ? [NSURL URLWithString:urlString] : nil;
    if (!nsUrl) return;
    [webView loadRequest:[NSURLRequest requestWithURL:nsUrl]];
}

} // namespace

GEASTACK_EXPORT void* CreateWebViewDarwin(void* parentHandle, const char* initialUrl,
                                          int x, int y, int width, int height) {
    auto* instance = new WebViewInstance();

    RunOnMain([&] {
        NSView* parent = ResolveParent(parentHandle);
        if (!parent) return;

        WKWebViewConfiguration* config = [[WKWebViewConfiguration alloc] init];
        WKWebView* webView = [[WKWebView alloc] initWithFrame:ToCocoaRect(parent, x, y, width, height)
                                                configuration:config];
        [parent addSubview:webView];
        instance->webView = webView;
        LoadUrl(webView, initialUrl);
    });

    if (!instance->webView) {
        delete instance;
        return nullptr;
    }
    return instance;
}

GEASTACK_EXPORT void NavigateWebViewDarwin(void* handle, const char* url) {
    auto* instance = static_cast<WebViewInstance*>(handle);
    if (!instance || !url) return;
    RunOnMain([&] { LoadUrl(instance->webView, url); });
}

GEASTACK_EXPORT void SetFrameWebViewDarwin(void* handle, int x, int y, int width, int height) {
    auto* instance = static_cast<WebViewInstance*>(handle);
    if (!instance) return;
    RunOnMain([&] {
        WKWebView* webView = instance->webView;
        NSView* parent = webView.superview;
        if (!webView || !parent) return;
        webView.frame = ToCocoaRect(parent, x, y, width, height);
    });
}

GEASTACK_EXPORT void DestroyWebViewDarwin(void* handle) {
    auto* instance = static_cast<WebViewInstance*>(handle);
    if (!instance) return;
    RunOnMain([&] {
        if (instance->webView) {
            [instance->webView stopLoading];
            [instance->webView removeFromSuperview];
            instance->webView = nil;
        }
    });
    delete instance;
}
