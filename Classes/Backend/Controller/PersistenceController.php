<?php

declare(strict_types=1);

namespace TYPO3\CMS\VisualEditor\Backend\Controller;

use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use RuntimeException;
use TYPO3\CMS\Backend\Attribute\AsController;
use TYPO3\CMS\Core\Http\JsonResponse;
use TYPO3\CMS\VisualEditor\Service\DataHandlerService;

use function array_keys;
use function implode;
use function is_array;

#[AsController]
final readonly class PersistenceController
{
    public function __construct(
        private DataHandlerService $dataHandlerService,
    ) {
    }

    public function saveAction(ServerRequestInterface $request): ResponseInterface
    {
        $input = $this->getJsonPayload($request);

        $data = $input['data'] ?? [];
        unset($input['data']);
        $cmdArray = $input['cmdArray'] ?? [];
        unset($input['cmdArray']);
        if (!is_array($data)) {
            throw new RuntimeException('Data must be an array of table names to rows', 5781185589);
        }

        if (!is_array($cmdArray)) {
            throw new RuntimeException('Command array must be a list of DataHandler commands', 4576273831);
        }

        if ($input !== []) {
            throw new RuntimeException('Unknown data operations: ' . implode(', ', array_keys($input)) . ' only data and cmdArray are allowed', 8110225095);
        }

        $GLOBALS['TYPO3_REQUEST'] = $request;
        $errorLog = $this->dataHandlerService->run($data, []);

        foreach ($cmdArray as $cmd) {
            $errorLog = [...$errorLog, ...$this->dataHandlerService->run([], $cmd)];
        }

        if ($errorLog) {
            return new JsonResponse(['success' => false, 'errorLog' => $errorLog], 500);
        }

        return new JsonResponse(['success' => true]);
    }

    /**
     * @return array<string, mixed>
     */
    private function getJsonPayload(ServerRequestInterface $request): array
    {
        $payload = $request->getParsedBody();
        if (!is_array($payload)) {
            $payload = json_decode((string)$request->getBody(), true, 512, JSON_THROW_ON_ERROR);
        }

        if (!is_array($payload)) {
            throw new RuntimeException('Save payload must be a JSON object', 2634277014);
        }

        return $payload;
    }
}
