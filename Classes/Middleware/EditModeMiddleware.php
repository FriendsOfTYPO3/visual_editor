<?php

declare(strict_types=1);

namespace TYPO3\CMS\VisualEditor\Middleware;

use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\MiddlewareInterface;
use Psr\Http\Server\RequestHandlerInterface;
use TYPO3\CMS\Backend\Middleware\JavaScriptLabelImportMapEntryResolver;
use TYPO3\CMS\Backend\Routing\Router;
use TYPO3\CMS\Backend\Routing\UriBuilder;
use TYPO3\CMS\Core\Authentication\BackendUserAuthentication;
use TYPO3\CMS\Core\Context\Context;
use TYPO3\CMS\Core\Context\VisibilityAspect;
use TYPO3\CMS\Core\Error\Http\UnauthorizedException;
use TYPO3\CMS\Core\EventDispatcher\ListenerProvider;
use TYPO3\CMS\Core\Http\HtmlResponse;
use TYPO3\CMS\Core\Http\ImmediateResponseException;
use TYPO3\CMS\Core\Information\Typo3Version;
use TYPO3\CMS\Core\Page\Event\ResolveVirtualJavaScriptImportEvent;
use TYPO3\CMS\Core\Page\PageRenderer;
use TYPO3\CMS\Core\Utility\GeneralUtility;
use TYPO3\CMS\Core\View\ViewFactoryData;
use TYPO3\CMS\Core\View\ViewFactoryInterface;

use function substr;

readonly class EditModeMiddleware implements MiddlewareInterface
{
    public function __construct(
        private Context $context,
        private UriBuilder $uriBuilder,
        private ViewFactoryInterface $viewFactory,
        private Typo3Version $typo3Version,
        private ListenerProvider $listenerProvider,
        private PageRenderer $pageRenderer,
    ) {
    }

    public function process(ServerRequestInterface $request, RequestHandlerInterface $handler): ResponseInterface
    {
        if ($this->shouldInitEditMode($request)) {
            return $this->handleEdit($request, $handler);
        }

        return $handler->handle($request);
    }

    private function shouldInitEditMode(ServerRequestInterface $request): bool
    {
        // parameter editMode must be set
        $params = $request->getQueryParams();
        if (!isset($params['editMode'])) {
            return false;
        }

        // backend user required
        $user = $this->context->getAspect('backend.user');

        if (!$user->isLoggedIn()) {
            $loginUrl = $this->uriBuilder->buildUriFromRoute('login', [], UriBuilder::ABSOLUTE_URL)->__toString();
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

        return true;
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

        $this->pageRenderer->addInlineSetting('', 'ajaxUrls', $ajaxUrls);
    }
}
