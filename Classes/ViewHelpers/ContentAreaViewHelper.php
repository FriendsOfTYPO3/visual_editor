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
        $this->registerArgument('table', 'string', 'The table of the dropArea', false, 'tt_content');
        $this->registerArgument('pid', 'int', 'The pid of the dropArea', false, null);
        // TODO add parent element for EXT:container
    }

    public function render(): mixed
    {
        $this->editModeService->init();

        if (!$this->editModeService->isEditMode()) {
            return $this->renderChildren();
        }

        $tag = GeneralUtility::makeInstance(TagBuilder::class, 've-column', $this->renderChildren());
        $pid = $this->arguments['pid'] ?? $this->getPageInformation()->getId();
        $tag->addAttribute('target', $pid);
        $tag->addAttribute('colPos', (string)$this->arguments['colPos']);
        $sysLanguageUid = $this->arguments['sys_language_uid'] ?? GeneralUtility::makeInstance(Context::class)->getPropertyFromAspect('language', 'id');
        $tag->addAttribute('sys_language_uid', (string)$sysLanguageUid);
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
