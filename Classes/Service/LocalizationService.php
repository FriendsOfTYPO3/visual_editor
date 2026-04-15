<?php

declare(strict_types=1);

namespace TYPO3\CMS\VisualEditor\Service;

use InvalidArgumentException;
use TYPO3\CMS\Core\Localization\Locale;
use TYPO3\CMS\Extbase\Utility\LocalizationUtility;

final readonly class LocalizationService
{
    /**
     * @param array<array-key, mixed> $arguments
     */
    public function tryTranslation(string $label, ?array $arguments = null, Locale|string|null $languageKey = null): string
    {
        $languageKey ??=  $this->getBackendUserLanguage();

        try {
            return LocalizationUtility::translate($label, null, $arguments, $languageKey)
                ?? $label;
        } catch (InvalidArgumentException) {
            return $label;
        }
    }

    public function getBackendUserLanguage(): ?string
    {
        $backendUserAuthentication = $GLOBALS['BE_USER'];
        if ($backendUserAuthentication?->user['lang'] !== null) {
            return $backendUserAuthentication->user['lang'];
        }

        return null;
    }
}
