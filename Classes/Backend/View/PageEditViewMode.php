<?php

declare(strict_types=1);

namespace TYPO3\CMS\VisualEditor\Backend\View;

enum PageEditViewMode: int
{
    case SingleLanguage = 1;
    case MultiLanguage = 2;

    public function getLabel(): string
    {
        return match ($this) {
            self::SingleLanguage => 'LLL:EXT:visual_editor/Resources/Private/Language/locallang_mod.xlf:viewMode.singleLanguage',
            self::MultiLanguage => 'LLL:EXT:visual_editor/Resources/Private/Language/locallang_mod.xlf:viewMode.multiLanguage',
        };
    }
}
