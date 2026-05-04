CREATE DATABASE IF NOT EXISTS tiktok_shuffle;
USE tiktok_shuffle;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  google_id VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  avatar_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  deck JSON NOT NULL,
  current_index INT NOT NULL DEFAULT 0,
  is_complete TINYINT(1) NOT NULL DEFAULT 0,
  is_demo TINYINT(1) NOT NULL DEFAULT 0,
  file_fingerprint VARCHAR(64),
  unavailable_ids JSON,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_user (user_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Managed automatically by express-mysql-session
CREATE TABLE IF NOT EXISTS express_sessions (
  session_id VARCHAR(128) NOT NULL PRIMARY KEY,
  expires INT UNSIGNED NOT NULL,
  data MEDIUMTEXT
);
