<?php

declare(strict_types=1);

namespace TYPO3\CMS\VisualEditor\Tests\Functional\ViewHelpers\Render;

use Generator;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\Attributes\Test;
use TYPO3\CMS\Core\Configuration\SiteWriter;
use TYPO3\CMS\Core\Core\SystemEnvironmentBuilder;
use TYPO3\CMS\Core\Domain\RecordFactory;
use TYPO3\CMS\Core\Http\NormalizedParams;
use TYPO3\CMS\Core\Http\ServerRequest;
use TYPO3\CMS\Core\Site\Entity\NullSite;
use TYPO3\CMS\Fluid\Core\Rendering\RenderingContextFactory;
use TYPO3\CMS\VisualEditor\EditableResult\RichText;
use TYPO3\TestingFramework\Core\Functional\FunctionalTestCase;
use TYPO3Fluid\Fluid\View\TemplateView;

final class TextViewHelperTest extends FunctionalTestCase
{
    protected array $testExtensionsToLoad = [
        'typo3conf/ext/visual_editor',
    ];

    protected function setUp(): void
    {
        parent::setUp();
        $this->importCSVDataSet(__DIR__ . '/Fixtures/pages.csv');
        $this->setUpBackendUser(1);
        $this->get(SiteWriter::class)->write('typo3-localhost', [
            'rootPageId' => 1,
            'base' => 'https://typo3.localhost/',
            'languages' => [
                [
                    'languageId' => 0,
                    'title' => 'English',
                    'navigationTitle' => 'English',
                    'base' => '/',
                    'locale' => 'en_US.UTF-8',
                    'flag' => 'global',
                ],
            ],
        ]);
    }

    #[Test]
    #[DataProvider('backendRichTextRenderingDataProvider')]
    public function richTextIsRenderedInBackendContext(string $value, string $expected): void
    {
        $request = new ServerRequest(
            'https://typo3-2.localhost/',
            'GET',
            'php://input',
            [],
            ['HTTP_HOST' => 'typo3-2.localhost'],
        );
        $request = $request
            ->withAttribute('applicationType', SystemEnvironmentBuilder::REQUESTTYPE_BE)
            ->withAttribute('normalizedParams', NormalizedParams::createFromRequest($request))
            ->withAttribute('language', (new NullSite())->getDefaultLanguage());
        $GLOBALS['TYPO3_REQUEST'] = $request;

        $context = $this->get(RenderingContextFactory::class)->create([], $request);
        $context->getTemplatePaths()->setTemplateSource(
            "{namespace ve=TYPO3\\CMS\\VisualEditor\\ViewHelpers}"
            . "{record -> ve:render.text(field: 'bodytext')}",
        );
        $view = new TemplateView($context);
        $view->assign('record', $this->get(RecordFactory::class)->createRawRecord('tt_content', [
            'uid' => 1,
            'pid' => 1,
            'CType' => 'text',
            'bodytext' => $value,
        ]));

        $result = $view->render();

        self::assertInstanceOf(RichText::class, $result);
        self::assertSame($expected, $result->getHtml());
    }

    public static function backendRichTextRenderingDataProvider(): Generator
    {
        yield 'sanitizes unsafe attributes' => [
            'value' => '<img src="/image.png" onerror="alert(1)">',
            'expected' => '<img src="/image.png">',
        ];
        yield 'transforms internal links' => [
            'value' => '<a href="t3://page?uid=1">Root</a>',
            'expected' => '<a href="https://typo3.localhost/">Root</a>',
        ];
    }
}
