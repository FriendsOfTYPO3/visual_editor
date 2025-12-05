<?php

declare(strict_types=1);

namespace Andersundsehr\Editara\Service;

use Exception;
use RuntimeException;
use TYPO3\CMS\Core\Database\ConnectionPool;
use TYPO3\CMS\Core\Domain\Record;
use TYPO3\CMS\Core\Domain\RecordFactory;
use TYPO3\CMS\Core\Schema\Capability\TcaSchemaCapability;
use TYPO3\CMS\Core\Schema\TcaSchemaFactory;
use TYPO3\CMS\Core\Site\Entity\Site;
use TYPO3\CMS\Core\Site\Entity\SiteLanguage;
use TYPO3\CMS\Frontend\Page\PageInformation;

use function json_decode;

final readonly class RecordService
{
    public function __construct(private RecordFactory $recordFactory) {}

    public function getPageRecordAsRecordInterface(PageInformation $pageInformation): Record
    {
        return $this->recordFactory->createResolvedRecordFromDatabaseRow('pages', $pageInformation->getPageRecord());
    }
}
