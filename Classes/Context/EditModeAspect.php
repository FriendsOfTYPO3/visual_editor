<?php

declare(strict_types=1);

namespace TYPO3\CMS\VisualEditor\Context;

use TYPO3\CMS\Core\Context\AspectInterface;
use TYPO3\CMS\Core\Context\Context;
use TYPO3\CMS\Core\Context\Exception\AspectPropertyNotFoundException;

use function in_array;
use function is_array;

/**
 * Tells whether the current frontend request renders the edit mode, and for which tables hidden records
 * are shown in edit mode.
 *
 * Set by the EditModeMiddleware while it handles a frontend request and removed afterwards, so services
 * without access to the request, e.g. query restrictions, can check it.
 */
final readonly class EditModeAspect implements AspectInterface
{
    public const IDENTIFIER = 'visual_editor';

    /**
     * @param list<string> $tablesWithHiddenRecords
     */
    public function __construct(
        private bool $editMode = false,
        private array $tablesWithHiddenRecords = [],
    ) {
    }

    public static function isEditMode(Context $context): bool
    {
        // The aspect is missing outside of frontend requests, e.g. in the backend or CLI.
        return $context->hasAspect(self::IDENTIFIER)
            && (bool)$context->getPropertyFromAspect(self::IDENTIFIER, 'editMode', false);
    }

    /**
     * Whether hidden records of the table are shown, which is only the case in edit mode.
     */
    public static function showsHiddenRecordsOf(Context $context, string $table): bool
    {
        if (!self::isEditMode($context)) {
            return false;
        }

        $tables = $context->getPropertyFromAspect(self::IDENTIFIER, 'tablesWithHiddenRecords', []);

        return is_array($tables) && in_array($table, $tables, true);
    }

    /**
     * @return bool|list<string>
     */
    public function get(string $name): bool|array
    {
        return match ($name) {
            'editMode' => $this->editMode,
            'tablesWithHiddenRecords' => $this->editMode ? $this->tablesWithHiddenRecords : [],
            default => throw new AspectPropertyNotFoundException(
                'Property "' . $name . '" not found in Aspect "' . self::class . '".',
                1794563200,
            ),
        };
    }
}
