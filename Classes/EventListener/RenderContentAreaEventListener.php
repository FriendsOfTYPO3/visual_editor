<?php

declare(strict_types=1);

namespace TYPO3\CMS\VisualEditor\EventListener;

use B13\Container\Domain\Model\Container;
use TYPO3\CMS\Core\Attribute\AsEventListener;
use TYPO3\CMS\Core\Utility\GeneralUtility;
use TYPO3\CMS\Fluid\Event\ModifyRenderedContentAreaEvent;
use TYPO3\CMS\VisualEditor\BackwardsCompatibility\Event\RenderContentAreaEvent as V13RenderContentAreaEvent;
use TYPO3\CMS\VisualEditor\Service\EditModeService;
use TYPO3Fluid\Fluid\Core\ViewHelper\TagBuilder;

final readonly class RenderContentAreaEventListener
{
    public function __construct(
        private EditModeService $editModeService,
    ) {
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
        $tag->addAttribute('colPos', $event->getContentArea()->getColPos());
        $tag->addAttribute('columnName', $event->getContentArea()->getName());

        $extContainer = $event->getContentArea()->getConfiguration()['container'] ?? null;
        if ($extContainer instanceof Container) {
            $tag->addAttribute('tx_container_parent', (string)$extContainer->getUid());// TODO test this (test with sys_language_uid > 1)
        }

        // Backwards compatibility for TYPO3 13: (TODO remove this in TYPO3 15)
        $txContainerParent = $event->getContentArea()->getConfiguration()['tx_container_parent'] ?? null;
        if (is_int($txContainerParent)) {
            $tag->addAttribute('tx_container_parent', (string)$txContainerParent);
        }

        $event->setRenderedContentArea($tag->render());
    }
}
