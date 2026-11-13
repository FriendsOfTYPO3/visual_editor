<?php

declare(strict_types=1);

namespace TYPO3\CMS\VisualEditor\Tests\Functional\EventListener;

use Generator;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\Attributes\Test;
use TYPO3\CMS\Core\Context\Context;
use TYPO3\CMS\Core\Database\ConnectionPool;
use TYPO3\CMS\Core\Domain\Event\ModifyDefaultConstraintsForDatabaseQueryEvent;
use TYPO3\CMS\VisualEditor\Context\EditModeAspect;
use TYPO3\CMS\VisualEditor\EventListener\ModifyDefaultConstraintsForDatabaseQueryEventListener;
use TYPO3\TestingFramework\Core\Functional\FunctionalTestCase;

final class ModifyDefaultConstraintsForDatabaseQueryEventListenerTest extends FunctionalTestCase
{
    protected array $testExtensionsToLoad = [
        'typo3conf/ext/visual_editor',
    ];

    public static function invokeDataProvider(): Generator
    {
        yield 'edit mode removes the disabled constraint of content elements' => [
            'table' => 'tt_content',
            'editMode' => true,
            'tablesWithHiddenRecords' => ['tt_content'],
            'withDisabledConstraint' => true,
            'expectDisabledConstraint' => false,
        ];
        yield 'edit mode keeps the disabled constraint of other tables' => [
            'table' => 'sys_file_reference',
            'editMode' => true,
            'tablesWithHiddenRecords' => ['tt_content'],
            'withDisabledConstraint' => true,
            'expectDisabledConstraint' => true,
        ];
        yield 'edit mode does not add a disabled constraint to other tables' => [
            'table' => 'sys_file_reference',
            'editMode' => true,
            'tablesWithHiddenRecords' => ['tt_content'],
            'withDisabledConstraint' => false,
            'expectDisabledConstraint' => false,
        ];
        yield 'without edit mode the disabled constraint of content elements is kept' => [
            'table' => 'tt_content',
            'editMode' => false,
            'tablesWithHiddenRecords' => ['tt_content'],
            'withDisabledConstraint' => true,
            'expectDisabledConstraint' => true,
        ];
        yield 'edit mode removes the disabled constraint of configured tables' => [
            'table' => 'sys_file_reference',
            'editMode' => true,
            'tablesWithHiddenRecords' => ['tt_content', 'sys_file_reference'],
            'withDisabledConstraint' => true,
            'expectDisabledConstraint' => false,
        ];
        yield 'edit mode keeps the disabled constraint of content elements if they are not configured' => [
            'table' => 'tt_content',
            'editMode' => true,
            'tablesWithHiddenRecords' => [],
            'withDisabledConstraint' => true,
            'expectDisabledConstraint' => true,
        ];
    }

    /**
     * @param list<string> $tablesWithHiddenRecords
     */
    #[Test]
    #[DataProvider('invokeDataProvider')]
    public function invokeRemovesDisabledConstraintOnlyOfConfiguredTablesInEditMode(
        string $table,
        bool $editMode,
        array $tablesWithHiddenRecords,
        bool $withDisabledConstraint,
        bool $expectDisabledConstraint,
    ): void {
        $context = $this->get(Context::class);
        $context->setAspect(EditModeAspect::IDENTIFIER, new EditModeAspect($editMode, $tablesWithHiddenRecords));

        $expressionBuilder = $this->get(ConnectionPool::class)->getQueryBuilderForTable($table)->expr();
        $constraints = ['deleted' => $expressionBuilder->eq('record.deleted', 0)];
        if ($withDisabledConstraint) {
            $constraints['disabled'] = $expressionBuilder->eq('record.hidden', 0);
        }

        $event = new ModifyDefaultConstraintsForDatabaseQueryEvent(
            $table,
            'record',
            $expressionBuilder,
            $constraints,
            [],
            $context,
        );
        $this->get(ModifyDefaultConstraintsForDatabaseQueryEventListener::class)($event);

        $expectedConstraints = ['deleted' => $constraints['deleted']];
        if ($expectDisabledConstraint) {
            $expectedConstraints['disabled'] = $expressionBuilder->eq('record.hidden', 0);
        }

        self::assertSame($expectedConstraints, $event->getConstraints());
    }
}
