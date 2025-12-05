<?php

declare(strict_types=1);

namespace Andersundsehr\Editara\EditableResult;

interface EditableResult
{
    public string $name {
        get;
    }
    public string $html {
        get;
    }
    public bool $isEmpty {
        get;
    }

    public function __toString(): string;
}
