-- Syfer Password Manager — Database Schema
-- Run this file in phpMyAdmin to set up the password_manager database

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";
SET NAMES utf8mb4;

-- --------------------------------------------------------
-- Table: users
-- Stores one row per registered account
-- master_password_hash holds the bcrypt hash — the plain text password is never saved
-- --------------------------------------------------------

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `username` varchar(50) NOT NULL,
  `email` varchar(100) NOT NULL,
  `master_password_hash` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------
-- Table: vault_entries
-- Stores one row per saved password
-- encrypted_password holds the AES-256 encrypted value
-- iv is the initialization vector needed to decrypt it
-- user_id links each entry back to its owner in the users table
-- --------------------------------------------------------

CREATE TABLE `vault_entries` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `site_name` varchar(100) DEFAULT NULL,
  `site_username` varchar(100) DEFAULT NULL,
  `encrypted_password` text DEFAULT NULL,
  `iv` varchar(255) DEFAULT NULL,
  `category` varchar(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Primary keys and unique constraints for users
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`),
  ADD UNIQUE KEY `email` (`email`);

-- Primary key and index on user_id for fast vault lookups
ALTER TABLE `vault_entries`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

-- Auto-increment IDs so each new row gets a unique number automatically
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

ALTER TABLE `vault_entries`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

-- Foreign key: if a user is deleted, all their vault entries are deleted too
ALTER TABLE `vault_entries`
  ADD CONSTRAINT `vault_entries_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

COMMIT;
