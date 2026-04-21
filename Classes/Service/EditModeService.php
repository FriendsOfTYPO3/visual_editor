<?php

declare(strict_types=1);

namespace TYPO3\CMS\VisualEditor\Service;

use Psr\Http\Message\ServerRequestInterface;
use RuntimeException;
use TYPO3\CMS\Backend\Routing\UriBuilder;
use TYPO3\CMS\Core\Authentication\BackendUserAuthentication;
use TYPO3\CMS\Core\Domain\Record;
use TYPO3\CMS\Core\Domain\RecordInterface;
use TYPO3\CMS\Core\FormProtection\FormProtectionFactory;
use TYPO3\CMS\Core\Information\Typo3Version;
use TYPO3\CMS\Core\Localization\LanguageServiceFactory;
use TYPO3\CMS\Core\Page\AssetCollector;
use TYPO3\CMS\Core\Page\PageRenderer;
use TYPO3\CMS\Core\Routing\PageArguments;
use TYPO3\CMS\Core\Schema\Capability\TcaSchemaCapability;
use TYPO3\CMS\Core\Schema\TcaSchemaFactory;
use TYPO3\CMS\Core\Site\Entity\SiteLanguage;
use TYPO3\CMS\Core\Site\SiteFinder;
use TYPO3\CMS\Core\Utility\ExtensionManagementUtility;
use TYPO3\CMS\Frontend\Page\PageInformation;

use function method_exists;

