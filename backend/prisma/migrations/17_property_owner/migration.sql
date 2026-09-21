-- AlterTable
ALTER TABLE `Property` ADD COLUMN `createdById` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `Property_createdById_idx` ON `Property`(`createdById`);

-- AddForeignKey
ALTER TABLE `Property` ADD CONSTRAINT `Property_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
