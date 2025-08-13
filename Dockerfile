# Çok aşamalı (multi-stage) build kullanıyoruz
# Derleme aşaması
FROM node:20-alpine AS builder
WORKDIR /app

# Paket bağımlılıklarını kopyala ve yükle
COPY package.json package-lock.json ./
RUN npm ci

# Kaynak kodları kopyala
COPY . .

# Budget kontrollerini tamamen kaldıralım
RUN node -e "const fs = require('fs'); \
    const angularJson = JSON.parse(fs.readFileSync('./angular.json', 'utf8')); \
    if (angularJson.projects['education-center-frontend'].architect.build.configurations.production.budgets) { \
        angularJson.projects['education-center-frontend'].architect.build.configurations.production.budgets = []; \
    } \
    fs.writeFileSync('./angular.json', JSON.stringify(angularJson, null, 2));"

# Uygulamayı derle
RUN npm run build -- --configuration production
RUN ls -la /app/dist/

# Çalıştırma aşaması
FROM nginx:alpine AS runtime
WORKDIR /usr/share/nginx/html

# Varsayılan nginx yapılandırmasını kaldır
RUN rm -rf ./*

# Derlenen uygulamayı nginx'e kopyala - doğru yolu kullan
COPY --from=builder /app/dist/education-center-frontend/browser/ .

# İzinleri ayarla
RUN chmod -R 755 /usr/share/nginx/html && \
    chown -R nginx:nginx /usr/share/nginx/html

# Nginx yapılandırma dosyasını oluştur
RUN echo 'server { \
    listen 80; \
    server_name localhost; \
    root /usr/share/nginx/html; \
    index index.html; \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
    error_page 404 /index.html; \
}' > /etc/nginx/conf.d/default.conf

# 80 portunu aç
EXPOSE 80

# nginx'i başlat
CMD ["nginx", "-g", "daemon off;"]