CREATE DATABASE IF NOT EXISTS db_auth;
USE db_auth;

-- Tabel users
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NULL, -- Nullable karena login GitHub tidak pakai password lokal
    avatar_url VARCHAR(255) NULL,
    oauth_provider ENUM('local', 'github', 'google', 'facebook') DEFAULT 'local',
    oauth_id VARCHAR(255) NULL,
    role ENUM('owner', 'tenant') DEFAULT 'tenant',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabel refresh_tokens
CREATE TABLE refresh_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token TEXT NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_token (token(255))
);

-- Index untuk performa query
CREATE INDEX idx_email ON users(email);
CREATE INDEX idx_oauth ON users(oauth_provider, oauth_id);
