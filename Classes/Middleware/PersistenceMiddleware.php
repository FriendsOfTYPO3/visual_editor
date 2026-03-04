<?php

declare(strict_types=1);

namespace TYPO3\CMS\VisualEditor\Middleware;

use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\MiddlewareInterface;
use Psr\Http\Server\RequestHandlerInterface;
use RuntimeException;
use TYPO3\CMS\Backend\Middleware\JavaScriptLabelImportMapEntryResolver;
use TYPO3\CMS\Backend\Routing\Router;
use TYPO3\CMS\Backend\Routing\UriBuilder;
use TYPO3\CMS\Core\Authentication\BackendUserAuthentication;
use TYPO3\CMS\Core\Context\Context;
use TYPO3\CMS\Core\Context\VisibilityAspect;
use TYPO3\CMS\Core\Error\Http\UnauthorizedException;
use TYPO3\CMS\Core\EventDispatcher\ListenerProvider;
use TYPO3\CMS\Core\FormProtection\FormProtectionFactory;
use TYPO3\CMS\Core\Http\HtmlResponse;
use TYPO3\CMS\Core\Http\ImmediateResponseException;
use TYPO3\CMS\Core\Http\JsonResponse;
use TYPO3\CMS\Core\Information\Typo3Version;
use TYPO3\CMS\Core\Page\Event\ResolveVirtualJavaScriptImportEvent;
use TYPO3\CMS\Core\Page\PageRenderer;
use TYPO3\CMS\Core\Type\Bitmask\Permission;
use TYPO3\CMS\Core\Utility\GeneralUtility;
use TYPO3\CMS\Core\View\ViewFactoryData;
use TYPO3\CMS\Core\View\ViewFactoryInterface;
use TYPO3\CMS\Frontend\Page\PageInformation;
use TYPO3\CMS\VisualEditor\Service\DataHandlerService;

use function array_keys;
use function implode;
use function json_decode;
use function substr;

