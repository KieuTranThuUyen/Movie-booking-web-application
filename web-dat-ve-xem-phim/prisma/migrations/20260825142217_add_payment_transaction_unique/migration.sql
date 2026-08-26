/*
  Warnings:

  - A unique constraint covering the columns `[provider,transactionCode]` on the table `Payment` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX `Payment_provider_transactionCode_key` ON `Payment`(`provider`, `transactionCode`);
