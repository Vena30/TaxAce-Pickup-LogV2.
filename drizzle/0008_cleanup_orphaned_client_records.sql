UPDATE `tax_year_records` AS `tyr`
LEFT JOIN `clients` AS `c` ON `tyr`.`clientId` = `c`.`id`
LEFT JOIN `businesses` AS `b` ON `tyr`.`businessId` = `b`.`id`
LEFT JOIN `clients` AS `bc` ON `b`.`clientId` = `bc`.`id`
SET `tyr`.`deletedAt` = CURRENT_TIMESTAMP
WHERE `tyr`.`deletedAt` IS NULL
  AND (
    (`tyr`.`clientId` IS NOT NULL AND (`c`.`id` IS NULL OR `c`.`deletedAt` IS NOT NULL))
    OR (`tyr`.`businessId` IS NOT NULL AND (`b`.`id` IS NULL OR `b`.`deletedAt` IS NOT NULL OR `bc`.`id` IS NULL OR `bc`.`deletedAt` IS NOT NULL))
    OR (`tyr`.`clientId` IS NULL AND `tyr`.`businessId` IS NULL)
  );
--> statement-breakpoint
UPDATE `businesses` AS `b`
LEFT JOIN `clients` AS `c` ON `b`.`clientId` = `c`.`id`
SET `b`.`deletedAt` = CURRENT_TIMESTAMP
WHERE `b`.`deletedAt` IS NULL
  AND (`c`.`id` IS NULL OR `c`.`deletedAt` IS NOT NULL);
