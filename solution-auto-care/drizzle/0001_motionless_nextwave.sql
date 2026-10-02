CREATE TABLE `wrap_preview_cache` (
	`cacheKey` varchar(64) NOT NULL,
	`responseJson` text NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `wrap_preview_cache_cacheKey` PRIMARY KEY(`cacheKey`)
);
--> statement-breakpoint
CREATE TABLE `wrap_preview_usage` (
	`ipHash` varchar(64) NOT NULL,
	`usageDay` varchar(10) NOT NULL,
	`completedCount` int NOT NULL DEFAULT 0,
	`activeCount` int NOT NULL DEFAULT 0,
	`activeSince` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `wrap_preview_usage_ipHash_usageDay_pk` PRIMARY KEY(`ipHash`,`usageDay`)
);
