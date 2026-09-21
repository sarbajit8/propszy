-- CreateEnum (MySQL uses inline ENUM on the column)
ALTER TABLE `Property`
    ADD COLUMN `listingIntent` ENUM('SALE', 'RENT', 'PG') NOT NULL DEFAULT 'SALE',
    ADD COLUMN `description` TEXT NULL,
    ADD COLUMN `videoUrl` VARCHAR(191) NULL,
    ADD COLUMN `details` JSON NULL;
