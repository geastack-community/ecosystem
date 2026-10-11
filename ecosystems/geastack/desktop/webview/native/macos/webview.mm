// WKWebView backend of @geastack-community/webview for the macOS target.
//
// WebKit.framework is not on the target's link line, so it is loaded at run time
// (dlopen) and its classes are looked up by name; the headers are only used for
// declarations. Every function runs on the main thread (dispatching there when
// called from another).

#import <AppKit/AppKit.h>
#import <WebKit/WebKit.h>

#include <dispatch/dispatch.h>
#include <dlfcn.h>

#include <cstdint>
#include <mutex>
#include <string>
#include <unordered_map>

#include "../include/geastack/webview/webview.h"

namespace gea::webview {
namespace {

template <typename Fn>
void runOnMain(Fn &&fn) {
  if ([NSThread isMainThread]) {
    fn();
  } else {
    dispatch_sync(dispatch_get_main_queue(), ^{ fn(); });
  }
}

bool ensureWebKit() {
  static const bool loaded = dlopen("/System/Library/Frameworks/WebKit.framework/WebKit", RTLD_LAZY) != nullptr;
  return loaded;
}

// Handle table: one strong reference per control, keyed by the number a
// generated program carries.
std::mutex &tableMutex() {
  static std::mutex mutex;
  return mutex;
}
std::unordered_map<std::uint64_t, WKWebView *> &views() {
  static std::unordered_map<std::uint64_t, WKWebView *> table;
  return table;
}
std::uint64_t &nextHandle() {
  static std::uint64_t next = 1;
  return next;
}

WKWebView *lookup(GeaWebView self) {
  std::lock_guard<std::mutex> lock(tableMutex());
  auto found = views().find(static_cast<std::uint64_t>(self.handle));
  return found == views().end() ? nil : found->second;
}

// 0 -> the app's own window (key, then main, then the first one);
// otherwise an NSView* supplied by the host.
NSView *resolveParent(double parentHandle) {
  if (parentHandle != 0) {
    id object = (__bridge id)reinterpret_cast<void *>(static_cast<std::uintptr_t>(parentHandle));
    return [object isKindOfClass:[NSView class]] ? (NSView *)object : nil;
  }
  NSWindow *window = NSApp.keyWindow ?: NSApp.mainWindow ?: NSApp.windows.firstObject;
  return window.contentView;
}

// Public coordinates have a top-left origin; AppKit's is bottom-left unless the
// parent is flipped.
NSRect toCocoaRect(NSView *parent, double x, double y, double width, double height) {
  const CGFloat cocoaY = parent.isFlipped ? y : parent.bounds.size.height - y - height;
  return NSMakeRect(x, cocoaY, width, height);
}

// NSURL refuses characters such as spaces, quotes and angle brackets (a data:
// URL carrying markup has all of them); escape what is not allowed and keep
// the escapes and delimiters already there.
NSURL *makeURL(const std::string &text) {
  NSString *string = [NSString stringWithUTF8String:text.c_str()];
  if (!string) return nil;
  NSURL *url = [NSURL URLWithString:string];
  if (url) return url;
  NSMutableCharacterSet *allowed = [[NSCharacterSet URLQueryAllowedCharacterSet] mutableCopy];
  [allowed formUnionWithCharacterSet:[NSCharacterSet URLPathAllowedCharacterSet]];
  [allowed addCharactersInString:@":/?#[]@!$&'()*+,;=%"];
  return [NSURL URLWithString:[string stringByAddingPercentEncodingWithAllowedCharacters:allowed]];
}

}  // namespace

double GeaWebView_create(double parentHandle) {
  if (!ensureWebKit()) return 0;
  double handle = 0;
  runOnMain([&] {
    NSView *parent = resolveParent(parentHandle);
    Class configurationClass = NSClassFromString(@"WKWebViewConfiguration");
    Class viewClass = NSClassFromString(@"WKWebView");
    if (!parent || !configurationClass || !viewClass) return;

    WKWebViewConfiguration *configuration = [[configurationClass alloc] init];
    WKWebView *view = [[viewClass alloc] initWithFrame:parent.bounds configuration:configuration];
    // Fill the parent and follow it when it is resized, until setFrame places
    // the control explicitly.
    view.autoresizingMask = NSViewWidthSizable | NSViewHeightSizable;
    [parent addSubview:view positioned:NSWindowAbove relativeTo:nil];

    std::lock_guard<std::mutex> lock(tableMutex());
    handle = static_cast<double>(nextHandle()++);
    views()[static_cast<std::uint64_t>(handle)] = view;
  });
  return handle;
}

void GeaWebView_navigate(GeaWebView self, std::string url) {
  runOnMain([&] {
    WKWebView *view = lookup(self);
    NSURL *target = makeURL(url);
    if (view && target) [view loadRequest:[NSURLRequest requestWithURL:target]];
  });
}

void GeaWebView_setFrame(GeaWebView self, double x, double y, double width, double height) {
  runOnMain([&] {
    WKWebView *view = lookup(self);
    NSView *parent = view.superview;
    if (!view || !parent) return;
    view.autoresizingMask = NSViewNotSizable;
    view.frame = toCocoaRect(parent, x, y, width, height);
    [parent addSubview:view positioned:NSWindowAbove relativeTo:nil];
  });
}

void GeaWebView_destroy(GeaWebView self) {
  runOnMain([&] {
    WKWebView *view = nil;
    {
      std::lock_guard<std::mutex> lock(tableMutex());
      auto found = views().find(static_cast<std::uint64_t>(self.handle));
      if (found == views().end()) return;
      view = found->second;
      views().erase(found);
    }
    [view stopLoading];
    [view removeFromSuperview];
  });
}

}  // namespace gea::webview
