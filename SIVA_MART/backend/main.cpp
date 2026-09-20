#include <drogon/drogon.h>

using namespace drogon;

int main()
{
    // Load PostgreSQL configuration
    app().loadConfigFile("config/config.json");

    // Get PostgreSQL client
    auto dbClient = app().getDbClient();

    // Test PostgreSQL connection
    dbClient->execSqlAsync(
        "SELECT 1",
        [](const orm::Result &result)
        {
            LOG_INFO << "====================================";
            LOG_INFO << "PostgreSQL connection SUCCESS!";
            LOG_INFO << "Database test result: "
                     << result[0][0].as<int>();
            LOG_INFO << "====================================";
        },
        [](const orm::DrogonDbException &error)
        {
            LOG_ERROR << "====================================";
            LOG_ERROR << "PostgreSQL connection FAILED!";
            LOG_ERROR << error.base().what();
            LOG_ERROR << "====================================";
        }
    );

    // Health check API
    app().registerHandler(
        "/api/health",
        [](const HttpRequestPtr &,
           std::function<void(const HttpResponsePtr &)> &&callback)
        {
            Json::Value response;

            response["status"] = "ok";
            response["message"] =
                "Siva_Mart C++ backend is running";

            auto resp =
                HttpResponse::newHttpJsonResponse(response);

            callback(resp);
        },
        {Get}
    );

    // Start server
    app().addListener("0.0.0.0", 8080);

    LOG_INFO << "====================================";
    LOG_INFO << "SIVA_MART backend starting...";
    LOG_INFO << "Server: http://localhost:8080";
    LOG_INFO << "Health: http://localhost:8080/api/health";
    LOG_INFO << "====================================";

    app().run();

    return 0;
} 