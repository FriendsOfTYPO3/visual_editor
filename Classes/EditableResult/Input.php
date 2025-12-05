<?php

declare(strict_types=1);

namespace Andersundsehr\Editara\EditableResult;

final readonly class Input implements EditableResult
{
    public function __construct(
        public string $name,
        public string $html,
        public bool $isEmpty,
        public string $value,
    ) {}

    public function __toString(): string
    {
        return $this->html;
    }
}
