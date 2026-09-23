-- AlterTable
ALTER TABLE `Project` ADD COLUMN `isBestSeller` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `isFeatured` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `isTrending` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `Property` ADD COLUMN `isBestSeller` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `isFeatured` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `isTrending` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `soldCount` INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX `Project_isFeatured_idx` ON `Project`(`isFeatured`);

-- CreateIndex
CREATE INDEX `Property_isFeatured_idx` ON `Property`(`isFeatured`);

