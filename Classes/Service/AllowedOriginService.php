<?php

declare(strict_types=1);

namespace TYPO3\CMS\VisualEditor\Service;

use TYPO3\CMS\Core\Site\SiteFinder;

final readonly class AllowedOriginService
{
    public function __construct(
        private SiteFinder $siteFinder,
    ) {
    }

    /**
     * returns the origins of all configured sites and languages
     *
     * @return list<string>
     */
    public function getAllowedOrigins(): array
    {
        $allowed = [];
        $sites = $this->siteFinder->getAllSites();
        foreach ($sites as $site) {
            $origin = $site->getBase()->withQuery('')->withPath('')->withUserInfo('')->withFragment('');
            $allowed[(string)$origin] = true;
            foreach ($site->getLanguages() as $language) {
                $origin = $language->getBase()->withQuery('')->withPath('')->withUserInfo('')->withFragment('');
                $allowed[(string)$origin] = true;
            }
        }

        return array_values(array_filter(array_keys($allowed)));
    }
}
