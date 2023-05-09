/*
  Warnings:

  - A unique constraint covering the columns `[refresh_token,userId]` on the table `Refresh_Tokens` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX `Refresh_Tokens_refresh_token_userId_key` ON `Refresh_Tokens`(`refresh_token`, `userId`);
