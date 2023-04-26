/*
  Warnings:

  - Added the required column `duration` to the `Quiz` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `quiz` ADD COLUMN `duration` INTEGER NOT NULL;
