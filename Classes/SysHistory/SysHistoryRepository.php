<?php

declare(strict_types=1);

namespace TYPO3\CMS\VisualEditor\SysHistory;

use DateTimeImmutable;
use Symfony\Component\DependencyInjection\Attribute\AsAlias;
use TYPO3\CMS\Core\Database\ConnectionPool;

use function array_map;

#[AsAlias(SysHistoryRepositoryInterface::class)]
final readonly class SysHistoryRepository implements SysHistoryRepositoryInterface
{
    public function __construct(
        private ConnectionPool $connectionPool,
    ) {
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function fetchSysHistory(int $timeToFetch): array
    {
        $queryBuilder = $this->connectionPool->getQueryBuilderForTable('sys_history');
        $result = $queryBuilder
            ->select('*')
            ->from('sys_history')
            ->where($queryBuilder->expr()->gte('tstamp', (new DateTimeImmutable())->getTimestamp() - $timeToFetch))
            ->orderBy('uid', 'ASC')
            ->executeQuery();
        return $result->fetchAllAssociative();
    }

    /**
     * @param list<int> $toBeDeletedUids
     */
    public function deleteEntries(array $toBeDeletedUids): void
    {
        if ($toBeDeletedUids) {
            $queryBuilder = $this->connectionPool->getQueryBuilderForTable('sys_history');
            $queryBuilder
                ->delete('sys_history')
                ->where($queryBuilder->expr()->in('uid', array_map(intval(...), $toBeDeletedUids)))
                ->executeStatement();
        }
    }

    /**
     * @param array<string, mixed> $newHistoryData
     */
    public function updateHistoryData(int $uid, array $newHistoryData): void
    {
        $this->connectionPool->getConnectionForTable('sys_history')->update(
            'sys_history',
            ['history_data' => json_encode($newHistoryData, JSON_THROW_ON_ERROR)],
            ['uid' => $uid],
        );
    }
}
