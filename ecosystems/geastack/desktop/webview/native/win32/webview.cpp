// WebView2 backend of @geastack-community/webview. Every function must be
// called on the UI thread that owns the parent window (WebView2 is STA).

#include "geastack/webview/webview.h"

#ifndef NOMINMAX
#define NOMINMAX
#endif
#include <windows.h>
#include <shlobj.h>
#include <wrl.h>

#include <cmath>
#include <cstdint>
#include <cwchar>
#include <memory>
#include <set>
#include <string>

#include "WebView2.h"

using Microsoft::WRL::Callback;
using Microsoft::WRL::ComPtr;

namespace gea::webview {
namespace {

enum class State { Creating, Ready, Failed, Closed };

struct Instance {
  HWND parent = nullptr;
  ComPtr<ICoreWebView2Controller> controller;
  ComPtr<ICoreWebView2> webview;
  State state = State::Creating;
  HWND host = nullptr;  // the "Chrome_WidgetWin_0" window WebView2 created inside `parent`
  RECT bounds{0, 0, 0, 0};
  std::wstring pendingUrl;  // a copy: the caller's string is gone by the time we are ready
  bool hasPendingUrl = false;
};

using InstancePtr = std::shared_ptr<Instance>;

// The handle table owns one heap-allocated shared_ptr per control; asynchronous
// callbacks hold their own copy, so a control closed while it is still being
// created is never touched after it is freed.
InstancePtr lookup(GeaWebView self) {
  auto *slot = static_cast<InstancePtr *>(gea::windows::handles::object(self.handle));
  return slot ? *slot : nullptr;
}

void destroySlot(void *slot) { delete static_cast<InstancePtr *>(slot); }

// WebView2 hosts each control in a child window of the parent. Remember which
// ones belong to a control so several controls in one parent are told apart.
std::set<HWND> &claimedHosts() {
  static std::set<HWND> hosts;
  return hosts;
}

HWND findHostWindow(HWND parent) {
  for (HWND child = GetWindow(parent, GW_CHILD); child; child = GetWindow(child, GW_HWNDNEXT)) {
    wchar_t name[64] = {};
    GetClassNameW(child, name, 64);
    if (std::wcscmp(name, L"Chrome_WidgetWin_0") == 0 && !claimedHosts().count(child)) return child;
  }
  return nullptr;
}

// The engine's own views are child windows of the same parent and can end up in
// front of the control, so the control is raised above its siblings.
void raise(const Instance &instance) {
  if (instance.host) SetWindowPos(instance.host, HWND_TOP, 0, 0, 0, 0, SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE);
}

LONG toPixel(double value) { return static_cast<LONG>(std::lround(value)); }

std::wstring userDataFolder() {
  wchar_t base[MAX_PATH] = {};
  DWORD length = GetEnvironmentVariableW(L"LOCALAPPDATA", base, MAX_PATH);
  std::wstring folder = (length > 0 && length < MAX_PATH) ? std::wstring(base) : std::wstring(L".");
  wchar_t module[MAX_PATH] = {};
  GetModuleFileNameW(nullptr, module, MAX_PATH);
  std::wstring exe(module);
  const std::size_t slash = exe.find_last_of(L"\\/");
  if (slash != std::wstring::npos) exe = exe.substr(slash + 1);
  const std::size_t dot = exe.find_last_of(L'.');
  if (dot != std::wstring::npos) exe = exe.substr(0, dot);
  folder += L"\\GeaStack\\WebView2\\" + exe;
  SHCreateDirectoryExW(nullptr, folder.c_str(), nullptr);
  return folder;
}

}  // namespace

double GeaWebView_create(double parentHandle) {
  HWND parent = reinterpret_cast<HWND>(static_cast<std::uintptr_t>(parentHandle));
  if (!parent || !IsWindow(parent)) return 0;

  // Already initialised by the engine in the usual case; S_FALSE and
  // RPC_E_CHANGED_MODE are both fine to ignore here.
  CoInitializeEx(nullptr, COINIT_APARTMENTTHREADED);

  auto instance = std::make_shared<Instance>();
  instance->parent = parent;
  GetClientRect(parent, &instance->bounds);

  const std::wstring dataFolder = userDataFolder();
  HRESULT started = CreateCoreWebView2EnvironmentWithOptions(
      nullptr, dataFolder.c_str(), nullptr,
      Callback<ICoreWebView2CreateCoreWebView2EnvironmentCompletedHandler>(
          [instance](HRESULT result, ICoreWebView2Environment *environment) -> HRESULT {
            if (instance->state == State::Closed) return S_OK;
            if (FAILED(result) || !environment) {
              instance->state = State::Failed;
              return S_OK;
            }
            HRESULT requested = environment->CreateCoreWebView2Controller(
                instance->parent,
                Callback<ICoreWebView2CreateCoreWebView2ControllerCompletedHandler>(
                    [instance](HRESULT result, ICoreWebView2Controller *controller) -> HRESULT {
                      if (instance->state == State::Closed) {
                        if (controller) controller->Close();
                        return S_OK;
                      }
                      if (FAILED(result) || !controller) {
                        instance->state = State::Failed;
                        return S_OK;
                      }
                      instance->controller = controller;
                      controller->get_CoreWebView2(&instance->webview);
                      instance->host = findHostWindow(instance->parent);
                      if (instance->host) claimedHosts().insert(instance->host);
                      // The parent may not have had its final size when the control was
                      // requested; without an explicit setFrame, fill what it has now.
                      if (instance->bounds.right <= instance->bounds.left || instance->bounds.bottom <= instance->bounds.top) {
                        GetClientRect(instance->parent, &instance->bounds);
                      }
                      controller->put_Bounds(instance->bounds);
                      controller->put_IsVisible(TRUE);
                      raise(*instance);
                      instance->state = State::Ready;
                      if (instance->hasPendingUrl && instance->webview) {
                        instance->webview->Navigate(instance->pendingUrl.c_str());
                        instance->hasPendingUrl = false;
                      }
                      return S_OK;
                    })
                    .Get());
            if (FAILED(requested)) instance->state = State::Failed;
            return S_OK;
          })
          .Get());
  if (FAILED(started)) return 0;

  return gea::windows::handles::retainRaw(new InstancePtr(instance), destroySlot);
}

void GeaWebView_navigate(GeaWebView self, std::string url) {
  InstancePtr instance = lookup(self);
  if (!instance) return;
  const std::wstring wide = gea::windows::text::toWide(url);
  if (instance->state == State::Ready && instance->webview) {
    instance->webview->Navigate(wide.c_str());
  } else if (instance->state == State::Creating) {
    instance->pendingUrl = wide;
    instance->hasPendingUrl = true;
  }
}

void GeaWebView_setFrame(GeaWebView self, double x, double y, double width, double height) {
  InstancePtr instance = lookup(self);
  if (!instance || instance->state == State::Closed) return;
  instance->bounds = RECT{toPixel(x), toPixel(y), toPixel(x + width), toPixel(y + height)};
  if (instance->state == State::Ready && instance->controller) {
    instance->controller->put_Bounds(instance->bounds);
    raise(*instance);
  }
}

void GeaWebView_destroy(GeaWebView self) {
  InstancePtr instance = lookup(self);
  if (!instance) return;
  instance->state = State::Closed;
  if (instance->host) claimedHosts().erase(instance->host);
  if (instance->controller) instance->controller->Close();
  instance->webview.Reset();
  instance->controller.Reset();
  gea::windows::handles::release(self.handle);
}

}  // namespace gea::webview
