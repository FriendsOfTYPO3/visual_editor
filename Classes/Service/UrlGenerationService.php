<?php

declare(strict_types=1);

namespace TYPO3\CMS\VisualEditor\Service;

use Psr\EventDispatcher\EventDispatcherInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Message\UriInterface;
use RuntimeException;
use TYPO3\CMS\Backend\Routing\UriBuilder;
use TYPO3\CMS\Core\Information\Typo3Version;
use TYPO3\CMS\Core\Routing\PageArguments;
use TYPO3\CMS\Core\Site\Entity\SiteLanguage;
use TYPO3\CMS\Core\Utility\ExtensionManagementUtility;
use TYPO3\CMS\Frontend\Page\PageInformation;
use TYPO3\CMS\VisualEditor\Dto\EditModeUrls;
use TYPO3\CMS\VisualEditor\Events\ModifyNewContentElementWizardUrlParameterEvent;

final readonly class UrlGenerationService
{
    public function __construct(
        private EventDispatcherInterface $eventDispatcher,
        private UriBuilder $uriBuilder,
        private Typo3Version $typo3Version,
    ) {
    }

    public function generateUrls(ServerRequestInterface $request): EditModeUrls
    {
        $pageInformation = $request->getAttribute('frontend.page.information');
        if (!$pageInformation instanceof PageInformation) {
            throw new RuntimeException('Could not determine current page information', 9965439961);
        }

        $pageId = $pageInformation->getId();

        if (!$pageId) {
            throw new RuntimeException('Could not determine current page id', 1768983081);
        }

        $isExtContainerInstalled = ExtensionManagementUtility::isLoaded('container');

        $backendEditUrl = (string)$this->getBackendEditUrl($request);

        $event = $this->eventDispatcher->dispatch(
            new ModifyNewContentElementWizardUrlParameterEvent([
                'id' => $pageId,
                'colPos' => '__COL_POS__',
                'uid_pid' => '__UID_PID__',
                ...($isExtContainerInstalled ? ['tx_container_parent' => '__TX_CONTAINER_PARENT__'] : []),
                'returnUrl' => $backendEditUrl,
            ], $this->getUsedArguments($request), $request),
        );
        assert($event instanceof ModifyNewContentElementWizardUrlParameterEvent);
        $parameters = $event->getParameters();

        $newContentUrl = (string)$this->uriBuilder->buildUriFromRoute('new_content_element_wizard', $parameters);

        $editParams = [
            'edit' => ['__TABLE__' => ['__UID__' => 'edit']],
            'returnUrl' => $backendEditUrl,
            'module' => 'web_edit',
        ];
        $editContentUrl = (string)$this->uriBuilder->buildUriFromRoute('record_edit', $editParams);
        $editContentContextualUrl = null;
        if ($this->typo3Version->getMajorVersion() >= 14) {
            $editContentContextualUrl = (string)$this->uriBuilder->buildUriFromRoute('record_edit_contextual', $editParams);
        }

        return new EditModeUrls($backendEditUrl, $newContentUrl, $editContentUrl, $editContentContextualUrl);
    }

    public function getBackendEditUrl(ServerRequestInterface $request): UriInterface
    {
        // backend and Frontend Context: determine current page id
        $pageInformation = $request->getAttribute('frontend.page.information');
        if (!$pageInformation instanceof PageInformation) {
            throw new RuntimeException('Could not determine current page information', 9965439961);
        }

        $pageId = $pageInformation->getId();
        if (!$pageId) {
            throw new RuntimeException('Could not determine current page id', 1768983081);
        }

        $siteLanguage = $request->getAttribute('language');
        if (!$siteLanguage instanceof SiteLanguage) {
            throw new RuntimeException('Could not determine current site language', 3305745963);
        }

        $usedArguments = $this->getUsedArguments($request);
        return $this->uriBuilder->buildUriFromRoute('web_edit', [
            'id' => $pageId,
            // the selected viewMode and languages are saved in be_user->uc
            'params' => $usedArguments,
        ]);
    }

    /**
     * @return array<string|array<string|array<mixed>>>
     */
    public function getUsedArguments(ServerRequestInterface $request): array
    {
        $routing = $request->getAttribute('routing');
        if (!$routing instanceof PageArguments) {
            throw new RuntimeException('Could not determine current routing context', 1773230232);
        }

        $usedArguments = array_replace_recursive(
            $routing->getArguments(),
            $routing->getRouteArguments(),
        );
        unset($usedArguments['cHash']);
        unset($usedArguments['editMode']);
        return $usedArguments;
    }

    /**
     * @param array<array-key, string|float|int|bool|null|array<mixed>> $input
     * @return array<string, string>
     */
    public function flattenBracketKeys(array $input, string $prefix = ''): array
    {
        $result = [];

        foreach ($input as $key => $value) {
            $newKey = $prefix === '' ? (string)$key : $prefix . '[' . $key . ']';

            if ($value === []) {
                $result[$newKey] = '';
            } elseif (is_array($value)) {
                $result += $this->flattenBracketKeys($value, $newKey);
            } else {
                $result[$newKey] = (string)$value;
            }
        }

        return $result;
    }
}
