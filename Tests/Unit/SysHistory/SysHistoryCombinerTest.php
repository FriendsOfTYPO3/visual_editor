<?php

declare(strict_types=1);

namespace TYPO3\CMS\VisualEditor\Tests\Unit\SysHistory;

use Generator;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\TestCase;
use TYPO3\CMS\VisualEditor\SysHistory\SysHistoryCombiner;

class SysHistoryCombinerTest extends TestCase
{
    /**
     * @param list<array<string, mixed>> $sysHistoryData
     * @param list<list<int>> $recordedDeleteEntries
     * @param array<int, array<string, mixed>> $recordedUpdateHistoryData
     */
    #[Test]
    #[DataProvider('provideCombineData')]
    public function combine(
        array $sysHistoryData,
        array $recordedDeleteEntries = [],
        array $recordedUpdateHistoryData = [],
        int $timeToCombine = 60
    ): void {
        $recordings = new RecordingSysHistoryRepository($sysHistoryData);
        $combiner = new SysHistoryCombiner($recordings);
        $combiner->combine($timeToCombine);
        self::assertSame($recordedDeleteEntries, $recordings->recordedDeleteEntries, 'Delete entries do not match');
        self::assertSame($recordedUpdateHistoryData, $recordings->recordedUpdateHistoryData, 'Update history data does not match');
    }

