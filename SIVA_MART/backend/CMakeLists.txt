cmake_minimum_required(VERSION 3.20)
project(siva_mart_backend VERSION 0.1.0 LANGUAGES CXX)

# C++20 is required by the capstone brief.
set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

# Drogon is installed inside the Docker image. CMake finds its headers and library.
find_package(Drogon CONFIG REQUIRED)

add_executable(siva_mart main.cpp)
target_link_libraries(siva_mart PRIVATE Drogon::Drogon)
