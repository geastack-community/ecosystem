cmake_minimum_required(VERSION 3.15)
project(geastack_webview_linux CXX)

set(CMAKE_CXX_STANDARD 17)

if (UNIX AND NOT APPLE)
    find_package(PkgConfig REQUIRED)
    pkg_check_modules(WEBKIT2GTK REQUIRED webkit2gtk-4.0)

    add_library(geastack_webview_linux SHARED
        geastack_webview_linux.cpp
    )

    target_include_directories(geastack_webview_linux PRIVATE
        ${WEBKIT2GTK_INCLUDE_DIRS}
    )

    target_link_libraries(geastack_webview_linux PRIVATE
        ${WEBKIT2GTK_LIBRARIES}
    )
endif()