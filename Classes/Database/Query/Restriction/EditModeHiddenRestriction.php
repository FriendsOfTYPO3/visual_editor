<?php

declare(strict_types=1);

namespace TYPO3\CMS\VisualEditor\Database\Query\Restriction;

use TYPO3\CMS\Core\Context\Context;
use TYPO3\CMS\Core\Database\Query\Expression\CompositeExpression;
use TYPO3\CMS\Core\Database\Query\Expression\ExpressionBuilder;
use TYPO3\CMS\Core\Database\Query\Restriction\HiddenRestriction;
use TYPO3\CMS\VisualEditor\Context\EditModeAspect;

use function array_filter;

/**
 * Decorates the core HiddenRestriction, see Configuration/Services.yaml: GeneralUtility::makeInstance()
 * takes the HiddenRestriction from the container.
 *
 * In edit mode, hidden records of the tables of the extension configuration showHiddenRecordsOfTables
 * (by default tt_content) are not restricted, to make them editable. All other tables are restricted by the
 * decorated HiddenRestriction, e.g. hidden file references stay hidden.
 *
 * It stays a HiddenRestriction, so the core handles it like before: the FrontendRestrictionContainer disables
 * it with VisibilityAspect::includeHiddenContent, and removeByType(HiddenRestriction::class) removes it,
 * e.g. in the language overlay of a workspace preview.
 */
final class EditModeHiddenRestriction extends HiddenRestriction
{
    public function __construct(
        private readonly Context $context,
        private readonly HiddenRestriction $hiddenRestriction,
    ) {
    }

    /**
     * @param array<string, string> $queriedTables table names, keyed by table alias
     */
    public function buildExpression(array $queriedTables, ExpressionBuilder $expressionBuilder): CompositeExpression
    {
        if (EditModeAspect::isEditMode($this->context)) {
            $queriedTables = array_filter(
                $queriedTables,
                fn(string $tableName): bool => !EditModeAspect::showsHiddenRecordsOf($this->context, $tableName),
            );
        }

        return $this->hiddenRestriction->buildExpression($queriedTables, $expressionBuilder);
    }
}
