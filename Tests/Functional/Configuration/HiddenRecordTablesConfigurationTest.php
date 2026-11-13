<?php

declare(strict_types=1);

namespace TYPO3\CMS\VisualEditor\Tests\Functional\Configuration;

use Generator;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\Attributes\Test;
use TYPO3\CMS\VisualEditor\Configuration\HiddenRecordTablesConfiguration;
use TYPO3\TestingFramework\Core\Functional\FunctionalTestCase;

final class HiddenRecordTablesConfigurationTest extends FunctionalTestCase
{
    protected array $testExtensionsToLoad = [
        'typo3conf/ext/visual_editor',
    ];

    public static function getTablesDataProvider(): Generator
    {
        yield 'content elements by default' => [
            'configuration' => null,
            'expected' => ['tt_content'],
        ];
        yield 'configured tables' => [
            'configuration' => 'tt_content,tx_news_domain_model_news',
            'expected' => ['tt_content', 'tx_news_domain_model_news'],
        ];
        yield 'whitespace, empty and duplicate entries are removed' => [
            'configuration' => ' tt_content , ,tx_news_domain_model_news,tt_content',
            'expected' => ['tt_content', 'tx_news_domain_model_news'],
        ];
        yield 'pages are not supported' => [
            'configuration' => 'pages,tt_content',
            'expected' => ['tt_content'],
        ];
        yield 'an empty configuration shows no hidden records' => [
            'configuration' => '',
            'expected' => [],
        ];
    }

    /**
     * @param list<string> $expected
     */
    #[Test]
    #[DataProvider('getTablesDataProvider')]
    public function getTablesReturnsTheConfiguredTables(?string $configuration, array $expected): void
    {
        unset($GLOBALS['TYPO3_CONF_VARS']['EXTENSIONS']['visual_editor']);
        if ($configuration !== null) {
            $GLOBALS['TYPO3_CONF_VARS']['EXTENSIONS']['visual_editor']['showHiddenRecordsOfTables'] = $configuration;
        }

        self::assertSame($expected, $this->get(HiddenRecordTablesConfiguration::class)->getTables());
    }
}
