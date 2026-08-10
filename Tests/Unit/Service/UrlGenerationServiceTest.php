<?php

declare(strict_types=1);

namespace TYPO3\CMS\VisualEditor\Tests\Unit\Service;

use Generator;
use GuzzleHttp\Psr7\ServerRequest;
use GuzzleHttp\Psr7\Uri;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\TestCase;
use Psr\EventDispatcher\EventDispatcherInterface;
use Psr\Http\Message\ServerRequestInterface;
use ReflectionProperty;
use RuntimeException;
use TYPO3\CMS\Backend\Routing\UriBuilder;
use TYPO3\CMS\Core\EventDispatcher\NoopEventDispatcher;
use TYPO3\CMS\Core\Information\Typo3Version;
use TYPO3\CMS\Core\Package\PackageManager;
use TYPO3\CMS\Core\Routing\PageArguments;
use TYPO3\CMS\Core\Site\Entity\SiteLanguage;
use TYPO3\CMS\Core\Utility\ExtensionManagementUtility;
use TYPO3\CMS\Frontend\Page\PageInformation;
use TYPO3\CMS\VisualEditor\Events\ModifyNewContentElementWizardUrlParameterEvent;
use TYPO3\CMS\VisualEditor\Service\UrlGenerationService;

final class UrlGenerationServiceTest extends TestCase
{
    /**
     * @param array<string, mixed> $arguments
     * @param array<string, mixed> $routeArguments
     * @param array<string, mixed> $expected
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

    #[Test]
    public function getBackendEditUrlReturnsUriForCurrentRequest(): void
    {
        self::assertSame(
            $this->buildUri('web_edit', [
                'id' => 42,
                'params' => $this->usedArguments(),
            ]),
            (string)$this->createSubject()->getBackendEditUrl($this->createRequest()),
        );
    }

    #[Test]
    public function generateUrlsReturnsUrlsForCurrentRequest(): void
    {
        $packageManagerProperty = new ReflectionProperty(ExtensionManagementUtility::class, 'packageManager');
        $originalPackageManager = $packageManagerProperty->getValue();
        $packageManager = $this->createStub(PackageManager::class);
        $packageManager->method('isPackageActive')->willReturn(true);
        ExtensionManagementUtility::setPackageManager($packageManager);

        $typo3Version = new Typo3Version();
        $backendEditUrl = $this->buildUri('web_edit', [
            'id' => 42,
            'params' => $this->usedArguments(),
        ]);
        $editParameters = [
            'edit' => ['__TABLE__' => ['__UID__' => 'edit']],
            'returnUrl' => $backendEditUrl,
            'module' => 'web_edit',
        ];

        try {
            $urls = $this->createSubject()->generateUrls($this->createRequest());

            self::assertSame($backendEditUrl, $urls->backendEditUrl);
            self::assertSame($this->buildUri('new_content_element_wizard', [
                'id' => 42,
                'colPos' => '__COL_POS__',
                'uid_pid' => '__UID_PID__',
                'tx_container_parent' => '__TX_CONTAINER_PARENT__',
                'returnUrl' => $backendEditUrl,
            ]), $urls->newContentUrl);
            self::assertSame($this->buildUri('record_edit', $editParameters), $urls->editContentUrl);
            self::assertSame(
                $typo3Version->getMajorVersion() >= 14
                    ? $this->buildUri('record_edit_contextual', $editParameters)
                    : null,
                $urls->editContentContextualUrl,
            );
        } finally {
            ExtensionManagementUtility::setPackageManager($originalPackageManager);
        }
    }

    #[Test]
    public function generateUrlsOmitsContainerParentWhenContainerIsNotInstalled(): void
    {
        $packageManagerProperty = new ReflectionProperty(ExtensionManagementUtility::class, 'packageManager');
        $originalPackageManager = $packageManagerProperty->getValue();
        $packageManager = $this->createStub(PackageManager::class);
        $packageManager->method('isPackageActive')->willReturn(false);
        ExtensionManagementUtility::setPackageManager($packageManager);

        $backendEditUrl = $this->buildUri('web_edit', [
            'id' => 42,
            'params' => $this->usedArguments(),
        ]);

        try {
            $urls = $this->createSubject()->generateUrls($this->createRequest());

            self::assertSame($this->buildUri('new_content_element_wizard', [
                'id' => 42,
                'colPos' => '__COL_POS__',
                'uid_pid' => '__UID_PID__',
                'returnUrl' => $backendEditUrl,
            ]), $urls->newContentUrl);
        } finally {
            ExtensionManagementUtility::setPackageManager($originalPackageManager);
        }
    }

    #[Test]
    public function generateUrlsUsesParametersModifiedByNewContentElementWizardEvent(): void
    {
        $request = $this->createRequest();
        $eventDispatcher = $this->createStub(EventDispatcherInterface::class);
        $eventDispatcher
            ->method('dispatch')
            ->willReturnCallback(function (object $event) use ($request): object {
                self::assertInstanceOf(ModifyNewContentElementWizardUrlParameterEvent::class, $event);
                self::assertSame(42, $event->getParameters()['id']);
                self::assertSame('__COL_POS__', $event->getParameters()['colPos']);
                self::assertSame('__UID_PID__', $event->getParameters()['uid_pid']);
                self::assertSame($this->usedArguments(), $event->getUsedArguments());
                self::assertSame($request, $event->getRequest());

                $event->setParameters(['eventParameter' => 'eventValue']);
                return $event;
            });

        $urls = $this->createSubject($eventDispatcher)->generateUrls($request);

        self::assertSame(
            $this->buildUri('new_content_element_wizard', ['eventParameter' => 'eventValue']),
            $urls->newContentUrl,
        );
    }

    /**
     * @param array<array-key, string|float|int|bool|null|array<mixed>> $input
     * @param array<string, string> $expected
     */
    #[Test]
    #[DataProvider('flattenBracketKeysDataProvider')]
    public function flattenBracketKeysFlattensNestedValuesAndCastsScalars(array $input, string $prefix, array $expected): void
    {
        self::assertSame($expected, $this->createSubject()->flattenBracketKeys($input, $prefix));
    }

