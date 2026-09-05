-- DropForeignKey
ALTER TABLE `Ticket` DROP FOREIGN KEY `Ticket_applicationId_fkey`;

-- AlterTable
ALTER TABLE `Ticket` ADD COLUMN `teamId` VARCHAR(191) NULL,
    MODIFY `applicationId` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `Ticket_teamId_idx` ON `Ticket`(`teamId`);

-- AddForeignKey
ALTER TABLE `Ticket` ADD CONSTRAINT `Ticket_applicationId_fkey` FOREIGN KEY (`applicationId`) REFERENCES `StudentProjectApply`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Ticket` ADD CONSTRAINT `Ticket_teamId_fkey` FOREIGN KEY (`teamId`) REFERENCES `TeamApproved`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
