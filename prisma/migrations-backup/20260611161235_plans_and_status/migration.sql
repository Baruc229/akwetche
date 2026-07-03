/*
  Warnings:

  - You are about to drop the column `walletAccountId` on the `Transaction` table. All the data in the column will be lost.
  - You are about to drop the `WalletAccount` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Transaction" DROP CONSTRAINT "Transaction_walletAccountId_fkey";

-- DropForeignKey
ALTER TABLE "WalletAccount" DROP CONSTRAINT "WalletAccount_userId_fkey";

-- AlterTable
ALTER TABLE "Transaction" DROP COLUMN "walletAccountId";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "activityActivated" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "plan" TEXT NOT NULL DEFAULT 'free',
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'inactive';

-- DropTable
DROP TABLE "WalletAccount";
