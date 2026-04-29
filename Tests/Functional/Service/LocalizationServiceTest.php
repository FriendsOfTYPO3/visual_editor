<?php

declare(strict_types=1);

namespace TYPO3\CMS\VisualEditor\Tests\Functional\Service;

use TYPO3\CMS\Core\Authentication\BackendUserAuthentication;
use TYPO3\CMS\VisualEditor\Service\LocalizationService;
use TYPO3\TestingFramework\Core\Functional\FunctionalTestCase;

final class LocalizationServiceTest extends FunctionalTestCase
{
    protected array $testExtensionsToLoad = [
        'typo3conf/ext/visual_editor',
    ];

    protected function tearDown(): void
    {
        unset($GLOBALS['BE_USER']);
        parent::tearDown();
    }

    public function testTryTranslationLoadsDefaultLanguageLabelFromExtensionFile(): void
    {
        $subject = new LocalizationService();

        self::assertSame(
            'Save',
            $subject->tryTranslation(
                'LLL:EXT:visual_editor/Resources/Private/Language/locallang.xlf:save',
                null,
                'en'
            )
        );
    }

    public function testTryTranslationUsesBackendUserLanguageWhenNoLanguageIsGiven(): void
    {
        $backendUser = new BackendUserAuthentication();
        $backendUser->user['lang'] = 'de';
        $GLOBALS['BE_USER'] = $backendUser;

        $subject = new LocalizationService();

        self::assertSame(
            'Speichern',
            $subject->tryTranslation('LLL:EXT:visual_editor/Resources/Private/Language/locallang.xlf:save')
        );
    }

    public function testTryTranslationReturnsLabelKeyWhenTranslationNotFound(): void
    {
        $subject = new LocalizationService();

        $label = 'LLL:EXT:visual_editor/Resources/Private/Language/locallang.xlf:nonexistent';
        self::assertSame(
            $label,
            $subject->tryTranslation($label, null, 'en')
        );
    }

    public function testTryTranslationWithArgumentsSubstitution(): void
    {
        $subject = new LocalizationService();

        self::assertSame(
            'Save 5 changes',
            $subject->tryTranslation(
                'LLL:EXT:visual_editor/Resources/Private/Language/locallang.xlf:save.changes',
                [5],
                'en'
            )
        );
    }

    public function testTryTranslationWithFallback(): void
    {
        $subject = new LocalizationService();

        $result = $subject->tryTranslation(
            'LLL:EXT:visual_editor/Resources/Private/Language/locallang.xlf:save',
            null,
            'fr',
        );

        self::assertEquals('Save', $result);
    }

    public function testTryTranslationReturnsOriginalLabelWhenBackendUserNotSet(): void
    {
        $subject = new LocalizationService();

        $result = $subject->tryTranslation(
            'LLL:EXT:visual_editor/Resources/Private/Language/locallang.xlf:save'
        );

        self::assertEquals('Save', $result);
    }

    public function testGetBackendUserLanguageReturnsLanguageWhenBackendUserExists(): void
    {
        $backendUser = new BackendUserAuthentication();
        $backendUser->user['lang'] = 'de';
        $GLOBALS['BE_USER'] = $backendUser;

        $subject = new LocalizationService();

        self::assertSame('de', $subject->getBackendUserLanguage());
    }

    public function testGetBackendUserLanguageReturnsNullWhenBackendUserNotSet(): void
    {
        $subject = new LocalizationService();

        self::assertNull($subject->getBackendUserLanguage());
    }

    public function testGetBackendUserLanguageReturnsNullWhenLanguageNotSetInUser(): void
    {
        $backendUser = new BackendUserAuthentication();
        $GLOBALS['BE_USER'] = $backendUser;

        $subject = new LocalizationService();

        self::assertNull($subject->getBackendUserLanguage());
    }

    public function testTryTranslationLoadsMultipleTranslationsWithDifferentKeys(): void
    {
        $subject = new LocalizationService();

        self::assertSame(
            'Save',
            $subject->tryTranslation('LLL:EXT:visual_editor/Resources/Private/Language/locallang.xlf:save', null, 'en')
        );

        self::assertSame(
            'Saving ...',
            $subject->tryTranslation('LLL:EXT:visual_editor/Resources/Private/Language/locallang.xlf:saving', null, 'en')
        );

        self::assertSame(
            'reset changes',
            $subject->tryTranslation('LLL:EXT:visual_editor/Resources/Private/Language/locallang.xlf:frontend.resetChanges', null, 'en')
        );
    }
}
