CREATE TABLE `member_preview_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`previewUrl` text NOT NULL,
	`originalImageUrl` text,
	`pantoneId` varchar(48) NOT NULL,
	`catalogColorJson` text,
	`aspectRatio` varchar(20) NOT NULL,
	`outputSize` varchar(32),
	`partialWrapCustomizations` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`retentionDays` int NOT NULL DEFAULT 3,
	`expiresAt` timestamp NOT NULL,
	`isSaved` int NOT NULL DEFAULT 0,
	CONSTRAINT `member_preview_history_id` PRIMARY KEY(`id`)
);
