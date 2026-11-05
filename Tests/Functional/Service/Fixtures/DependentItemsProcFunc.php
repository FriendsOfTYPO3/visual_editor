<?php

declare(strict_types=1);

namespace TYPO3\CMS\VisualEditor\Tests\Functional\Service\Fixtures;

use function array_values;
use function array_filter;
use function in_array;
use function is_array;

/**
 * Like the itemsProcFunc of grid_styled_content: the items depend on another field of the record.
 */
final class DependentItemsProcFunc
{
    /**
     * @param array<string, mixed> $params
     */
    public function itemsProcFunc(array &$params): void
    {
        $frameClass = $params['row']['frame_class'] ?? '';
        $frameClass = is_array($frameClass) ? ($frameClass[0] ?? '') : $frameClass;
        if ($frameClass !== 'none') {
            return;
        }

        $params['items'] = array_values(array_filter(
            $params['items'],
            static fn(array $item): bool => !in_array((string)$item['value'], ['large', 'extra-large'], true),
        ));
    }
}
