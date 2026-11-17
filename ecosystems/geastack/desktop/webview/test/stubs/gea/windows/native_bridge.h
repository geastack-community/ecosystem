#pragma once
// A stand-in for the generated gea/windows/native_bridge.h, declaring only what
// native/win32/webview.cpp uses, so CI can compile that file without building a
// whole Gea app. The signatures are copied from @geastack/windows'
// generateWindowsNativeBridgeHeader; keep them in sync with it.

#include <string>

struct gea_cpp_value;

namespace gea::windows::handles {
void *object(double handle);
double retainRaw(void *object, void (*destroy)(void *));
void release(double handle);
}  // namespace gea::windows::handles

namespace gea::windows::text {
std::wstring toWide(const std::string &utf8);
}  // namespace gea::windows::text
