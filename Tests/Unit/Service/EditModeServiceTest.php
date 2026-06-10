<?php

declare(strict_types=1);

namespace TYPO3\CMS\VisualEditor\Tests\Unit\Service;

use PHPUnit\Framework\MockObject\Exception;
use Generator;
use GuzzleHttp\Psr7\ServerRequest;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\TestCase;
use ReflectionClass;
use RuntimeException;
use TYPO3\CMS\Core\Routing\PageArguments;
use TYPO3\CMS\VisualEditor\Service\EditModeService;

final class EditModeServiceTest extends TestCase
{
    /**
     * @param array<string, mixed> $arguments
     * @param array<string, mixed> $routeArguments
     * @param array<string, mixed> $expected
     * @throws Exception
     */
    #[Test]
    #[DataProvider('usedArgumentsDataProvider')]
    public function getUsedArgumentsReplacesDuplicateRouteArguments(array $arguments, array $routeArguments, array $expected): void
    {
        $routing = $this->createStub(PageArguments::class);
        $routing
            ->method('getArguments')
            ->willReturn($arguments);
        $routing
            ->method('getRouteArguments')
            ->willReturn($routeArguments);

        $request = (new ServerRequest('GET', '/news/detail'))->withAttribute('routing', $routing);

        self::assertSame($expected, $this->createSubject()->getUsedArguments($request));
    }

    /**
     * @return Generator<string, array{arguments: array<mixed>, routeArguments: array<mixed>, expected: array<mixed>}>
     */
    public static function usedArgumentsDataProvider(): Generator
    {
        yield 'keeps duplicate plugin route arguments scalar' => [
            'arguments' => [
                'tx_news_pi1' => [
                    'action' => 'detail',
                    'controller' => 'News',
                    'news' => '123',
                ],
                'cHash' => 'will-be-removed',
                'editMode' => '1',
            ],
            'routeArguments' => [
                'tx_news_pi1' => [
                    'action' => 'detail',
                    'controller' => 'News',
                ],
            ],
            'expected' => [
                'tx_news_pi1' => [
                    'action' => 'detail',
                    'controller' => 'News',
                    'news' => '123',
                ],
            ],
        ];

        yield 'route arguments replace nested dynamic values' => [
            'arguments' => [
                'tx_news_pi1' => [
                    'action' => 'list',
                    'controller' => 'News',
                ],
                'category' => 'press',
            ],
            'routeArguments' => [
                'tx_news_pi1' => [
                    'action' => 'detail',
                ],
            ],
            'expected' => [
                'tx_news_pi1' => [
                    'action' => 'detail',
                    'controller' => 'News',
                ],
                'category' => 'press',
            ],
        ];

        yield 'keeps repeated query argument values as list' => [
            'arguments' => [
                'filter' => [
                    '123',
                    '456',
                ],
            ],
            'routeArguments' => [],
            'expected' => [
                'filter' => [
                    '123',
                    '456',
                ],
            ],
        ];
    }

    #[Test]
    public function getUsedArgumentsThrowsExceptionIfRoutingIsMissing(): void
    {
        $this->expectException(RuntimeException::class);
        $this->expectExceptionCode(1773230232);
        $this->expectExceptionMessage('Could not determine current routing context');

        $this->createSubject()->getUsedArguments(new ServerRequest('GET', '/'));
    }

    private function createSubject(): EditModeService
    {
        return (new ReflectionClass(EditModeService::class))->newInstanceWithoutConstructor();
    }
}
