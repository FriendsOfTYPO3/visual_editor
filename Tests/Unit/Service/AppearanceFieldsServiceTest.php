<?php

declare(strict_types=1);

namespace TYPO3\CMS\VisualEditor\Tests\Unit\Service;

use Generator;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\TestCase;
use ReflectionClass;
use TYPO3\CMS\Core\Imaging\IconRegistry;
use TYPO3\CMS\Core\Schema\Field\StaticSelectFieldType;
use TYPO3\CMS\Core\Schema\TcaSchemaFactory;
use TYPO3\CMS\VisualEditor\Service\AppearanceFieldsService;
use TYPO3\CMS\VisualEditor\Service\EditModeService;
use TYPO3\CMS\VisualEditor\Service\LocalizationService;

final class AppearanceFieldsServiceTest extends TestCase
{
    /**
     * @param array<array-key, mixed> $pageTsConfig
     * @param list<string> $expected
     */
    #[Test]
    #[DataProvider('fieldNamesDataProvider')]
    public function resolveFieldNamesAddsTheConfiguredFieldsToTheDefaults(array $pageTsConfig, array $expected): void
    {
        self::assertSame($expected, $this->createSubject()->resolveFieldNames('tt_content', $pageTsConfig));
    }

    /**
     * @return Generator<string, array{pageTsConfig: array<mixed>, expected: list<string>}>
     */
    public static function fieldNamesDataProvider(): Generator
    {
        yield 'nothing configured falls back to the defaults' => [
            'pageTsConfig' => [],
            'expected' => ['frame_class', 'space_before_class', 'space_after_class'],
        ];

        yield 'configured fields are added to the defaults, trimmed and in order' => [
            'pageTsConfig' => ['mod.' => ['web_edit.' => ['appearanceFields.' => ['tt_content' => ' grid_class ,grid_class_position']]]],
            'expected' => ['frame_class', 'space_before_class', 'space_after_class', 'grid_class', 'grid_class_position'],
        ];

        yield 'duplicates are removed' => [
            'pageTsConfig' => ['mod.' => ['web_edit.' => ['appearanceFields.' => ['tt_content' => 'grid_class, frame_class, grid_class']]]],
            'expected' => ['frame_class', 'space_before_class', 'space_after_class', 'grid_class'],
        ];

        yield 'other tables are ignored' => [
            'pageTsConfig' => ['mod.' => ['web_edit.' => ['appearanceFields.' => ['pages' => 'layout']]]],
            'expected' => ['frame_class', 'space_before_class', 'space_after_class'],
        ];

        yield 'a default can be removed' => [
            'pageTsConfig' => ['mod.' => ['web_edit.' => ['appearanceFields.' => ['tt_content' => '-space_before_class, -space_after_class']]]],
            'expected' => ['frame_class'],
        ];

        yield 'a removed field that is not known changes nothing' => [
            'pageTsConfig' => ['mod.' => ['web_edit.' => ['appearanceFields.' => ['tt_content' => 'grid_class, -unknown']]]],
            'expected' => ['frame_class', 'space_before_class', 'space_after_class', 'grid_class'],
        ];

        yield 'a configured field is removed again by a later entry' => [
            'pageTsConfig' => ['mod.' => ['web_edit.' => ['appearanceFields.' => ['tt_content' => 'grid_class, -grid_class']]]],
            'expected' => ['frame_class', 'space_before_class', 'space_after_class'],
        ];
    }

    /**
     * @param array<string, mixed> $configuration
     * @param array<string, mixed> $expected
     */
    #[Test]
    #[DataProvider('describeFieldDataProvider')]
    public function describeFieldDescribesTheFieldWithoutItsItems(array $configuration, string $value, array $expected): void
    {
        $field = new StaticSelectFieldType('grid_class', $configuration);

        self::assertSame($expected, $this->createSubject()->describeField($field, $value));
    }

