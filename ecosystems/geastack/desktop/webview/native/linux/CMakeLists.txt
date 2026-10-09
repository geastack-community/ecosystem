cmake_minimum_required(VERSION 3.15)
project(geastack_webview_linux CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_POSITION_INDEPENDENT_CODE ON)

if (UNIX AND NOT APPLE)
    find_package(PkgConfig REQUIRED)
    pkg_check_modules(GTK3 REQUIRED gtk+-3.0)
    pkg_check_modules(X11 REQUIRED x11)
    pkg_check_modules(WEBKIT2GTK webkit2gtk-4.1)
    if (NOT WEBKIT2GTK_FOUND)
        pkg_check_modules(WEBKIT2GTK REQUIRED webkit2gtk-4.0)
    endif()

    add_library(geastack_webview_linux SHARED
        geastack_webview_linux.cpp
    )

    target_include_directories(geastack_webview_linux PRIVATE
        ${GTK3_INCLUDE_DIRS}
        ${X11_INCLUDE_DIRS}
        ${WEBKIT2GTK_INCLUDE_DIRS}
    )

    target_link_directories(geastack_webview_linux PRIVATE
        ${GTK3_LIBRARY_DIRS}
        ${X11_LIBRARY_DIRS}
        ${WEBKIT2GTK_LIBRARY_DIRS}
    )

    target_link_libraries(geastack_webview_linux PRIVATE
        ${GTK3_LIBRARIES}
        ${X11_LIBRARIES}
        ${WEBKIT2GTK_LIBRARIES}
    )
endif()
