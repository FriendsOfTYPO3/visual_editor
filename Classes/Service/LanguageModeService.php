<?php

declare(strict_types=1);

namespace TYPO3\CMS\VisualEditor\Service;

use TYPO3\CMS\Backend\Utility\BackendUtility;
use TYPO3\CMS\Core\Domain\Record;
use TYPO3\CMS\Core\Site\Entity\SiteLanguage;
use TYPO3\CMS\Frontend\Page\PageInformation;
use TYPO3\CMS\VisualEditor\Enum\LanguageMode;
use function method_exists;

final readonly class LanguageModeService
{
    public function getBackendLanguageMode(PageInformation $pageInformation): LanguageMode
    {
        if ($pageInformation->getPageRecord()['sys_language_uid'] == 0) {
            return LanguageMode::Connected;
        }

        $isConnectedMode = false;
        $isFreeMode = false;

        $contentAreas = $pageInformation->getPageLayout()->getContentAreas();
        if (method_exists($contentAreas, 'getGroupedRecords')) {
            $groupedRecords = $contentAreas->getGroupedRecords();
        } else {
            $groupedRecords = $contentAreas;
        }

        foreach ($groupedRecords as $contentArea) {
            foreach ($contentArea['records'] as $record) {
                if (!$record instanceof Record) {
                    throw new \InvalidArgumentException('Record array must implement ' . Record::class);
                }
                if ($record->getPid() !== $pageInformation->getId()) {
                    // skip records that are from slideMode
                    continue;
                }
                if ($record->getLanguageInfo()->getTranslationParent()) {
                    $isConnectedMode = true;
                } else {
                    $isFreeMode = true;
                }
            }
        }
        if ($isConnectedMode && $isFreeMode) {
            return LanguageMode::Mixed;
        }
        if ($isConnectedMode) {
            return LanguageMode::Connected;
        }
        if ($isFreeMode) {
            return LanguageMode::Free;
        }
        return LanguageMode::Connected;
    }

    /**
     * logic from: \TYPO3\CMS\Backend\View\PageLayoutContext::getAllowNewContent (v14)
     */
    public function getAllowNewContent(PageInformation $pageInformation, SiteLanguage $language): bool
    {
        if ($language->getLanguageId() === 0) {
            return true;
        }
        $pageTsConfig = BackendUtility::getPagesTSconfig($pageInformation->getId());
        $allowInconsistentLanguageHandling = (bool)($pageTsConfig['mod.']['web_layout.']['allowInconsistentLanguageHandling'] ?? false);
        $langaugeMode = $this->getBackendLanguageMode($pageInformation);
        if (!$allowInconsistentLanguageHandling && $langaugeMode === LanguageMode::Connected) {
            return false;
        }
        return true;
    }
}
