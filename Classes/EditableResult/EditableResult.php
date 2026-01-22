<?php

declare(strict_types=1);

namespace TYPO3\CMS\VisualEditor\EditableResult;

use TYPO3Fluid\Fluid\Core\Parser\UnsafeHTML;

interface EditableResult extends UnsafeHTML
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
