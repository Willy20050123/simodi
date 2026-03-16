-- Drop unique index so plate can be reused after soft delete
DROP INDEX `vehicles_nomor-polisi_key` ON `vehicles`;

-- Add soft-delete column
ALTER TABLE `vehicles`
    ADD COLUMN `deleted_at` DATETIME(3) NULL;

-- Add supporting indexes
CREATE INDEX `vehicles_nomor-polisi_idx` ON `vehicles`(`nomor-polisi`);
CREATE INDEX `vehicles_deleted_at_idx` ON `vehicles`(`deleted_at`);
