-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Waktu pembuatan: 17 Mar 2026 pada 04.26
-- Versi server: 10.4.32-MariaDB
-- Versi PHP: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `simodi`
--

-- --------------------------------------------------------

--
-- Struktur dari tabel `audit_logs`
--

CREATE TABLE `audit_logs` (
  `id` int(11) NOT NULL,
  `actor_id` int(11) DEFAULT NULL,
  `action` enum('REQUEST_CREATED','REQUEST_APPROVED','REQUEST_REJECTED','REQUEST_CANCELED','USAGE_ACTIVATED','USAGE_COMPLETED','USER_CREATED','USER_UPDATED','USER_DELETED','USER_PASSWORD_RESET') NOT NULL,
  `entity` enum('VEHICLE_USAGE','VEHICLE','USER','NOTIFICATION') NOT NULL,
  `entity_id` int(11) NOT NULL,
  `message` varchar(191) DEFAULT NULL,
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`metadata`)),
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Struktur dari tabel `notifications`
--

CREATE TABLE `notifications` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `type` enum('REQUEST_CREATED','REQUEST_APPROVED','REQUEST_REJECTED','USAGE_OVERDUE') NOT NULL,
  `title` varchar(191) NOT NULL,
  `message` text DEFAULT NULL,
  `href` varchar(191) DEFAULT NULL,
  `read_at` datetime(3) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Struktur dari tabel `user`
--

