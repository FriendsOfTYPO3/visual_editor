<?php

declare(strict_types=1);

namespace TYPO3\CMS\VisualEditor\EventListener;

use TYPO3\CMS\Core\Attribute\AsEventListener;
use TYPO3\CMS\Frontend\ContentObject\Event\AfterStdWrapFunctionsExecutedEvent;
use TYPO3\CMS\VisualEditor\Service\ContentElementWrapperService;

final readonly class AfterStdWrapFunctionsExecutedEventListener
{
    public function __construct(
        private ContentElementWrapperService $contentElementWrapperService,
    ) {
    }

    #[AsEventListener]
    public function __invoke(AfterStdWrapFunctionsExecutedEvent $event): void
    {
        if (!($event->getConfiguration()['wrapContentElementsWithVeWrapper'] ?? false)) {
            return;
        }

        $contentObjectRenderer = $event->getContentObjectRenderer();

        $request = $contentObjectRenderer->getRequest();
        $content = $this->contentElementWrapperService->wrapContentElementHtml(
            $contentObjectRenderer->getCurrentTable(),
            $contentObjectRenderer->data,
            $event->getContent(),
            $request,
        );
        $event->setContent($content);
    }
}
