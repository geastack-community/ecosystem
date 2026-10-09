cmake_minimum_required(VERSION 3.15)
project(geastack_webview_win32 CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

if (WIN32)
    add_library(geastack_webview_win32 SHARED
        geastack_webview_win32.cpp
    )

    target_link_libraries(geastack_webview_win32 PRIVATE
        user32
        dwmapi
        ole32
    )

    target_compile_definitions(geastack_webview_win32 PRIVATE GEASTACK_EXPORTS)
endif()