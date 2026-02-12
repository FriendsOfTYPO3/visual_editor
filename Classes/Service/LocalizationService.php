<?php

declare(strict_types=1);

namespace TYPO3\CMS\VisualEditor\Service;

use TYPO3\CMS\Core\Localization\Locale;
use TYPO3\CMS\Extbase\Utility\LocalizationUtility;

final readonly class LocalizationService
{

    public function tryTranslation(string $label, ?array $arguments = null, Locale|string|null $languageKey = null): string
    {
        $languageKey ??=  $this->getBackendUserLanguage();

        try {
            return LocalizationUtility::translate($label, arguments: $arguments, languageKey: $languageKey);
        } catch (\InvalidArgumentException) {
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
