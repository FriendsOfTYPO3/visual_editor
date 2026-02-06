<?php

declare(strict_types=1);

namespace TYPO3\CMS\VisualEditor\ViewHelpers;

use RuntimeException;
use Psr\EventDispatcher\EventDispatcherInterface;
use Psr\Http\Message\ServerRequestInterface;
use TYPO3\CMS\Fluid\Event\ModifyRenderedContentAreaEvent;
use TYPO3\CMS\Frontend\Page\PageInformation;
use TYPO3Fluid\Fluid\Core\ViewHelper\AbstractViewHelper;

/**
 * ViewHelper to render a content area with possible modifications by event listeners.
 * This can be used to allow extensions to modify the output of content areas.
 * For example, for adding debug wrappers or editing features.
 *
 *  ```
 *    <f:contentArea colPos="3">
 *        <f:cObject typoscriptObjectPath="lib.dynamicContent" data="{colPos: '3'}"/>
 *    </f:contentArea>
 *  ```
 *  ```
 *    <f:contentArea colPos="3" tx_container_parent="{record.tx_container_parent}">
 *        <f:for each="{children_200}" as="record">
 *            {record.renderedContent -> f:format.raw()}
 *        </f:for>
 *    </f:contentArea>
 *  ```
 */
final class ContentAreaViewHelper extends AbstractViewHelper
{
    protected $escapeOutput = false;

    public function __construct(private readonly EventDispatcherInterface $eventDispatcher)
    {
    }

    public function initializeArguments(): void
    {
        parent::initializeArguments();
        $this->registerArgument('colPos', 'int', 'The colPos number', true);
        $this->registerArgument('pageUid', 'int', 'The pid of the contentArea', false);
        // this class is a 100% copy of the core ContentAreaViewHelper, it is here for adding the tx_container_parent argument and making it available for TYPO3 13
        $this->registerArgument('tx_container_parent', 'int', 'if you have EXT:container you need to add record.tx_container_parent', false);
    }


    public function render(): string
    {
        $request = $this->renderingContext->hasAttribute(ServerRequestInterface::class) ?
            $this->renderingContext->getAttribute(ServerRequestInterface::class) :
            null;

        $additionalArguments = $this->arguments;
        unset($additionalArguments['colPos'], $additionalArguments['pageUid']);

        // TODO
        $event = $this->eventDispatcher->dispatch(
            new ModifyRenderedContentAreaEvent(
                renderedContentArea: $this->renderChildren(),
                request: $request,
                contentAreaConfiguration: $this->arguments['colPos'],
                pageUid: $this->arguments['pageUid'] ?? $this->getCurrentPageUid($request),
                additionalArguments: $additionalArguments,
            ),
        );
        return $event->getRenderedContentArea();
    }

    private function getCurrentPageUid(ServerRequestInterface|null $request): int
    {
        if (!$request instanceof ServerRequestInterface) {
            throw new RuntimeException('No request available', 1769000378);
        }

        $frontendPageInformation = $request->getAttribute('frontend.page.information');
        if (!$frontendPageInformation instanceof PageInformation) {
            throw new RuntimeException('No frontend page information available', 1769000379);
        }

        return $frontendPageInformation->getId();
    }
}
