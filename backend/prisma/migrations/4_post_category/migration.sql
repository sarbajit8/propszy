-- AlterTable
ALTER TABLE `Post` ADD COLUMN `category` VARCHAR(191) NULL,
    ADD COLUMN `tags` JSON NULL;

-- CreateIndex
CREATE INDEX `Post_status_publishedAt_idx` ON `Post`(`status`, `publishedAt`);

-- CreateIndex
CREATE INDEX `Post_category_idx` ON `Post`(`category`);

