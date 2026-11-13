<?php

declare(strict_types=1);

namespace TYPO3\CMS\VisualEditor\Configuration;

use Symfony\Component\DependencyInjection\Attribute\Autoconfigure;
use TYPO3\CMS\Core\Configuration\Exception\ExtensionConfigurationExtensionNotConfiguredException;
use TYPO3\CMS\Core\Configuration\Exception\ExtensionConfigurationPathDoesNotExistException;
use TYPO3\CMS\Core\Configuration\ExtensionConfiguration;

use function array_filter;
use function array_map;
use function array_unique;
use function array_values;
use function explode;
use function is_string;
use function trim;

/**
 * Reads the extension configuration showHiddenRecordsOfTables: the tables whose hidden records are shown
 * in edit mode, by default tt_content.
 */
#[Autoconfigure(public: true)]
final readonly class HiddenRecordTablesConfiguration
{
    private const DEFAULT_TABLES = 'tt_content';

    public function __construct(
        private ExtensionConfiguration $extensionConfiguration,
    ) {
    }

    /**
     * pages are left out: hidden pages follow VisibilityAspect::includeHiddenPages of the core preview.
     *
     * @return list<string>
     */
    public function getTables(): array
    {
        try {
            $configuration = $this->extensionConfiguration->get('visual_editor', 'showHiddenRecordsOfTables');
        } catch (ExtensionConfigurationExtensionNotConfiguredException | ExtensionConfigurationPathDoesNotExistException) {
            $configuration = self::DEFAULT_TABLES;
        }

        if (!is_string($configuration)) {
            $configuration = self::DEFAULT_TABLES;
        }

        $tables = array_map(trim(...), explode(',', $configuration));

        return array_values(array_unique(array_filter(
            $tables,
            static fn(string $table): bool => $table !== '' && $table !== 'pages',
        )));
    }
}
