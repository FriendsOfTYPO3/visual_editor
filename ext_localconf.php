<?php

declare(strict_types=1);

defined('TYPO3') || die('TYPO3 not defined.');

use TYPO3\CMS\Core\Utility\ExtensionManagementUtility;
use TYPO3\CMS\Fluid\Event\ModifyRenderedContentAreaEvent;
use TYPO3\CMS\VisualEditor\BackwardsCompatibility\Event\RenderContentAreaEvent as V13_RenderContentAreaEvent;

$GLOBALS['TYPO3_CONF_VARS']['SYS']['fluid']['namespaces']['f'][] = 'TYPO3\\CMS\\VisualEditor\\ViewHelpers';

ExtensionManagementUtility::addTypoScriptSetup("@import 'EXT:visual_editor/Configuration/TypoScript/setup.typoscript'");

if (!class_exists(ModifyRenderedContentAreaEvent::class)) {
    class_alias(V13_RenderContentAreaEvent::class, ModifyRenderedContentAreaEvent::class);
}
