/*
  Warnings:

  - Added the required column `correctAnswers` to the `QuizResult` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `quizresult` ADD COLUMN `correctAnswers` VARCHAR(191) NOT NULL;
