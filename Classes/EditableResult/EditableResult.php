<?php

declare(strict_types=1);

namespace TYPO3\CMS\VisualEditor\EditableResult;

use TYPO3Fluid\Fluid\Core\Parser\UnsafeHTML;

interface EditableResult extends UnsafeHTML
{
    public function getName(): string;

    public function getHtml(): string;

    public function isEmpty(): bool;
}
