<?php

declare(strict_types=1);

namespace TYPO3\CMS\VisualEditor\Api;

use JsonSerializable;
use TYPO3Fluid\Fluid\Core\Parser\UnsafeHTML;
use TYPO3Fluid\Fluid\Core\ViewHelper\TagBuilder;

use function array_map;

final class CustomElement extends TagBuilder implements JsonSerializable, UnsafeHTML
{
    protected bool $forceClosingTag = true;

    public function jsonSerialize(): mixed
    {
        return [
            'tag' => $this->tagName,
            'arguments' => array_map(htmlspecialchars_decode(...), $this->attributes),
            'content' => $this->content,
        ];
    }

    public function __toString(): string
    {
        return $this->render();
    }
}
