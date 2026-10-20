<?php

declare(strict_types=1);

namespace TYPO3\CMS\VisualEditor\Tests\Functional\Backend\Controller;

use PHPUnit\Framework\Attributes\Test;
use TYPO3\CMS\Core\Http\ServerRequest;
use TYPO3\CMS\Core\Http\Stream;
use TYPO3\CMS\Core\Localization\LanguageServiceFactory;
use TYPO3\CMS\VisualEditor\Backend\Controller\AppearanceItemsController;
use TYPO3\TestingFramework\Core\Functional\FunctionalTestCase;

use function array_column;
use function json_decode;
use function json_encode;

use const JSON_THROW_ON_ERROR;

final class AppearanceItemsControllerTest extends FunctionalTestCase
{
    protected array $testExtensionsToLoad = [
        'typo3conf/ext/visual_editor',
    ];

    protected function setUp(): void
    {
        parent::setUp();
        $this->importCSVDataSet(__DIR__ . '/../../Service/Fixtures/appearance_fields.csv');
        $backendUser = $this->setUpBackendUser(1);
        $GLOBALS['LANG'] = $this->get(LanguageServiceFactory::class)->createFromUserPreferences($backendUser);
    }

    #[Test]
    public function itemsActionAnswersWithTheItemsOfTheFields(): void
    {
        $response = $this->get(AppearanceItemsController::class)->itemsAction($this->createRequest([
            'table' => 'tt_content',
            'uid' => 1,
            'pageId' => 1,
            'fields' => ['frame_class'],
            'values' => ['frame_class' => 'none'],
        ]));

        $body = json_decode((string)$response->getBody(), true, 512, JSON_THROW_ON_ERROR);

        self::assertSame(200, $response->getStatusCode());
        self::assertSame('none', $body['fields']['frame_class']['value']);
        self::assertContains('indent', array_column($body['fields']['frame_class']['items'], 'value'));
    }

    #[Test]
    public function itemsActionRefusesARequestWithoutARecord(): void
    {
        $response = $this->get(AppearanceItemsController::class)->itemsAction($this->createRequest(['table' => 'tt_content']));

        self::assertSame(400, $response->getStatusCode());
    }

    /**
     * @param array<string, mixed> $payload
     */
    private function createRequest(array $payload): ServerRequest
    {
        $body = new Stream('php://temp', 'rw');
        $body->write(json_encode($payload, JSON_THROW_ON_ERROR));

        return (new ServerRequest('https://example.com/typo3/ajax/visual-editor/appearance-items', 'POST'))
            ->withHeader('Content-Type', 'application/json')
            ->withBody($body);
    }
}
