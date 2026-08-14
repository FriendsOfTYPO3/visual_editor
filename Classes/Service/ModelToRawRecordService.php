<?php

declare(strict_types=1);

namespace TYPO3\CMS\VisualEditor\Service;

use DateTimeInterface;
use ReflectionClass;
use TYPO3\CMS\Core\DataHandling\TableColumnType;
use TYPO3\CMS\Core\Domain\RawRecord;
use TYPO3\CMS\Core\Domain\Record;
use TYPO3\CMS\Core\Domain\RecordFactory;
use TYPO3\CMS\Core\Schema\TcaSchema;
use TYPO3\CMS\Core\Schema\TcaSchemaFactory;
use TYPO3\CMS\Extbase\DomainObject\DomainObjectInterface;
use TYPO3\CMS\Extbase\Persistence\Generic\LazyLoadingProxy;
use TYPO3\CMS\Extbase\Persistence\Generic\LazyObjectStorage;
use TYPO3\CMS\Extbase\Persistence\Generic\Mapper\DataMapFactory;
use function get_debug_type;
use function in_array;
use function is_int;

final readonly class ModelToRawRecordService
{
    public function __construct(
        private RecordFactory $recordFactory,
        private DataMapFactory $dataMapFactory,
        private TcaSchemaFactory $tcaSchema,
    ) {
    }

    /**
     * Extracts all possible information from the given Extbase model
     * and transforms it into a RawRecord that can be used there a RecordInterface is needed.
     */
    public function modelToRawRecord(DomainObjectInterface $model): RawRecord
    {
        $dataMap = $this->dataMapFactory->buildDataMap($model::class);
        $table = $dataMap->getTableName();
        $recordTypeField = $dataMap->getRecordTypeColumnName();
        $languageField = $dataMap->getLanguageIdColumnName();

        $row = [
            'uid' => $model->getUid(),
            'pid' => $model->getPid(),
            '_ORIG_uid' => $model->_getProperty('_versionedUid'),
            '_LOCALIZED_UID' => $model->_getProperty('_localizedUid'),
        ];
        if ($languageField) {
            $row[$languageField] = (int)$model->_getProperty('_languageUid');
        }

        foreach ($model->_getProperties() as $propertyName => $value) {
            $columnName = $dataMap->getColumnMap($propertyName)?->getColumnName();
            if (!$columnName) {
                continue;
            }

            // for now we only support scalar values
            if (!in_array(get_debug_type($value), ['null', 'bool', 'int', 'float', 'string'], true)) {
                continue;
            }

            $row[$columnName] = $value;
        }

        if ($recordTypeField && $dataMap->getRecordType()) {
            $row[$recordTypeField] = $dataMap->getRecordType();
        }

        return $this->recordFactory->createRawRecord($table, $row);
    }

    /**
     * Extracts all possible information from the given Extbase model
     * and transforms it into a RawRecord that can be used there a RecordInterface is needed.
     */
    public function modelToRecord(DomainObjectInterface $model): Record
    {
        $dataMap = $this->dataMapFactory->buildDataMap($model::class);
        $table = $dataMap->getTableName();
        $recordTypeField = $dataMap->getRecordTypeColumnName();
        $languageField = $dataMap->getLanguageIdColumnName();

        $row = [
            'uid' => $model->getUid(),
            'pid' => $model->getPid(),
            '_ORIG_uid' => $model->_getProperty('_versionedUid'),
            '_LOCALIZED_UID' => $model->_getProperty('_localizedUid'),
        ];
        if ($languageField) {
            $row[$languageField] = (int)$model->_getProperty('_languageUid');
        }
        $schema = $this->tcaSchema->get($table);

        foreach ($model->_getProperties() as $propertyName => $value) {
            $columnName = $dataMap->getColumnMap($propertyName)?->getColumnName();
            if (!$columnName) {
                continue;
            }

            if ($value === null) {
                if ($schema->getField($columnName)->isType(TableColumnType::DATETIME)) {
                    $value = 0;
                }
            }

            // for now we only support scalar values
            if (in_array(get_debug_type($value), ['null', 'bool', 'int', 'float', 'string'], true)) {
                $row[$columnName] = $value;
                continue;
            }

            if ($value instanceof DateTimeInterface) {
                $row[$columnName] = $value->getTimestamp();
                continue;
            }

            if ($value instanceof LazyObjectStorage) {
                $reflection = new ReflectionClass($value);
                $row[$columnName] = $reflection->getProperty('fieldValue')->getValue($value);
                continue;
            }

            if ($value instanceof LazyLoadingProxy) {
                $row[$columnName] = $value->getUid();
                continue;
            }

            continue;
        }

        // TODO replace with a more generic solution and real values:
        $row['t3ver_wsid'] ??= 0;
        $row['t3ver_oid'] ??= 0;
        $row['t3ver_state'] ??= 0;
        $row['t3ver_stage'] ??= 0;
        $row['deleted'] ??= 0;
        $row['l10n_parent'] ??= 0;
        $row['hidden'] ??= 0;
        $row['notes'] ??= '';

        if ($recordTypeField && $dataMap->getRecordType()) {
            $row[$recordTypeField] = $dataMap->getRecordType();
        }

        return $this->recordFactory->createResolvedRecordFromDatabaseRow($table, $row);
        return $this->recordFactory->createRawRecord($table, $row);
    }
}
