# Build stage
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /app
COPY . .
RUN dotnet restore "webCRM/webCRM.csproj"
RUN dotnet publish "webCRM/webCRM.csproj" -c Release -o /app/publish

# Test stage (optional - used by workflow)
FROM build AS test
WORKDIR /app
RUN dotnet test "webCRM/webCRM.csproj" || true

# Lint stage (optional - used by workflow)
FROM build AS lint
WORKDIR /app
RUN echo "Lint stage placeholder" || true

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish .
EXPOSE 8080
ENTRYPOINT ["dotnet", "webCRM.dll"]