final readonly class EditModeService
{
    public function __construct(
        private AssetCollector $assetCollector,
        private UriBuilder $uriBuilder,
        private PageRenderer $pageRenderer,
        private TcaSchemaFactory $tcaSchema,
        private LanguageServiceFactory $languageServiceFactory,
        private LanguageModeService $languageModeService,
        private LocalizationService $localizationService,
        private FormProtectionFactory $formProtectionFactory,
        private Typo3Version $typo3Version,
        private SiteFinder $siteFinder,
    ) {
    }

    public function isEditMode(ServerRequestInterface $request): bool
    {
        $queryParams = $request->getQueryParams();

        if (!($queryParams['editMode'] ?? false)) {
            return false;
        }

        return $this->isBeUser();
    }


    public function init(ServerRequestInterface $request): void
    {
        if (!$this->isEditMode($request)) {
            return;
        }

        $this->assetCollector->addStyleSheet('editable', 'EXT:visual_editor/Resources/Public/Css/editable.css');
        $this->assetCollector->addJavaScriptModule('@typo3/visual-editor/Frontend/index');
        if ($this->typo3Version->getMajorVersion() >= 14) {
            $this->assetCollector->addJavaScriptModule('@typo3/backend/element/contextual-record-edit-trigger.js');
        }

        $this->loadLanguageLabelsInline();

        if (!$this->assetCollector->hasInlineJavaScript('veLangInfo')) {
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

            $routing = $request->getAttribute('routing');
            if (!$routing instanceof PageArguments) {
                throw new RuntimeException('Could not determine current routing context', 1773230232);
            }

            $isExtContainerInstalled = ExtensionManagementUtility::isLoaded('container');

            $backendEditUrl = (string)$this->uriBuilder->buildUriFromRoute('web_edit', [
                'id' => $pageId,
                'languages' => [$siteLanguage->getLanguageId()],
                'params' => $routing->getRouteArguments(),
            ]);

            $newContentUrl = (string)$this->uriBuilder->buildUriFromRoute('new_content_element_wizard', [
                'id' => $pageId,
                'colPos' => '__COL_POS__',
                'uid_pid' => '__UID_PID__',
                ...($isExtContainerInstalled ? ['tx_container_parent' => '__TX_CONTAINER_PARENT__'] : []),
                'returnUrl' => $backendEditUrl,
            ]);

            $editParams = [
                'edit' => ['__TABLE__' => ['__UID__' => 'edit']],
                'returnUrl' => $backendEditUrl,
                'module' => 'web_edit',
            ];
            $editContentUrl = (string)$this->uriBuilder->buildUriFromRoute('record_edit', $editParams);
            if ($this->typo3Version->getMajorVersion() >= 14) {
                $editContentContextualUrl = (string)$this->uriBuilder->buildUriFromRoute('record_edit_contextual', $editParams);
            }

            $veInfo = [
                'pageId' => $pageId,
                'languageId' => $siteLanguage->getLanguageId(),
                'backendEditUrl' => $backendEditUrl,
                'newContentUrl' => $newContentUrl,
                'editContentUrl' => $editContentUrl,
                'editContentContextualUrl' => $editContentContextualUrl ?? null,
                'allowNewContent' => $this->languageModeService->getAllowNewContent($pageInformation, $siteLanguage, $request),
                'token' => $this->formProtectionFactory->createForType('backend')->generateToken('visual_editor', 'save'),
                'routeArguments' => (object)$this->flattenBracketKeys(['params' => $routing->getRouteArguments()]),
                'allowedOrigins' => $this->getAllowedOrigins(),
            ];
            $this->assetCollector->addInlineJavaScript(
                'veLangInfo',
                'window.TYPO3 = window.TYPO3 || {};
window.veInfo = ' . json_encode($veInfo, JSON_THROW_ON_ERROR) . ';
/* if you open this page without it being in an iframe we redirect to the backend */
if (window.parent === window && window.veInfo) {
  const backendEditUrl = window.veInfo.backendEditUrl || null;
  if (backendEditUrl) {
    window.location.replace(backendEditUrl);
    document.body.innerHTML = "";
  }
}',
                [
                    'type' => 'text/javascript',
                ],
                [
                    'useNonce' => true,
                ],
            );
        }
    }

    /**
     * @param array<array-key, string|float|int|bool|null|array<mixed>> $input
     * @return array<string, string>
     */
    private function flattenBracketKeys(array $input, string $prefix = ''): array
    {
        $result = [];

        foreach ($input as $key => $value) {
            $newKey = $prefix === '' ? (string)$key : $prefix . '[' . $key . ']';

            if (is_array($value)) {
                $result += $this->flattenBracketKeys($value, $newKey);
            } else {
                $result[$newKey] = (string)$value;
            }
        }

        return $result;
    }

    public function canEditField(RecordInterface $record, string $field, ServerRequestInterface $request): bool
    {
        if (!$this->isEditMode($request)) {
            return false; // not in edit mode
        }

        $tcaSchema = $this->tcaSchema->get($record->getFullType());
        $fieldType = $tcaSchema->getField($field);

        if ($tcaSchema->hasCapability(TcaSchemaCapability::AccessReadOnly)) {
            return false; // table readonly
        }

        if ($fieldType->getConfiguration()['readOnly'] ?? false) {
            return false; // field readonly
        }

        // user access check
        /** @var BackendUserAuthentication $beUser */
        $beUser = $GLOBALS['BE_USER'];
        if ($record instanceof Record || method_exists($record, 'getLanguageId')) {
            $languageId = $record->getLanguageId();
            // it is not that bad if we can not check the language access, on save there might be an error message. (better than always throwing an error.
            if (!$beUser->checkLanguageAccess($languageId)) {
                return false; // no access to this language
            }
        }

        if (!$beUser->check('tables_modify', $record->getMainType())) {
            return false; // no access to this table
        }

        if (!$beUser->isInWebMount($record->getPid())) {
            return false; // no access to this page // TODO move this to the middleware
        }

        if ($record->getMainType() === 'tt_content' && !$beUser->check('explicit_allowdeny', 'tt_content:CType:' . $record->get('CType'))) {
            return false;
            // content element type not allowed
        }

        if ($fieldType->supportsAccessControl() && !$beUser->check('non_exclude_fields', $record->getMainType() . ':' . $field)) {
            return false; // no access to this field
        }

        return true;
    }

    private function isBeUser(): bool
    {
        return ($GLOBALS['BE_USER'] ?? null) instanceof BackendUserAuthentication;
    }

    private function loadLanguageLabelsInline(): void
    {
        $files = [
            'EXT:backend/Resources/Private/Language/locallang_alt_doc.xlf',
            'EXT:visual_editor/Resources/Private/Language/locallang.xlf',
        ];
        foreach ($files as $file) {
            $languageService = $this->languageServiceFactory->create($this->localizationService->getBackendUserLanguage() ?? 'en');
            foreach ($languageService->getLabelsFromResource($file) as $key => $value) {
                $this->pageRenderer->addInlineLanguageLabel($key, $value);
            }
        }
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

        return array_keys($allowed);
    }
}
