<?php

declare(strict_types=1);

namespace TYPO3\CMS\VisualEditor\Tests\Functional\Service;

use Generator;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\Attributes\Test;
use TYPO3\CMS\Core\Http\ServerRequest;
use TYPO3\CMS\Core\Localization\LanguageServiceFactory;
use TYPO3\CMS\Frontend\ContentObject\ContentObjectRenderer;
use TYPO3\CMS\Frontend\Page\PageInformation;
use TYPO3\CMS\VisualEditor\Service\AppearanceDraftService;
use TYPO3\TestingFramework\Core\Functional\FunctionalTestCase;

final class AppearanceDraftServiceTest extends FunctionalTestCase
{
    protected array $testExtensionsToLoad = [
        'typo3conf/ext/visual_editor',
    ];

    protected function setUp(): void
    {
        parent::setUp();
        $this->importCSVDataSet(__DIR__ . '/Fixtures/appearance_fields.csv');
        $backendUser = $this->setUpBackendUser(1);
        $GLOBALS['LANG'] = $this->get(LanguageServiceFactory::class)->createFromUserPreferences($backendUser);
    }

    /**
     * @param array<string, mixed> $draft
     * @param array<string, mixed> $row
     * @param array<string, mixed> $expected
     */
    #[Test]
    #[DataProvider('overlayDataProvider')]
    public function overlayLaysTheDraftOverTheRecord(int $pageId, ?array $draft, string $table, array $row, array $expected): void
    {
        $pageInformation = new PageInformation();
        $pageInformation->setId($pageId);

        $request = (new ServerRequest('https://example.com/', 'POST'))
            ->withParsedBody($draft === null ? [] : ['veDraft' => $draft])
            ->withAttribute('frontend.page.information', $pageInformation);

        $subject = $this->get(AppearanceDraftService::class);
        $subject->load($request);

        self::assertSame($expected, $subject->overlay($table, $row));
    }

    /**
     * @return Generator<string, array{pageId: int, draft: array<mixed>|null, table: string, row: array<string, mixed>, expected: array<string, mixed>}>
     */
    public static function overlayDataProvider(): Generator
    {
        $row = ['uid' => 1, 'frame_class' => 'default', 'space_before_class' => ''];

        yield 'no draft' => [
            'pageId' => 1,
            'draft' => null,
            'table' => 'tt_content',
            'row' => $row,
            'expected' => $row,
        ];

        yield 'a configured field of the record' => [
            'pageId' => 1,
            'draft' => ['tt_content' => [1 => ['frame_class' => 'ruler-before']]],
            'table' => 'tt_content',
            'row' => $row,
            'expected' => ['uid' => 1, 'frame_class' => 'ruler-before', 'space_before_class' => ''],
        ];

        yield 'the localized uid of the record' => [
            'pageId' => 1,
            'draft' => ['tt_content' => [3 => ['frame_class' => 'ruler-before']]],
            'table' => 'tt_content',
            'row' => [...$row, '_LOCALIZED_UID' => 3],
            'expected' => ['uid' => 1, 'frame_class' => 'ruler-before', 'space_before_class' => '', '_LOCALIZED_UID' => 3],
        ];

        yield 'the uid of a version of the record' => [
            'pageId' => 1,
            'draft' => ['tt_content' => [2 => ['frame_class' => 'ruler-before']]],
            'table' => 'tt_content',
            'row' => [...$row, '_ORIG_uid' => 2],
            'expected' => ['uid' => 1, 'frame_class' => 'ruler-before', 'space_before_class' => '', '_ORIG_uid' => 2],
        ];

        yield 'an item that the page TSconfig adds' => [
            'pageId' => 5,
            'draft' => ['tt_content' => [6 => ['frame_class' => 'bg-dark']]],
            'table' => 'tt_content',
            'row' => ['uid' => 6, 'frame_class' => 'default'],
            'expected' => ['uid' => 6, 'frame_class' => 'bg-dark'],
        ];

        yield 'an item that another page adds' => [
            'pageId' => 1,
            'draft' => ['tt_content' => [1 => ['frame_class' => 'bg-dark']]],
            'table' => 'tt_content',
            'row' => $row,
            'expected' => $row,
        ];

        yield 'a record that does not exist' => [
            'pageId' => 1,
            'draft' => ['tt_content' => [99 => ['frame_class' => 'ruler-before']]],
            'table' => 'tt_content',
            'row' => ['uid' => 99, 'frame_class' => 'default'],
            'expected' => ['uid' => 99, 'frame_class' => 'default'],
        ];

        yield 'another record' => [
            'pageId' => 1,
            'draft' => ['tt_content' => [2 => ['frame_class' => 'ruler-before']]],
            'table' => 'tt_content',
            'row' => $row,
            'expected' => $row,
        ];

        yield 'another table' => [
            'pageId' => 1,
            'draft' => ['tt_content' => [1 => ['frame_class' => 'ruler-before']]],
            'table' => 'pages',
            'row' => $row,
            'expected' => $row,
        ];

        yield 'a value that is not an item' => [
            'pageId' => 1,
            'draft' => ['tt_content' => [1 => ['frame_class' => 'not-an-item']]],
            'table' => 'tt_content',
            'row' => $row,
            'expected' => $row,
        ];

        yield 'a field that is not configured' => [
            'pageId' => 1,
            'draft' => ['tt_content' => [1 => ['header' => 'Changed']]],
            'table' => 'tt_content',
            'row' => $row,
            'expected' => $row,
        ];

        yield 'a default field that the page removed' => [
            'pageId' => 2,
            'draft' => ['tt_content' => [1 => ['space_before_class' => 'extra-small']]],
            'table' => 'tt_content',
            'row' => $row,
            'expected' => $row,
        ];

        yield 'a field that the page added' => [
            'pageId' => 2,
            'draft' => ['tt_content' => [1 => ['layout' => '1']]],
            'table' => 'tt_content',
            'row' => [...$row, 'layout' => '0'],
            'expected' => ['uid' => 1, 'frame_class' => 'default', 'space_before_class' => '', 'layout' => '1'],
        ];

        yield 'a value that is not a string' => [
            'pageId' => 1,
            'draft' => ['tt_content' => [1 => ['frame_class' => ['ruler-before']]]],
            'table' => 'tt_content',
            'row' => $row,
            'expected' => $row,
        ];
    }

    #[Test]
    public function theContentObjectRendererStartsWithTheDraftValues(): void
    {
        $pageInformation = new PageInformation();
        $pageInformation->setId(1);

        $request = (new ServerRequest('https://example.com/', 'POST'))
            ->withParsedBody(['veDraft' => ['tt_content' => [1 => ['frame_class' => 'ruler-before']]]])
            ->withAttribute('frontend.page.information', $pageInformation);
        $this->get(AppearanceDraftService::class)->load($request);

        $contentObjectRenderer = $this->get(ContentObjectRenderer::class);
        $contentObjectRenderer->setRequest($request);
        $contentObjectRenderer->start(['uid' => 1, 'pid' => 1, 'frame_class' => 'default'], 'tt_content');

        $otherContentObjectRenderer = $this->get(ContentObjectRenderer::class);
        $otherContentObjectRenderer->setRequest($request);
        $otherContentObjectRenderer->start(['uid' => 2, 'pid' => 1, 'frame_class' => 'default'], 'tt_content');

        self::assertSame('ruler-before', $contentObjectRenderer->data['frame_class']);
        self::assertSame('default', $otherContentObjectRenderer->data['frame_class']);
    }
}
