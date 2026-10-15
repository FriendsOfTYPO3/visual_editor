<?php

declare(strict_types=1);

namespace TYPO3\CMS\VisualEditor\SysHistory;

use InvalidArgumentException;
use TYPO3\CMS\Core\DataHandling\History\RecordHistoryStore;
use TYPO3\CMS\Core\DataHandling\Model\CorrelationId;

final readonly class SysHistoryCombiner
{
    public const CORRELATION_ASPECT = 'visual-editor';

    public function __construct(
        private SysHistoryRepositoryInterface $sysHistoryRepository,
    ) {
    }

    /**
     * Separate Visual Editor saves within the time window of $timeToCombine seconds are merged.
     *
     * Combines all sys_history entries that have the same actiontype, usertype, userid, originaluserid, recuid, tablename and workspace
     * takes the last entry of the combined entries and updates the history_data with the combined oldRecord and newRecord
     * deletes all other entries of the combined entries.
     *
     * @param int $timeToCombine how many seconds to load and combine entries if possible
     */
    public function combine(int $timeToCombine = 60): void
    {
        $toBeDeletedUids = [];
        $mapped = $this->getMappedRows($timeToCombine);
        foreach ($mapped as $rowsToCombine) {
            $toBeDeletedUids = [...$toBeDeletedUids, ...$this->combineRows($rowsToCombine)];
        }

        $this->sysHistoryRepository->deleteEntries($toBeDeletedUids);
    }

    /**
     * @return array<string, list<array<string, mixed>>>
     */
    private function getMappedRows(int $timeToCombine): array
    {
        $mapped = [];
        $groupedPerRecord = [];
        foreach ($this->sysHistoryRepository->fetchSysHistory($timeToCombine) as $row) {
            $key = implode('-', [
                $row['recuid'],
                $row['tablename'],
                $row['workspace'],
            ]);
            $groupedPerRecord[$key] ??= [];
            $groupedPerRecord[$key][] = $row;
        }

        foreach ($groupedPerRecord as $parentKey => $rows) {
            $lastKey = null;
            $counter = 0;
            foreach ($rows as $row) {
                if (!$this->isVisualEditorModification($row)) {
                    $lastKey = null;
                    $counter++;
                    continue;
                }

                $key = implode('-', [
                    $row['actiontype'],
                    $row['usertype'],
                    $row['userid'],
                    $row['originaluserid'],
                ]);
                if ($key !== $lastKey) {
                    $lastKey = $key;
                    $counter++;
                }

                $mapped[$counter . '-' . $parentKey . '-' . $key][] = $row;
            }
        }

        return $mapped;
    }

    /**
     * @param array<string, mixed> $row
     */
    private function isVisualEditorModification(array $row): bool
    {
        if ((int)$row['actiontype'] !== RecordHistoryStore::ACTION_MODIFY) {
            return false;
        }

        try {
            return CorrelationId::fromString((string)$row['correlation_id'])->getAspects() === [self::CORRELATION_ASPECT];
        } catch (InvalidArgumentException) {
            return false;
        }
    }

    /**
     * @param list<array<string, mixed>> $rowsToCombine
     * @return list<int>
     */
    private function combineRows(array $rowsToCombine): array
    {
        if (count($rowsToCombine) <= 1) {
            return [];
        }

        // first is the Oldest, last is the Newest
        $first = $rowsToCombine[0];
        $last = $rowsToCombine[array_key_last($rowsToCombine)];
        $newHistoryData = json_decode($first['history_data'], true, flags: JSON_THROW_ON_ERROR);
        foreach (array_slice($rowsToCombine, 1) as $rowToCombine) {
            $currentHistoryData = json_decode($rowToCombine['history_data'], true, flags: JSON_THROW_ON_ERROR);

            $newHistoryData['oldRecord'] = [
                ...$currentHistoryData['oldRecord'],
                ...$newHistoryData['oldRecord'],
            ];
            $newHistoryData['newRecord'] = [
                ...$newHistoryData['newRecord'],
                ...$currentHistoryData['newRecord'],
            ];
        }

        // if one field is the same, we can remove it from the diff, because it is not a change
        $newHistoryData = $this->reduce($newHistoryData);

        // if you change the text and than change it back, the resulting diff will be empty, so we can just delete all history entries
        if ($this->isTheSame($newHistoryData['oldRecord'], $newHistoryData['newRecord'])) {
            return array_map(intval(...), array_column($rowsToCombine, 'uid'));
        }

        $this->sysHistoryRepository->updateHistoryData((int)$last['uid'], $newHistoryData);

        return array_map(intval(...), array_column(array_slice($rowsToCombine, 0, -1), 'uid'));
    }

    /**
     * @param array<string, mixed> $oldRecord
     * @param array<string, mixed> $newRecord
     */
    private function isTheSame(array $oldRecord, array $newRecord): bool
    {
        unset($oldRecord['l18n_diffsource'], $newRecord['l18n_diffsource']);

        $normalizeScalarValue = static fn(mixed $value): mixed => is_scalar($value) ? (string)$value : $value;
        $oldRecord = array_map($normalizeScalarValue, $oldRecord);
        $newRecord = array_map($normalizeScalarValue, $newRecord);

        return $oldRecord === $newRecord;
    }

    /**
     * @param array{oldRecord: array<string, mixed>, newRecord: array<string, mixed>} $newHistoryData
     * @return array{oldRecord: array<string, mixed>, newRecord: array<string, mixed>}
     */
    private function reduce(array $newHistoryData): array
    {
        foreach ($newHistoryData['oldRecord'] as $field => $value) {
            if (isset($newHistoryData['newRecord'][$field]) && $newHistoryData['newRecord'][$field] === $value) {
                unset($newHistoryData['oldRecord'][$field], $newHistoryData['newRecord'][$field]);
            }
        }

        return $newHistoryData;
    }
}
