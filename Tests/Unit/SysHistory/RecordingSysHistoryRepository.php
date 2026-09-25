<?php

declare(strict_types=1);

namespace TYPO3\CMS\VisualEditor\Tests\Unit\SysHistory;

use TYPO3\CMS\VisualEditor\SysHistory\SysHistoryRepositoryInterface;

/**
 * only use this in Tests.
 * @test
 */
final class RecordingSysHistoryRepository implements SysHistoryRepositoryInterface
{
    /** @var list<list<int>> */
    public array $recordedDeleteEntries = [];

    /** @var array<int, array<string, mixed>> */
    public array $recordedUpdateHistoryData = [];

    /**
     * @param list<array<string, mixed>> $sysHistoryData
     */
    public function __construct(private readonly array $sysHistoryData = [])
    {
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function fetchSysHistory(int $timeToFetch): array
    {
        return $this->sysHistoryData;
    }

    /**
     * @param list<int> $toBeDeletedUids
     */
    public function deleteEntries(array $toBeDeletedUids): void
    {
        $this->recordedDeleteEntries[] = $toBeDeletedUids;
    }

    /**
     * @param array<string, mixed> $newHistoryData
     */
    public function updateHistoryData(int $uid, array $newHistoryData): void
    {
        $this->recordedUpdateHistoryData[$uid] = $newHistoryData;
    }
}
