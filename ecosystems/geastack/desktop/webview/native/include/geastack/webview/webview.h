#pragma once
// The C++ contract between generated programs and the platform backends
// (native/win32/webview.cpp, native/macos/webview.mm).
//
// A GeaWebView carries a handle-table key (not a window or view pointer) as a
// double, the same layout as the wrapper structs of @geastack/windows and
// @geastack/apple, so a generated program can store, pass and box it like any
// other value. Plain C++ only: generated modules include this header.

#include <string>

#ifdef _WIN32
// Handle table (gea::windows::handles) and the gea_cpp_value forward
// declaration, written beside every Windows-native program.
#include "gea/windows/native_bridge.h"
#else
struct gea_cpp_value;
#endif

namespace gea::webview {

struct GeaWebView {
  double handle = 0;
  GeaWebView() = default;
  explicit GeaWebView(double rawHandle) : handle(rawHandle) {}
  template <typename __GeaValue = gea_cpp_value> __GeaValue __gea_to_value() const { return __GeaValue(static_cast<double>(handle)); }
  explicit operator bool() const { return handle != 0; }
};

// parentHandle: the HWND of the hosting window on Windows; on macOS 0 means the
// app's own window. Returns 0 on failure. Creation of the control itself may be
// asynchronous; calls made before it is ready are remembered and applied.
double GeaWebView_create(double parentHandle);
void GeaWebView_navigate(GeaWebView self, std::string url);
void GeaWebView_setFrame(GeaWebView self, double x, double y, double width, double height);
void GeaWebView_destroy(GeaWebView self);

}  // namespace gea::webview
