<?php

declare(strict_types=1);

namespace TYPO3\CMS\VisualEditor\ViewHelpers\Mark;

use Exception;
use B13\Container\Tca\Registry;
use InvalidArgumentException;
use Psr\Http\Message\ServerRequestInterface;
use TYPO3\CMS\Backend\Utility\BackendUtility;
use TYPO3\CMS\Core\EventDispatcher\EventDispatcher;
use TYPO3\CMS\Core\Information\Typo3Version;
use TYPO3\CMS\Core\Utility\GeneralUtility;
use TYPO3\CMS\Frontend\Page\PageInformation;
use TYPO3\CMS\VisualEditor\BackwardsCompatibility\ContentArea;
use TYPO3\CMS\VisualEditor\BackwardsCompatibility\Event\RenderContentAreaEvent;
use TYPO3\CMS\VisualEditor\Service\EditModeService;
use TYPO3\CMS\VisualEditor\Service\LocalizationService;
use TYPO3Fluid\Fluid\Core\ViewHelper\AbstractViewHelper;

/**
 * ViewHelper to render a content area with possible modifications by event listeners.
 * This can be used to allow extensions to modify the output of content areas.
 * For example, for adding debug wrappers or editing features.
 *
 * @deprecated In TYPO3 14 you should use f:render.contentArea instead!!! (Will be removed in TYPO3 15)
 *
 *  ```
 *    <f:mark.contentArea colPos="3">
 *        <f:cObject typoscriptObjectPath="lib.dynamicContent" data="{colPos: '3'}"/>
 *    </f:mark.contentArea>
 *  ```
 *  ```
 *    <f:mark.contentArea colPos="3" txContainerParent="{record.tx_container_parent}">
 *        <f:for each="{children_200}" as="record">
 *            {record.renderedContent -> f:format.raw()}
 *        </f:for>
 *    </f:mark.contentArea>
 *  ```
 */
final class ContentAreaViewHelper extends AbstractViewHelper
{
    protected $escapeOutput = false;

    public function __construct(
        private readonly EventDispatcher $eventDispatcher,
        private readonly EditModeService $editModeService,
        private readonly LocalizationService $localizationService,
        private readonly Typo3Version $typo3Version,
    ) {
    }

    public function initializeArguments(): void
    {
        parent::initializeArguments();
        $this->registerArgument('colPos', 'int', 'The colPos number', true);
        // this class is a 100% copy of the core ContentAreaViewHelper, it is here for adding the tx_container_parent argument and making it available for TYPO3 13
        $this->registerArgument('txContainerParent', 'int', 'if you have EXT:container you need to add record.tx_container_parent', false, 0);
    }

    public function render(): string
    {
        $renderingContext = $this->renderingContext ?? throw new InvalidArgumentException('$this->renderingContext is not available', 1772464212);
        $request = $renderingContext->getAttribute(ServerRequestInterface::class);

        $this->editModeService->init($request);

        $additionalArguments = $this->arguments;
        unset($additionalArguments['colPos'], $additionalArguments['pageUid']);

        $colPos = (int)$this->arguments['colPos'];
        $txContainerParent = (int)$this->arguments['txContainerParent'];

        $event = $this->eventDispatcher->dispatch(
            new RenderContentAreaEvent(
                renderedContentArea: $this->renderChildren(),
                contentArea: $this->getContentArea($request, $colPos, $txContainerParent),
                request: $request,
            ),
        );
        return $event->getRenderedContentArea();
    }

    private function getContentArea(ServerRequestInterface $request, int $colPos, int $txContainerParent): ContentArea
    {
        if ($txContainerParent) {
            // TODO combine this with the code from getAllowedContentTypes and getDisallowedContentTypes to avoid multiple calls to BackendUtility::getRecord and Registry::getColPosName
            $row = BackendUtility::getRecord('tt_content', $txContainerParent) ?? throw new InvalidArgumentException(
                'Container parent record not found',
                1773147534,
            );
            $containerRegistry = GeneralUtility::makeInstance(Registry::class);
            $name = $this->localizationService->tryTranslation($containerRegistry->getColPosName($row['CType'], $colPos) ?? (string)$colPos);
            $allowedContentTypes = $containerRegistry->getContentDefenderConfiguration($row['CType'], $colPos)['allowed.']['CType'] ?? '';
            $allowedContentTypes = GeneralUtility::trimExplode(',', $allowedContentTypes, true);
            $disallowedContentTypes = $containerRegistry->getContentDefenderConfiguration($row['CType'], $colPos)['disallowed.']['CType'] ?? '';
            $disallowedContentTypes = GeneralUtility::trimExplode(',', $disallowedContentTypes, true);

            return new ContentArea(
                colPos: $colPos,
                name: $name,
                tx_container_parent: $txContainerParent,
                allowedContentTypes: $allowedContentTypes,
                disallowedContentTypes: $disallowedContentTypes,
            );
        }

        /** @var PageInformation $pageInformation */
        $pageInformation = $request->getAttribute('frontend.page.information');
        $pageLayout = $pageInformation->getPageLayout() ?? throw new InvalidArgumentException('PageLayout is not available', 1772464283);
        foreach ($pageLayout->getContentAreas() as $contentArea) {
            if ($this->typo3Version->getMajorVersion() >= 14) {
                $contentAreaColPos = $contentArea->getColPos();
                $name = $contentArea->getName();
                /** @var list<string> $allowed */
                $allowed = $contentArea->getAllowedContentTypes();
                /** @var list<string> $disallowed */
                $disallowed = $contentArea->getDisallowedContentTypes();
            } else {
                $contentAreaColPos = (int)$contentArea['colPos'];
                $name = $contentArea['name'];
                $allowed = GeneralUtility::trimExplode(',', $contentArea['allowed.']['CType'] ?? '', true);
                $disallowed = GeneralUtility::trimExplode(',', $contentArea['disallowed.']['CType'] ?? '', true);
            }

            if ($contentAreaColPos === $colPos) {
                $name = $this->localizationService->tryTranslation($name);

                return new ContentArea(
                    colPos: $colPos,
                    name: $name,
                    tx_container_parent: 0,
                    allowedContentTypes: $allowed,
                    disallowedContentTypes: $disallowed,
                );
            }
        }

        throw new Exception('Content area with colPos ' . $colPos . ' not found in page layout', 1773150282);
    }
}
