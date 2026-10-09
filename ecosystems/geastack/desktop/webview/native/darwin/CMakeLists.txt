cmake_minimum_required(VERSION 3.15)
project(geastack_webview_darwin CXX OBJCXX)

set(CMAKE_CXX_STANDARD 17)

if (APPLE)
    add_library(geastack_webview_darwin SHARED
        geastack_webview_darwin.mm
    )

    find_library(WEBKIT_FRAMEWORK WebKit REQUIRED)
    find_library(APPKIT_FRAMEWORK AppKit REQUIRED)

    target_link_libraries(geastack_webview_darwin PRIVATE
        ${WEBKIT_FRAMEWORK}
        ${APPKIT_FRAMEWORK}
    )
endif()