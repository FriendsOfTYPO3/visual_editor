<?php

declare(strict_types=1);

namespace Andersundsehr\Editara\Service;

use Psr\Http\Message\ServerRequestInterface;
use TYPO3\CMS\Core\Authentication\BackendUserAuthentication;
use TYPO3\CMS\Core\Page\AssetCollector;

final readonly class EditaraService
{
    public function __construct(
        private AssetCollector $assetCollector,
    )
    {
    }

    public function isEditMode(): bool
    {
        $queryParams = $this->getRequest()->getQueryParams();

        if (!($queryParams['editara'] ?? false)) {
            return false;
        }

        return $this->isBeUser();
    }


    public function init(): void
    {
        if (!$this->isEditMode()) {
            return;
        }
        $this->assetCollector->addStyleSheet('editable', 'EXT:editara/Resources/Public/Css/editable.css');
        $this->assetCollector->addJavaScriptModule('@andersundsehr/editara/Frontend/index.mjs');
    }

    private function getRequest(): ServerRequestInterface
    {
        return $GLOBALS['TYPO3_REQUEST'];
    }

    private function isBeUser():bool
    {
        return ($GLOBALS['BE_USER'] ?? null) instanceof BackendUserAuthentication;
    }
}
