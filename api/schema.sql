CREATE DATABASE IF NOT EXISTS `mondoflix` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `mondoflix`;

CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `watchlist` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `media_id` INT NOT NULL,
  `media_type` VARCHAR(50) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `poster_path` VARCHAR(255),
  `added_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  UNIQUE KEY `unique_user_media` (`user_id`, `media_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `user_progress` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `media_id` INT NOT NULL,
  `media_type` VARCHAR(50) NOT NULL,
  `season` INT DEFAULT NULL,
  `episode` INT DEFAULT NULL,
  `progress_seconds` INT DEFAULT 0,
  `duration_seconds` INT DEFAULT 0,
  `last_watched` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  UNIQUE KEY `unique_user_media_ep` (`user_id`, `media_id`, `season`, `episode`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `notifications` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `message` TEXT NOT NULL,
  `is_read` BOOLEAN DEFAULT FALSE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `search_history` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `media_id` INT NOT NULL,
  `item_json` TEXT NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `settings` (
  `key_name` VARCHAR(100) PRIMARY KEY,
  `value` TEXT NOT NULL,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `watch_parties` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `code` CHAR(8) NOT NULL UNIQUE,
  `host_user_id` INT NOT NULL,
  `media_id` INT NOT NULL,
  `media_type` ENUM('movie','tv') NOT NULL,
  `season` INT NULL,
  `episode` INT NULL,
  `title` VARCHAR(255) NOT NULL,
  `poster_path` VARCHAR(255),
  `is_playing` TINYINT(1) DEFAULT 0,
  `position_seconds` DECIMAL(10,2) DEFAULT 0.00,
  `state_updated_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
  `version` INT UNSIGNED DEFAULT 1,
  `is_active` TINYINT(1) DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `ended_at` TIMESTAMP NULL,
  FOREIGN KEY (`host_user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `party_members` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `party_id` INT NOT NULL,
  `user_id` INT NOT NULL,
  `joined_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `last_seen_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `left_at` TIMESTAMP NULL,
  FOREIGN KEY (`party_id`) REFERENCES `watch_parties`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  UNIQUE KEY `unique_party_user` (`party_id`, `user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `party_messages` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `party_id` INT NOT NULL,
  `user_id` INT NOT NULL,
  `kind` ENUM('chat','system','reaction') NOT NULL,
  `body` VARCHAR(500) NOT NULL,
  `created_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
  FOREIGN KEY (`party_id`) REFERENCES `watch_parties`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  INDEX `idx_party_id_id` (`party_id`, `id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Add admin role to existing users
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `role` ENUM('user','admin') DEFAULT 'user';

-- Add server tracking to Watch Parties
ALTER TABLE `watch_parties` ADD COLUMN IF NOT EXISTS `server_key` VARCHAR(32) NULL;

-- Create the new media_sources table
CREATE TABLE IF NOT EXISTS `media_sources` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `media_id` INT NOT NULL,
  `media_type` ENUM('movie','tv') NOT NULL,
  `season` INT NULL,
  `episode` INT NULL,
  `server_key` VARCHAR(32) NOT NULL,
  `source` VARCHAR(500) NOT NULL,
  `quality` ENUM('360p','480p','720p','1080p','4K') NULL,
  `language` VARCHAR(16) NULL,
  `is_active` TINYINT(1) DEFAULT 1,
  `priority` INT DEFAULT 0,
  `reports` INT DEFAULT 0,
  `added_by` INT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `unique_source` (`media_id`, `media_type`, `season`, `episode`, `server_key`, `source`),
  INDEX `idx_media` (`media_id`, `media_type`, `season`, `episode`),
  FOREIGN KEY (`added_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
