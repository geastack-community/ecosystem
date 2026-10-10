#pragma once
// The C++ contract between generated programs and native/win32/webview.cpp.
//
// A GeaWebView carries a handle-table key (not an HWND) as a double, the same
// layout as the wrapper structs of @geastack/windows, so a generated program
// can store, pass and box it like any other value.

#include <string>

// Handle table (gea::windows::handles) and the gea_cpp_value forward
// declaration, written beside every Windows-native program.
#include "gea/windows/native_bridge.h"

namespace gea::webview {

struct GeaWebView {
  double handle = 0;
  GeaWebView() = default;
  explicit GeaWebView(double rawHandle) : handle(rawHandle) {}
  template <typename __GeaValue = gea_cpp_value> __GeaValue __gea_to_value() const { return __GeaValue(static_cast<double>(handle)); }
  explicit operator bool() const { return handle != 0; }
};

// Returns 0 when `parentHandle` is not a window. Creation of the control itself
// is asynchronous; calls made before it is ready are remembered and applied.
double GeaWebView_create(double parentHandle);
void GeaWebView_navigate(GeaWebView self, std::string url);
void GeaWebView_setFrame(GeaWebView self, double x, double y, double width, double height);
void GeaWebView_destroy(GeaWebView self);

}  // namespace gea::webview
