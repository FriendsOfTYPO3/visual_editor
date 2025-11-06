<?php

declare(strict_types=1);

namespace Andersundsehr\Editara\ViewHelpers\Record;

use Doctrine\DBAL\ParameterType;
use TYPO3\CMS\Core\Database\ConnectionPool;
use TYPO3\CMS\Core\Domain\Persistence\RecordIdentityMap;
use TYPO3\CMS\Core\Domain\RecordFactory;
use TYPO3\CMS\Core\Domain\RecordInterface;
use TYPO3\CMS\Core\Domain\Repository\PageRepository;
use TYPO3\CMS\Core\Utility\GeneralUtility;
use TYPO3\CMS\Frontend\ContentObject\ContentObjectRenderer;
use TYPO3Fluid\Fluid\Core\ViewHelper\AbstractViewHelper;

use function sprintf;

/**
 * This viewHelper should only be used in Legacy Project to convert array data to Record objects
 * usage:
 * ````html
 * <e:record.load table="my_table" uid="12" />
 * {e:record.load(table: 'my_table', uid: 12)}
 *
 * <!-- or in an editable.input: -->
 * <e:editable.input record="{e:record.load(table: 'my_table', uid: 12)}" field="my_field" />
 * {e:editable.input(record: '{e:record.load(table: \'my_table\', uid: 12)}', field: 'my_field')}
 * ````
 */
final class LoadViewHelper extends AbstractViewHelper
{
    public function __construct(
        private RecordFactory $recordFactory,
        private readonly PageRepository $pageRepository,
        private readonly ConnectionPool $connectionPool,
    )
    {
    }

    public function initializeArguments(): void
    {
        $this->registerArgument('table', 'string', 'TableName of the data object', true);
        $this->registerArgument('uid', 'int', 'given uid for the record', true);
    }

    public function render(): RecordInterface
    {
        $table = $this->arguments['table'];
        $uid = (int)$this->arguments['uid'];
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
            ->where(
                $expr->or(
                    $expr->eq('uid', $queryBuilder->createNamedParameter($uid, ParameterType::INTEGER)),
                    $expr->eq('l10n_parent', $queryBuilder->createNamedParameter($uid, ParameterType::INTEGER))
                )
            )
            ->executeQuery()
            ->fetchAssociative();

        if ($row === null) {
            throw new \RuntimeException(sprintf('Record with uid %d in table %s not found', $uid, $table));
        }

        return $this->recordFactory->createResolvedRecordFromDatabaseRow($table, $row);
    }
}
