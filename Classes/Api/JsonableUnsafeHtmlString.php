<?php

declare(strict_types=1);

namespace TYPO3\CMS\VisualEditor\Api;

use JsonSerializable;
use Stringable;
use TYPO3Fluid\Fluid\Core\Parser\UnsafeHTML;

final readonly class JsonableUnsafeHtmlString implements JsonSerializable, UnsafeHTML
{
    public function __construct(private string|Stringable $string)
    {
    }

    public function jsonSerialize(): mixed
    {
        return (string)$this->string;
    }

    public function __toString(): string
    {
        return (string)$this->string;
    }
}
