/*
  Warnings:

  - Made the column `userId` on table `SeatHold` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE `SeatHold` DROP FOREIGN KEY `SeatHold_userId_fkey`;

-- AlterTable
ALTER TABLE `SeatHold` MODIFY `userId` VARCHAR(191) NOT NULL;

-- AddForeignKey
ALTER TABLE `SeatHold` ADD CONSTRAINT `SeatHold_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
