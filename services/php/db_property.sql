CREATE DATABASE IF NOT EXISTS db_property;
USE db_property;

-- Tabel properties (Data Kos Induk)
CREATE TABLE properties (
    id INT AUTO_INCREMENT PRIMARY KEY,
    owner_id INT NOT NULL, -- Merujuk ke id di db_auth.users
    name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    description TEXT,
    city VARCHAR(100),
    province VARCHAR(100),
    postal_code VARCHAR(10),
    phone_number VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_owner_id (owner_id),
    INDEX idx_city (city)
);

-- Tabel rooms (Data Kamar Kos)
CREATE TABLE rooms (
    id INT AUTO_INCREMENT PRIMARY KEY,
    property_id INT NOT NULL,
    room_number VARCHAR(50) NOT NULL,
    price_per_month DECIMAL(10, 2) NOT NULL,
    description TEXT,
    status ENUM('available', 'occupied', 'maintenance') DEFAULT 'available',
    capacity INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
    INDEX idx_property_id (property_id),
    INDEX idx_status (status),
    UNIQUE KEY unique_room (property_id, room_number)
);

-- Tabel facilities (Master Data Fasilitas)
CREATE TABLE facilities (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    icon VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabel room_facilities (Relasi Many-to-Many)
CREATE TABLE room_facilities (
    room_id INT NOT NULL,
    facility_id INT NOT NULL,
    PRIMARY KEY (room_id, facility_id),
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
    FOREIGN KEY (facility_id) REFERENCES facilities(id) ON DELETE CASCADE
);

-- Seeder dummy untuk tabel facilities
INSERT INTO facilities (name, description) VALUES 
('AC', 'Air Conditioning'),
('Kamar Mandi Dalam', 'Private Bathroom'),
('WiFi', 'Internet Connection'),
('Kasur', 'Bed'),
('Lemari Pakaian', 'Wardrobe'),
('Meja Belajar', 'Desk'),
('Lampu LED', 'LED Light'),
('Jendela Besar', 'Large Window');
