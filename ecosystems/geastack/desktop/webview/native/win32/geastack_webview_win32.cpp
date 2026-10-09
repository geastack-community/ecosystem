#include <windows.h>
#include <wrl.h>
#include <string>
#include "WebView2.h"

using namespace Microsoft::WRL;

struct WebViewInstance {
    ComPtr<ICoreWebView2Controller> controller;
    ComPtr<ICoreWebView2> webview;
};

extern "C" {

__declspec(dllexport) void* CreateWebViewWin32(HWND parentHwnd, const wchar_t* initialUrl, int width, int height) {
    auto instance = new WebViewInstance();

    CreateCoreWebView2EnvironmentWithOptions(nullptr, nullptr, nullptr,
        Callback<ICoreWebView2CreateCoreWebView2EnvironmentCompletedHandler>(
            [parentHwnd, initialUrl, width, height, instance](HRESULT result, ICoreWebView2Environment* env) -> HRESULT {
                if (FAILED(result) || !env) return result;

                env->CreateCoreWebView2Controller(parentHwnd,
                    Callback<ICoreWebView2CreateCoreWebView2ControllerCompletedHandler>(
                        [initialUrl, width, height, instance](HRESULT result, ICoreWebView2Controller* controller) -> HRESULT {
                            if (SUCCEEDED(result) && controller) {
                                instance->controller = controller;
                                instance->controller->get_CoreWebView2(&instance->webview);

                                RECT bounds = { 0, 0, width, height };
                                instance->controller->put_Bounds(bounds);
                                instance->controller->put_IsVisible(TRUE);

                                if (initialUrl) {
                                    instance->webview->Navigate(initialUrl);
                                }
                            }
                            return S_OK;
                        }).Get());
                return S_OK;
            }).Get());

    return instance;
}

__declspec(dllexport) void NavigateWebViewWin32(void* handle, const wchar_t* url) {
    auto instance = static_cast<WebViewInstance*>(handle);
    if (instance && instance->webview && url) {
        instance->webview->Navigate(url);
    }
}

__declspec(dllexport) void ResizeWebViewWin32(void* handle, int width, int height) {
    auto instance = static_cast<WebViewInstance*>(handle);
    if (instance && instance->controller) {
        RECT bounds = { 0, 0, width, height };
        instance->controller->put_Bounds(bounds);
    }
}

__declspec(dllexport) void DestroyWebViewWin32(void* handle) {
    auto instance = static_cast<WebViewInstance*>(handle);
    if (instance) {
        if (instance->controller) {
            instance->controller->Close();
        }
        delete instance;
    }
}

}