    public static function provideCombineData(): Generator
    {
        yield 'no data' => [
            'sysHistoryData' => [],
            'recordedDeleteEntries' => [[]],
            'recordedUpdateHistoryData' => [],
        ];
        yield 'simple' => [
            'sysHistoryData' => [
                self::createRow(1, 'A', 'B'),
                self::createRow(2, 'B', 'C'),
            ],
            'recordedDeleteEntries' => [[1]],
            'recordedUpdateHistoryData' => [
                2 => self::createResult('A', 'C'),
            ],
        ];
        yield 'visual editor correlations combine across scopes' => [
            'sysHistoryData' => [
                self::createRow(1, 'A', 'B', correlationId: '0400$scope-1:subject/visual-editor'),
                self::createRow(2, 'B', 'C', correlationId: '0400$scope-2:subject/visual-editor'),
            ],
            'recordedDeleteEntries' => [[1]],
            'recordedUpdateHistoryData' => [
                2 => self::createResult('A', 'C'),
            ],
        ];
        yield 'non visual editor correlations are rollback boundaries' => [
            'sysHistoryData' => [
                self::createRow(1, 'A', 'B', correlationId: '0400$scope-1:subject/redirects/slug'),
                self::createRow(2, 'B', 'C', correlationId: '0400$scope-2:subject/redirects/slug'),
            ],
            'recordedDeleteEntries' => [[]],
            'recordedUpdateHistoryData' => [],
        ];
        yield 'non visual editor correlations separate visual editor modifications' => [
            'sysHistoryData' => [
                self::createRow(1, 'A', 'B', correlationId: '0400$scope-1:subject/visual-editor'),
                self::createRow(2, 'B', 'B', correlationId: '0400$scope-2:subject/visual-editor/redirects/slug'),
                self::createRow(3, 'B', 'C', correlationId: '0400$scope-3:subject/visual-editor'),
            ],
            'recordedDeleteEntries' => [[]],
            'recordedUpdateHistoryData' => [],
        ];
        yield 'change to and back with type missmatch' => [
            'sysHistoryData' => [
                self::createRow(1, 1, 2),
                self::createRow(2, 2, '1'),
            ],
            'recordedDeleteEntries' => [[1, 2]],
            'recordedUpdateHistoryData' => [],
        ];
        yield 'structured values are not treated as identical' => [
            'sysHistoryData' => [
                self::createRow(1, ['a'], ['b']),
                self::createRow(2, ['b'], ['c']),
            ],
            'recordedDeleteEntries' => [[1]],
            'recordedUpdateHistoryData' => [
                2 => self::createResult(['a'], ['c']),
            ],
        ];
        yield 'null and empty strings are not treated as identical' => [
            'sysHistoryData' => [
                self::createRow(1, null, 'value'),
                self::createRow(2, 'value', ''),
            ],
            'recordedDeleteEntries' => [[1]],
            'recordedUpdateHistoryData' => [
                2 => self::createResult(null, ''),
            ],
        ];
        yield 'different Users' => [
            'sysHistoryData' => [
                self::createRow(1, 'A', 'B', 2),
                self::createRow(2, 'B', 'C', 3),
            ],
            'recordedDeleteEntries' => [[]],
            'recordedUpdateHistoryData' => [],
        ];
        yield 'different Users still combining' => [
            'sysHistoryData' => [
                self::createRow(1, 'A', 'B', 2),
                self::createRow(2, 'B', 'C', 2),
                self::createRow(3, 'C', 'D', 3),
            ],
            'recordedDeleteEntries' => [[1]],
            'recordedUpdateHistoryData' => [
                2 => self::createResult('A', 'C'),
            ],
        ];
        yield 'not combining over other users entries' => [
            'sysHistoryData' => [
                self::createRow(1, 'A', 'B', userid: 2),
                self::createRow(2, 'B', 'C', userid: 2),
                self::createRow(3, 'C', 'D', userid: 3),
                self::createRow(4, 'D', 'E', userid: 2),
                self::createRow(5, 'E', 'F', userid: 2),
            ],
            'recordedDeleteEntries' => [[1, 4]],
            'recordedUpdateHistoryData' => [
                2 => self::createResult('A', 'C'),
                5 => self::createResult('D', 'F'),
            ],
        ];
        yield 'not combining over intervening actions' => [
            'sysHistoryData' => [
                self::createRow(1, 'A', 'B'),
                self::createRow(2, 'B', 'B', actiontype: 3),
                self::createRow(3, 'B', 'C'),
            ],
            'recordedDeleteEntries' => [[]],
            'recordedUpdateHistoryData' => [],
        ];
        yield 'combining over another record by the same user' => [
            'sysHistoryData' => [
                self::createRow(1, 'A', 'B', recuid: 9),
                self::createRow(2, 'A', 'B', recuid: 10),
                self::createRow(3, 'B', 'C', recuid: 9),
            ],
            'recordedDeleteEntries' => [[1]],
            'recordedUpdateHistoryData' => [
                3 => self::createResult('A', 'C'),
            ],
        ];
        yield 'combining over another workspace by the same user' => [
            'sysHistoryData' => [
                self::createRow(1, 'A', 'B', workspace: 0),
                self::createRow(2, 'A', 'B', workspace: 2),
                self::createRow(3, 'B', 'C', workspace: 0),
            ],
            'recordedDeleteEntries' => [[1]],
            'recordedUpdateHistoryData' => [
                3 => self::createResult('A', 'C', workspace: 0),
            ],
        ];
        yield 'not combining over other users entries second user also combines' => [
            'sysHistoryData' => [
                self::createRow(1, 'A', 'B', userid: 2),
                self::createRow(2, 'B', 'C', userid: 2),
                self::createRow(3, 'C', 'D', userid: 3),
                self::createRow(4, 'D', 'E', userid: 3),
                self::createRow(5, 'E', 'F', userid: 2),
            ],
            'recordedDeleteEntries' => [[1, 3]],
            'recordedUpdateHistoryData' => [
                2 => self::createResult('A', 'C'),
                4 => self::createResult('C', 'E'),
            ],
        ];
        yield 'lot of changes' => [
            'sysHistoryData' => [
                self::createRow(1, 'A', 'B'),
                self::createRow(2, 'B', 'C'),
                self::createRow(3, 'C', 'D'),
                self::createRow(4, 'D', 'E'),
                self::createRow(5, 'E', 'F'),
            ],
            'recordedDeleteEntries' => [[1, 2, 3, 4]],
            'recordedUpdateHistoryData' => [
                5 => self::createResult('A', 'F'),
            ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public static function createRow(int $uid, mixed $oldValue, mixed $newValue, int $userid = 1, int $recuid = 9, int $workspace = 3, int $actiontype = 2, string $correlationId = '0400$scope:subject/visual-editor'): array
    {
        return [
            'uid' => $uid,
            'tstamp' => $uid,
            'actiontype' => $actiontype,
            'usertype' => 'BE',
            'userid' => $userid,
            'originaluserid' => 0,
            'recuid' => $recuid,
            'tablename' => 'tt_content',
            'history_data' => json_encode([
                'oldRecord' => [
                    'header' => $oldValue,
                ],
                'newRecord' => [
                    'header' => $newValue,
                ],
                'workspace' => $workspace,
            ]),
            'workspace' => $workspace,
            'correlation_id' => $correlationId,
        ];
    }

    /**
     * @return array{oldRecord: array{header: mixed}, newRecord: array{header: mixed}, workspace: int}
     */
    public static function createResult(mixed $oldValue, mixed $newValue, int $workspace = 3): array
    {
        return [
            'oldRecord' => [
                'header' => $oldValue,
            ],
            'newRecord' => [
                'header' => $newValue,
            ],
            'workspace' => $workspace,
        ];
    }
}
