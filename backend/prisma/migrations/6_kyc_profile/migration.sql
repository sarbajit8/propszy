-- AlterTable
ALTER TABLE `User` ADD COLUMN `kycProfile` JSON NULL,
    ADD COLUMN `kycSubmittedAt` DATETIME(3) NULL;

