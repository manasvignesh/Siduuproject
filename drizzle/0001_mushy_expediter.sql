CREATE TABLE `departments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(160) NOT NULL,
	`slug` varchar(80) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `departments_id` PRIMARY KEY(`id`),
	CONSTRAINT `departments_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `issue_comments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`issueId` int NOT NULL,
	`authorId` int NOT NULL,
	`body` text NOT NULL,
	`isInternal` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `issue_comments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `issue_photos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`issueId` int NOT NULL,
	`url` text NOT NULL,
	`kind` enum('before','after') NOT NULL DEFAULT 'before',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `issue_photos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `issue_status_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`issueId` int NOT NULL,
	`fromStatus` varchar(40),
	`toStatus` varchar(40) NOT NULL,
	`changedById` int,
	`note` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `issue_status_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `issue_upvotes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`issueId` int NOT NULL,
	`userId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `issue_upvotes_id` PRIMARY KEY(`id`),
	CONSTRAINT `issue_user_unique` UNIQUE(`issueId`,`userId`)
);
--> statement-breakpoint
CREATE TABLE `issues` (
	`id` int AUTO_INCREMENT NOT NULL,
	`referenceCode` varchar(32) NOT NULL,
	`reporterId` int,
	`isAnonymous` boolean NOT NULL DEFAULT false,
	`categorySlug` varchar(60) NOT NULL,
	`departmentId` int,
	`title` varchar(200) NOT NULL,
	`description` text NOT NULL,
	`status` enum('submitted','acknowledged','in_progress','resolved','rejected','reopened') NOT NULL DEFAULT 'submitted',
	`priority` enum('low','medium','high','urgent') NOT NULL DEFAULT 'medium',
	`latitude` double NOT NULL,
	`longitude` double NOT NULL,
	`address` text,
	`upvoteCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`resolvedAt` timestamp,
	CONSTRAINT `issues_id` PRIMARY KEY(`id`),
	CONSTRAINT `issues_referenceCode_unique` UNIQUE(`referenceCode`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`issueId` int,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`read` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `issue_comments` ADD CONSTRAINT `issue_comments_issueId_issues_id_fk` FOREIGN KEY (`issueId`) REFERENCES `issues`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `issue_comments` ADD CONSTRAINT `issue_comments_authorId_users_id_fk` FOREIGN KEY (`authorId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `issue_photos` ADD CONSTRAINT `issue_photos_issueId_issues_id_fk` FOREIGN KEY (`issueId`) REFERENCES `issues`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `issue_status_history` ADD CONSTRAINT `issue_status_history_issueId_issues_id_fk` FOREIGN KEY (`issueId`) REFERENCES `issues`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `issue_status_history` ADD CONSTRAINT `issue_status_history_changedById_users_id_fk` FOREIGN KEY (`changedById`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `issue_upvotes` ADD CONSTRAINT `issue_upvotes_issueId_issues_id_fk` FOREIGN KEY (`issueId`) REFERENCES `issues`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `issue_upvotes` ADD CONSTRAINT `issue_upvotes_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `issues` ADD CONSTRAINT `issues_reporterId_users_id_fk` FOREIGN KEY (`reporterId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `issues` ADD CONSTRAINT `issues_departmentId_departments_id_fk` FOREIGN KEY (`departmentId`) REFERENCES `departments`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_issueId_issues_id_fk` FOREIGN KEY (`issueId`) REFERENCES `issues`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `issues_geo_idx` ON `issues` (`latitude`,`longitude`);--> statement-breakpoint
CREATE INDEX `issues_status_idx` ON `issues` (`status`);--> statement-breakpoint
CREATE INDEX `issues_category_idx` ON `issues` (`categorySlug`);