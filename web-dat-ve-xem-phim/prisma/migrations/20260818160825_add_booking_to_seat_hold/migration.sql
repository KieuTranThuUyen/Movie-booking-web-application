-- AlterTable
ALTER TABLE `SeatHold` ADD COLUMN `bookingId` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `SeatHold_bookingId_idx` ON `SeatHold`(`bookingId`);

-- AddForeignKey
ALTER TABLE `SeatHold` ADD CONSTRAINT `SeatHold_bookingId_fkey` FOREIGN KEY (`bookingId`) REFERENCES `Booking`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
