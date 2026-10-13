<?php

declare(strict_types=1);

namespace TYPO3\CMS\VisualEditor\Service;

use TYPO3\CMS\Core\Domain\RecordInterface;
use TYPO3\CMS\Core\Schema\TcaSchema;
use TYPO3\CMS\Core\Schema\TcaSchemaFactory;

final readonly class RecordSchemaService
{
    public function __construct(
        private TcaSchemaFactory $tcaSchemaFactory,
    ) {
    }

    /**
     * The schema of the type of the record, for example "tt_content.text".
     * Records with a type that has no schema (anymore), for example the removed CType "list", get the schema of the table.
     */
    public function getSchema(RecordInterface $record): TcaSchema
    {
        $fullType = $record->getFullType();

        return $this->tcaSchemaFactory->has($fullType)
            ? $this->tcaSchemaFactory->get($fullType)
            : $this->tcaSchemaFactory->get($record->getMainType());
    }
}