    /**
     * @return Generator<string, array{input: array<array-key, mixed>, prefix: string, expected: array<string, string>}>
     */
    public static function flattenBracketKeysDataProvider(): Generator
    {
        yield 'nested values and scalar casts' => [
            'input' => [
                'params' => [
                    'tx_news_pi1' => [
                        'filters' => [
                            'news',
                            'limit' => 10,
                            'ratio' => 1.5,
                            'enabled' => true,
                            'disabled' => false,
                            'unset' => null,
                        ],
                    ],
                ],
            ],
            'prefix' => '',
            'expected' => [
                'params[tx_news_pi1][filters][0]' => 'news',
                'params[tx_news_pi1][filters][limit]' => '10',
                'params[tx_news_pi1][filters][ratio]' => '1.5',
                'params[tx_news_pi1][filters][enabled]' => '1',
                'params[tx_news_pi1][filters][disabled]' => '',
                'params[tx_news_pi1][filters][unset]' => '',
            ],
        ];

        yield 'provided prefix wraps top-level keys' => [
            'input' => [
                'filter' => [
                    'category' => 'news',
                    'tags' => [3, 7],
                ],
            ],
            'prefix' => 'params',
            'expected' => [
                'params[filter][category]' => 'news',
                'params[filter][tags][0]' => '3',
                'params[filter][tags][1]' => '7',
            ],
        ];

        yield 'sibling arrays and scalars retain numeric keys' => [
            'input' => [
                'items' => [2 => 'second', 0 => 'first'],
                'page' => 2,
            ],
            'prefix' => '',
            'expected' => [
                'items[2]' => 'second',
                'items[0]' => 'first',
                'page' => '2',
            ],
        ];

        yield 'empty arrays are omitted' => [
            'input' => [
                'filters' => [],
                'nested' => ['empty' => []],
            ],
            'prefix' => '',
            'expected' => [
                'filters' => '',
                'nested[empty]' => '',
            ],
        ];

        yield 'empty input stays empty with a prefix' => [
            'input' => [],
            'prefix' => 'params',
            'expected' => [],
        ];

        yield 'prefixed empty arrays use an empty value' => [
            'input' => ['filter' => []],
            'prefix' => 'params',
            'expected' => ['params[filter]' => ''],
        ];

        yield 'literal bracket key replaces nested key when it follows it' => [
            'input' => [
                'filter' => ['status' => 'nested'],
                'filter[status]' => 'literal',
            ],
            'prefix' => '',
            'expected' => ['filter[status]' => 'literal'],
        ];

        yield 'literal bracket key is retained when it precedes nested key' => [
            'input' => [
                'filter[status]' => 'literal',
                'filter' => ['status' => 'nested'],
            ],
            'prefix' => '',
            'expected' => ['filter[status]' => 'literal'],
        ];
    }

