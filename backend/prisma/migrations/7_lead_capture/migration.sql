-- DropForeignKey
ALTER TABLE `lead` DROP FOREIGN KEY `Lead_projectId_fkey`;

-- AlterTable
ALTER TABLE `lead` ADD COLUMN `bedroomsWanted` INTEGER NULL,
    ADD COLUMN `budgetMax` DECIMAL(14, 2) NULL,
    ADD COLUMN `budgetMin` DECIMAL(14, 2) NULL,
    ADD COLUMN `guestAadhaar` VARCHAR(191) NULL,
    ADD COLUMN `guestPan` VARCHAR(191) NULL,
    ADD COLUMN `preferredArea` VARCHAR(191) NULL,
    ADD COLUMN `preferredCity` VARCHAR(191) NULL,
    ADD COLUMN `purpose` VARCHAR(191) NULL,
    ADD COLUMN `requirement` VARCHAR(191) NULL,
    MODIFY `projectId` VARCHAR(191) NULL;

-- AddForeignKey
ALTER TABLE `Lead` ADD CONSTRAINT `Lead_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

