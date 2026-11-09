<?php

declare(strict_types=1);

namespace TYPO3\CMS\VisualEditor\Tests\Functional\ViewHelpers\Render;

use Generator;
use InvalidArgumentException;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\Attributes\Test;
use TYPO3\CMS\Core\Core\SystemEnvironmentBuilder;
use TYPO3\CMS\Core\Domain\RecordFactory;
use TYPO3\CMS\Core\Http\NormalizedParams;
use TYPO3\CMS\Core\Http\ServerRequest;
use TYPO3\CMS\Core\Schema\TcaSchemaFactory;
use TYPO3\CMS\Core\Site\Entity\NullSite;
use TYPO3\CMS\Fluid\Core\Rendering\RenderingContextFactory;
use TYPO3\CMS\VisualEditor\EditableResult\Input;
use TYPO3\TestingFramework\Core\Functional\FunctionalTestCase;
use TYPO3Fluid\Fluid\View\TemplateView;

final class NumberViewHelperTest extends FunctionalTestCase
{
    protected array $testExtensionsToLoad = [
        'typo3conf/ext/visual_editor',
    ];

    protected function setUp(): void
    {
        parent::setUp();
        $GLOBALS['TCA']['tt_content']['columns']['tx_ve_integer'] = [
            'label' => 'Integer',
            'config' => ['type' => 'number'],
        ];
        $GLOBALS['TCA']['tt_content']['columns']['tx_ve_decimal'] = [
            'label' => 'Decimal',
            'config' => ['type' => 'number', 'format' => 'decimal', 'nullable' => true],
        ];
        $GLOBALS['TCA']['tt_content']['types']['text']['showitem'] .= ',tx_ve_integer,tx_ve_decimal';
        $this->get(TcaSchemaFactory::class)->rebuild($GLOBALS['TCA']);
    }

    /**
     * @param array<string, mixed> $row
     */
    #[Test]
    #[DataProvider('numberRenderingDataProvider')]
    public function numberIsRenderedFormatted(string $template, array $row, string $expectedHtml, bool $expectedEmpty, string $expectedValue): void
    {
        $result = $this->renderTemplate($template, $row);

        self::assertInstanceOf(Input::class, $result);
        self::assertSame($expectedHtml, $result->getHtml());
        self::assertSame($expectedEmpty, $result->isEmpty());
        self::assertSame($expectedValue, $result->value);
    }

    public static function numberRenderingDataProvider(): Generator
    {
        yield 'integer without decimals by default' => [
            'template' => "{record -> ve:render.number(field: 'tx_ve_integer', thousandsSeparator: '.')}",
            'row' => ['tx_ve_integer' => 1234567],
            'expectedHtml' => '1.234.567',
            'expectedEmpty' => false,
            'expectedValue' => '1234567',
        ];
        yield 'decimal with two decimals by default' => [
            'template' => "{record -> ve:render.number(field: 'tx_ve_decimal')}",
            'row' => ['tx_ve_decimal' => '1234.5'],
            'expectedHtml' => '1,234.50',
            'expectedEmpty' => false,
            'expectedValue' => '1234.5',
        ];
        yield 'explicit format arguments' => [
            'template' => "{record -> ve:render.number(field: 'tx_ve_decimal', decimals: 1, decimalSeparator: ',', thousandsSeparator: ' ')}",
            'row' => ['tx_ve_decimal' => '-9876.54'],
            'expectedHtml' => '-9 876,5',
            'expectedEmpty' => false,
            'expectedValue' => '-9876.54',
        ];
        yield 'separators are escaped' => [
            'template' => "{record -> ve:render.number(field: 'tx_ve_integer', thousandsSeparator: '<b>')}",
            'row' => ['tx_ve_integer' => 1000],
            'expectedHtml' => '1&lt;b&gt;000',
            'expectedEmpty' => false,
            'expectedValue' => '1000',
        ];
        yield 'zero is not empty' => [
            'template' => "{record -> ve:render.number(field: 'tx_ve_integer')}",
            'row' => ['tx_ve_integer' => 0],
            'expectedHtml' => '0',
            'expectedEmpty' => false,
            'expectedValue' => '0',
        ];
        yield 'null is rendered empty' => [
            'template' => "{record -> ve:render.number(field: 'tx_ve_decimal')}",
            'row' => ['tx_ve_decimal' => null],
            'expectedHtml' => '',
            'expectedEmpty' => true,
            'expectedValue' => '',
        ];
    }

    #[Test]
    public function nonNumberFieldThrowsException(): void
    {
        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionCode(1778400004);

        $this->renderTemplate("{record -> ve:render.number(field: 'header')}", ['header' => '42']);
    }

    /**
     * @param array<string, mixed> $row
     */
    private function renderTemplate(string $template, array $row): mixed
    {
        $request = new ServerRequest(
            'https://typo3.localhost/',
            'GET',
            'php://input',
            [],
            ['HTTP_HOST' => 'typo3.localhost'],
        );
        $request = $request
            ->withAttribute('applicationType', SystemEnvironmentBuilder::REQUESTTYPE_FE)
            ->withAttribute('normalizedParams', NormalizedParams::createFromRequest($request))
            ->withAttribute('language', (new NullSite())->getDefaultLanguage());
        $GLOBALS['TYPO3_REQUEST'] = $request;

        $context = $this->get(RenderingContextFactory::class)->create([], $request);
        $context->getTemplatePaths()->setTemplateSource(
            '{namespace ve=TYPO3\\CMS\\VisualEditor\\ViewHelpers}' . $template,
        );
        $view = new TemplateView($context);
        $view->assign('record', $this->get(RecordFactory::class)->createRawRecord('tt_content', [
            'uid' => 1,
            'pid' => 1,
            'CType' => 'text',
            ...$row,
        ]));

        return $view->render();
    }
}
