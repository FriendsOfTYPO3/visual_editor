<?php

declare(strict_types=1);

namespace TYPO3\CMS\VisualEditor\Service;

use Psr\Http\Message\ServerRequestInterface;
use RuntimeException;
use TYPO3\CMS\Core\Authentication\BackendUserAuthentication;
use TYPO3\CMS\Core\Domain\Record;
use TYPO3\CMS\Core\Domain\RecordInterface;
use TYPO3\CMS\Core\FormProtection\FormProtectionFactory;
use TYPO3\CMS\Core\Information\Typo3Version;
use TYPO3\CMS\Core\Localization\LanguageServiceFactory;
use TYPO3\CMS\Core\Page\AssetCollector;
use TYPO3\CMS\Core\Page\PageRenderer;
use TYPO3\CMS\Core\Schema\Capability\TcaSchemaCapability;
use TYPO3\CMS\Core\Schema\TcaSchemaFactory;
use TYPO3\CMS\Core\Site\Entity\SiteLanguage;
use TYPO3\CMS\Frontend\Page\PageInformation;

use function method_exists;

final readonly class EditModeService
{
    public function __construct(
        private AssetCollector $assetCollector,
        private PageRenderer $pageRenderer,
        private TcaSchemaFactory $tcaSchema,
        private LanguageServiceFactory $languageServiceFactory,
        private LanguageModeService $languageModeService,
        private LocalizationService $localizationService,
        private FormProtectionFactory $formProtectionFactory,
        private Typo3Version $typo3Version,
        private AllowedOriginService $allowedOriginService,
        private UrlGenerationService $urlGenerationService,
    ) {
    }

    public function isEditMode(ServerRequestInterface $request): bool
    {
        $queryParams = $request->getQueryParams();

        if (!isset($queryParams['editMode'])) {
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

            $urls = $this->urlGenerationService->generateUrls($request);

            $veInfo = [
                'pageId' => $pageId,
                'languageId' => $siteLanguage->getLanguageId(),
                'showIdWithTitle' => !empty($this->getBeUser()->getTSConfig()['options.']['pageTree.']['showPageIdWithTitle']),
                'backendEditUrl' => $urls->backendEditUrl,
                'newContentUrl' => $urls->newContentUrl,
                'editContentUrl' => $urls->editContentUrl,
                'editContentContextualUrl' => $urls->editContentContextualUrl ?? null,
                'allowNewContent' => $this->languageModeService->getAllowNewContent($pageInformation, $siteLanguage, $request),
                'token' => $this->formProtectionFactory->createForType('backend')->generateToken('visual_editor', 'save'),
                'routeArguments' => (object)$this->urlGenerationService->flattenBracketKeys(['params' => $this->urlGenerationService->getUsedArguments($request)]),
                'allowedOrigins' => $this->allowedOriginService->getAllowedOrigins(),
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
        $beUser = $this->getBeUser();
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

    private function getBeUser(): BackendUserAuthentication
    {
        $beUser = $GLOBALS['BE_USER'];
        if (!$beUser instanceof BackendUserAuthentication) {
            throw new RuntimeException('Could not determine backend user authentication', 3305745964);
        }

        return $beUser;
    }
}
