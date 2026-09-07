CREATE TABLE `learning_items` (
	`id` text PRIMARY KEY NOT NULL,
	`path_id` text NOT NULL,
	`module_id` text NOT NULL,
	`user_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`kind` text DEFAULT 'lesson' NOT NULL,
	`status` text DEFAULT 'todo' NOT NULL,
	`due_date` text DEFAULT '' NOT NULL,
	`estimated_minutes` integer DEFAULT 0 NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`completed_at` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`path_id`) REFERENCES `learning_paths`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`module_id`) REFERENCES `learning_modules`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `learning_items_pathId_idx` ON `learning_items` (`path_id`);--> statement-breakpoint
CREATE INDEX `learning_items_moduleId_idx` ON `learning_items` (`module_id`);--> statement-breakpoint
CREATE INDEX `learning_items_userId_idx` ON `learning_items` (`user_id`);--> statement-breakpoint
CREATE INDEX `learning_items_user_due_idx` ON `learning_items` (`user_id`,`due_date`);--> statement-breakpoint
CREATE TABLE `learning_journal_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`path_id` text,
	`title` text DEFAULT '' NOT NULL,
	`body` text DEFAULT '' NOT NULL,
	`entry_date` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`path_id`) REFERENCES `learning_paths`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `learning_journal_userId_idx` ON `learning_journal_entries` (`user_id`);--> statement-breakpoint
CREATE INDEX `learning_journal_pathId_idx` ON `learning_journal_entries` (`path_id`);--> statement-breakpoint
CREATE TABLE `learning_modules` (
	`id` text PRIMARY KEY NOT NULL,
	`path_id` text NOT NULL,
	`user_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`start_date` text DEFAULT '' NOT NULL,
	`end_date` text DEFAULT '' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`path_id`) REFERENCES `learning_paths`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `learning_modules_pathId_idx` ON `learning_modules` (`path_id`);--> statement-breakpoint
CREATE INDEX `learning_modules_userId_idx` ON `learning_modules` (`user_id`);--> statement-breakpoint
CREATE TABLE `learning_paths` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`goal` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`start_date` text DEFAULT '' NOT NULL,
	`target_end_date` text DEFAULT '' NOT NULL,
	`color` text DEFAULT 'neutral' NOT NULL,
	`archived` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `learning_paths_userId_idx` ON `learning_paths` (`user_id`);--> statement-breakpoint
CREATE INDEX `learning_paths_user_archived_idx` ON `learning_paths` (`user_id`,`archived`);--> statement-breakpoint
CREATE TABLE `learning_resources` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`path_id` text,
	`item_id` text,
	`title` text NOT NULL,
	`url` text DEFAULT '' NOT NULL,
	`kind` text DEFAULT 'article' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`path_id`) REFERENCES `learning_paths`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`item_id`) REFERENCES `learning_items`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `learning_resources_userId_idx` ON `learning_resources` (`user_id`);--> statement-breakpoint
CREATE INDEX `learning_resources_pathId_idx` ON `learning_resources` (`path_id`);--> statement-breakpoint
CREATE INDEX `learning_resources_itemId_idx` ON `learning_resources` (`item_id`);