CREATE TABLE `user` (
  `id` int(11) NOT NULL,
  `nip` varchar(191) NOT NULL,
  `name` varchar(191) NOT NULL,
  `fungsi` varchar(191) NOT NULL,
  `posisi` varchar(191) NOT NULL,
  `passhash` varchar(191) NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `role` enum('USER','ADMIN') NOT NULL DEFAULT 'USER',
  `deleted_at` datetime(3) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data untuk tabel `user`
--

INSERT INTO `user` (`id`, `nip`, `name`, `fungsi`, `posisi`, `passhash`, `createdAt`, `role`, `deleted_at`) VALUES
(1, '007', 'James Bond', 'IT', 'Admin', '$2a$12$99vaBDzYg200ilDzzxf7QeAvLcXcwMzgCwa18k.ENEbLunlh7g67a', '2026-03-16 09:29:29.219', 'ADMIN', NULL);

-- --------------------------------------------------------

--
-- Struktur dari tabel `vehicles`
--

CREATE TABLE `vehicles` (
  `id` int(11) NOT NULL,
  `merk` varchar(191) NOT NULL,
  `tahun` int(11) NOT NULL,
  `warna` varchar(191) NOT NULL,
  `nomor-polisi` varchar(191) NOT NULL,
  `dalam-perbaikan` tinyint(1) NOT NULL,
  `deleted_at` datetime(3) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Struktur dari tabel `vehicle_usage`
--

CREATE TABLE `vehicle_usage` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `vehicle_id` int(11) NOT NULL,
  `tujuan` varchar(191) DEFAULT NULL,
  `keperluan` varchar(191) DEFAULT NULL,
  `start_at` datetime(3) NOT NULL,
  `end_at` datetime(3) DEFAULT NULL,
  `odometer_start` int(11) DEFAULT NULL,
  `odometer_end` int(11) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `status` enum('PENDING','APPROVED','REJECTED','ACTIVE','COMPLETED','CANCELED') NOT NULL DEFAULT 'PENDING',
  `approved_by_id` int(11) DEFAULT NULL,
  `approved_at` datetime(3) DEFAULT NULL,
  `rejected_at` datetime(3) DEFAULT NULL,
  `reject_reason` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Struktur dari tabel `_prisma_migrations`
--

CREATE TABLE `_prisma_migrations` (
  `id` varchar(36) NOT NULL,
  `checksum` varchar(64) NOT NULL,
  `finished_at` datetime(3) DEFAULT NULL,
  `migration_name` varchar(255) NOT NULL,
  `logs` text DEFAULT NULL,
  `rolled_back_at` datetime(3) DEFAULT NULL,
  `started_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `applied_steps_count` int(10) UNSIGNED NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data untuk tabel `_prisma_migrations`
--

INSERT INTO `_prisma_migrations` (`id`, `checksum`, `finished_at`, `migration_name`, `logs`, `rolled_back_at`, `started_at`, `applied_steps_count`) VALUES
('136c0982-5c2f-4c12-8b21-bb21c4fe547e', 'eee7dde64911a7fabc675e24d775658a764571430f056420ed9f5fc05d2f4c83', '2026-03-16 02:28:07.115', '20260306002000_user_soft_delete', NULL, NULL, '2026-03-16 02:28:07.059', 1),
('976bd168-c408-42ab-8a2f-ec678cf2fdbc', 'dbdb0363c7575c9e1a411e4cbcc27eb998a27393466a6476af8775713316b2f5', '2026-03-16 02:28:06.998', '20260305035844_init', NULL, NULL, '2026-03-16 02:28:06.649', 1),
('9bb4c670-541b-496b-a4b3-756a430e1981', '3874987139678c4971f56704374026ca66b24edca8da0aa098c86129e9672ba2', '2026-03-16 02:28:07.057', '20260306000000_vehicle_soft_delete', NULL, NULL, '2026-03-16 02:28:07.001', 1);

--
-- Indexes for dumped tables
--

--
-- Indeks untuk tabel `audit_logs`
--
ALTER TABLE `audit_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `audit_logs_actor_id_idx` (`actor_id`),
  ADD KEY `audit_logs_entity_entity_id_idx` (`entity`,`entity_id`),
  ADD KEY `audit_logs_created_at_idx` (`created_at`);

--
-- Indeks untuk tabel `notifications`
--
ALTER TABLE `notifications`
  ADD PRIMARY KEY (`id`),
  ADD KEY `notifications_user_id_idx` (`user_id`),
  ADD KEY `notifications_created_at_idx` (`created_at`);

--
-- Indeks untuk tabel `user`
--
ALTER TABLE `user`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_nip_idx` (`nip`),
  ADD KEY `user_deleted_at_idx` (`deleted_at`);

--
-- Indeks untuk tabel `vehicles`
--
ALTER TABLE `vehicles`
  ADD PRIMARY KEY (`id`),
  ADD KEY `vehicles_nomor-polisi_idx` (`nomor-polisi`),
  ADD KEY `vehicles_deleted_at_idx` (`deleted_at`);

--
-- Indeks untuk tabel `vehicle_usage`
--
ALTER TABLE `vehicle_usage`
  ADD PRIMARY KEY (`id`),
  ADD KEY `vehicle_usage_user_id_idx` (`user_id`),
  ADD KEY `vehicle_usage_vehicle_id_idx` (`vehicle_id`),
  ADD KEY `vehicle_usage_start_at_idx` (`start_at`),
  ADD KEY `vehicle_usage_status_idx` (`status`);

--
-- Indeks untuk tabel `_prisma_migrations`
--
ALTER TABLE `_prisma_migrations`
  ADD PRIMARY KEY (`id`);

--
-- AUTO_INCREMENT untuk tabel yang dibuang
--

--
-- AUTO_INCREMENT untuk tabel `audit_logs`
--
ALTER TABLE `audit_logs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT untuk tabel `notifications`
--
ALTER TABLE `notifications`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT untuk tabel `user`
--
ALTER TABLE `user`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT untuk tabel `vehicles`
--
ALTER TABLE `vehicles`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT untuk tabel `vehicle_usage`
--
ALTER TABLE `vehicle_usage`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- Ketidakleluasaan untuk tabel pelimpahan (Dumped Tables)
--

--
-- Ketidakleluasaan untuk tabel `audit_logs`
--
ALTER TABLE `audit_logs`
  ADD CONSTRAINT `audit_logs_actor_id_fkey` FOREIGN KEY (`actor_id`) REFERENCES `user` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Ketidakleluasaan untuk tabel `notifications`
--
ALTER TABLE `notifications`
  ADD CONSTRAINT `notifications_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON UPDATE CASCADE;

--
-- Ketidakleluasaan untuk tabel `vehicle_usage`
--
ALTER TABLE `vehicle_usage`
  ADD CONSTRAINT `vehicle_usage_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `vehicle_usage_vehicle_id_fkey` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles` (`id`) ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
