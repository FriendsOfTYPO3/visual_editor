<?php

declare(strict_types=1);

namespace TYPO3\CMS\VisualEditor\Service;

use TYPO3\CMS\Core\Domain\Record;
use TYPO3\CMS\Core\Domain\RecordFactory;
use TYPO3\CMS\Frontend\Page\PageInformation;

final readonly class RecordService
{
    public function __construct(private RecordFactory $recordFactory) {}

    public function getPageRecordAsRecordInterface(PageInformation $pageInformation): Record
    {
        return $this->recordFactory->createResolvedRecordFromDatabaseRow('pages', $pageInformation->getPageRecord());
    }
}
