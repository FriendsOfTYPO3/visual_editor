<?php

declare(strict_types=1);

namespace TYPO3\CMS\VisualEditor\SysHistory;

interface SysHistoryRepositoryInterface
{
    /**
     * @return list<array<string, mixed>>
     */
    public function fetchSysHistory(int $timeToFetch): array;

    /**
     * @param list<int> $toBeDeletedUids
     */
    public function deleteEntries(array $toBeDeletedUids): void;

    /**
     * @param array<string, mixed> $newHistoryData
     */
    public function updateHistoryData(int $uid, array $newHistoryData): void;
}
