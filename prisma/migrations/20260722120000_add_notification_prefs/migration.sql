-- AlterTable
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name = 'User' AND column_name = 'notificationPrefs'
  ) THEN
    ALTER TABLE "User" ADD COLUMN "notificationPrefs" JSONB NOT NULL DEFAULT '{}';
  END IF;
END
$$;
