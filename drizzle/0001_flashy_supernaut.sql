CREATE TABLE `leads` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`company_id` text NOT NULL,
	`person_name` text NOT NULL,
	`person_role` text DEFAULT '' NOT NULL,
	`platform` text NOT NULL,
	`company_website` text DEFAULT '' NOT NULL,
	`profile_url` text DEFAULT '' NOT NULL,
	`lead_url` text DEFAULT '' NOT NULL,
	`status` text NOT NULL,
	`priority` text NOT NULL,
	`sent_date` text DEFAULT '' NOT NULL,
	`next_step_date` text DEFAULT '' NOT NULL,
	`next_step_label` text DEFAULT '' NOT NULL,
	`reminder_time` text DEFAULT 'None' NOT NULL,
	`message` text DEFAULT '' NOT NULL,
	`resume_id` text,
	`cover_letter_id` text,
	`notes` text DEFAULT '' NOT NULL,
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
CREATE INDEX `leads_userId_idx` ON `leads` (`user_id`);--> statement-breakpoint
CREATE INDEX `leads_user_archived_idx` ON `leads` (`user_id`,`archived`);--> statement-breakpoint
CREATE INDEX `leads_companyId_idx` ON `leads` (`company_id`);