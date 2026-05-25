FROM php:8.1-fpm-alpine

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache \
    build-base \
    autoconf \
    icu-dev \
    icu-libs \
    oniguruma-dev \
    mysql-client \
    curl \
    git \
    zip \
    unzip \
    composer \
    bash

# Install PHP extensions
RUN docker-php-ext-install pdo pdo_mysql intl ctype mbstring

# Copy application
COPY . .

# Install composer dependencies
RUN composer install --no-dev --optimize-autoloader --ignore-platform-req=ext-intl --ignore-platform-req=ext-ctype

# Expose port
EXPOSE 3002

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3002/ || exit 1

# Start PHP server
CMD ["php", "-S", "0.0.0.0:3002", "-t", "public"]
