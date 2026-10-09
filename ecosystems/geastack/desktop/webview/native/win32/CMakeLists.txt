cmake_minimum_required(VERSION 3.15)
project(geastack_webview_win32 CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

if (WIN32)
    set(WEBVIEW2_VERSION "1.0.2903.40")

    include(FetchContent)
    FetchContent_Declare(
        webview2_nuget
        URL "https://www.nuget.org/api/v2/package/Microsoft.Web.WebView2/${WEBVIEW2_VERSION}"
        DOWNLOAD_DIR "${CMAKE_CURRENT_BINARY_DIR}/nuget"
    )

    FetchContent_MakeAvailable(webview2_nuget)

    set(WEBVIEW2_INCLUDE_DIR "${webview2_nuget_SOURCE_DIR}/build/native/include")

    if(CMAKE_SIZEOF_VOID_P EQUAL 8)
        set(WEBVIEW2_LIB_DIR "${webview2_nuget_SOURCE_DIR}/build/native/x64")
    else()
        set(WEBVIEW2_LIB_DIR "${webview2_nuget_SOURCE_DIR}/build/native/x86")
    endif()

    add_library(geastack_webview_win32 SHARED
        geastack_webview_win32.cpp
    )

    target_include_directories(geastack_webview_win32 PRIVATE
        ${WEBVIEW2_INCLUDE_DIR}
    )

    target_link_directories(geastack_webview_win32 PRIVATE
        ${WEBVIEW2_LIB_DIR}
    )

    target_link_libraries(geastack_webview_win32 PRIVATE
        WebView2Loader.dll.lib
        user32
        dwmapi
        ole32
    )

    add_custom_command(TARGET geastack_webview_win32 POST_BUILD
        COMMAND ${CMAKE_COMMAND} -E copy_if_different
        "${WEBVIEW2_LIB_DIR}/WebView2Loader.dll"
        "$<TARGET_FILE_DIR:geastack_webview_win32>"
    )
endif()