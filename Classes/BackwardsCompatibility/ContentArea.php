<?php

declare(strict_types=1);

namespace TYPO3\CMS\VisualEditor\BackwardsCompatibility;

/**
 * @internal
 */
final readonly class ContentArea
{
    /**
     * @param list<string> $allowedContentTypes
     * @param list<string> $disallowedContentTypes
     */
    public function __construct(
        private int $colPos,
        private string $name,
        private int $tx_container_parent,
        private array $allowedContentTypes = [],
        private array $disallowedContentTypes = [],
    ) {
    }

    public function getColPos(): int
    {
        return $this->colPos;
    }

    public function getName(): string
    {
        return $this->name;
    }

    /**
     * @return array<string, mixed>
     */
    public function getConfiguration(): array
    {
        return [
            'tx_container_parent' => $this->tx_container_parent,
        ];
    }

    /**
     * @return list<string>
     */
    public function getAllowedContentTypes(): array
    {
        return $this->allowedContentTypes;
    }

    /**
     * @return list<string>
     */
    public function getDisallowedContentTypes(): array
    {
        return $this->disallowedContentTypes;
    }
}
