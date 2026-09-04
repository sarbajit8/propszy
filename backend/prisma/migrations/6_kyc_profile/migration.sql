-- AlterTable
ALTER TABLE `user` ADD COLUMN `kycProfile` JSON NULL,
    ADD COLUMN `kycSubmittedAt` DATETIME(3) NULL;

