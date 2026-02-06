<?php

declare(strict_types=1);

namespace TYPO3\CMS\VisualEditor\Core\RichtText;

final readonly class RichTextConfigurationServiceDto
{
    public function __construct(
        public string $tableName,
        public int $uid,
        public string $fieldName,
        public string $recordTypeValue,
        public int $effectivePid,
        public string $richtextConfigurationName,
        public string $label = '',
        public string $placeholder = '',
        public bool $readOnly = false,
        private array $data = [],
        private array $additionalConfiguration = [],
        private array $externalPlugins = [],
    ) {
    }

    public function getData(): array
    {
        return $this->data;
    }

    public function getAdditionalConfiguration(): array
    {
        return $this->additionalConfiguration;
    }

    public function getExternalPlugins(): array
    {
        return $this->externalPlugins;
    }
}
