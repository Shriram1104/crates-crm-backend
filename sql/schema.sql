CREATE DATABASE IF NOT EXISTS crates_crm CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE crates_crm;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(150) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  mobile_number VARCHAR(30) NULL,
  role ENUM('admin', 'team_member') NOT NULL DEFAULT 'team_member',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS login_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  login_at DATETIME NOT NULL,
  logout_at DATETIME NULL,
  is_success TINYINT(1) NOT NULL DEFAULT 1,
  ip_address VARCHAR(80) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_login_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  actor_user_id INT NULL,
  entity_type VARCHAR(80) NOT NULL,
  entity_id VARCHAR(80) NOT NULL,
  action_name VARCHAR(100) NOT NULL,
  details_json JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_audit_user FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS config_values (
  id INT AUTO_INCREMENT PRIMARY KEY,
  config_key VARCHAR(150) NOT NULL UNIQUE,
  config_label VARCHAR(190) NOT NULL,
  config_value JSON NOT NULL,
  value_type ENUM('string', 'number', 'boolean', 'json') NOT NULL DEFAULT 'string',
  category_name VARCHAR(100) NOT NULL DEFAULT 'general',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS quotes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  quote_number VARCHAR(60) NOT NULL UNIQUE,
  customer_name VARCHAR(190) NOT NULL,
  sales_person VARCHAR(150) NOT NULL,
  quote_date DATE NOT NULL,
  crate_size VARCHAR(120) NOT NULL,
  remarks TEXT NULL,
  status ENUM('draft', 'generated', 'shared', 'emailed', 'archived') NOT NULL DEFAULT 'draft',
  created_by INT NOT NULL,
  updated_by INT NOT NULL,
  input_snapshot_json JSON NOT NULL,
  output_snapshot_json JSON NOT NULL,
  final_total DECIMAL(14,2) NOT NULL DEFAULT 0,
  latest_file_id INT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_quote_created_by FOREIGN KEY (created_by) REFERENCES users(id),
  CONSTRAINT fk_quote_updated_by FOREIGN KEY (updated_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS quote_generated_files (
  id INT AUTO_INCREMENT PRIMARY KEY,
  quote_id INT NOT NULL,
  user_id INT NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_generated_quote FOREIGN KEY (quote_id) REFERENCES quotes(id) ON DELETE CASCADE,
  CONSTRAINT fk_generated_user FOREIGN KEY (user_id) REFERENCES users(id)
);

ALTER TABLE quotes
  ADD CONSTRAINT fk_quote_latest_file FOREIGN KEY (latest_file_id) REFERENCES quote_generated_files(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS quote_share_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  quote_id INT NOT NULL,
  user_id INT NOT NULL,
  channel_name VARCHAR(80) NOT NULL,
  payload_json JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_share_quote FOREIGN KEY (quote_id) REFERENCES quotes(id) ON DELETE CASCADE,
  CONSTRAINT fk_share_user FOREIGN KEY (user_id) REFERENCES users(id)
);


CREATE TABLE IF NOT EXISTS plastic_crate_master (
  id INT AUTO_INCREMENT PRIMARY KEY,
  series_name VARCHAR(120) NULL,
  size_mm VARCHAR(120) NOT NULL UNIQUE,
  cost_per_unit DECIMAL(12,2) NOT NULL DEFAULT 0,
  discount_percent DECIMAL(8,4) NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
