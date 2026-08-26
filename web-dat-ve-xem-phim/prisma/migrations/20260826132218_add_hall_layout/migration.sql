-- AlterTable
ALTER TABLE `Hall` ADD COLUMN `layoutHeight` INTEGER NOT NULL DEFAULT 650,
    ADD COLUMN `layoutPreset` VARCHAR(191) NOT NULL DEFAULT 'STANDARD',
    ADD COLUMN `layoutWidth` INTEGER NOT NULL DEFAULT 1000;

-- AlterTable
ALTER TABLE `Seat` ADD COLUMN `positionX` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `positionY` INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE `HallLayoutBlock` (
    `id` VARCHAR(191) NOT NULL,
    `hallId` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `x` INTEGER NOT NULL,
    `y` INTEGER NOT NULL,
    `width` INTEGER NOT NULL,
    `height` INTEGER NOT NULL,
    `label` VARCHAR(191) NULL,

    INDEX `HallLayoutBlock_hallId_idx`(`hallId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `Payment_status_idx` ON `Payment`(`status`);

-- CreateIndex
CREATE INDEX `Seat_hallId_positionY_idx` ON `Seat`(`hallId`, `positionY`);

-- CreateIndex
CREATE INDEX `Seat_hallId_positionX_idx` ON `Seat`(`hallId`, `positionX`);

-- AddForeignKey
ALTER TABLE `HallLayoutBlock` ADD CONSTRAINT `HallLayoutBlock_hallId_fkey` FOREIGN KEY (`hallId`) REFERENCES `Hall`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER TABLE `Hall` RENAME INDEX `Hall_cinemaId_fkey` TO `Hall_cinemaId_idx`;
