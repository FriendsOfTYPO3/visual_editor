<?php

declare(strict_types=1);

namespace Andersundsehr\Editara\Middleware;

use Andersundsehr\Editara\Service\DataHandlerService;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\MiddlewareInterface;
use Psr\Http\Server\RequestHandlerInterface;
use TYPO3\CMS\Core\Authentication\BackendUserAuthentication;
use TYPO3\CMS\Core\Context\Context;
use TYPO3\CMS\Core\Context\UserAspect;
use TYPO3\CMS\Core\Error\Http\UnauthorizedException;
use TYPO3\CMS\Core\Http\JsonResponse;
use TYPO3\CMS\Core\Type\Bitmask\Permission;
use TYPO3\CMS\Frontend\Page\PageInformation;
use function array_keys;
use function implode;
use function json_decode;

class EditaraPersistenceMiddleware implements MiddlewareInterface
{
    public function __construct(
        private readonly Context $context,
        private readonly DataHandlerService $dataHandlerService,
    )
    {
    }

    public function process(ServerRequestInterface $request, RequestHandlerInterface $handler): ResponseInterface
    {
        if (!$this->shouldSaveStuff($request)) {
            return $handler->handle($request);
        }
        return $this->saveStuff($request);
    }

    private function saveStuff(ServerRequestInterface $request): ResponseInterface
    {
        $input = json_decode($request->getBody()->getContents(), true, 512, JSON_THROW_ON_ERROR);

        $data = $input['data'] ?? [];
        unset($input['data']);
        $cmd = $input['cmd'] ?? [];
        unset($input['cmd']);

        if (!empty($input)) {
            throw new \RuntimeException('Unknown data operations: ' . implode(', ', array_keys($input)) . ' only data and cmd are allowed');
        }

        $this->dataHandlerService->run($data, $cmd);

        return new JsonResponse(['success' => true]);
    }

    private function shouldSaveStuff(ServerRequestInterface $request)
    {
        // parameter editara must be set
        $params = $request->getQueryParams();
        if (!isset($params['editara'])) {
            return false;
        }

        // backend user required
        $user = $this->context->getAspect('backend.user');
        if (!$user instanceof UserAspect) {
            throw new \RuntimeException('UserAspect not set in context');
        }

        if (!$user->isLoggedIn()) {
            throw new \RuntimeException('not logged in');
        }

        // only do something on POST requests
        if ($request->getMethod() !== 'POST') {
            return false;
        }

        // only allow application/json content type
        if ($request->getHeaderLine('Content-Type') !== 'application/json') {
            throw new UnauthorizedException('Content-Type must be application/json to save stuff with editara');
        }

        if ($user->isAdmin()) {
            return true;
        }

        $beUser = $GLOBALS['BE_USER'] ?? null;
        if (!$beUser instanceof BackendUserAuthentication) {
            throw new UnauthorizedException('No $GLOBALS[\'BE_USER\'] available');
        }

        // check permissions of user on page
        $pageInformation = $this->getPageInformation($request);

        if (!$beUser->isInWebMount($pageInformation->getId())) {
            throw new UnauthorizedException('No permission to access this page');
        }

        if (!$beUser->doesUserHaveAccess($pageInformation->getPageRecord(), Permission::CONTENT_EDIT)) {
            throw new UnauthorizedException('No permission to edit content on this page');
        }

        return true;
    }

    private function getPageInformation(ServerRequestInterface $request): PageInformation
    {
        $frontendPageInformation = $request->getAttribute('frontend.page.information');
        if (!$frontendPageInformation instanceof PageInformation) {
            throw new \RuntimeException('No frontend page information available');
        }
        return $frontendPageInformation;
    }
}
