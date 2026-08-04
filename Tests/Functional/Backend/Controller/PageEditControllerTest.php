<?php

declare(strict_types=1);

namespace TYPO3\CMS\VisualEditor\Tests\Functional\Backend\Controller;

use PHPUnit\Framework\Attributes\Test;
use Psr\Http\Message\UriInterface;
use ReflectionMethod;
use TYPO3\CMS\Backend\Module\ModuleData;
use TYPO3\CMS\Core\Http\ServerRequest;
use TYPO3\CMS\Core\Localization\LanguageServiceFactory;
use TYPO3\CMS\Core\Site\Entity\Site;
use TYPO3\CMS\Frontend\Page\CacheHashCalculator;
use TYPO3\CMS\VisualEditor\Backend\Controller\PageEditController;
use TYPO3\TestingFramework\Core\Functional\FunctionalTestCase;

final class PageEditControllerTest extends FunctionalTestCase
{
    protected array $testExtensionsToLoad = [
        'typo3conf/ext/visual_editor',
    ];

    protected function setUp(): void
    {
        parent::setUp();
        $this->importCSVDataSet(__DIR__ . '/Fixtures/pages.csv');
        $backendUser = $this->setUpBackendUser(1);
        $GLOBALS['LANG'] = $this->get(LanguageServiceFactory::class)->createFromUserPreferences($backendUser);
    }

    #[Test]
    public function translatedIframeUrlUsesDefaultPageUidForCacheHash(): void
    {
        $site = new Site('test', 1, [
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
                ],
            ],
        ]);
        $request = (new ServerRequest('https://example.com/typo3/module/web/edit'))
            ->withAttribute('site', $site)
            ->withAttribute('moduleData', new ModuleData('web_edit', ['languages' => [1]]))
            ->withQueryParams([
                'id' => 2,
                'params' => ['testing' => ['value' => 1]],
            ]);
        $subject = $this->get(PageEditController::class);
        (new ReflectionMethod($subject, 'initialize'))->invoke($subject, $request);

        /** @var UriInterface $iframeUrl */
        $iframeUrl = (new ReflectionMethod($subject, 'iframeUrl'))->invoke($subject, $request, $site->getLanguageById(1));
        parse_str($iframeUrl->getQuery(), $queryParameters);
        $expectedCacheHash = $this->get(CacheHashCalculator::class)->generateForParameters(http_build_query([
            'id' => 2,
            'testing' => ['value' => 1],
            'editMode' => 1,
        ]));

        self::assertSame('/de/translated-page', $iframeUrl->getPath());
        self::assertSame('1', $queryParameters['editMode']);
        self::assertSame(['value' => '1'], $queryParameters['testing']);
        self::assertSame($expectedCacheHash, $queryParameters['cHash']);
    }
}
