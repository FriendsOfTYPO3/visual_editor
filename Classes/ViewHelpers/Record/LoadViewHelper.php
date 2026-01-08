<?php

declare(strict_types=1);

namespace TYPO3\CMS\VisualEditor\ViewHelpers\Record;

use Doctrine\DBAL\ParameterType;
use TYPO3\CMS\Core\Context\Context;
use TYPO3\CMS\Core\Database\ConnectionPool;
use TYPO3\CMS\Core\Domain\Access\RecordAccessVoter;
use TYPO3\CMS\Core\Domain\Persistence\RecordIdentityMap;
use TYPO3\CMS\Core\Domain\RecordFactory;
use TYPO3\CMS\Core\Domain\RecordInterface;
use TYPO3\CMS\Core\Domain\Repository\PageRepository;
use TYPO3\CMS\Core\Utility\GeneralUtility;
use TYPO3Fluid\Fluid\Core\ViewHelper\AbstractViewHelper;
use function sprintf;

/**
 * This viewHelper should only be used in Legacy Project to convert array data to Record objects
 * usage:
 * ````html
 * <f:record.load table="my_table" uid="12" />
 * {f:record.load(table: 'my_table', uid: 12)}
 *
 * <!-- or in an editable.input: -->
 * <f:render.text record="{f:record.load(table: 'my_table', uid: 12)}" field="my_field" />
 * {f:render.text(record: '{f:record.load(table: \'my_table\', uid: 12)}', field: 'my_field')}
 * ````
 */
final class LoadViewHelper extends AbstractViewHelper
{
    public function __construct(
        private readonly RecordFactory $recordFactory,
        private readonly PageRepository $pageRepository,
        private readonly ConnectionPool $connectionPool,
        private readonly RecordAccessVoter $recordAccessVoter,
        private readonly Context $context,
    )
    {
    }

    public function initializeArguments(): void
    {
        $this->registerArgument('table', 'string', 'TableName of the data object', true);
        $this->registerArgument('uid', 'int', 'given uid for the record', true);
        $this->registerArgument('returnNullOnNotFound', 'bool', 'if not set it will throw on not found', false, false);
    }

    public function render(): ?RecordInterface
    {
        $table = $this->arguments['table'];
        $uid = (int)$this->arguments['uid'];
        $returnNullOnNotFound = (bool)$this->arguments['returnNullOnNotFound'];

        if ($uid <= 0) {
            throw new \InvalidArgumentException('UID must be greater than 0');
        }

        $recordIdentityMap = GeneralUtility::makeInstance(RecordIdentityMap::class);
        if ($recordIdentityMap->hasIdentifier($table, $uid)) {
            return $recordIdentityMap->findByIdentifier($table, $uid);
        }
        $queryBuilder = $this->connectionPool->getQueryBuilderForTable($table);
        $expr = $queryBuilder->expr();
        $row = $queryBuilder
            ->select('*')
            ->from($table)
            ->where($expr->eq('uid', $queryBuilder->createNamedParameter($uid, ParameterType::INTEGER)))
            ->executeQuery()
            ->fetchAssociative();

        if ($row === null) {
            if ($returnNullOnNotFound) {
                return null;
            }
            throw new \RuntimeException(sprintf('Record with uid %d in table %s not found', $uid, $table));
        }

        $this->pageRepository->versionOL($table, $row);
        if ($row === false) {
            if ($returnNullOnNotFound) {
                return null;
            }
            throw new \RuntimeException(sprintf('Record with uid %d in table %s not found after version overlay', $uid, $table));
        }

        $row = $this->pageRepository->getLanguageOverlay($table, $row);
        if ($row === null) {
            if ($returnNullOnNotFound) {
                return null;
            }
            throw new \RuntimeException(sprintf('Record with uid %d in table %s not found after language overlay', $uid, $table));
        }

        if (!$this->recordAccessVoter->accessGranted($table, $row, $this->context)) {
            if ($returnNullOnNotFound) {
                return null;
            }
            throw new \RuntimeException(sprintf('Access to record with uid %d in table %s is denied', $uid, $table));
        }

        return $this->recordFactory->createResolvedRecordFromDatabaseRow($table, $row);
    }
}
