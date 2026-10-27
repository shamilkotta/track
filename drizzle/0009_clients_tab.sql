-- clients tab (client-hunter). Additive only: new client_* tables and indexes.
CREATE TABLE `client_leads` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`external_ref` text NOT NULL,
	`business` text NOT NULL,
	`contact_name` text DEFAULT '' NOT NULL,
	`region` text DEFAULT '' NOT NULL,
	`category` text,
	`site_url` text DEFAULT '' NOT NULL,
	`hook_url` text DEFAULT '' NOT NULL,
	`need` text DEFAULT '' NOT NULL,
	`contact_email` text DEFAULT '' NOT NULL,
	`contact_channel` text DEFAULT 'email' NOT NULL,
	`email_confidence` text,
	`source_url` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'new' NOT NULL,
	`on_hold` integer DEFAULT false NOT NULL,
	`do_not_contact` integer DEFAULT false NOT NULL,
	`drop_reason` text,
	`drop_note` text DEFAULT '' NOT NULL,
	`first_sent_at` integer,
	`followup_sent_at` integer,
	`followup_due_at` integer,
	`cold_at` integer,
	`budget_stated` integer,
	`quoted_price` integer,
	`agreed_price` integer,
	`currency` text DEFAULT 'GBP' NOT NULL,
	`payment_status` text,
	`delivery_status` text,
	`preview_url` text DEFAULT '' NOT NULL,
	`started_at` integer,
	`delivered_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "client_leads_status_chk" CHECK(status in ('new', 'draft_ready', 'approved', 'waiting', 'replied', 'in_talks', 'won', 'cold', 'dropped')),
	CONSTRAINT "client_leads_category_chk" CHECK(category is null or category in ('founder_app', 'pro_site', 'local_shop', 'shopify')),
	CONSTRAINT "client_leads_channel_chk" CHECK(contact_channel in ('email', 'x', 'reddit', 'other')),
	CONSTRAINT "client_leads_confidence_chk" CHECK(email_confidence is null or email_confidence in ('high', 'med', 'low')),
	CONSTRAINT "client_leads_drop_reason_chk" CHECK(drop_reason is null or drop_reason in ('weak_hook', 'said_no', 'wrong_fit', 'cant_reach', 'other')),
	CONSTRAINT "client_leads_payment_chk" CHECK(payment_status is null or payment_status in ('unpaid', 'part_paid', 'paid')),
	CONSTRAINT "client_leads_delivery_chk" CHECK(delivery_status is null or delivery_status in ('in_progress', 'delivered')),
	CONSTRAINT "client_leads_dnc_chk" CHECK(do_not_contact = 0 or status = 'dropped')
);
--> statement-breakpoint
CREATE UNIQUE INDEX `client_leads_user_external_ref_uidx` ON `client_leads` (`user_id`,`external_ref`);
--> statement-breakpoint
CREATE INDEX `client_leads_user_status_idx` ON `client_leads` (`user_id`,`status`);
--> statement-breakpoint
CREATE TABLE `client_drafts` (
	`id` text PRIMARY KEY NOT NULL,
	`lead_id` text NOT NULL,
	`kind` text NOT NULL,
	`version` integer NOT NULL,
	`subject` text DEFAULT '' NOT NULL,
	`body` text NOT NULL,
	`body_sha256` text NOT NULL,
	`author` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`approved_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`lead_id`) REFERENCES `client_leads`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "client_drafts_kind_chk" CHECK(kind in ('first', 'followup', 'reply')),
	CONSTRAINT "client_drafts_author_chk" CHECK(author in ('agent', 'shamil')),
	CONSTRAINT "client_drafts_status_chk" CHECK(status in ('pending', 'revision_requested', 'approved', 'superseded', 'sent', 'rejected'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `client_drafts_lead_kind_version_uidx` ON `client_drafts` (`lead_id`,`kind`,`version`);
--> statement-breakpoint
CREATE TABLE `client_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`lead_id` text NOT NULL,
	`direction` text NOT NULL,
	`body` text NOT NULL,
	`summary` text DEFAULT '' NOT NULL,
	`received_at` integer NOT NULL,
	FOREIGN KEY (`lead_id`) REFERENCES `client_leads`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "client_messages_direction_chk" CHECK(direction in ('in', 'out'))
);
--> statement-breakpoint
CREATE INDEX `client_messages_lead_idx` ON `client_messages` (`lead_id`);
--> statement-breakpoint
CREATE TABLE `client_tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`lead_id` text NOT NULL,
	`text` text NOT NULL,
	`done` integer DEFAULT false NOT NULL,
	`blocked` integer DEFAULT false NOT NULL,
	`position` integer NOT NULL,
	FOREIGN KEY (`lead_id`) REFERENCES `client_leads`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `client_tasks_lead_idx` ON `client_tasks` (`lead_id`);
--> statement-breakpoint
CREATE TABLE `client_notes` (
	`id` text PRIMARY KEY NOT NULL,
	`lead_id` text NOT NULL,
	`author` text NOT NULL,
	`body` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`lead_id`) REFERENCES `client_leads`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "client_notes_author_chk" CHECK(author in ('agent', 'shamil'))
);
--> statement-breakpoint
CREATE INDEX `client_notes_lead_idx` ON `client_notes` (`lead_id`);
--> statement-breakpoint
CREATE TABLE `client_events` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`lead_id` text NOT NULL,
	`action` text NOT NULL,
	`payload_json` text NOT NULL,
	`created_at` integer NOT NULL,
	`delivered_at` integer,
	`attempts` integer DEFAULT 0 NOT NULL,
	`last_error` text,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`lead_id`) REFERENCES `client_leads`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "client_events_action_chk" CHECK(action in ('approve', 'revise', 'drop', 'revive', 'hold', 'note'))
);
--> statement-breakpoint
CREATE INDEX `client_events_user_created_idx` ON `client_events` (`user_id`,`created_at`);
--> statement-breakpoint
CREATE INDEX `client_events_undelivered_idx` ON `client_events` (`delivered_at`);
