UPDATE `learning_resources` SET `title` = `url` WHERE `url` IS NOT NULL AND `url` != '';
--> statement-breakpoint
ALTER TABLE `learning_resources` DROP COLUMN `url`;
--> statement-breakpoint
ALTER TABLE `learning_resources` DROP COLUMN `kind`;
--> statement-breakpoint
ALTER TABLE `learning_resources` DROP COLUMN `notes`;
