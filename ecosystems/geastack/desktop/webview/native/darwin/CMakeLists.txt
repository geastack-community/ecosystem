cmake_minimum_required(VERSION 3.15)
project(geastack_webview_darwin CXX OBJCXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_OBJCXX_STANDARD 17)
set(CMAKE_OBJCXX_STANDARD_REQUIRED ON)

if (APPLE)
    add_library(geastack_webview_darwin SHARED
        geastack_webview_darwin.mm
    )

    target_compile_options(geastack_webview_darwin PRIVATE -fobjc-arc)

    find_library(WEBKIT_FRAMEWORK WebKit REQUIRED)
    find_library(APPKIT_FRAMEWORK AppKit REQUIRED)

    target_link_libraries(geastack_webview_darwin PRIVATE
        ${WEBKIT_FRAMEWORK}
        ${APPKIT_FRAMEWORK}
    )
endif()
