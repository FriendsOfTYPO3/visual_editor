<?php

declare(strict_types=1);

namespace TYPO3\CMS\VisualEditor\Tests\Functional\Database\Query\Restriction;

use Generator;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\Attributes\Test;
use TYPO3\CMS\Core\Context\Context;
use TYPO3\CMS\Core\Database\ConnectionPool;
use TYPO3\CMS\Core\Database\Query\Restriction\FrontendRestrictionContainer;
use TYPO3\CMS\Core\Database\Query\Restriction\HiddenRestriction;
use TYPO3\CMS\Core\Utility\GeneralUtility;
use TYPO3\CMS\VisualEditor\Context\EditModeAspect;
use TYPO3\CMS\VisualEditor\Database\Query\Restriction\EditModeHiddenRestriction;
use TYPO3\TestingFramework\Core\Functional\FunctionalTestCase;

final class EditModeHiddenRestrictionTest extends FunctionalTestCase
{
    protected array $testExtensionsToLoad = [
        'typo3conf/ext/visual_editor',
    ];

    #[Test]
    public function makeInstanceReturnsEditModeHiddenRestrictionForHiddenRestriction(): void
    {
        self::assertInstanceOf(EditModeHiddenRestriction::class, GeneralUtility::makeInstance(HiddenRestriction::class));
    }

    #[Test]
    public function removeByTypeOfHiddenRestrictionRemovesEditModeHiddenRestriction(): void
    {
        $this->get(Context::class)->setAspect(EditModeAspect::IDENTIFIER, new EditModeAspect(true, ['tt_content']));
        $expressionBuilder = $this->get(ConnectionPool::class)->getQueryBuilderForTable('sys_file_reference')->expr();
        $restrictionContainer = GeneralUtility::makeInstance(FrontendRestrictionContainer::class);
        self::assertStringContainsString(
            'hidden',
            (string)$restrictionContainer->buildExpression(['reference' => 'sys_file_reference'], $expressionBuilder),
        );

        $restrictionContainer->removeByType(HiddenRestriction::class);

        self::assertStringNotContainsString(
            'hidden',
            (string)$restrictionContainer->buildExpression(['reference' => 'sys_file_reference'], $expressionBuilder),
        );
    }

    public static function buildExpressionDataProvider(): Generator
    {
        yield 'edit mode does not restrict hidden content elements' => [
            'queriedTables' => ['content' => 'tt_content'],
            'editMode' => true,
            'tablesWithHiddenRecords' => ['tt_content'],
            'expectedFields' => [],
        ];
        yield 'edit mode restricts hidden records of other tables with the table alias' => [
            'queriedTables' => ['reference' => 'sys_file_reference'],
            'editMode' => true,
            'tablesWithHiddenRecords' => ['tt_content'],
            'expectedFields' => ['reference.hidden'],
        ];
        yield 'edit mode restricts hidden pages like the core' => [
            'queriedTables' => ['page' => 'pages'],
            'editMode' => true,
            'tablesWithHiddenRecords' => ['tt_content'],
            'expectedFields' => ['page.hidden'],
        ];
        yield 'edit mode uses the hidden field of the table' => [
            'queriedTables' => ['user' => 'fe_users'],
            'editMode' => true,
            'tablesWithHiddenRecords' => ['tt_content'],
            'expectedFields' => ['user.disable'],
        ];
        yield 'edit mode only restricts other tables than content elements in a join' => [
            'queriedTables' => ['content' => 'tt_content', 'reference' => 'sys_file_reference'],
            'editMode' => true,
            'tablesWithHiddenRecords' => ['tt_content'],
            'expectedFields' => ['reference.hidden'],
        ];
        yield 'edit mode does not restrict hidden records of configured tables' => [
            'queriedTables' => ['content' => 'tt_content', 'reference' => 'sys_file_reference'],
            'editMode' => true,
            'tablesWithHiddenRecords' => ['tt_content', 'sys_file_reference'],
            'expectedFields' => [],
        ];
        yield 'edit mode restricts hidden content elements if they are not configured' => [
            'queriedTables' => ['content' => 'tt_content'],
            'editMode' => true,
            'tablesWithHiddenRecords' => [],
            'expectedFields' => ['content.hidden'],
        ];
        yield 'tables without hidden field are not restricted' => [
            'queriedTables' => ['file' => 'sys_file'],
            'editMode' => true,
            'tablesWithHiddenRecords' => ['tt_content'],
            'expectedFields' => [],
        ];
        yield 'tables without TCA are not restricted' => [
            'queriedTables' => ['unknown' => 'tx_visualeditor_unknown'],
            'editMode' => true,
            'tablesWithHiddenRecords' => ['tt_content'],
            'expectedFields' => [],
        ];
        yield 'without edit mode hidden content elements are restricted like the core' => [
            'queriedTables' => ['content' => 'tt_content', 'reference' => 'sys_file_reference'],
            'editMode' => false,
            'tablesWithHiddenRecords' => ['tt_content'],
            'expectedFields' => ['content.hidden', 'reference.hidden'],
        ];
    }

    /**
     * @param array<string, string> $queriedTables
     * @param list<string> $tablesWithHiddenRecords
     * @param list<string> $expectedFields
     */
    #[Test]
    #[DataProvider('buildExpressionDataProvider')]
    public function buildExpressionRestrictsHiddenRecordsOfConfiguredTablesOnlyWithoutEditMode(
        array $queriedTables,
        bool $editMode,
        array $tablesWithHiddenRecords,
        array $expectedFields,
    ): void {
        $this->get(Context::class)->setAspect(
            EditModeAspect::IDENTIFIER,
            new EditModeAspect($editMode, $tablesWithHiddenRecords),
        );

        $expressionBuilder = $this->get(ConnectionPool::class)->getQueryBuilderForTable('pages')->expr();
        $expectedConstraints = array_map(
            static fn(string $field): string => $expressionBuilder->eq($field, 0),
            $expectedFields,
        );

        $expression = GeneralUtility::makeInstance(HiddenRestriction::class)->buildExpression($queriedTables, $expressionBuilder);

        self::assertSame((string)$expressionBuilder->and(...$expectedConstraints), (string)$expression);
    }
}
