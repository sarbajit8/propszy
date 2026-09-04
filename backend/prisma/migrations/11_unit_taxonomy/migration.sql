-- CreateTable
CREATE TABLE `UnitCategory` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `parentId` VARCHAR(191) NULL,
    `icon` VARCHAR(191) NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `UnitCategory_slug_key`(`slug`),
    INDEX `UnitCategory_parentId_idx`(`parentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AlterTable
ALTER TABLE `Project` ADD COLUMN `featuredVideoUrl` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `Property` ADD COLUMN `categoryId` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `Property_categoryId_idx` ON `Property`(`categoryId`);

-- AddForeignKey
ALTER TABLE `UnitCategory` ADD CONSTRAINT `UnitCategory_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `UnitCategory`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Property` ADD CONSTRAINT `Property_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `UnitCategory`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
