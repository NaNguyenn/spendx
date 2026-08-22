-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "category" ADD VALUE 'transportation';
ALTER TYPE "category" ADD VALUE 'vehicle';
ALTER TYPE "category" ADD VALUE 'shopping';
ALTER TYPE "category" ADD VALUE 'health';
ALTER TYPE "category" ADD VALUE 'education';
ALTER TYPE "category" ADD VALUE 'travel';
