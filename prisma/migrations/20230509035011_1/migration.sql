/*
  Warnings:

  - Added the required column `resultsArr` to the `QuizResult` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `quizresult` ADD COLUMN `resultsArr` VARCHAR(191) NOT NULL;
