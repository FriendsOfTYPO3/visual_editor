<?php

declare(strict_types=1);

namespace TYPO3\CMS\VisualEditor\EditableResult;

final readonly class RichText implements EditableResult
{
    public function __construct(
        public string $name,
        public string $html,
        public bool $isEmpty,
        public string $value,
    ) {
    }

    public function __toString(): string
    {
        return $this->html;
    }

    public function getName(): string
    {
        return $this->name;
    }

    public function getHtml(): string
    {
        return $this->html;
    }

    public function isEmpty(): bool
    {
        return $this->isEmpty;
    }
}
