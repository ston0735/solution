ALTER TABLE `member_preview_history` ADD `vehicleModelAi` varchar(160);--> statement-breakpoint
ALTER TABLE `member_preview_history` ADD `vehicleModelAiConfidence` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `member_preview_history` ADD `vehicleModelAiSource` varchar(24) DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE `member_preview_history` ADD `vehicleModelAiCandidatesJson` text;