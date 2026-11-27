<?php

declare(strict_types=1);

namespace TYPO3\CMS\VisualEditor\Tests\Functional\Service;

use Generator;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\Attributes\Test;
use TYPO3\CMS\Core\Http\ServerRequest;
use TYPO3\CMS\Core\Localization\LanguageServiceFactory;
use TYPO3\CMS\VisualEditor\Service\AppearanceItemsService;
use TYPO3\CMS\VisualEditor\Tests\Functional\Service\Fixtures\DependentItemsProcFunc;
use TYPO3\TestingFramework\Core\Functional\FunctionalTestCase;

use function array_column;
use function array_intersect_key;

final class AppearanceItemsServiceTest extends FunctionalTestCase
{
    protected array $testExtensionsToLoad = [
        'typo3conf/ext/visual_editor',
    ];

    protected function setUp(): void
    {
        parent::setUp();
        $this->importCSVDataSet(__DIR__ . '/Fixtures/appearance_fields.csv');
        $backendUser = $this->setUpBackendUser(1);
        $GLOBALS['LANG'] = $this->get(LanguageServiceFactory::class)->createFromUserPreferences($backendUser);
        $GLOBALS['TCA']['tt_content']['columns']['space_before_class']['config']['itemsProcFunc']
            = DependentItemsProcFunc::class . '->itemsProcFunc';
    }

    /**
     * @param list<string> $fields
     * @param array<string, string> $pendingValues
     * @param array<string, array{value: string, itemValues: list<string>}> $expected
     */
    #[Test]
    #[DataProvider('resolveDataProvider')]
    public function resolveReturnsTheItemsOfTheEditForm(int $uid, int $pageId, array $fields, array $pendingValues, array $expected): void
    {
        $resolved = $this->get(AppearanceItemsService::class)->resolve(
            new ServerRequest('https://example.com/typo3/ajax/visual-editor/appearance-items', 'POST'),
            'tt_content',
            $uid,
            $pageId,
            $fields,
            $pendingValues,
        );

        $actual = [];
        foreach ($resolved as $fieldName => $field) {
            $actual[$fieldName] = ['value' => $field['value'], 'itemValues' => array_column($field['items'], 'value')];
        }

        self::assertSame($expected, $actual);
    }

    /**
     * @return Generator<string, array{uid: int, pageId: int, fields: list<string>, pendingValues: array<string, string>, expected: array<string, array{value: string, itemValues: list<string>}>}>
     */
    public static function resolveDataProvider(): Generator
    {
        yield 'the items of the saved values' => [
            'uid' => 1,
            'pageId' => 1,
            'fields' => ['space_before_class'],
            'pendingValues' => [],
            'expected' => [
                'space_before_class' => ['value' => '', 'itemValues' => ['', 'extra-small', 'small', 'medium', 'large', 'extra-large']],
            ],
        ];

        yield 'the items depend on an unsaved value' => [
            'uid' => 1,
            'pageId' => 1,
            'fields' => ['frame_class', 'space_before_class'],
            'pendingValues' => ['frame_class' => 'none'],
            'expected' => [
                'frame_class' => ['value' => 'none', 'itemValues' => ['default', 'ruler-before', 'ruler-after', 'indent', 'indent-left', 'indent-right', 'none']],
                'space_before_class' => ['value' => '', 'itemValues' => ['', 'extra-small', 'small', 'medium']],
            ],
        ];

        yield 'a value that is no longer an item is reset to the default' => [
            'uid' => 1,
            'pageId' => 1,
            'fields' => ['frame_class', 'space_before_class'],
            'pendingValues' => ['frame_class' => 'none', 'space_before_class' => 'extra-large'],
            'expected' => [
                'frame_class' => ['value' => 'none', 'itemValues' => ['default', 'ruler-before', 'ruler-after', 'indent', 'indent-left', 'indent-right', 'none']],
                'space_before_class' => ['value' => '', 'itemValues' => ['', 'extra-small', 'small', 'medium']],
            ],
        ];

        yield 'removeItems of the page TSconfig is applied' => [
            'uid' => 5,
            'pageId' => 4,
            'fields' => ['frame_class'],
            'pendingValues' => [],
            'expected' => [
                'frame_class' => ['value' => 'default', 'itemValues' => ['default', 'ruler-after', 'indent-left', 'indent-right', 'none']],
            ],
        ];

        yield 'a field that is disabled in the form is left out' => [
            'uid' => 4,
            'pageId' => 3,
            'fields' => ['frame_class', 'space_after_class'],
            'pendingValues' => [],
            'expected' => [
                'space_after_class' => ['value' => '', 'itemValues' => ['', 'extra-small', 'small', 'medium', 'large', 'extra-large']],
            ],
        ];

        yield 'a field that is not configured is left out' => [
            'uid' => 1,
            'pageId' => 1,
            'fields' => ['header', 'layout'],
            'pendingValues' => [],
            'expected' => [],
        ];

        yield 'a field that the page configured' => [
            'uid' => 2,
            'pageId' => 2,
            'fields' => ['layout', 'space_before_class'],
            'pendingValues' => [],
            'expected' => [
                'layout' => ['value' => '0', 'itemValues' => ['0', '1', '2', '3']],
            ],
        ];
    }

    #[Test]
    public function resolveOnlyReturnsIconsOfTheIconRegistry(): void
    {
        foreach ($GLOBALS['TCA']['tt_content']['columns']['frame_class']['config']['items'] as $index => $item) {
            $GLOBALS['TCA']['tt_content']['columns']['frame_class']['config']['items'][$index]['icon'] = match ($item['value']) {
                'indent' => 'actions-open',
                'none' => 'EXT:my_extension/Resources/Public/Icons/none.svg',
                default => null,
            };
        }

        $resolved = $this->get(AppearanceItemsService::class)->resolve(
            new ServerRequest('https://example.com/typo3/ajax/visual-editor/appearance-items', 'POST'),
            'tt_content',
            1,
            1,
            ['frame_class'],
            [],
        );

        self::assertSame(
            ['default' => null, 'indent' => 'actions-open', 'none' => null],
            array_intersect_key(
                array_column($resolved['frame_class']['items'], 'icon', 'value'),
                ['default' => 1, 'indent' => 1, 'none' => 1],
            ),
        );
    }
}
