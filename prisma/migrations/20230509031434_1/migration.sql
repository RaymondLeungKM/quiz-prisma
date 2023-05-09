/*
  Warnings:

  - Added the required column `answers` to the `QuizResult` table without a default value. This is not possible if the table is not empty.
  - Added the required column `correctCount` to the `QuizResult` table without a default value. This is not possible if the table is not empty.
  - Added the required column `quiz_date` to the `QuizResult` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `quizresult` ADD COLUMN `answers` VARCHAR(191) NOT NULL,
    ADD COLUMN `correctCount` INTEGER NOT NULL,
    ADD COLUMN `quiz_date` DATETIME(3) NOT NULL;
