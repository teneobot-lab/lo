
CREATE DATABASE IF NOT EXISTS nexus_wms;
USE nexus_wms;

-- Users Table
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(50) PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inventory Items Table
CREATE TABLE IF NOT EXISTS items (
  id VARCHAR(50) PRIMARY KEY,
  sku VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100),
  price DECIMAL(15, 2) DEFAULT 0,
  location VARCHAR(50),
  unit VARCHAR(20),
  stock INT DEFAULT 0,
  min_level INT DEFAULT 0,
  active BOOLEAN DEFAULT TRUE,
  image_url TEXT,
  -- Multi-unit fields
  unit2 VARCHAR(20),
  ratio2 DECIMAL(10, 4),
  op2 VARCHAR(10),
  unit3 VARCHAR(20),
  ratio3 DECIMAL(10, 4),
  op3 VARCHAR(10),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Transactions Header
CREATE TABLE IF NOT EXISTS transactions (
  id VARCHAR(50) PRIMARY KEY,
  type VARCHAR(20) NOT NULL, -- 'inbound' or 'outbound'
  date DATETIME NOT NULL,
  total_value DECIMAL(15, 2) NOT NULL,
  user_id VARCHAR(50),
  supplier VARCHAR(100),
  po_number VARCHAR(50),
  delivery_note VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Transaction Detail Items
CREATE TABLE IF NOT EXISTS transaction_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  transaction_id VARCHAR(50) NOT NULL,
  item_id VARCHAR(50) NOT NULL,
  sku VARCHAR(50),
  name VARCHAR(255),
  qty INT NOT NULL, -- Quantity in Base Unit
  uom VARCHAR(20),
  unit_price DECIMAL(15, 2),
  total DECIMAL(15, 2),
  FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE
);

-- Reject Module: Master Data
CREATE TABLE IF NOT EXISTS reject_master (
  id VARCHAR(50) PRIMARY KEY,
  sku VARCHAR(50),
  name VARCHAR(255),
  base_unit VARCHAR(20),
  unit2 VARCHAR(20),
  ratio2 DECIMAL(10, 4),
  op2 VARCHAR(10),
  unit3 VARCHAR(20),
  ratio3 DECIMAL(10, 4),
  op3 VARCHAR(10),
  last_updated DATETIME
);

-- Reject Module: Logs
CREATE TABLE IF NOT EXISTS reject_logs (
  id VARCHAR(50) PRIMARY KEY,
  date DATE,
  notes TEXT,
  timestamp DATETIME,
  items_json JSON -- Storing detail items as JSON for flexibility in this specific module
);

-- Seed Initial Admin User (Password: admin / 12345)
-- Hash: 5994471abb01112afcc18159f6cc74b4f511b99806da59b3caf5a9c173cacfc5
INSERT IGNORE INTO users (id, username, password_hash, role, name) 
VALUES ('admin', 'admin', '5994471abb01112afcc18159f6cc74b4f511b99806da59b3caf5a9c173cacfc5', 'admin', 'Super Admin');

-- Seed Initial Staff User (Password: staff / 12345)
INSERT IGNORE INTO users (id, username, password_hash, role, name) 
VALUES ('staff', 'staff', '5994471abb01112afcc18159f6cc74b4f511b99806da59b3caf5a9c173cacfc5', 'staff', 'Warehouse Staff');
