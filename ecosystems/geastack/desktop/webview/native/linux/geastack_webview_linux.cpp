// Desktop Linux (Ubuntu etc.) WebView for X11 / Xwayland hosts.
//
// The host (e.g. an SDL2 window from @geastack/linux) does not expose a toolkit
// handle, so the WebKitGTK window is reparented into the host's X11 window with
// XReparentWindow. GTK runs on its own thread, so the host's frame loop does
// not need to pump GTK events.

#include <gtk/gtk.h>
#include <gdk/gdkx.h>
#include <webkit2/webkit2.h>
#include <X11/Xatom.h>
#include <X11/Xlib.h>
#include <unistd.h>

#include <functional>

#define GEASTACK_EXPORT extern "C" __attribute__((visibility("default")))

namespace {

struct WebViewInstance {
    GtkWidget* window = nullptr;
    GtkWidget* webview = nullptr;
    Window xid = 0;
};

// ---- GTK thread -----------------------------------------------------------

GThread* g_gtkThread = nullptr;
GMutex g_initMutex;
GCond g_initCond;
bool g_initDone = false;
bool g_initOk = false;
GOnce g_once = G_ONCE_INIT;

gpointer GtkThreadMain(gpointer) {
    gdk_set_allowed_backends("x11");
    bool ok = gtk_init_check(nullptr, nullptr);
    if (ok) {
        GdkDisplay* display = gdk_display_get_default();
        ok = display && GDK_IS_X11_DISPLAY(display);
    }

    g_mutex_lock(&g_initMutex);
    g_initOk = ok;
    g_initDone = true;
    g_cond_broadcast(&g_initCond);
    g_mutex_unlock(&g_initMutex);

    if (ok) gtk_main();
    return nullptr;
}

gpointer StartGtkThread(gpointer) {
    g_gtkThread = g_thread_new("geastack-webview-gtk", GtkThreadMain, nullptr);
    g_mutex_lock(&g_initMutex);
    while (!g_initDone) g_cond_wait(&g_initCond, &g_initMutex);
    g_mutex_unlock(&g_initMutex);
    return nullptr;
}

bool EnsureGtk() {
    g_once(&g_once, StartGtkThread, nullptr);
    return g_initOk;
}

struct Task {
    std::function<void()> fn;
    GMutex mutex;
    GCond cond;
    bool done = false;
};

gboolean RunTask(gpointer data) {
    auto* task = static_cast<Task*>(data);
    task->fn();
    g_mutex_lock(&task->mutex);
    task->done = true;
    g_cond_signal(&task->cond);
    g_mutex_unlock(&task->mutex);
    return G_SOURCE_REMOVE;
}

// Runs fn on the GTK thread and waits for it to finish.
void RunOnGtk(std::function<void()> fn) {
    if (g_thread_self() == g_gtkThread) {
        fn();
        return;
    }
    Task task;
    task.fn = std::move(fn);
    g_mutex_init(&task.mutex);
    g_cond_init(&task.cond);
    g_idle_add(RunTask, &task);
    g_mutex_lock(&task.mutex);
    while (!task.done) g_cond_wait(&task.cond, &task.mutex);
    g_mutex_unlock(&task.mutex);
    g_mutex_clear(&task.mutex);
    g_cond_clear(&task.cond);
}

// ---- X11 helpers ----------------------------------------------------------

// Finds a viewable top-level window owned by this process via _NET_WM_PID.
Window FindOwnWindow(Display* display, Window window, Atom pidAtom, Window ignore, int depth) {
    Window root, parent, *children = nullptr;
    unsigned int count = 0;
    if (!XQueryTree(display, window, &root, &parent, &children, &count)) return 0;

    Window found = 0;
    for (unsigned int i = 0; i < count && !found; ++i) {
        Window candidate = children[i];
        if (candidate == ignore) continue;

        Atom actualType;
        int actualFormat;
        unsigned long items, bytesAfter;
        unsigned char* data = nullptr;
        if (XGetWindowProperty(display, candidate, pidAtom, 0, 1, False, XA_CARDINAL,
                               &actualType, &actualFormat, &items, &bytesAfter, &data) == Success
            && data) {
            bool match = items == 1 && actualFormat == 32
                && *reinterpret_cast<unsigned long*>(data) == static_cast<unsigned long>(getpid());
            XFree(data);
            if (match) {
                XWindowAttributes attrs;
                if (XGetWindowAttributes(display, candidate, &attrs) && attrs.map_state == IsViewable) {
                    found = candidate;
                    break;
                }
            }
        }
        if (depth > 0) found = FindOwnWindow(display, candidate, pidAtom, ignore, depth - 1);
    }
    if (children) XFree(children);
    return found;
}

} // namespace

