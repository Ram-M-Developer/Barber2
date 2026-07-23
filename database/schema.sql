-- =============================================
-- BarberEase – Database Schema (Reference Only)
-- =============================================
-- This file is for documentation purposes.
-- Sequelize ORM auto-creates tables from models.
-- To use this manually:
--   1. Create the database first
--   2. Run this script in MySQL
-- =============================================

CREATE DATABASE IF NOT EXISTS barberease_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE barberease_db;

-- ─── Admins Table ────────────────────────────
CREATE TABLE IF NOT EXISTS admins (
  id            INT           AUTO_INCREMENT PRIMARY KEY,
  username      VARCHAR(50)   NOT NULL UNIQUE,
  email         VARCHAR(100)  NOT NULL UNIQUE,
  password      VARCHAR(255)  NOT NULL,
  full_name     VARCHAR(100)  NOT NULL,
  role          ENUM('super_admin', 'admin') NOT NULL DEFAULT 'admin',
  is_active     BOOLEAN       NOT NULL DEFAULT TRUE,
  last_login    DATETIME      NULL,
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_admin_email (email),
  INDEX idx_admin_username (username)
) ENGINE=InnoDB;

-- ─── Customers Table ─────────────────────────
CREATE TABLE IF NOT EXISTS customers (
  id            INT           AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(100)  NOT NULL,
  email         VARCHAR(100)  NOT NULL UNIQUE,
  phone         VARCHAR(20)   NOT NULL,
  password      VARCHAR(255)  NOT NULL,
  address       TEXT          NULL,
  gender        ENUM('male', 'female', 'other') NULL,
  is_active     BOOLEAN       NOT NULL DEFAULT TRUE,
  last_login    DATETIME      NULL,
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_customer_email (email),
  INDEX idx_customer_phone (phone)
) ENGINE=InnoDB;

-- ─── Services Table ──────────────────────────
CREATE TABLE IF NOT EXISTS services (
  id                INT           AUTO_INCREMENT PRIMARY KEY,
  name              VARCHAR(100)  NOT NULL,
  description       TEXT          NULL,
  duration_minutes  INT           NOT NULL DEFAULT 30,
  price             DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  category          VARCHAR(50)   NULL DEFAULT 'general',
  is_active         BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_service_category (category),
  INDEX idx_service_active (is_active)
) ENGINE=InnoDB;

-- ─── Chairs Table ────────────────────────────
CREATE TABLE IF NOT EXISTS chairs (
  id            INT           AUTO_INCREMENT PRIMARY KEY,
  chair_number  INT           NOT NULL UNIQUE,
  name          VARCHAR(50)   NULL,
  status        ENUM('available', 'reserved', 'occupied', 'maintenance') NOT NULL DEFAULT 'available',
  is_active     BOOLEAN       NOT NULL DEFAULT TRUE,
  reserved_at   DATETIME      NULL,
  reserved_by   INT           NULL,
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_chair_status (status),
  INDEX idx_chair_number (chair_number),
  FOREIGN KEY (reserved_by) REFERENCES customers(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ─── Appointments Table ──────────────────────
CREATE TABLE IF NOT EXISTS appointments (
  id                INT           AUTO_INCREMENT PRIMARY KEY,
  customer_id       INT           NOT NULL,
  service_id        INT           NOT NULL,
  chair_id          INT           NULL,
  token_number      VARCHAR(20)   NOT NULL,
  appointment_date  DATE          NOT NULL,
  time_slot         VARCHAR(20)   NOT NULL,
  status            ENUM('pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show') NOT NULL DEFAULT 'pending',
  notes             TEXT          NULL,
  started_at        DATETIME      NULL,
  completed_at      DATETIME      NULL,
  created_at        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_appt_customer (customer_id),
  INDEX idx_appt_date (appointment_date),
  INDEX idx_appt_status (status),
  INDEX idx_appt_token (token_number),
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  FOREIGN KEY (service_id)  REFERENCES services(id)  ON DELETE CASCADE,
  FOREIGN KEY (chair_id)    REFERENCES chairs(id)    ON DELETE SET NULL
) ENGINE=InnoDB;

-- ─── Queue Table ─────────────────────────────
CREATE TABLE IF NOT EXISTS queues (
  id                    INT           AUTO_INCREMENT PRIMARY KEY,
  customer_id           INT           NOT NULL,
  service_id            INT           NOT NULL,
  token_number          VARCHAR(20)   NOT NULL,
  position              INT           NOT NULL DEFAULT 0,
  status                ENUM('waiting', 'called', 'serving', 'completed', 'cancelled') NOT NULL DEFAULT 'waiting',
  estimated_wait_minutes INT          NOT NULL DEFAULT 0,
  called_at             DATETIME      NULL,
  served_at             DATETIME      NULL,
  completed_at          DATETIME      NULL,
  created_at            DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_queue_customer (customer_id),
  INDEX idx_queue_status (status),
  INDEX idx_queue_position (position),
  INDEX idx_queue_token (token_number),
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  FOREIGN KEY (service_id)  REFERENCES services(id)  ON DELETE CASCADE
) ENGINE=InnoDB;

-- ─── Tokens Table ────────────────────────────
CREATE TABLE IF NOT EXISTS tokens (
  id              INT           AUTO_INCREMENT PRIMARY KEY,
  token_number    VARCHAR(20)   NOT NULL,
  customer_id     INT           NOT NULL,
  appointment_id  INT           NULL,
  queue_id        INT           NULL,
  type            ENUM('appointment', 'queue') NOT NULL DEFAULT 'appointment',
  token_date      DATE          NOT NULL,
  status          ENUM('active', 'used', 'expired', 'cancelled') NOT NULL DEFAULT 'active',
  created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_token_number (token_number),
  INDEX idx_token_customer (customer_id),
  INDEX idx_token_date (token_date),
  INDEX idx_token_status (status),
  FOREIGN KEY (customer_id)    REFERENCES customers(id)    ON DELETE CASCADE,
  FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL,
  FOREIGN KEY (queue_id)       REFERENCES queues(id)       ON DELETE SET NULL
) ENGINE=InnoDB;
