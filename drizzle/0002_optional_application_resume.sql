PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_applications` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`company_id` text NOT NULL,
	`role` text NOT NULL,
	`source` text NOT NULL,
	`company_website` text DEFAULT '' NOT NULL,
	`job_type` text NOT NULL,
	`location` text DEFAULT '' NOT NULL,
	`work_mode` text NOT NULL,
	`stage` text NOT NULL,
	`priority` text NOT NULL,
	`reply_status` text NOT NULL,
	`applied_date` text DEFAULT '' NOT NULL,
	`next_step_date` text DEFAULT '' NOT NULL,
	`next_step_label` text DEFAULT '' NOT NULL,
	`reminder_time` text DEFAULT 'None' NOT NULL,
	`compensation_min` text DEFAULT '' NOT NULL,
	`compensation_max` text DEFAULT '' NOT NULL,
	`currency` text DEFAULT 'USD' NOT NULL,
	`equity_bonus` text DEFAULT '' NOT NULL,
	`job_url` text DEFAULT '' NOT NULL,
	`job_description` text DEFAULT '' NOT NULL,
	`resume_id` text,
	`cover_letter_id` text,
	`message` text DEFAULT '' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`contact_name` text DEFAULT '' NOT NULL,
	`contact_role` text DEFAULT '' NOT NULL,
	`contact_email` text DEFAULT '' NOT NULL,
	`contact_phone` text DEFAULT '' NOT NULL,
	`contact_url` text DEFAULT '' NOT NULL,
	`contact_notes` text DEFAULT '' NOT NULL,
	`tags` text DEFAULT '[]' NOT NULL,
	`archived` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`resume_id`) REFERENCES `resumes`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`cover_letter_id`) REFERENCES `cover_letters`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_applications`("id", "user_id", "company_id", "role", "source", "company_website", "job_type", "location", "work_mode", "stage", "priority", "reply_status", "applied_date", "next_step_date", "next_step_label", "reminder_time", "compensation_min", "compensation_max", "currency", "equity_bonus", "job_url", "job_description", "resume_id", "cover_letter_id", "message", "notes", "contact_name", "contact_role", "contact_email", "contact_phone", "contact_url", "contact_notes", "tags", "archived", "created_at", "updated_at") SELECT "id", "user_id", "company_id", "role", "source", "company_website", "job_type", "location", "work_mode", "stage", "priority", "reply_status", "applied_date", "next_step_date", "next_step_label", "reminder_time", "compensation_min", "compensation_max", "currency", "equity_bonus", "job_url", "job_description", "resume_id", "cover_letter_id", "message", "notes", "contact_name", "contact_role", "contact_email", "contact_phone", "contact_url", "contact_notes", "tags", "archived", "created_at", "updated_at" FROM `applications`;--> statement-breakpoint
DROP TABLE `applications`;--> statement-breakpoint
ALTER TABLE `__new_applications` RENAME TO `applications`;--> statement-breakpoint
CREATE INDEX `applications_userId_idx` ON `applications` (`user_id`);--> statement-breakpoint
CREATE INDEX `applications_user_archived_idx` ON `applications` (`user_id`,`archived`);--> statement-breakpoint
CREATE INDEX `applications_companyId_idx` ON `applications` (`company_id`);--> statement-breakpoint
PRAGMA foreign_keys=ON;
