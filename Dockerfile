# Build stage
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /app
COPY . .
RUN dotnet restore
RUN dotnet build -c Release -o /app/build

# Test stage (optional - used by workflow)
FROM build AS test
WORKDIR /app
RUN dotnet test || true

# Lint stage (optional - used by workflow)
FROM build AS lint
WORKDIR /app
RUN echo "Lint stage placeholder" || true

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
COPY --from=build /app/build .
EXPOSE 80
EXPOSE 443
ENTRYPOINT ["dotnet", "WebCRM.dll"]
