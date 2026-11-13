<?php

declare(strict_types=1);

namespace TYPO3\CMS\VisualEditor\Tests\Functional\Middleware;

use PHPUnit\Framework\Attributes\Test;
use TYPO3\CMS\Core\Configuration\SiteWriter;
use TYPO3\TestingFramework\Core\Functional\Framework\Frontend\InternalRequest;
use TYPO3\TestingFramework\Core\Functional\Framework\Frontend\InternalRequestContext;
use TYPO3\TestingFramework\Core\Functional\FunctionalTestCase;

/**
 * The frontend sub requests of the testing framework load the configuration of the test instance,
 * so the extension configuration is set with configurationToUseInTestInstance.
 */
final class EditModeMiddlewareConfiguredTablesTest extends FunctionalTestCase
{
    protected array $coreExtensionsToLoad = [
        'workspaces',
    ];

    protected array $testExtensionsToLoad = [
        __DIR__ . '/../Fixtures/Extensions/backend_user_session',
        __DIR__ . '/../Fixtures/Extensions/blog_example',
        'typo3conf/ext/visual_editor',
    ];

    protected array $configurationToUseInTestInstance = [
        'EXTENSIONS' => [
            'visual_editor' => [
                'showHiddenRecordsOfTables' => 'tx_blogexample_domain_model_post',
            ],
        ],
    ];

    protected function setUp(): void
    {
        parent::setUp();
        $this->importCSVDataSet(__DIR__ . '/Fixtures/hidden_records.csv');
        $this->setUpFrontendRootPage(1, ['EXT:visual_editor/Tests/Functional/Middleware/Fixtures/hidden_records.typoscript']);
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
            ],
        ]);
    }

    #[Test]
    public function editModeShowsHiddenRecordsOnlyOfConfiguredTables(): void
    {
        $request = (new InternalRequest('https://example.com/'))->withQueryParameters(['editMode' => 1]);
        $context = (new InternalRequestContext())->withBackendUserId(1)->withWorkspaceId(0);

        $content = (string)$this->executeFrontendSubRequest($request, $context)->getBody();

        self::assertStringContainsString('Visible content element', $content);
        self::assertStringContainsString('Hidden post', $content);
        self::assertStringNotContainsString('Hidden content element', $content);
        self::assertStringNotContainsString('Hidden file reference', $content);
    }
}
