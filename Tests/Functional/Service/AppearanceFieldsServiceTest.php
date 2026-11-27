<?php

declare(strict_types=1);

namespace TYPO3\CMS\VisualEditor\Tests\Functional\Service;

use Generator;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\Attributes\Test;
use TYPO3\CMS\Backend\Utility\BackendUtility;
use TYPO3\CMS\Core\Domain\Record;
use TYPO3\CMS\Core\Domain\RecordFactory;
use TYPO3\CMS\Core\Http\ServerRequest;
use TYPO3\CMS\Core\Schema\TcaSchemaFactory;
use TYPO3\CMS\Frontend\Page\PageInformation;
use TYPO3\CMS\VisualEditor\Service\AppearanceFieldsService;
use TYPO3\TestingFramework\Core\Functional\FunctionalTestCase;

use function array_column;

final class AppearanceFieldsServiceTest extends FunctionalTestCase
{
    protected array $testExtensionsToLoad = [
        'typo3conf/ext/visual_editor',
    ];

    protected function setUp(): void
    {
        parent::setUp();
        $this->importCSVDataSet(__DIR__ . '/Fixtures/appearance_fields.csv');
        $this->setUpBackendUser(1);
    }

    /**
     * @param list<string> $expectedNames
     */
    #[Test]
    #[DataProvider('configuredFieldsDataProvider')]
    public function getFieldsReturnsTheConfiguredStaticSelectFields(int $contentUid, array $expectedNames): void
    {
        [$record, $row, $request] = $this->prepare($contentUid, ['editMode' => '1']);

        $fields = $this->get(AppearanceFieldsService::class)->getFields($record, $row, $request);

        self::assertSame($expectedNames, array_column($fields, 'name'));
    }

    /**
     * @return Generator<string, array{contentUid: int, expectedNames: list<string>}>
     */
    public static function configuredFieldsDataProvider(): Generator
    {
        yield 'defaults without page TSconfig' => [
            'contentUid' => 1,
            'expectedNames' => ['frame_class', 'space_before_class', 'space_after_class'],
        ];

        yield 'page TSconfig adds and removes fields' => [
            'contentUid' => 2,
            'expectedNames' => ['frame_class', 'layout'],
        ];

        yield 'a field that is disabled in the form is not offered' => [
            'contentUid' => 4,
            'expectedNames' => ['space_before_class', 'space_after_class'],
        ];
    }

    #[Test]
    public function getFieldsReturnsTheCurrentValue(): void
    {
        [$record, $row, $request] = $this->prepare(2, ['editMode' => '1']);

        $fields = $this->get(AppearanceFieldsService::class)->getFields($record, $row, $request);

        self::assertSame('ruler-before', $fields[0]['value']);
    }

    /**
     * @param list<string> $expectedNames
     */
    #[Test]
    #[DataProvider('fieldsExcludedFromTheTranslationDataProvider')]
    public function getFieldsOffersFieldsExcludedFromTheTranslationOnlyForTheDefaultLanguage(int $contentUid, array $expectedNames): void
    {
        $GLOBALS['TCA']['tt_content']['columns']['frame_class']['l10n_mode'] = 'exclude';
        $this->get(TcaSchemaFactory::class)->load($GLOBALS['TCA'], true);
        [$record, $row, $request] = $this->prepare($contentUid, ['editMode' => '1']);

        $fields = $this->get(AppearanceFieldsService::class)->getFields($record, $row, $request);

        self::assertSame($expectedNames, array_column($fields, 'name'));
    }

    /**
     * @return Generator<string, array{contentUid: int, expectedNames: list<string>}>
     */
    public static function fieldsExcludedFromTheTranslationDataProvider(): Generator
    {
        yield 'default language' => [
            'contentUid' => 1,
            'expectedNames' => ['frame_class', 'space_before_class', 'space_after_class'],
        ];

        yield 'translation' => [
            'contentUid' => 3,
            'expectedNames' => ['space_before_class', 'space_after_class'],
        ];
    }

    #[Test]
    public function getFieldsReturnsNothingOutsideOfEditMode(): void
    {
        [$record, $row, $request] = $this->prepare(1, []);

        self::assertSame([], $this->get(AppearanceFieldsService::class)->getFields($record, $row, $request));
    }

    /**
     * @param array<string, string> $queryParams
     * @return array{0: Record, 1: array<string, mixed>, 2: ServerRequest}
     */
    private function prepare(int $contentUid, array $queryParams): array
    {
        $row = BackendUtility::getRecord('tt_content', $contentUid);
        self::assertIsArray($row);
        $record = $this->get(RecordFactory::class)->createResolvedRecordFromDatabaseRow('tt_content', $row);
        self::assertInstanceOf(Record::class, $record);

        $pageInformation = new PageInformation();
        $pageInformation->setId((int)$row['pid']);

        $request = (new ServerRequest('https://example.com/'))
            ->withQueryParams($queryParams)
            ->withAttribute('frontend.page.information', $pageInformation);

        return [$record, $row, $request];
    }
}
