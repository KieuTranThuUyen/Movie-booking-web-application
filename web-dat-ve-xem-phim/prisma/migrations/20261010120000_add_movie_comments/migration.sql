CREATE TABLE `MovieComment` (
    `id` VARCHAR(191) NOT NULL,
    `movieId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `parentId` VARCHAR(191) NULL,
    `content` TEXT NOT NULL,
    `rating` INTEGER NULL,
    `imageUrl` TEXT NULL,
    `isHidden` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `MovieComment_movieId_isHidden_createdAt_idx`(`movieId`, `isHidden`, `createdAt`),
    INDEX `MovieComment_userId_movieId_idx`(`userId`, `movieId`),
    INDEX `MovieComment_parentId_idx`(`parentId`),
    PRIMARY KEY (`id`),
    CONSTRAINT `MovieComment_movieId_fkey` FOREIGN KEY (`movieId`) REFERENCES `Movie`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `MovieComment_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `MovieComment_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `MovieComment`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;