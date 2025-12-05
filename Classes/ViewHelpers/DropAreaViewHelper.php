<?php

declare(strict_types=1);

namespace Andersundsehr\Editara\ViewHelpers;

use Andersundsehr\Editara\Service\EditaraService;
use Psr\Http\Message\ServerRequestInterface;
use TYPO3\CMS\Core\Context\Context;
use TYPO3\CMS\Core\Utility\GeneralUtility;
use TYPO3\CMS\Frontend\Page\PageInformation;
use TYPO3Fluid\Fluid\Core\ViewHelper\AbstractViewHelper;
use TYPO3Fluid\Fluid\Core\ViewHelper\TagBuilder;

final class DropAreaViewHelper extends AbstractViewHelper
{
    protected $escapeOutput = false;

    public function __construct(private readonly EditaraService $editaraService)
    {
    }

    public function initializeArguments(): void
    {
        parent::initializeArguments();
        $this->registerArgument('colPos', 'int', 'The colPos number', true);
        $this->registerArgument('table', 'string', 'The table of the dropArea', false, 'tt_content');
        $this->registerArgument('pid', 'int', 'The pid of the dropArea', false, null);
        $this->registerArgument('sys_language_uid', 'int', 'The sys_language_uid of the dropArea', false, null);
    }

    public function render(): mixed
    {
        if (!$this->editaraService->isEditMode()) {
            return $this->renderChildren();
        }

        $tag = GeneralUtility::makeInstance(TagBuilder::class, 'editara-column', $this->renderChildren());
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
