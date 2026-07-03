-- AlterTable
ALTER TABLE "User" ADD COLUMN "role" TEXT NOT NULL DEFAULT 'user';
UPDATE "User" SET "role" = CASE WHEN "isAdmin" = true THEN 'admin' ELSE 'user' END;
ALTER TABLE "User" DROP COLUMN "isAdmin";
