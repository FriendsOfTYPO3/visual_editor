<?php

declare(strict_types=1);

namespace TYPO3\CMS\VisualEditor\Service;

use Psr\Http\Message\ServerRequestInterface;
use RuntimeException;
use TYPO3\CMS\Backend\Routing\UriBuilder;
use TYPO3\CMS\Core\Authentication\BackendUserAuthentication;
use TYPO3\CMS\Core\Context\Context;
use TYPO3\CMS\Core\Context\SecurityAspect;
use TYPO3\CMS\Core\Domain\Record;
use TYPO3\CMS\Core\Domain\RecordInterface;
use TYPO3\CMS\Core\Localization\LanguageServiceFactory;
use TYPO3\CMS\Core\Page\AssetCollector;
use TYPO3\CMS\Core\Page\PageRenderer;
use TYPO3\CMS\Core\Schema\Capability\TcaSchemaCapability;
use TYPO3\CMS\Core\Schema\TcaSchemaFactory;
use TYPO3\CMS\Core\Security\RequestToken;
use TYPO3\CMS\Core\Site\Entity\SiteLanguage;
use TYPO3\CMS\Core\Utility\ExtensionManagementUtility;
use TYPO3\CMS\Frontend\Page\PageInformation;
use TYPO3\CMS\VisualEditor\Service\LocalizationService;
use function assert;
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
        private Context $context,
        private LocalizationService $localizationService,
    )
    {
    }

    public function isEditMode(): bool
    {
        $queryParams = $this->getRequest()->getQueryParams();

        if (!($queryParams['editMode'] ?? false)) {
            return false;
        }

        return $this->isBeUser();
    }


    public function init(): void
    {
        if (!$this->isEditMode()) {
            return;
        }

        $this->assetCollector->addStyleSheet('editable', 'EXT:visual_editor/Resources/Public/Css/editable.css');
        $this->assetCollector->addJavaScriptModule('@typo3/visual-editor/Frontend/index.mjs');
        $this->assetCollector->addJavaScriptModule('@typo3/visual-editor/Frontend/index.mjs');

        $this->loadLangaugeLabelsInline();

        if (!$this->assetCollector->hasInlineJavaScript('veLangInfo')) {
            $request = $GLOBALS['TYPO3_REQUEST'];
            assert($request instanceof ServerRequestInterface);

            // backend and Frontend Context: determine current page id
            $pageInformation = $request->getAttribute('frontend.page.information');
            if (!$pageInformation instanceof PageInformation) {
                throw new RuntimeException('Could not determine current page information');
            }
            $pageId = $pageInformation->getId();

            if (!$pageId) {
                throw new RuntimeException('Could not determine current page id', 1768983081);
            }

            $siteLanguage = $request->getAttribute('language');
            if (!$siteLanguage instanceof SiteLanguage) {
                throw new RuntimeException('Could not determine current site language');
            }

            $isExtContainerInstalled = ExtensionManagementUtility::isLoaded('container');
            $newContentUrl = (string)$this->uriBuilder->buildUriFromRoute('new_content_element_wizard', [
                'id' => $pageId,
                'colPos' => '__COL_POS__',
                'uid_pid' => '__UID_PID__',
                ...($isExtContainerInstalled ? ['tx_container_parent' => '__TX_CONTAINER_PARENT__'] : []),
                'returnUrl' => (string)$this->uriBuilder->buildUriFromRoute('web_edit', [
                    'id' => $pageId,
                ]),
            ]);
            $editContentUrl = (string)$this->uriBuilder->buildUriFromRoute('record_edit', [
                'edit' => [
                    '__TABLE__' => [
                        '__UID__' => 'edit',
                    ],
                ],
                'returnUrl' => (string)$this->uriBuilder->buildUriFromRoute('web_edit', [
                    'id' => '__PAGE_ID__',
                ]),
            ]);
            $nonce = SecurityAspect::provideIn($this->context)->provideNonce();
            $data = [
                'pageId' => $pageId,
                'languageId' => $siteLanguage->getLanguageId(),
                'newContentUrl' => $newContentUrl,
                'editContentUrl' => $editContentUrl,
                'allowNewContent' => $this->languageModeService->getAllowNewContent($pageInformation, $siteLanguage),
                'token' => RequestToken::create('friendsoftypo3/visual-editor')->toHashSignedJwt($nonce),
            ];
            $this->assetCollector->addInlineJavaScript(
                'veLangInfo',
                'window.TYPO3 = window.TYPO3 || {};
window.veInfo = ' . json_encode($data, JSON_THROW_ON_ERROR) . ';',
                [
                    'type' => 'text/javascript',
                ],
            );
        }
    }

    public function canEditField(RecordInterface $record, string $field): bool
    {
        if (!$this->isEditMode()) {
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
            // it is not that bad if we can not check the language access, on save there might be an error message. (better than always throwing an error.
            if (!$beUser->checkLanguageAccess($record->getLanguageId())) {
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

    private function getRequest(): ServerRequestInterface
    {
        return $GLOBALS['TYPO3_REQUEST'];
    }

    private function isBeUser(): bool
    {
        return ($GLOBALS['BE_USER'] ?? null) instanceof BackendUserAuthentication;
    }

    private function loadLangaugeLabelsInline(): void
    {
        $file = 'EXT:visual_editor/Resources/Private/Language/locallang.xlf';
        $languageService = $this->languageServiceFactory->create($this->localizationService->getBackendUserLanguage());
        foreach ($languageService->getLabelsFromResource($file) as $key => $value) {
            $this->pageRenderer->addInlineLanguageLabel($key, $value);
        }
    }

}
