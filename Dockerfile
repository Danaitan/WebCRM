# Stage 1: Build (ใช้ SDK ตัวเต็มเพื่อ Compile)
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Copy เฉพาะไฟล์โปรเจกต์มา Restore ก่อน (เพื่อใช้ Layer Caching)
COPY ["webCRM.csproj", "./"]
RUN dotnet restore "./webCRM.csproj"

# Copy ไฟล์ที่เหลือทั้งหมดและ Build
COPY . .
RUN dotnet build "webCRM.csproj" -c Release -o /app/build

# Stage 2: Publish
FROM build AS publish
RUN dotnet publish "webCRM.csproj" -c Release -o /app/publish /p:UseAppHost=false

# Stage 3: Final (ใช้ Runtime ตัวจิ๋วเพื่อรันแอป)
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app
EXPOSE 5003

# เวอร์ชันแอป: คุมจากที่เดียวตรงนี้ override ได้ตอน build ด้วย
#   docker build --build-arg APP_VERSION=3.0.2 ...
# ตัว .NET จะอ่าน env var "appVersion" นี้ผ่าน Environment.GetEnvironmentVariable("appVersion") ได้ทันที
ARG APP_VERSION=3.0.1
ENV appVersion=$APP_VERSION

ENV ASPNETCORE_URLS=http://+:5003

# Copy ไฟล์ที่ผ่านการ Publish มาใส่ใน Image ตัวจริง
COPY --from=publish /app/publish .

# สั่งรันแอป (เปลี่ยน webCRM.dll เป็นชื่อไฟล์ DLL ของโปรเจกต์คุณถ้าไม่ตรง)
ENTRYPOINT ["dotnet", "webCRM.dll"]