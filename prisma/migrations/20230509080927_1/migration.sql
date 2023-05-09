-- CreateTable
CREATE TABLE `Refresh_Tokens` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `refresh_token` VARCHAR(191) NOT NULL,
    `userId` INTEGER NOT NULL,
    `created_date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Refresh_Tokens` ADD CONSTRAINT `Refresh_Tokens_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
