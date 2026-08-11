<?php

declare(strict_types=1);

namespace TYPO3\CMS\VisualEditor\Api;

use Psr\Http\Message\ServerRequestInterface;
use TYPO3\CMS\Core\Domain\RecordInterface;

interface TextFieldRendererInterface
{
    public function renderFromValues(
        string $fullType,
        int $uid,
        int $pid,
        int $localizedUid,
        int $versionedUid,
        string $field,
        string $value,
        ServerRequestInterface $request,
        ?string $typeValue = null
    ): CustomElement|JsonableUnsafeHtmlString|null;

    public function render(RecordInterface $record, string $field, ServerRequestInterface $request, bool $optional): CustomElement|JsonableUnsafeHtmlString|null;
}
