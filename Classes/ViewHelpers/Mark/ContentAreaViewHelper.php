<?php

declare(strict_types=1);

namespace TYPO3\CMS\VisualEditor\ViewHelpers\Mark;

use Psr\EventDispatcher\EventDispatcherInterface;
use Psr\Http\Message\ServerRequestInterface;
use TYPO3\CMS\VisualEditor\BackwardsCompatibility\ContentArea;
use TYPO3\CMS\VisualEditor\BackwardsCompatibility\Event\RenderContentAreaEvent;
use TYPO3Fluid\Fluid\Core\ViewHelper\AbstractViewHelper;

/**
 * ViewHelper to render a content area with possible modifications by event listeners.
 * This can be used to allow extensions to modify the output of content areas.
 * For example, for adding debug wrappers or editing features.
 *
 * @deprecated in TYPO3 14 you should use f:render.contentArea instead!!! (Will be removed in TYPO3 15)
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

    public function __construct(private readonly EventDispatcherInterface $eventDispatcher)
    {
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
        $request = $this->renderingContext->hasAttribute(ServerRequestInterface::class) ?
            $this->renderingContext->getAttribute(ServerRequestInterface::class) :
            null;

        $additionalArguments = $this->arguments;
        unset($additionalArguments['colPos'], $additionalArguments['pageUid']);

        $event = $this->eventDispatcher->dispatch(
            new RenderContentAreaEvent(
                renderedContentArea: $this->renderChildren(),
                contentArea: new ContentArea(
                    colPos: (int)$this->arguments['colPos'],
                    tx_container_parent: (int)$this->arguments['txContainerParent'],
                ),
                request: $request,
            ),
        );
        return $event->getRenderedContentArea();
    }
}
