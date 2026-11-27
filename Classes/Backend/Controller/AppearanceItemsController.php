<?php

declare(strict_types=1);

namespace TYPO3\CMS\VisualEditor\Backend\Controller;

use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use TYPO3\CMS\Backend\Attribute\AsController;
use TYPO3\CMS\Backend\Form\Exception\AccessDeniedException;
use TYPO3\CMS\Core\Http\JsonResponse;
use TYPO3\CMS\VisualEditor\Service\AppearanceItemsService;

use function array_filter;
use function array_map;
use function array_values;
use function is_array;
use function is_scalar;
use function is_string;
use function json_decode;

use const JSON_THROW_ON_ERROR;

#[AsController]
final readonly class AppearanceItemsController
{
    public function __construct(
        private AppearanceItemsService $appearanceItemsService,
    ) {
    }

    public function itemsAction(ServerRequestInterface $request): ResponseInterface
    {
        $payload = $request->getParsedBody();
        if (!is_array($payload)) {
            $payload = json_decode((string)$request->getBody(), true, 512, JSON_THROW_ON_ERROR);
        }

        $table = is_array($payload) ? ($payload['table'] ?? null) : null;
        $uid = (int)($payload['uid'] ?? 0);
        $pageId = (int)($payload['pageId'] ?? 0);
        if (!is_string($table) || $table === '' || $uid <= 0 || $pageId <= 0) {
            return new JsonResponse(['error' => 'The table, the uid and the pageId are required'], 400);
        }

        $fields = array_values(array_filter(
            is_array($payload['fields'] ?? null) ? $payload['fields'] : [],
            is_string(...),
        ));
        $values = array_map(
            static fn(mixed $value): string => (string)$value,
            array_filter(is_array($payload['values'] ?? null) ? $payload['values'] : [], is_scalar(...)),
        );

        try {
            return new JsonResponse([
                'fields' => $this->appearanceItemsService->resolve($request, $table, $uid, $pageId, $fields, $values),
            ]);
        } catch (AccessDeniedException) {
            return new JsonResponse(['error' => 'No access to the record'], 403);
        }
    }
}