// parentWindowId: X11 Window ID of the host window, or 0 to auto-detect the
// calling process's own top-level window.
GEASTACK_EXPORT void* CreateWebViewLinux(unsigned long parentWindowId, const char* initialUrl,
                                         int x, int y, int width, int height) {
    if (!EnsureGtk()) return nullptr;

    auto* instance = new WebViewInstance();
    bool ok = false;

    RunOnGtk([&] {
        GdkDisplay* gdkDisplay = gdk_display_get_default();
        Display* xdisplay = GDK_DISPLAY_XDISPLAY(gdkDisplay);

        Window parent = parentWindowId;
        if (!parent) {
            Atom pidAtom = XInternAtom(xdisplay, "_NET_WM_PID", True);
            if (pidAtom != None) {
                parent = FindOwnWindow(xdisplay, DefaultRootWindow(xdisplay), pidAtom, 0, 3);
            }
        }
        if (!parent) return;

        instance->window = gtk_window_new(GTK_WINDOW_TOPLEVEL);
        gtk_window_set_decorated(GTK_WINDOW(instance->window), FALSE);
        gtk_window_set_default_size(GTK_WINDOW(instance->window), width, height);

        instance->webview = webkit_web_view_new();
        gtk_container_add(GTK_CONTAINER(instance->window), instance->webview);

        // Realize creates the X window without mapping it, so the window
        // manager has not seen it yet and reparenting is safe.
        gtk_widget_realize(instance->window);
        instance->xid = GDK_WINDOW_XID(gtk_widget_get_window(instance->window));
        XReparentWindow(xdisplay, instance->xid, parent, x, y);
        XFlush(xdisplay);

        gtk_widget_show_all(instance->window);
        if (initialUrl) {
            webkit_web_view_load_uri(WEBKIT_WEB_VIEW(instance->webview), initialUrl);
        }
        ok = true;
    });

    if (!ok) {
        RunOnGtk([&] {
            if (instance->window) gtk_widget_destroy(instance->window);
        });
        delete instance;
        return nullptr;
    }
    return instance;
}

GEASTACK_EXPORT void NavigateWebViewLinux(void* handle, const char* url) {
    auto* instance = static_cast<WebViewInstance*>(handle);
    if (!instance || !url) return;
    RunOnGtk([&] {
        if (instance->webview) webkit_web_view_load_uri(WEBKIT_WEB_VIEW(instance->webview), url);
    });
}

GEASTACK_EXPORT void SetFrameWebViewLinux(void* handle, int x, int y, int width, int height) {
    auto* instance = static_cast<WebViewInstance*>(handle);
    if (!instance) return;
    RunOnGtk([&] {
        if (!instance->window) return;
        Display* xdisplay = GDK_DISPLAY_XDISPLAY(gdk_display_get_default());
        gtk_window_resize(GTK_WINDOW(instance->window), width, height);
        XMoveResizeWindow(xdisplay, instance->xid, x, y, width, height);
        XFlush(xdisplay);
    });
}

GEASTACK_EXPORT void DestroyWebViewLinux(void* handle) {
    auto* instance = static_cast<WebViewInstance*>(handle);
    if (!instance) return;
    RunOnGtk([&] {
        if (instance->window) {
            gtk_widget_destroy(instance->window); // also destroys the WebKitWebView
            instance->window = nullptr;
            instance->webview = nullptr;
        }
    });
    delete instance;
}
