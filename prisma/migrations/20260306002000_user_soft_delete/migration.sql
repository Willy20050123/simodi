-- Drop unique index so NIP can be reused after soft delete
DROP INDEX `user_nip_key` ON `user`;

-- Add soft-delete column
ALTER TABLE `user`
    ADD COLUMN `deleted_at` DATETIME(3) NULL;

-- Add supporting indexes
CREATE INDEX `user_nip_idx` ON `user`(`nip`);
CREATE INDEX `user_deleted_at_idx` ON `user`(`deleted_at`);
