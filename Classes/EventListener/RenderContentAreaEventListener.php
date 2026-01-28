<?php

declare(strict_types=1);

namespace TYPO3\CMS\VisualEditor\EventListener;

use TYPO3\CMS\Core\Attribute\AsEventListener;
use TYPO3\CMS\Core\Utility\GeneralUtility;
use TYPO3\CMS\Extbase\Utility\DebuggerUtility;
use TYPO3\CMS\Fluid\Event\ModifyRenderedContentAreaEvent;
use TYPO3\CMS\VisualEditor\Event\RenderContentAreaEvent as V13RenderContentAreaEvent;
use TYPO3\CMS\VisualEditor\Service\EditModeService;
use TYPO3Fluid\Fluid\Core\ViewHelper\TagBuilder;

final class RenderContentAreaEventListener
{
    public function __construct(
        private readonly EditModeService $editModeService,
    )
    {
    }

    #[AsEventListener]
    public function __invoke(ModifyRenderedContentAreaEvent|V13RenderContentAreaEvent $event): void
    {
        if (!$this->editModeService->isEditMode()) {
            return;
        }
        $this->editModeService->init();

        $tag = GeneralUtility::makeInstance(TagBuilder::class, 've-content-area', $event->getRenderedContentArea());
        $tag->forceClosingTag(true);
        $pageUid = $event->getRequest()->getAttribute('frontend.page.information')->getId();
        $tag->addAttribute('target', $pageUid);
        $tag->addAttribute('colPos', $event->getContentAreaConfiguration()['colPos']);
        if (isset($event->getContentAreaConfiguration()['tx_container_parent'])) {
            $tag->addAttribute('tx_container_parent', (string)$event->getContentAreaConfiguration()['tx_container_parent']);
        }
        $event->setRenderedContentArea($tag->render());
    }
}
