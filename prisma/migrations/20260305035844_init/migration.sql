-- CreateTable
CREATE TABLE `user` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nip` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `fungsi` VARCHAR(191) NOT NULL,
    `posisi` VARCHAR(191) NOT NULL,
    `passhash` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `role` ENUM('USER', 'ADMIN') NOT NULL DEFAULT 'USER',

    UNIQUE INDEX `user_nip_key`(`nip`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vehicles` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `merk` VARCHAR(191) NOT NULL,
    `tahun` INTEGER NOT NULL,
    `warna` VARCHAR(191) NOT NULL,
    `nomor-polisi` VARCHAR(191) NOT NULL,
    `dalam-perbaikan` BOOLEAN NOT NULL,

    UNIQUE INDEX `vehicles_nomor-polisi_key`(`nomor-polisi`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vehicle_usage` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `vehicle_id` INTEGER NOT NULL,
    `tujuan` VARCHAR(191) NULL,
    `keperluan` VARCHAR(191) NULL,
    `start_at` DATETIME(3) NOT NULL,
    `end_at` DATETIME(3) NULL,
    `odometer_start` INTEGER NULL,
    `odometer_end` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED', 'ACTIVE', 'COMPLETED', 'CANCELED') NOT NULL DEFAULT 'PENDING',
    `approved_by_id` INTEGER NULL,
    `approved_at` DATETIME(3) NULL,
    `rejected_at` DATETIME(3) NULL,
    `reject_reason` TEXT NULL,

    INDEX `vehicle_usage_user_id_idx`(`user_id`),
    INDEX `vehicle_usage_vehicle_id_idx`(`vehicle_id`),
    INDEX `vehicle_usage_start_at_idx`(`start_at`),
    INDEX `vehicle_usage_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notifications` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `type` ENUM('REQUEST_CREATED', 'REQUEST_APPROVED', 'REQUEST_REJECTED', 'USAGE_OVERDUE') NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `message` TEXT NULL,
    `href` VARCHAR(191) NULL,
    `read_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `notifications_user_id_idx`(`user_id`),
    INDEX `notifications_created_at_idx`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `audit_logs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `actor_id` INTEGER NULL,
    `action` ENUM('REQUEST_CREATED', 'REQUEST_APPROVED', 'REQUEST_REJECTED', 'REQUEST_CANCELED', 'USAGE_ACTIVATED', 'USAGE_COMPLETED', 'USER_CREATED', 'USER_UPDATED', 'USER_DELETED', 'USER_PASSWORD_RESET') NOT NULL,
    `entity` ENUM('VEHICLE_USAGE', 'VEHICLE', 'USER', 'NOTIFICATION') NOT NULL,
    `entity_id` INTEGER NOT NULL,
    `message` VARCHAR(191) NULL,
    `metadata` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `audit_logs_actor_id_idx`(`actor_id`),
    INDEX `audit_logs_entity_entity_id_idx`(`entity`, `entity_id`),
    INDEX `audit_logs_created_at_idx`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `vehicle_usage` ADD CONSTRAINT `vehicle_usage_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vehicle_usage` ADD CONSTRAINT `vehicle_usage_vehicle_id_fkey` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_actor_id_fkey` FOREIGN KEY (`actor_id`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
