<?php

declare(strict_types=1);

namespace TYPO3\CMS\VisualEditor\ViewHelpers\Record;

use TYPO3\CMS\Core\Domain\RecordFactory;
use TYPO3\CMS\Core\Domain\RecordInterface;
use TYPO3Fluid\Fluid\Core\ViewHelper\AbstractViewHelper;

/**
 * This viewHelper should only be used in Legacy Project to convert array data to Record objects
 * usage:
 * ````html
 * <f:record.fromArray table="my_table" data="{data}" />
 * {f:record.fromArray(table: 'my_table', data: data)}
 *
 * <!-- or in an editable.input: -->
 * <f:render.text record="{f:record.fromArray(table: 'my_table', data: data)}" field="my_field" />
 * {f:render.text(record: '{f:record.fromArray(table: \'my_table\', data: data)}', field: 'my_field')}
 * ````
 */
final class FromArrayViewHelper extends AbstractViewHelper
{
    public function __construct(
        private readonly RecordFactory $recordFactory,
    ) {
    }

    public function initializeArguments(): void
    {
        $this->registerArgument('table', 'string', 'TableName of the data object', true);
        $this->registerArgument('data', 'array', 'must be a full database row of the given table', true);
    }

    public function render(): RecordInterface
    {
        return $this->recordFactory->createResolvedRecordFromDatabaseRow($this->arguments['table'], $this->arguments['data']);
    }
}
