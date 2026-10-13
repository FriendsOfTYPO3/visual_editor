<?php

declare(strict_types=1);

namespace TYPO3\CMS\VisualEditor\Tests\Functional\Service;

use Generator;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\Attributes\Test;
use TYPO3\CMS\Backend\Utility\BackendUtility;
use TYPO3\CMS\Core\Domain\RecordFactory;
use TYPO3\CMS\VisualEditor\Service\RecordSchemaService;
use TYPO3\TestingFramework\Core\Functional\FunctionalTestCase;

final class RecordSchemaServiceTest extends FunctionalTestCase
{
    protected array $testExtensionsToLoad = [
        'typo3conf/ext/visual_editor',
    ];

    protected function setUp(): void
    {
        parent::setUp();
        $this->importCSVDataSet(__DIR__ . '/Fixtures/record_schema.csv');
    }

    #[Test]
    #[DataProvider('recordTypeDataProvider')]
    public function getSchemaReturnsTheSchemaOfTheTypeOrOfTheTable(int $uid, string $expectedSchemaName): void
    {
        $row = BackendUtility::getRecord('tt_content', $uid);
        self::assertIsArray($row);
        $record = $this->get(RecordFactory::class)->createResolvedRecordFromDatabaseRow('tt_content', $row);

        self::assertSame($expectedSchemaName, $this->get(RecordSchemaService::class)->getSchema($record)->getName());
    }

    /**
     * @return Generator<string, array{uid: int, expectedSchemaName: string}>
     */
    public static function recordTypeDataProvider(): Generator
    {
        yield 'a type with a schema' => [
            'uid' => 1,
            'expectedSchemaName' => 'tt_content.text',
        ];

        yield 'a type without a schema, like the removed CType list' => [
            'uid' => 2,
            'expectedSchemaName' => 'tt_content',
        ];
    }
}