readonly class PersistenceMiddleware implements MiddlewareInterface
{
    public function __construct(
        private Context $context,
        private DataHandlerService $dataHandlerService,
        private UriBuilder $uriBuilder,
        private ViewFactoryInterface $viewFactory,
        private FormProtectionFactory $formProtectionFactory,
        private Typo3Version $typo3Version,
        private ListenerProvider $listenerProvider,
        private PageRenderer $pageRenderer,
    ) {
    }

    public function process(ServerRequestInterface $request, RequestHandlerInterface $handler): ResponseInterface
    {
        return match ($this->whatToDo($request)) {
            MiddlewareAction::Edit => $this->handleEdit($request, $handler),
            MiddlewareAction::Save => $this->saveStuff($request),
            MiddlewareAction::None => $handler->handle($request),
        };
    }

    private function saveStuff(ServerRequestInterface $request): ResponseInterface
    {
        $token = $request->getHeaderLine('X-Request-Token');
        if (!$token || !$this->formProtectionFactory->createForType('backend')->validateToken($token, 'visual_editor', 'save')) {
            throw new UnauthorizedException('Invalid or missing request token', 8148623595);
        }

        $input = json_decode($request->getBody()->getContents(), true, 512, JSON_THROW_ON_ERROR);

        $data = $input['data'] ?? [];
        unset($input['data']);
        $cmdArray = $input['cmdArray'] ?? [];
        unset($input['cmdArray']);

        if (!empty($input)) {
            throw new RuntimeException('Unknown data operations: ' . implode(', ', array_keys($input)) . ' only data and cmdArray are allowed', 8110225095);
        }

        $this->dataHandlerService->run($data, []);

        foreach ($cmdArray as $cmd) {
            $this->dataHandlerService->run([], $cmd);
        }

        return new JsonResponse(['success' => true]);
    }

    private function whatToDo(ServerRequestInterface $request): MiddlewareAction
    {
        // parameter editMode must be set
        $params = $request->getQueryParams();
        if (!isset($params['editMode'])) {
            return MiddlewareAction::None;
        }

        // backend user required
        $user = $this->context->getAspect('backend.user');

        if (!$user->isLoggedIn()) {
            $loginUrl = $this->uriBuilder->buildUriFromRoute('login', referenceType: UriBuilder::ABSOLUTE_URL)->__toString();
            $view = $this->viewFactory
                ->create(
                    new ViewFactoryData(
                        templatePathAndFilename: 'EXT:visual_editor/Resources/Private/Templates/NotLoggedIn.html',
                        request: $request,
                    ),
                )
                ->assign('loginUrl', $loginUrl);
            throw new ImmediateResponseException(new HtmlResponse($view->render(), 401), 3476089111);
        }

        $beUser = $GLOBALS['BE_USER'] ?? null;
        if (!$beUser instanceof BackendUserAuthentication) {
            throw new UnauthorizedException('No $GLOBALS[\'BE_USER\'] available', 8725323237);
        }

        // only do something on POST requests
        if ($request->getMethod() !== 'POST') {
            return MiddlewareAction::Edit;
        }

        // only allow application/json content type
        if ($request->getHeaderLine('Content-Type') !== 'application/json') {
            throw new UnauthorizedException('Content-Type must be application/json to save stuff with visual_editor', 5015404100);
        }

        if ($user->isAdmin()) {
            return MiddlewareAction::Save;
        }

        // check permissions of user on page
        $pageInformation = $this->getPageInformation($request);

        if (!$beUser->isInWebMount($pageInformation->getId())) {
            throw new UnauthorizedException('No permission to access this page', 1610177162);
        }

        if (!$beUser->doesUserHaveAccess($pageInformation->getPageRecord(), Permission::CONTENT_EDIT)) {
            throw new UnauthorizedException('No permission to edit content on this page', 7668402611);
        }

        return MiddlewareAction::Save;
    }

    private function getPageInformation(ServerRequestInterface $request): PageInformation
    {
        $frontendPageInformation = $request->getAttribute('frontend.page.information');
        if (!$frontendPageInformation instanceof PageInformation) {
            throw new RuntimeException('No frontend page information available', 7005099635);
        }

        return $frontendPageInformation;
    }

    private function handleEdit(ServerRequestInterface $request, RequestHandlerInterface $handler): ResponseInterface
    {
        $this->context->setAspect(
            'visibility',
            new VisibilityAspect(
                includeHiddenPages: false,
                includeHiddenContent: true,
                includeDeletedRecords: false,
                includeScheduledRecords: false,
            ),
        );

        if ($this->typo3Version->getMajorVersion() >= 14) {
            // currently this is needed to allow ~labels imports to work in frontend context. (maybe this change in the development of v14)
            $this->listenerProvider->addListener(
                ResolveVirtualJavaScriptImportEvent::class,
                JavaScriptLabelImportMapEntryResolver::class,
                'resolveVirtualLabelImport',
            );
        }

        $this->addAjaxSettingsToJS();

        return $handler->handle($request);
    }

    /**
     * copied from \TYPO3\CMS\Core\Page\PageRenderer::addAjaxUrlsToInlineSettings (v14)
     */
    private function addAjaxSettingsToJS(): void
    {
        $ajaxUrls = [];
        // Add the ajax-based routes
        $router = GeneralUtility::makeInstance(Router::class);
        foreach ($router->getRoutes() as $routeIdentifier => $route) {
            if ($route->getOption('ajax')) {
                $uri = (string)$this->uriBuilder->buildUriFromRoute($routeIdentifier);
                // use the shortened value in order to use this in JavaScript
                if (str_starts_with($routeIdentifier, 'ajax_')) {
                    $routeIdentifier = substr($routeIdentifier, 5);
                }

                $ajaxUrls[$routeIdentifier] = $uri;
            }
        }

        $this->pageRenderer->addInlineSetting(null, 'ajaxUrls', $ajaxUrls);
    }
}
