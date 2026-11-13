<?php

declare(strict_types=1);

namespace TYPO3Tests\BackendUserSession\Middleware;

use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\MiddlewareInterface;
use Psr\Http\Server\RequestHandlerInterface;
use TYPO3\CMS\Core\Authentication\BackendUserAuthentication;

/**
 * The testing framework logs in the backend user without a session,
 * but e.g. form protection tokens of backend routes are stored in it.
 */
final class BackendUserSessionHandler implements MiddlewareInterface
{
    public function process(ServerRequestInterface $request, RequestHandlerInterface $handler): ResponseInterface
    {
        $backendUser = $GLOBALS['BE_USER'] ?? null;
        if ($backendUser instanceof BackendUserAuthentication) {
            $backendUser->initializeUserSessionManager();
        }

        return $handler->handle($request);
    }
}
