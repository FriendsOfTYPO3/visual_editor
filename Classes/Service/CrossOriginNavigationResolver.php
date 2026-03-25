<?php

declare(strict_types=1);

namespace TYPO3\CMS\VisualEditor\Service;

use Throwable;
use InvalidArgumentException;
use TYPO3\CMS\Backend\Routing\UriBuilder;
use TYPO3\CMS\Core\Http\ServerRequest;
use TYPO3\CMS\Core\Http\Uri;
use TYPO3\CMS\Core\Routing\PageArguments;
use TYPO3\CMS\Core\Routing\RouteNotFoundException;
use TYPO3\CMS\Core\Routing\SiteMatcher;
use TYPO3\CMS\Core\Routing\SiteRouteResult;
use TYPO3\CMS\Core\Site\Entity\Site;

final readonly class CrossOriginNavigationResolver
{
    public function __construct(
        private SiteMatcher $siteMatcher,
        private UriBuilder $uriBuilder,
    ) {
    }

    public function resolveBackendUrl(string $frontendUrl): string
    {
        $uri = new Uri($frontendUrl);

        parse_str($uri->getQuery(), $queryParams);
        $frontendRequest = (new ServerRequest($uri))->withQueryParams($queryParams);
        try {
            /** @var SiteRouteResult $siteMatch */
            $siteMatch = $this->siteMatcher->matchRequest($frontendRequest);
        } catch (Throwable $throwable) {
            throw new InvalidArgumentException('Could not resolve target site', 1742900105, $throwable);
        }

        $site = $siteMatch->getSite();
        if (!($site instanceof Site)) {
            throw new InvalidArgumentException('Target URL does not belong to a TYPO3 site', 1742900102);
        }

        try {
            $route = $site->getRouter()->matchRequest($frontendRequest, $siteMatch);
        } catch (RouteNotFoundException $routeNotFoundException) {
            throw new InvalidArgumentException('Could not resolve target page', 1742900103, $routeNotFoundException);
        }

        if (!$route instanceof PageArguments || $route->areDirty()) {
            throw new InvalidArgumentException('Could not resolve target page arguments', 1742900104);
        }

        $languageId = $siteMatch->getLanguage()?->getLanguageId();
        if ($languageId === null) {
            throw new InvalidArgumentException('Could not resolve target language', 1742900106);
        }

        $backendUrl = $this->uriBuilder
            ->buildUriFromRoute(
                'web_edit',
                [
                    'id' => $route->getPageId(),
                    'languages' => [$languageId],
                    'params' => $route->getArguments(),
                ],
                referenceType: UriBuilder::ABSOLUTE_URL,
            )
            ->withScheme($uri->getScheme())
            ->withHost($uri->getHost())
            ->withPort($uri->getPort());

        return (string)$backendUrl;
    }
}
