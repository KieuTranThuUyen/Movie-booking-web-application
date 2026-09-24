/*
  Warnings:

  - A unique constraint covering the columns `[qrCode]` on the table `BookingCombo` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `BookingCombo` ADD COLUMN `checkedInAt` DATETIME(3) NULL,
    ADD COLUMN `qrCode` VARCHAR(191) NULL,
    ADD COLUMN `status` ENUM('ACTIVE', 'USED', 'CANCELED', 'EXPIRED') NOT NULL DEFAULT 'ACTIVE';

-- CreateIndex
CREATE UNIQUE INDEX `BookingCombo_qrCode_key` ON `BookingCombo`(`qrCode`);