    /**
     * @return Generator<string, array{configuration: array<string, mixed>, value: string, expected: array<string, mixed>}>
     */
    public static function describeFieldDataProvider(): Generator
    {
        yield 'the label of the current value is taken from the items' => [
            'configuration' => [
                'label' => 'Grid class',
                'items' => [
                    ['label' => 'default', 'value' => '0'],
                    ['label' => 'page', 'value' => 'column-page'],
                ],
            ],
            'value' => 'column-page',
            'expected' => [
                'name' => 'grid_class',
                'label' => 'Grid class',
                'value' => 'column-page',
                'valueLabel' => 'page',
                'valueIcon' => null,
                'translationExcluded' => false,
            ],
        ];

        yield 'a value that is not an item is its own label' => [
            'configuration' => [
                'label' => 'Grid class',
                'items' => [
                    ['label' => 'default', 'value' => '0'],
                ],
            ],
            'value' => 'unknown',
            'expected' => [
                'name' => 'grid_class',
                'label' => 'Grid class',
                'value' => 'unknown',
                'valueLabel' => 'unknown',
                'valueIcon' => null,
                'translationExcluded' => false,
            ],
        ];

        yield 'a field that is excluded from the translation is marked' => [
            'configuration' => [
                'label' => 'Grid class',
                'l10n_mode' => 'exclude',
                'items' => [
                    ['label' => 'default', 'value' => '0'],
                ],
            ],
            'value' => '0',
            'expected' => [
                'name' => 'grid_class',
                'label' => 'Grid class',
                'value' => '0',
                'valueLabel' => 'default',
                'valueIcon' => null,
                'translationExcluded' => true,
            ],
        ];

        yield 'the icon of the current value is taken over if it is registered' => [
            'configuration' => [
                'label' => 'Grid class',
                'items' => [
                    ['label' => 'default', 'value' => '0', 'icon' => 'none'],
                    ['label' => 'page', 'value' => 'column-page', 'icon' => 'column-page'],
                ],
            ],
            'value' => 'column-page',
            'expected' => [
                'name' => 'grid_class',
                'label' => 'Grid class',
                'value' => 'column-page',
                'valueLabel' => 'page',
                'valueIcon' => 'column-page',
                'translationExcluded' => false,
            ],
        ];

        yield 'the icon of the current value is left out if it is not registered' => [
            'configuration' => [
                'label' => 'Grid class',
                'items' => [
                    ['label' => 'default', 'value' => '0', 'icon' => 'none'],
                    ['label' => 'page', 'value' => 'column-page', 'icon' => 'EXT:my_extension/Resources/Public/Icons/page.svg'],
                ],
            ],
            'value' => 'column-page',
            'expected' => [
                'name' => 'grid_class',
                'label' => 'Grid class',
                'value' => 'column-page',
                'valueLabel' => 'page',
                'valueIcon' => null,
                'translationExcluded' => false,
            ],
        ];

        yield 'a field with items from an itemsProcFunc is described as well' => [
            'configuration' => [
                'label' => 'Position',
                'itemsProcFunc' => 'Vendor\\Extension\\Hooks\\ItemsProcFunc->itemsProcFunc',
                'items' => [
                    ['label' => 'none', 'value' => '0'],
                    ['label' => 'left', 'value' => 'left'],
                ],
            ],
            'value' => 'left',
            'expected' => [
                'name' => 'grid_class',
                'label' => 'Position',
                'value' => 'left',
                'valueLabel' => 'left',
                'valueIcon' => null,
                'translationExcluded' => false,
            ],
        ];
    }

    /**
     * @param array<array-key, mixed> $pageTsConfig
     */
    #[Test]
    #[DataProvider('disabledByTsConfigDataProvider')]
    public function isDisabledByTsConfigReadsTheTceformConfiguration(array $pageTsConfig, string $recordType, bool $expected): void
    {
        self::assertSame($expected, $this->createSubject()->isDisabledByTsConfig($pageTsConfig, 'tt_content', 'frame_class', $recordType));
    }

    /**
     * @return Generator<string, array{pageTsConfig: array<mixed>, recordType: string, expected: bool}>
     */
    public static function disabledByTsConfigDataProvider(): Generator
    {
        yield 'nothing configured' => [
            'pageTsConfig' => [],
            'recordType' => 'text',
            'expected' => false,
        ];

        yield 'disabled' => [
            'pageTsConfig' => ['TCEFORM.' => ['tt_content.' => ['frame_class.' => ['disabled' => '1']]]],
            'recordType' => 'text',
            'expected' => true,
        ];

        yield 'explicitly not disabled' => [
            'pageTsConfig' => ['TCEFORM.' => ['tt_content.' => ['frame_class.' => ['disabled' => '0']]]],
            'recordType' => 'text',
            'expected' => false,
        ];

        yield 'disabled for another type only' => [
            'pageTsConfig' => ['TCEFORM.' => ['tt_content.' => ['frame_class.' => ['types.' => ['image.' => ['disabled' => '1']]]]]],
            'recordType' => 'text',
            'expected' => false,
        ];

        yield 'disabled for the type' => [
            'pageTsConfig' => ['TCEFORM.' => ['tt_content.' => ['frame_class.' => ['types.' => ['text.' => ['disabled' => '1']]]]]],
            'recordType' => 'text',
            'expected' => true,
        ];

        yield 'enabled again for the type' => [
            'pageTsConfig' => ['TCEFORM.' => ['tt_content.' => ['frame_class.' => ['disabled' => '1', 'types.' => ['text.' => ['disabled' => '0']]]]]],
            'recordType' => 'text',
            'expected' => false,
        ];
    }

    private function createSubject(): AppearanceFieldsService
    {
        $iconRegistry = $this->createStub(IconRegistry::class);
        $iconRegistry->method('isRegistered')->willReturnCallback(static fn(string $identifier): bool => $identifier === 'column-page');

        return new AppearanceFieldsService(
            $this->createStub(TcaSchemaFactory::class),
            // final class that is not used by the tested methods
            (new ReflectionClass(EditModeService::class))->newInstanceWithoutConstructor(),
            new LocalizationService(),
            $iconRegistry,
        );
    }
}
