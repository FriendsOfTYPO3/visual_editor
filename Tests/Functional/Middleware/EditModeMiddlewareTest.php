<?php

declare(strict_types=1);

namespace TYPO3\CMS\VisualEditor\Tests\Functional\Middleware;

use Generator;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\Attributes\Test;
use TYPO3\CMS\Core\Configuration\SiteWriter;
use TYPO3\TestingFramework\Core\Functional\Framework\Frontend\InternalRequest;
use TYPO3\TestingFramework\Core\Functional\Framework\Frontend\InternalRequestContext;
use TYPO3\TestingFramework\Core\Functional\FunctionalTestCase;

final class EditModeMiddlewareTest extends FunctionalTestCase
{
    protected array $coreExtensionsToLoad = [
        'workspaces',
    ];

    protected array $testExtensionsToLoad = [
        __DIR__ . '/../Fixtures/Extensions/backend_user_session',
        __DIR__ . '/../Fixtures/Extensions/blog_example',
        'typo3conf/ext/visual_editor',
    ];

    protected function setUp(): void
    {
        parent::setUp();
        $this->importCSVDataSet(__DIR__ . '/Fixtures/hidden_records.csv');
        $this->get(SiteWriter::class)->write('test', [
            'rootPageId' => 1,
            'base' => 'https://example.com/',
            'languages' => [
                [
                    'languageId' => 0,
                    'title' => 'English',
                    'locale' => 'en_US.UTF-8',
                    'base' => '/',
                ],
                [
                    'languageId' => 1,
                    'title' => 'German',
                    'locale' => 'de_DE.UTF-8',
                    'base' => '/de/',
                    'fallbackType' => 'strict',
                ],
            ],
        ]);
    }

    public static function hiddenRecordsDataProvider(): Generator
    {
        $renderings = [
            'TypoScript' => ['hidden_records.typoscript'],
            'Record API with Fluid' => ['hidden_records_record_api.typoscript'],
            'Extbase' => ['hidden_records.typoscript', 'hidden_records_extbase.typoscript'],
        ];
        foreach ($renderings as $rendering => $typoScriptFiles) {
            yield $rendering . ': edit mode shows hidden content elements, but no other hidden records' => [
                'typoScriptFiles' => $typoScriptFiles,
                'uri' => 'https://example.com/',
                'editMode' => true,
                'workspaceId' => 0,
                'expectedTexts' => [
                    'Visible content element',
                    'Hidden content element',
                    'Visible file reference',
                    'Visible post',
                ],
                'unexpectedTexts' => ['Hidden file reference', 'Hidden post', 'Live hidden post'],
            ];
            yield $rendering . ': edit mode shows hidden translated content elements, but no other hidden translations' => [
                'typoScriptFiles' => $typoScriptFiles,
                'uri' => 'https://example.com/de/',
                'editMode' => true,
                'workspaceId' => 0,
                'expectedTexts' => ['Hidden translated content element'],
                'unexpectedTexts' => ['Hidden translated post', 'Live hidden translated post'],
            ];
            yield $rendering . ': edit mode in a workspace shows translations that are only visible in the workspace' => [
                'typoScriptFiles' => $typoScriptFiles,
                'uri' => 'https://example.com/de/',
                'editMode' => true,
                'workspaceId' => 1,
                'expectedTexts' => ['Hidden translated content element', 'Workspace unhidden translated post'],
                'unexpectedTexts' => ['Hidden translated post', 'Live hidden translated post'],
            ];
            yield $rendering . ': edit mode in a workspace shows hidden content elements, but no other hidden records' => [
                'typoScriptFiles' => $typoScriptFiles,
                'uri' => 'https://example.com/',
                'editMode' => true,
                'workspaceId' => 1,
                'expectedTexts' => [
                    'Visible content element',
                    'Hidden content element',
                    'Workspace hidden content element',
                    'Visible post',
                    'Workspace unhidden post',
                ],
                'unexpectedTexts' => [
                    'Hidden file reference',
                    'Workspace hidden file reference',
                    'Hidden post',
                    'Live hidden post',
                    'Workspace hidden post',
                ],
            ];
            yield $rendering . ': frontend without edit mode shows no hidden records' => [
                'typoScriptFiles' => $typoScriptFiles,
                'uri' => 'https://example.com/',
                'editMode' => false,
                'workspaceId' => 0,
                'expectedTexts' => ['Visible content element', 'Visible file reference', 'Visible post'],
                'unexpectedTexts' => ['Hidden content element', 'Hidden file reference', 'Hidden post'],
            ];
        }
    }

    /**
     * @param list<string> $typoScriptFiles
     * @param list<string> $expectedTexts
     * @param list<string> $unexpectedTexts
     */
    #[Test]
    #[DataProvider('hiddenRecordsDataProvider')]
    public function editModeIncludesHiddenRecordsOnlyForContentElements(
        array $typoScriptFiles,
        string $uri,
        bool $editMode,
        int $workspaceId,
        array $expectedTexts,
        array $unexpectedTexts,
    ): void {
        $content = $this->renderPage($typoScriptFiles, $uri, $editMode, $workspaceId);

        $this->assertTexts($content, $expectedTexts, $unexpectedTexts);
    }

    public static function explicitlyQueriedHiddenRecordsDataProvider(): Generator
    {
        yield 'edit mode' => ['editMode' => true];
        yield 'frontend without edit mode' => ['editMode' => false];
    }

    #[Test]
    #[DataProvider('explicitlyQueriedHiddenRecordsDataProvider')]
    public function editModeKeepsHiddenRecordsThatAreQueriedExplicitly(bool $editMode): void
    {
        $content = $this->renderPage(
            ['hidden_records.typoscript', 'hidden_records_extbase.typoscript', 'hidden_records_extbase_ignore_hidden.typoscript'],
            'https://example.com/',
            $editMode,
            0,
        );

        $this->assertTexts($content, ['Visible post', 'Hidden post'], []);
    }

    #[Test]
    public function editModeDoesNotChangeFollowingRequests(): void
    {
        $this->renderPage(['hidden_records.typoscript'], 'https://example.com/', true, 0);

        $content = $this->renderPage(['hidden_records.typoscript'], 'https://example.com/', false, 0);

        $this->assertTexts($content, ['Visible content element'], ['Hidden content element']);
    }

    /**
     * @param list<string> $typoScriptFiles
     */
    private function renderPage(array $typoScriptFiles, string $uri, bool $editMode, int $workspaceId): string
    {
        $this->setUpFrontendRootPage(
            1,
            array_map(
                static fn(string $typoScriptFile): string => 'EXT:visual_editor/Tests/Functional/Middleware/Fixtures/' . $typoScriptFile,
                $typoScriptFiles,
            ),
        );
        $request = new InternalRequest($uri);
        $context = new InternalRequestContext();
        if ($editMode) {
            $request = $request->withQueryParameters(['editMode' => 1]);
            $context = $context->withBackendUserId(1)->withWorkspaceId($workspaceId);
        }

        return (string)$this->executeFrontendSubRequest($request, $context)->getBody();
    }

    /**
     * @param list<string> $expectedTexts
     * @param list<string> $unexpectedTexts
     */
    private function assertTexts(string $content, array $expectedTexts, array $unexpectedTexts): void
    {
        foreach ($expectedTexts as $expectedText) {
            self::assertStringContainsString($expectedText, $content);
        }

        foreach ($unexpectedTexts as $unexpectedText) {
            self::assertStringNotContainsString($unexpectedText, $content);
        }
    }
}
