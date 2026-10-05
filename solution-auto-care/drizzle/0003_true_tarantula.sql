ALTER TABLE `member_preview_history` ADD `vehicleModel` varchar(120);--> statement-breakpoint
ALTER TABLE `member_preview_history` ADD `followUpStatus` varchar(32) DEFAULT 'new' NOT NULL;--> statement-breakpoint
ALTER TABLE `member_preview_history` ADD `adminTagsJson` text;--> statement-breakpoint
ALTER TABLE `member_preview_history` ADD `adminNote` text;--> statement-breakpoint
ALTER TABLE `member_preview_history` ADD `updatedAt` timestamp DEFAULT (now()) NOT NULL ON UPDATE CURRENT_TIMESTAMP;