    /**
     * @return Generator<string, array{missingContext: string, exceptionCode: int, exceptionMessage: string}>
     */
    public static function invalidRequestContextDataProvider(): Generator
    {
        yield 'page information is missing' => ['missingContext' => 'pageInformation', 'exceptionCode' => 9965439961, 'exceptionMessage' => 'Could not determine current page information'];
        yield 'page id is zero' => ['missingContext' => 'pageId', 'exceptionCode' => 1768983081, 'exceptionMessage' => 'Could not determine current page id'];
        yield 'site language is missing' => ['missingContext' => 'siteLanguage', 'exceptionCode' => 3305745963, 'exceptionMessage' => 'Could not determine current site language'];
        yield 'routing is missing' => ['missingContext' => 'routing', 'exceptionCode' => 1773230232, 'exceptionMessage' => 'Could not determine current routing context'];
    }

    #[Test]
    #[DataProvider('invalidRequestContextDataProvider')]
    public function getBackendEditUrlThrowsExceptionForInvalidRequestContext(string $missingContext, int $exceptionCode, string $exceptionMessage): void
    {
        $this->expectException(RuntimeException::class);
        $this->expectExceptionCode($exceptionCode);
        $this->expectExceptionMessage($exceptionMessage);

        $this->createSubject()->getBackendEditUrl($this->createRequest($missingContext));
    }

    #[Test]
    #[DataProvider('invalidRequestContextDataProvider')]
    public function generateUrlsThrowsExceptionForInvalidRequestContext(string $missingContext, int $exceptionCode, string $exceptionMessage): void
    {
        $this->expectException(RuntimeException::class);
        $this->expectExceptionCode($exceptionCode);
        $this->expectExceptionMessage($exceptionMessage);

        $this->createSubject()->generateUrls($this->createRequest($missingContext));
    }

    private function createSubject(?EventDispatcherInterface $eventDispatcher = null): UrlGenerationService
    {
        return new UrlGenerationService(
            $eventDispatcher ?? new NoopEventDispatcher(),
            $this->createUriBuilderStub(),
            new Typo3Version(),
        );
    }

    private function createUriBuilderStub(): UriBuilder
    {
        $uriBuilder = $this->createStub(UriBuilder::class);
        $uriBuilder
            ->method('buildUriFromRoute')
            ->willReturnCallback(fn(string $routeName, array $parameters): Uri => new Uri($this->buildUri($routeName, $parameters)));
        return $uriBuilder;
    }

    private function createRequest(?string $missingContext = null): ServerRequestInterface
    {
        $request = new ServerRequest('GET', '/news/detail');
        if ($missingContext !== 'pageInformation') {
            $pageInformation = new PageInformation();
            $pageInformation->setId($missingContext === 'pageId' ? 0 : 42);
            $request = $request->withAttribute('frontend.page.information', $pageInformation);
        }

        if ($missingContext !== 'siteLanguage') {
            $request = $request->withAttribute('language', new SiteLanguage(0, 'en-US', new Uri('https://example.test/'), []));
        }

        if ($missingContext !== 'routing') {
            return $request->withAttribute('routing', new PageArguments(42, '0', [
                'tx_news_pi1' => [
                    'action' => 'detail',
                    'controller' => 'News',
                ],
            ], [], [
                'category' => 'press',
                'news' => '123',
                'cHash' => 'will-be-removed',
                'editMode' => '1',
            ]));
        }

        return $request;
    }

    /**
     * @return array<string, string|array<string, string>>
     */
    private function usedArguments(): array
    {
        return [
            'tx_news_pi1' => [
                'action' => 'detail',
                'controller' => 'News',
            ],
            'category' => 'press',
            'news' => '123',
        ];
    }

    /**
     * @param array<string, mixed> $parameters
     */
    private function buildUri(string $routeName, array $parameters): string
    {
        return 'https://example.test/typo3/' . $routeName . '?' . http_build_query($parameters, '', '&', PHP_QUERY_RFC3986);
    }
}
