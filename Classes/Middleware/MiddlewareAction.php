<?php

declare(strict_types=1);

namespace TYPO3\CMS\VisualEditor\Middleware;

enum MiddlewareAction
{
    case Edit;
    case Save;
    case None;
}
