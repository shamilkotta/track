ALTER TABLE `applications` ADD `step_logs` text DEFAULT '[]' NOT NULL;
--> statement-breakpoint
ALTER TABLE `leads` ADD `step_logs` text DEFAULT '[]' NOT NULL;
--> statement-breakpoint
ALTER TABLE `wishlists` ADD `step_logs` text DEFAULT '[]' NOT NULL;
