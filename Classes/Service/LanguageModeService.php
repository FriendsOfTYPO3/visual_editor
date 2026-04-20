<?php

declare(strict_types=1);

namespace TYPO3\CMS\VisualEditor\Service;

use InvalidArgumentException;
use TYPO3\CMS\Core\Information\Typo3Version;
use Psr\Http\Message\ServerRequestInterface;
use TYPO3\CMS\Backend\Utility\BackendUtility;
use TYPO3\CMS\Core\Domain\Record;
use TYPO3\CMS\Core\Site\Entity\SiteLanguage;
use TYPO3\CMS\Core\Utility\GeneralUtility;
use TYPO3\CMS\Frontend\ContentObject\ContentObjectRenderer;
use TYPO3\CMS\Frontend\DataProcessing\PageContentFetchingProcessor;
use TYPO3\CMS\Frontend\Page\PageInformation;
use TYPO3\CMS\VisualEditor\Enum\LanguageMode;

final readonly class LanguageModeService
{
    public function __construct(private PageContentFetchingProcessor $pageContentFetchingProcessor, private Typo3Version $typo3Version)
    {
    }

    public function getBackendLanguageMode(PageInformation $pageInformation, ServerRequestInterface $request): LanguageMode
    {
        if ($pageInformation->getPageRecord()['sys_language_uid'] == 0) {
            return LanguageMode::Connected;
        }

        $isConnectedMode = false;
        $isFreeMode = false;

        if ($this->typo3Version->getMajorVersion() >= 14) {
            $pageLayout = $pageInformation->getPageLayout() ?? throw new InvalidArgumentException('PageLayout is not available in PageInformation', 1772464934);
            $groupedRecords = $pageLayout->getContentAreas()->getGroupedRecords($request);
        } else {
            $groupedRecords = $this->getGroupedRecordsTYPO3v13($pageInformation->getPageRecord(), $request);
        }

        foreach ($groupedRecords as $contentArea) {
            foreach ($contentArea['records'] as $record) {
                if (!$record instanceof Record) {
                    throw new InvalidArgumentException('Record array must implement ' . Record::class, 1321851682);
                }

                if ($record->getPid() !== $pageInformation->getId()) {
                    // skip records that are from slideMode
                    continue;
                }

                if ($record->getLanguageInfo()?->getTranslationParent()) {
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
    public function getAllowNewContent(PageInformation $pageInformation, SiteLanguage $language, ServerRequestInterface $request): bool
    {
        if ($language->getLanguageId() === 0) {
            return true;
        }

        $pageTsConfig = BackendUtility::getPagesTSconfig($pageInformation->getId());
        $allowInconsistentLanguageHandling = (bool)($pageTsConfig['mod.']['web_layout.']['allowInconsistentLanguageHandling'] ?? false);
        $languageMode = $this->getBackendLanguageMode($pageInformation, $request);
        if ($allowInconsistentLanguageHandling) {
            return true;
        }

        return $languageMode !== LanguageMode::Connected;
    }

    /**
     * @deprecated will be removed after TYPO3 v13 support is dropped
     * @param array<string, mixed> $pageRow
     * @return array<string, array{records: list<Record>}>
     */
    private function getGroupedRecordsTYPO3v13(array $pageRow, ServerRequestInterface $request): array
    {
        $contentObjectRenderer = GeneralUtility::makeInstance(ContentObjectRenderer::class);
        $contentObjectRenderer->setRequest($request);
        $contentObjectRenderer->start($pageRow, 'pages');
        return $this->pageContentFetchingProcessor->process(
            $contentObjectRenderer,
            [],
            [
                'as' => 'groupedRecords',
            ],
            [],
        )['groupedRecords'];
    }
}
