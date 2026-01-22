<?php

declare(strict_types=1);

/*
 * This file is part of the TYPO3 CMS project.
 *
 * It is free software; you can redistribute it and/or modify it under
 * the terms of the GNU General Public License, either version 2
 * of the License, or any later version.
 *
 * For the full copyright and license information, please read the
 * LICENSE.txt file that was distributed with this source code.
 *
 * The TYPO3 project - inspiring people to share!
 */

namespace TYPO3\CMS\VisualEditor\Event;


use Psr\Http\Message\ServerRequestInterface;
use function class_exists;

/**
 * Event to modify the rendered content area output.
 * This can be used to alter the final HTML of a content area,
 * for example to render a debug wrapper around it.
 */
final class RenderContentAreaEvent
{
    /**
     * @param array<string, mixed> $additionalArguments
     */
    public function __construct(
        private string $renderedContentArea,
        private readonly int $colPos,
        private readonly int $pageUid,
        private readonly array $additionalArguments,
        private readonly ?ServerRequestInterface $request,
    )
    {
    }

    public function getRenderedContentArea(): string
    {
        return $this->renderedContentArea;
    }

    public function getColPos(): int
    {
        return $this->colPos;
    }

    public function getPageUid(): int
    {
        return $this->pageUid;
    }

    /**
     * @return array<string, mixed>
     */
    public function getAdditionalArguments(): array
    {
        return $this->additionalArguments;
    }

    public function getRequest(): ?ServerRequestInterface
    {
        return $this->request;
    }

    /**
     * Set the rendered content areas HTML
     * make sure to return escaped content if necessary
     */
    public function setRenderedContentArea(string $renderedContentArea): void
    {
        $this->renderedContentArea = $renderedContentArea;
    }
}
