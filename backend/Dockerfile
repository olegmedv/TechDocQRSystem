FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app
EXPOSE 80

# Install Tesseract OCR
RUN apt-get update && apt-get install -y \
    tesseract-ocr \
    tesseract-ocr-eng \
    tesseract-ocr-rus \
    libc6-dev \
    && rm -rf /var/lib/apt/lists/*

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY ["TechDocQRSystem.Api.csproj", "."]
RUN dotnet restore "TechDocQRSystem.Api.csproj"
COPY . .
WORKDIR "/src"
RUN dotnet build "TechDocQRSystem.Api.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "TechDocQRSystem.Api.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .

# Create tessdata directory and copy language files
RUN mkdir -p ./tessdata
COPY --from=build /usr/share/tesseract-ocr/4.00/tessdata/eng.traineddata ./tessdata/
COPY --from=build /usr/share/tesseract-ocr/4.00/tessdata/rus.traineddata ./tessdata/

# Create uploads directory
RUN mkdir -p /app/uploads
RUN chmod 755 /app/uploads

ENTRYPOINT ["dotnet", "TechDocQRSystem.Api.dll"]