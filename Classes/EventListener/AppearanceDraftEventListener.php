<?php

declare(strict_types=1);

namespace TYPO3\CMS\VisualEditor\EventListener;

use TYPO3\CMS\Core\Attribute\AsEventListener;
use TYPO3\CMS\Frontend\ContentObject\Event\AfterContentObjectRendererInitializedEvent;
use TYPO3\CMS\VisualEditor\Service\AppearanceDraftService;

final readonly class AppearanceDraftEventListener
{
    public function __construct(
        private AppearanceDraftService $appearanceDraftService,
    ) {
    }

    #[AsEventListener]
    public function __invoke(AfterContentObjectRendererInitializedEvent $event): void
    {
        $contentObjectRenderer = $event->getContentObjectRenderer();
        $contentObjectRenderer->data = $this->appearanceDraftService->overlay(
            $contentObjectRenderer->getCurrentTable(),
            $contentObjectRenderer->data,
        );
    }
}
