<?php

declare(strict_types=1);

namespace TYPO3\CMS\VisualEditor\Tests\Functional\Middleware;

use Generator;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\Attributes\Test;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;
use TYPO3\CMS\Core\Context\Context;
use TYPO3\CMS\Core\Http\Response;
use TYPO3\CMS\Core\Http\ServerRequest;
use TYPO3\CMS\VisualEditor\Context\EditModeAspect;
use TYPO3\CMS\VisualEditor\Middleware\EditModeMiddleware;
use TYPO3\TestingFramework\Core\Functional\FunctionalTestCase;

final class EditModeMiddlewareNestedRequestTest extends FunctionalTestCase
{
    protected array $testExtensionsToLoad = [
        'typo3conf/ext/visual_editor',
    ];

    public static function processDataProvider(): Generator
    {
        yield 'a request without an outer request does not keep the edit mode' => [
            'outerEditModeAspect' => null,
            'expectedEditModeAfterRequest' => false,
        ];
        yield 'a sub request during an edit mode request keeps the edit mode of the outer request' => [
            'outerEditModeAspect' => new EditModeAspect(true, ['tt_content']),
            'expectedEditModeAfterRequest' => true,
        ];
        yield 'a sub request during a request without edit mode keeps it without edit mode' => [
            'outerEditModeAspect' => new EditModeAspect(false, []),
            'expectedEditModeAfterRequest' => false,
        ];
    }

    #[Test]
    #[DataProvider('processDataProvider')]
    public function processRestoresTheEditModeOfTheOuterRequest(
        ?EditModeAspect $outerEditModeAspect,
        bool $expectedEditModeAfterRequest,
    ): void {
        $context = $this->get(Context::class);
        if ($outerEditModeAspect !== null) {
            $context->setAspect(EditModeAspect::IDENTIFIER, $outerEditModeAspect);
        }

        $handler = new class ($context) implements RequestHandlerInterface {
            public ?bool $editModeDuringRequest = null;

            public function __construct(private readonly Context $context)
            {
            }

            public function handle(ServerRequestInterface $request): ResponseInterface
            {
                $this->editModeDuringRequest = EditModeAspect::isEditMode($this->context);

                return new Response();
            }
        };

        $this->get(EditModeMiddleware::class)->process(new ServerRequest('https://example.com/'), $handler);

        self::assertFalse($handler->editModeDuringRequest);
        self::assertSame($outerEditModeAspect !== null, $context->hasAspect(EditModeAspect::IDENTIFIER));
        self::assertSame($expectedEditModeAfterRequest, EditModeAspect::isEditMode($context));
        self::assertSame(
            $expectedEditModeAfterRequest,
            EditModeAspect::showsHiddenRecordsOf($context, 'tt_content'),
        );
    }
}
