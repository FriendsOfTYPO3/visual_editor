<?php

declare(strict_types=1);

namespace TYPO3\CMS\VisualEditor\EventListener;

use TYPO3\CMS\Core\Attribute\AsEventListener;
use TYPO3\CMS\Frontend\ContentObject\Event\AfterStdWrapFunctionsExecutedEvent;
use TYPO3\CMS\VisualEditor\Service\ContentElementWrapperService;

final class AfterStdWrapFunctionsExecutedEventListener
{
    public function __construct(
        private readonly ContentElementWrapperService $contentElementWrapperService,
    )
    {
    }

    #[AsEventListener]
    public function __invoke(AfterStdWrapFunctionsExecutedEvent $event): void
    {
        if (!($event->getConfiguration()['wrapContentElementsWithVeWrapper'] ?? false)) {
            return;
        }

        $contentObjectRenderer = $event->getContentObjectRenderer();

        $content = $this->contentElementWrapperService->wrapContentElementHtml(
            $contentObjectRenderer->getCurrentTable(),
            $contentObjectRenderer->data,
            $event->getContent(),
        );
        $event->setContent($content);
    }
}
