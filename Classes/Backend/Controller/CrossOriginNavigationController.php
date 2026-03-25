<?php

declare(strict_types=1);

namespace TYPO3\CMS\VisualEditor\Backend\Controller;

use InvalidArgumentException;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use TYPO3\CMS\Backend\Attribute\AsController;
use TYPO3\CMS\Core\Http\JsonResponse;
use TYPO3\CMS\VisualEditor\Service\CrossOriginNavigationResolver;

#[AsController]
final readonly class CrossOriginNavigationController
{
    public function __construct(
        private CrossOriginNavigationResolver $resolver,
    ) {
    }

    public function resolveBackendUrlAction(ServerRequestInterface $request): ResponseInterface
    {
        $payload = $request->getParsedBody();
        if (!is_array($payload)) {
            $payload = json_decode((string)$request->getBody(), true);
        }

        $frontendUrl = is_array($payload) ? (string)($payload['url'] ?? '') : '';
        if ($frontendUrl === '') {
            return new JsonResponse(['error' => 'Missing url'], 400);
        }

        try {
            return new JsonResponse([
                'url' => $this->resolver->resolveBackendUrl($frontendUrl),
            ]);
        } catch (InvalidArgumentException $invalidArgumentException) {
            return new JsonResponse(['error' => $invalidArgumentException->getMessage()], 400);
        }
    }
}
