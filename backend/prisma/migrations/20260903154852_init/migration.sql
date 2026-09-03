-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `fullName` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `regNo` VARCHAR(191) NULL,
    `password` VARCHAR(191) NOT NULL,
    `role` ENUM('teacher', 'student') NOT NULL,
    `department` VARCHAR(191) NOT NULL DEFAULT 'Dept of ECE',
    `internshipStatus` ENUM('regular', 'internship') NOT NULL DEFAULT 'regular',
    `internshipCompany` VARCHAR(191) NOT NULL DEFAULT '',
    `internshipDuration` VARCHAR(191) NOT NULL DEFAULT '',
    `internships` JSON NOT NULL,
    `linkedinUrl` VARCHAR(191) NOT NULL DEFAULT '',
    `githubUrl` VARCHAR(191) NOT NULL DEFAULT '',
    `skills` JSON NOT NULL,
    `cgpa` DOUBLE NULL,
    `resumeUrl` VARCHAR(191) NOT NULL DEFAULT '',
    `profilePic` VARCHAR(191) NOT NULL DEFAULT '',
    `experience` VARCHAR(191) NULL,
    `description` TEXT NULL,
    `researchPast` TEXT NULL,
    `isVerified` BOOLEAN NOT NULL DEFAULT true,
    `verificationToken` VARCHAR(191) NULL,
    `tokenExpires` DATETIME(3) NULL,
    `resetPasswordToken` VARCHAR(191) NULL,
    `resetPasswordExpires` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_email_key`(`email`),
    UNIQUE INDEX `User_regNo_key`(`regNo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Project` (
    `id` VARCHAR(191) NOT NULL,
    `teacherId` VARCHAR(191) NOT NULL,
    `facultyName` VARCHAR(191) NOT NULL,
    `projectTitle` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `stream` VARCHAR(191) NOT NULL,
    `domain` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Project_teacherId_idx`(`teacherId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StudentProjectApply` (
    `id` VARCHAR(191) NOT NULL,
    `projectId` VARCHAR(191) NOT NULL,
    `applicationType` ENUM('individual', 'group') NOT NULL,
    `cohortTrack` ENUM('regular', 'internship') NOT NULL DEFAULT 'regular',
    `hasCrossBranch` BOOLEAN NOT NULL DEFAULT false,
    `status` ENUM('pending_member_approval', 'pending_faculty_approval', 'approved', 'rejected') NOT NULL DEFAULT 'pending_faculty_approval',
    `priority` INTEGER NOT NULL,
    `appliedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `StudentProjectApply_projectId_idx`(`projectId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ApplicationMember` (
    `id` VARCHAR(191) NOT NULL,
    `applicationId` VARCHAR(191) NOT NULL,
    `studentId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `regNo` VARCHAR(191) NOT NULL,
    `department` VARCHAR(191) NOT NULL DEFAULT 'Dept of ECE',
    `internshipStatus` ENUM('regular', 'internship') NOT NULL DEFAULT 'regular',
    `status` ENUM('pending', 'approved') NOT NULL DEFAULT 'pending',
    `verificationToken` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ApplicationMember_applicationId_idx`(`applicationId`),
    INDEX `ApplicationMember_studentId_idx`(`studentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TeamApproved` (
    `id` VARCHAR(191) NOT NULL,
    `projectId` VARCHAR(191) NOT NULL,
    `applicationType` ENUM('individual', 'group') NOT NULL,
    `approvedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `facultyName` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `TeamApproved_projectId_idx`(`projectId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TeamMember` (
    `id` VARCHAR(191) NOT NULL,
    `teamId` VARCHAR(191) NOT NULL,
    `studentId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `regNo` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `TeamMember_teamId_idx`(`teamId`),
    INDEX `TeamMember_studentId_idx`(`studentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Notification` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `message` TEXT NOT NULL,
    `type` ENUM('info', 'warning', 'success', 'error') NOT NULL DEFAULT 'info',
    `isRead` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Notification_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `GlobalDeadline` (
    `id` VARCHAR(191) NOT NULL,
    `deadline` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Ticket` (
    `id` VARCHAR(191) NOT NULL,
    `ticketId` VARCHAR(191) NOT NULL,
    `applicationId` VARCHAR(191) NOT NULL,
    `studentId` VARCHAR(191) NOT NULL,
    `projectTitle` VARCHAR(191) NOT NULL DEFAULT '',
    `facultyName` VARCHAR(191) NOT NULL DEFAULT '',
    `targetMember` JSON NOT NULL,
    `changeType` ENUM('name_correction', 'replacement', 'withdrawal') NOT NULL,
    `requestedChanges` JSON NULL,
    `reason` TEXT NOT NULL,
    `status` ENUM('pending', 'in_review', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
    `progressStep` INTEGER NOT NULL DEFAULT 1,
    `coordinatorRemarks` VARCHAR(191) NOT NULL DEFAULT '',
    `timeline` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Ticket_ticketId_key`(`ticketId`),
    INDEX `Ticket_applicationId_idx`(`applicationId`),
    INDEX `Ticket_studentId_idx`(`studentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Project` ADD CONSTRAINT `Project_teacherId_fkey` FOREIGN KEY (`teacherId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StudentProjectApply` ADD CONSTRAINT `StudentProjectApply_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ApplicationMember` ADD CONSTRAINT `ApplicationMember_applicationId_fkey` FOREIGN KEY (`applicationId`) REFERENCES `StudentProjectApply`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ApplicationMember` ADD CONSTRAINT `ApplicationMember_studentId_fkey` FOREIGN KEY (`studentId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TeamApproved` ADD CONSTRAINT `TeamApproved_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TeamMember` ADD CONSTRAINT `TeamMember_teamId_fkey` FOREIGN KEY (`teamId`) REFERENCES `TeamApproved`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TeamMember` ADD CONSTRAINT `TeamMember_studentId_fkey` FOREIGN KEY (`studentId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Notification` ADD CONSTRAINT `Notification_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Ticket` ADD CONSTRAINT `Ticket_applicationId_fkey` FOREIGN KEY (`applicationId`) REFERENCES `StudentProjectApply`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Ticket` ADD CONSTRAINT `Ticket_studentId_fkey` FOREIGN KEY (`studentId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
