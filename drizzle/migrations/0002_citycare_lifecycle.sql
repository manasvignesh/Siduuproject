ALTER TABLE `issues`
  MODIFY COLUMN `status` enum('submitted','acknowledged','in_progress','resolved','rejected','reopened','closed') NOT NULL DEFAULT 'submitted',
  ADD COLUMN `slaDeadline` timestamp NULL,
  ADD COLUMN `closedAt` timestamp NULL,
  ADD COLUMN `citizenVerification` enum('pending','accepted','rejected') NOT NULL DEFAULT 'pending',
  ADD COLUMN `verificationNote` text NULL;
