<?php

declare(strict_types=1);

namespace TYPO3\CMS\VisualEditor\ViewHelpers;

use Psr\Http\Message\ServerRequestInterface;
use TYPO3\CMS\Core\Context\Context;
use TYPO3\CMS\Core\Utility\GeneralUtility;
use TYPO3\CMS\Frontend\Page\PageInformation;
use TYPO3\CMS\VisualEditor\Service\EditModeService;
use TYPO3Fluid\Fluid\Core\ViewHelper\AbstractViewHelper;
use TYPO3Fluid\Fluid\Core\ViewHelper\TagBuilder;
use function json_encode;

final class ContentAreaViewHelper extends AbstractViewHelper
{
    protected $escapeOutput = false;

    public function __construct(private readonly EditModeService $editModeService)
    {
    }

    public function initializeArguments(): void
    {
        parent::initializeArguments();
        $this->registerArgument('colPos', 'int', 'The colPos number', true);
        $this->registerArgument('table', 'string', 'The table of the contentArea', false, 'tt_content');
        $this->registerArgument('pageUid', 'int', 'The pid of the contentArea', false, null);
        $this->registerArgument('updateFields', 'array', 'what should be updated additionally to the colPos (used for eg. sys_language_uid or tx_container_parent)', false, []);
    }

    public function render(): mixed
    {
        if (!$this->editModeService->isEditMode()) {
            return $this->renderChildren();
        }

        $this->editModeService->init();

        $tag = GeneralUtility::makeInstance(TagBuilder::class, 've-content-area', $this->renderChildren());
        $pageUid = $this->arguments['pageUid'] ?? $this->getPageInformation()->getId();
        $tag->addAttribute('target', $pageUid);
        $tag->addAttribute('colPos', (string)$this->arguments['colPos']);
        $updateFields = $this->arguments['updateFields'];
        $updateFields['sys_language_uid'] ??= GeneralUtility::makeInstance(Context::class)->getPropertyFromAspect('language', 'id');
        $tag->addAttribute('updateFields', json_encode($updateFields, JSON_THROW_ON_ERROR));
        return $tag->render();
    }

    private function getPageInformation(): PageInformation
    {
        $request = $this->renderingContext->getAttribute(ServerRequestInterface::class);
        $frontendPageInformation = $request->getAttribute('frontend.page.information');
        if (!$frontendPageInformation instanceof PageInformation) {
            throw new \RuntimeException('No frontend page information available');
        }
        return $frontendPageInformation;
    }
}
