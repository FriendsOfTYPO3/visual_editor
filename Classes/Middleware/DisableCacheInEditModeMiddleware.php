<?php

declare(strict_types=1);

namespace TYPO3\CMS\VisualEditor\Middleware;

use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\MiddlewareInterface;
use Psr\Http\Server\RequestHandlerInterface;
use TYPO3\CMS\Frontend\Cache\CacheInstruction;

readonly class DisableCacheInEditModeMiddleware implements MiddlewareInterface
{
    public function process(ServerRequestInterface $request, RequestHandlerInterface $handler): ResponseInterface
    {
        $params = $request->getQueryParams();
        if (isset($params['editMode'])) {
            $cacheInstruction = $request->getAttribute('frontend.cache.instruction', new CacheInstruction());
            $cacheInstruction->disableCache('EXT:visual_editor: The editMode parameter forced the cache to be disabled.');
            $request = $request->withAttribute('frontend.cache.instruction', $cacheInstruction);
        }

        return $handler->handle($request);
    }
}
