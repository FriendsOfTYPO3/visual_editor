<?php

declare(strict_types=1);

namespace TYPO3\CMS\VisualEditor\Tests\Functional\Core\RichtText;

use Generator;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\Attributes\Test;
use TYPO3\CMS\Core\Authentication\BackendUserAuthentication;
use TYPO3\CMS\Core\Localization\LanguageServiceFactory;
use TYPO3\CMS\VisualEditor\Core\RichtText\RichTextConfigurationService;
use TYPO3\CMS\VisualEditor\Core\RichtText\RichTextConfigurationServiceDto;
use TYPO3\TestingFramework\Core\Functional\FunctionalTestCase;

final class RichTextConfigurationServiceTest extends FunctionalTestCase
{
    protected array $testExtensionsToLoad = [
        'typo3conf/ext/visual_editor',
    ];

    /**
     * @param array<string, mixed> $configuration
     * @param array<string, mixed> $expected
     */
    #[Test]
    #[DataProvider('moduleConfigurationDataProvider')]
    public function resolvesModuleConfiguration(array $configuration, array $expected): void
    {
        $GLOBALS['BE_USER'] = new BackendUserAuthentication();
        $GLOBALS['LANG'] = $this->get(LanguageServiceFactory::class)->create('en');

        $result = $this->get(RichTextConfigurationService::class)->resolveCkEditorConfiguration(
            new RichTextConfigurationServiceDto(
                tableName: 'tt_content',
                uid: 1,
                fieldName: 'bodytext',
                recordTypeValue: 'text',
                effectivePid: 1,
                richtextConfigurationName: 'default',
                additionalConfiguration: $configuration,
            ),
        );

        self::assertSame($expected, array_intersect_key($result, array_flip(['importModules', 'removeImportModules'])));
    }

    /**
     * @return Generator<string, array{configuration: array<string, mixed>, expected: array<string, mixed>}>
     */
    public static function moduleConfigurationDataProvider(): Generator
    {
        yield 'missing module lists stay absent' => ['configuration' => [], 'expected' => []];
        yield 'empty module lists stay empty' => [
            'configuration' => ['importModules' => [], 'removeImportModules' => []],
            'expected' => ['importModules' => [], 'removeImportModules' => []],
        ];

        foreach (['importModules', 'removeImportModules'] as $key) {
            yield $key . ' accepts strings' => [
                'configuration' => [$key => ['@netresearch/rte-ckeditor-image/Plugins/typo3image.js']],
                'expected' => [$key => [
                    ['module' => '@netresearch/rte-ckeditor-image/Plugins/typo3image.js', 'exports' => ['default']],
                ]],
            ];
            yield $key . ' preserves arrays alongside strings' => [
                'configuration' => [$key => [
                    2 => ['module' => '@vendor/named.js', 'exports' => ['NamedPlugin']],
                    4 => '@vendor/default.js',
                    6 => ['module' => '@vendor/side-effect.js', 'exports' => []],
                ]],
                'expected' => [$key => [
                    2 => ['module' => '@vendor/named.js', 'exports' => ['NamedPlugin']],
                    4 => ['module' => '@vendor/default.js', 'exports' => ['default']],
                    6 => ['module' => '@vendor/side-effect.js', 'exports' => []],
                ]],
            ];
        }
    }
}
