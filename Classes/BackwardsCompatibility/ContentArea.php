<?php

declare(strict_types=1);

namespace TYPO3\CMS\VisualEditor\BackwardsCompatibility;

/**
 * @internal
 */
final readonly class ContentArea
{
    public function __construct(
        private int $colPos,
        private string $name,
        private int $tx_container_parent,
    )
    {
    }

    public function getColPos(): int
    {
        return $this->colPos;
    }

    public function getName(): string
    {
        return $this->name;
    }

    public function getConfiguration(): array
    {
        return [
            'tx_container_parent' => $this->tx_container_parent,
        ];
    }

    public function getAllowedContentTypes(): array
    {
        // TODO use content EXT:content_defender here?
        return [];
    }

    public function getDisallowedContentTypes(): array
    {
        // TODO use content EXT:content_defender here?
        return [];
    }
}
