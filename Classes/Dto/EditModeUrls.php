<?php

declare(strict_types=1);

namespace TYPO3\CMS\VisualEditor\Dto;

final readonly class EditModeUrls
{
    public function __construct(
        public string $backendEditUrl,
        public string $newContentUrl,
        public string $editContentUrl,
        public ?string $editContentContextualUrl,
    ) {
    }
}
