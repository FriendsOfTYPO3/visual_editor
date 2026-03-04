<?php

declare(strict_types=1);

namespace TYPO3\CMS\VisualEditor\Backend\Controller;

use InvalidArgumentException;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Message\UriInterface;
use TYPO3\CMS\Backend\Attribute\AsController;
use TYPO3\CMS\Backend\Context\PageContext;
use TYPO3\CMS\Backend\Module\ModuleData;
use TYPO3\CMS\Backend\Routing\PreviewUriBuilder;
use TYPO3\CMS\Backend\Routing\UriBuilder;
use TYPO3\CMS\Backend\Template\Components\ButtonBar;
use TYPO3\CMS\Backend\Template\Components\Buttons\ButtonInterface;
use TYPO3\CMS\Backend\Template\Components\Buttons\DropDown\DropDownItemInterface;
use TYPO3\CMS\Backend\Template\Components\Buttons\DropDown\DropDownRadio;
use TYPO3\CMS\Backend\Template\Components\Buttons\GenericButton;
use TYPO3\CMS\Backend\Template\Components\Buttons\LanguageSelectorBuilder;
use TYPO3\CMS\Backend\Template\Components\Buttons\LanguageSelectorMode;
use TYPO3\CMS\Backend\Template\ModuleTemplate;
use TYPO3\CMS\Backend\Template\ModuleTemplateFactory;
use TYPO3\CMS\Backend\Utility\BackendUtility;
use TYPO3\CMS\Core\Authentication\BackendUserAuthentication;
use TYPO3\CMS\Core\Database\Connection;
use TYPO3\CMS\Core\Database\ConnectionPool;
use TYPO3\CMS\Core\Database\Query\Restriction\DeletedRestriction;
use TYPO3\CMS\Core\Database\Query\Restriction\WorkspaceRestriction;
use TYPO3\CMS\Core\Domain\Record;
use TYPO3\CMS\Core\Domain\RecordFactory;
use TYPO3\CMS\Core\Imaging\IconFactory;
use TYPO3\CMS\Core\Imaging\IconSize;
use TYPO3\CMS\Core\Information\Typo3Version;
use TYPO3\CMS\Core\Localization\LanguageService;
use TYPO3\CMS\Core\Package\PackageManager;
use TYPO3\CMS\Core\Page\AssetCollector;
use TYPO3\CMS\Core\Page\JavaScriptModuleInstruction;
use TYPO3\CMS\Core\Page\PageRenderer;
use TYPO3\CMS\Core\Schema\Capability\TcaSchemaCapability;
use TYPO3\CMS\Core\Schema\TcaSchema;
use TYPO3\CMS\Core\Schema\TcaSchemaFactory;
use TYPO3\CMS\Core\Security\ContentSecurityPolicy\Directive;
use TYPO3\CMS\Core\Security\ContentSecurityPolicy\Mutation;
use TYPO3\CMS\Core\Security\ContentSecurityPolicy\MutationCollection;
use TYPO3\CMS\Core\Security\ContentSecurityPolicy\MutationMode;
use TYPO3\CMS\Core\Security\ContentSecurityPolicy\PolicyRegistry;
use TYPO3\CMS\Core\Security\ContentSecurityPolicy\UriValue;
use TYPO3\CMS\Core\Site\Entity\Site;
use TYPO3\CMS\Core\Site\Entity\SiteLanguage;
use TYPO3\CMS\Core\Type\Bitmask\Permission;
use TYPO3\CMS\Core\Utility\GeneralUtility;
use TYPO3\CMS\Core\Versioning\VersionState;

use function array_map;
use function array_values;
use function assert;
use function count;
use function in_array;
use function is_array;
use function sprintf;

/**
 * @phpstan-type LanguageRef -1|0|positive-int
 */
#[AsController]
final class PageEditController
{
    /** @var list<SiteLanguage> */
    private array $selectedLanguages = [];

    private ModuleData $moduleData;

    private Record $pageRecord;

    /** @var array<LanguageRef, SiteLanguage> */
    private array $availableLanguages = [];

    private Site $site;

    private TcaSchema $schema;

    public function __construct(
        private readonly ModuleTemplateFactory $moduleTemplateFactory,
        private readonly PageRenderer $pageRenderer,
        private readonly UriBuilder $uriBuilder,
        private readonly IconFactory $iconFactory,
        private readonly RecordFactory $recordFactory,
        private readonly TcaSchemaFactory $tcaSchemaFactory,
        private readonly PackageManager $packageManager,
        private readonly PolicyRegistry $policyRegistry,
        private readonly Typo3Version $typo3Version,
        private readonly ConnectionPool $connectionPool,
        private readonly AssetCollector $assetCollector,
    ) {
    }

    private function initialize(ServerRequestInterface $request): void
    {
        $backendUser = $this->getBackendUser();
        $pageUid = (int)($request->getQueryParams()['id'] ?? throw new InvalidArgumentException(
            'Missing "id" query parameter',
            8412770259,
        ));
        $this->moduleData = $request->getAttribute('moduleData');
        $site = $request->getAttribute('site');
        if (!$site instanceof Site) {
            throw new InvalidArgumentException('No site found for page id ' . $pageUid, 1616071820);
        }

        $this->site = $site;
        $this->availableLanguages = $site->getAvailableLanguages($backendUser, false, $pageUid);
        $languages = $this->moduleData->get('languages') ?? [0];
        $this->selectedLanguages = array_values(array_map(fn($languageUid): SiteLanguage => $site->getLanguageById((int)$languageUid), $languages));
        $this->pageRenderer->addInlineLanguageLabelFile('EXT:visual_editor/Resources/Private/Language/locallang.xlf');
        $this->schema = $this->tcaSchemaFactory->get('pages');

        $pageInfo = BackendUtility::readPageAccess($pageUid, $backendUser->getPagePermsClause(Permission::PAGE_SHOW));
        if (!$pageInfo || count($pageInfo) === 1) {
            // if $pageInfo is "empty" it will have the property "_thePath"
            throw new InvalidArgumentException('Page record not found for id ' . $pageUid, 4884897021);
        }

        $record = $this->recordFactory->createResolvedRecordFromDatabaseRow('pages', $pageInfo);
        if (!$record instanceof Record) {
            throw new InvalidArgumentException('RecordFactory did not return a Record for pages record, this should not happen', 6115380673);
        }

        if ($record->getRecordType() === '254') {
            throw new InvalidArgumentException('Page record is of type "folder" and cannot be edited with the Visual Editor', 5965019514);
        }

        $this->pageRecord = $record;

        $localizedPageRecord = $this->getLocalizedPageRecord($this->selectedLanguages[0]->getLanguageId());

        if (!$localizedPageRecord) {
            // if no translation is found for the selected langauge, we reset the langauge to the default language
            $this->selectedLanguages = [$site->getDefaultLanguage()];
        }
    }

    public function __invoke(ServerRequestInterface $request): ResponseInterface
    {
        try {
            $this->initialize($request);
        } catch (InvalidArgumentException) {
            $view = $this->moduleTemplateFactory->create($request);
            $languageService = $this->getLanguageService();

            // Page uid 0 or no access.
            $view->setTitle($languageService->sL('LLL:EXT:backend/Resources/Private/Language/locallang_mod.xlf:mlang_tabs_tab'));
            $view->assignMultiple([
                'pageId' => (int)($request->getQueryParams()['id'] ?? 0),
                'siteName' => $GLOBALS['TYPO3_CONF_VARS']['SYS']['sitename'] ?? '',
            ]);

            if ($this->typo3Version->getMajorVersion() >= 14) {
                $view->getDocHeaderComponent()->disableAutomaticReloadButton();
            }

            return $view->renderResponse('PageLayout/PageModuleNoAccess');
        }

        $this->pageRenderer->getJavaScriptRenderer()->addJavaScriptModuleInstruction(
            JavaScriptModuleInstruction::create('@typo3/visual-editor/Backend/index'),
        );

        $view = $this->moduleTemplateFactory->create($request);

        $view->setTitle('Edit Page · ' . $this->pageRecord->get('title'));
        if ($this->typo3Version->getMajorVersion() >= 14) {
            $view->getDocHeaderComponent()->setPageBreadcrumb($this->pageRecord->getRawRecord()->toArray());
        }

        $iframeUrl = $this->iframeUrl();
        $view->assignMultiple([
            'pageId' => $this->pageRecord->getUid(),
            'iframeSrc' => $iframeUrl,
        ]);

        $returnUrl = GeneralUtility::sanitizeLocalUrl(
            (string)($request->getQueryParams()['returnUrl'] ?? ''),
        ) ?: $this->uriBuilder->buildUriFromRoute('web_edit');

        // Always add rootPageId as additional field to have a reference for new records
        $view->assign('returnUrl', $returnUrl);

        $this->makeButtons($view, $request);
        $this->makeLanguageMenu($view, $request);


        if ($iframeUrl->getScheme() !== '' && $iframeUrl->getHost() !== '') {
            // temporarily(!) extend the CSP `frame-src` directive with the URL to be shown in the `<iframe>`
            $mutation = new Mutation(MutationMode::Extend, Directive::FrameSrc, UriValue::fromUri($iframeUrl->withQuery('')));
            $this->policyRegistry->appendMutationCollection(new MutationCollection($mutation));
        }

        return $view->renderResponse('PageEdit');
    }

    private function iframeUrl(): UriInterface
    {
        return $this->site->getRouter()->generateUri(
            $this->pageRecord->getUid(),
            [
                '_language' => $this->selectedLanguages[0]->getLanguageId(),
                'editMode' => 1,
            ],
        );
    }

    private function makeButtons(ModuleTemplate $view, ServerRequestInterface $request): void
    {
        $buttonBar = $view->getDocHeaderComponent()->getButtonBar();

        // Language Select in v13
        if ($button = $this->makeLanguageSelect($buttonBar)) {
            $buttonBar->addButton($button, buttonGroup: 1);
        }

        // Auto Save
        if ($button = $this->makeAutoSaveButton($buttonBar)) {
            $buttonBar->addButton($button, buttonGroup: 2);
        }

        // Save
        if ($button = $this->makeSaveButton($buttonBar)) {
            $buttonBar->addButton($button, buttonGroup: 2);
        }

        // Spotlight Toggle
        if ($button = $this->makeSpotlightToggleButton($buttonBar)) {
            $buttonBar->addButton($button, buttonGroup: 3);
        }

        // Show Empty Toggle
        if ($button = $this->makeShowEmptyToggleButton($buttonBar)) {
            $buttonBar->addButton($button, buttonGroup: 3);
        }

        // View
        if ($button = $this->makeViewButton($buttonBar)) {
            $buttonBar->addButton($button, buttonGroup: 4);
        }

        // Edit Page Properties
        if ($button = $this->makeEditButton($buttonBar, $request)) {
            $buttonBar->addButton($button, buttonGroup: 4);
        }

        // Clear Cache
        $button = $this->makeClearCacheButton();
        $buttonBar->addButton($button, ButtonBar::BUTTON_POSITION_RIGHT, buttonGroup: 1);

        /*
         * TODO add Preview Settings button
         * Preview Settings: (saved in user preferences)
         *
         * Show hidden pages
         * Show hidden records/content (default on) (Admin panel dose not work with workspaces, dose not show hidden records even if selected)
         * Ignore start and end time
         * Show fluid debug output (maybe not?)
         * Simulate time [datetime input]
         * Simulate user group [multi select]
         */

        if ($this->typo3Version->getMajorVersion() >= 14) {
            // Shortcut
            $view->getDocHeaderComponent()->setShortcutContext(
                routeIdentifier: 'web_edit',
                displayName: sprintf(
                    '%s: %s [%d]',
                    $this->getLanguageService()->sL('LLL:EXT:visual_editor/Resources/Private/Language/locallang_mod.xlf:edit_page'),
                    $this->pageRecord->get('title'),
                    $this->pageRecord->getUid(),
                ),
                arguments: [
                    'id' => $this->pageRecord->getUid(),
                    //                    'languages' => $this->pageContext->selectedLanguageIds,
                ],
            );
        } else {
            // Reload
            $reloadButton = $buttonBar
                ->makeLinkButton()
                ->setHref($request->getAttribute('normalizedParams')->getRequestUri())
                ->setTitle($this->getLanguageService()->sL('LLL:EXT:core/Resources/Private/Language/locallang_core.xlf:labels.reload'))
                ->setIcon($this->iconFactory->getIcon('actions-refresh', IconSize::SMALL));
            $buttonBar->addButton($reloadButton, ButtonBar::BUTTON_POSITION_RIGHT);
        }
    }

    /**
     * View Button
     */
    private function makeViewButton(ButtonBar $buttonBar): ?ButtonInterface
    {
        if (
            $this->pageRecord->getVersionInfo()?->getState() === VersionState::DELETE_PLACEHOLDER
        ) {
            return null;
        }

        $previewUriBuilder = PreviewUriBuilder::create($this->pageRecord->getRawRecord()->toArray());
        if (!$previewUriBuilder->isPreviewable()) {
            return null;
        }

        $previewDataAttributes = $previewUriBuilder
            ->withRootLine(BackendUtility::BEgetRootLine($this->pageRecord->getUid()))
            ->withLanguage($this->selectedLanguages[0]->getLanguageId())
            ->buildDispatcherDataAttributes();

        return $buttonBar
            ->makeLinkButton()
            ->setHref('#')
            ->setDataAttributes($previewDataAttributes ?? [])
            ->setDisabled(!$previewDataAttributes)
            ->setTitle($this->getLanguageService()->sL('LLL:EXT:core/Resources/Private/Language/locallang_core.xlf:labels.showPage'))
            ->setIcon($this->iconFactory->getIcon('actions-view-page', IconSize::SMALL));
    }

    /**
     * @return array<string, string|float|int|bool|null>|null
     */
    private function getLocalizedPageRecord(int $languageId): ?array
    {
        if ($languageId === 0) {
            return null;
        }

        $queryBuilder = $this->connectionPool->getQueryBuilderForTable('pages');
        $queryBuilder
            ->getRestrictions()
            ->removeAll()
            ->add(GeneralUtility::makeInstance(DeletedRestriction::class))
            ->add(GeneralUtility::makeInstance(WorkspaceRestriction::class, $this->getBackendUser()->workspace));

        $languageCapability = $this->schema->getCapability(TcaSchemaCapability::Language);
        $overlayRecord = $queryBuilder
            ->select('*')
            ->from('pages')
            ->where(
                $queryBuilder->expr()->eq(
                    $languageCapability->getTranslationOriginPointerField()->getName(),
                    $queryBuilder->createNamedParameter($this->pageRecord->getUid(), Connection::PARAM_INT),
                ),
                $queryBuilder->expr()->eq(
                    $languageCapability->getLanguageField()->getName(),
                    $queryBuilder->createNamedParameter($languageId, Connection::PARAM_INT),
                ),
            )
            ->setMaxResults(1)
            ->executeQuery()
            ->fetchAssociative();
        if ($overlayRecord) {
            BackendUtility::workspaceOL('pages', $overlayRecord, $this->getBackendUser()->workspace);
        }

        return is_array($overlayRecord) ? $overlayRecord : null;
    }

    /**
     * Edit Button
     */
    private function makeEditButton(ButtonBar $buttonBar, ServerRequestInterface $request): ?ButtonInterface
    {
        $primaryLanguageId = $this->selectedLanguages[0]->getLanguageId();
        if (!$this->isPageEditable($primaryLanguageId)) {
            return null;
        }

        $pageUid = $this->pageRecord->getUid();
        if ($this->selectedLanguages[0]->getLanguageId() > 0) {
            $localizedPageRecord = $this->getLocalizedPageRecord($this->selectedLanguages[0]->getLanguageId());
            $pageUid = (int)($localizedPageRecord['uid'] ?? $pageUid);
        }

        $params = [
            'returnUrl' => $request->getAttribute('normalizedParams')?->getRequestUri(),
            'edit' => [
                'pages' => [
                    $pageUid => 'edit',
                ],
            ],
            'module' => 'web_edit',
        ];

        if ($this->typo3Version->getMajorVersion() <= 13) {
            return $buttonBar
                ->makeLinkButton()
                ->setHref((string)$this->uriBuilder->buildUriFromRoute('record_edit', $params))
                ->setTitle($this->getLanguageService()->sL('LLL:EXT:backend/Resources/Private/Language/locallang_layout.xlf:editPageProperties'))
                ->setIcon($this->iconFactory->getIcon('actions-page-open', IconSize::SMALL));
        }

        // TODO add this to the Templates/PageEdit.html if TYPO3 v14 is the minimum requirement
        $this->assetCollector->addJavaScriptModule('@typo3/backend/element/contextual-record-edit-trigger.js');

        // TODO use $this->componentFactory->createGenericButton() if TYPO3 v14 is the minimum requirement
        return GeneralUtility::makeInstance(GenericButton::class)
            ->setTag('typo3-backend-contextual-record-edit-trigger')
            ->setAttributes([
                'url' => (string)$this->uriBuilder->buildUriFromRoute('record_edit_contextual', $params),
                'edit-url' => (string)$this->uriBuilder->buildUriFromRoute('record_edit', $params),
            ])
            ->setLabel($this->getLanguageService()->sL('LLL:EXT:backend/Resources/Private/Language/locallang_layout.xlf:editPageProperties'))
            ->setIcon($this->iconFactory->getIcon('actions-page-open', IconSize::SMALL));
    }

    private function makeClearCacheButton(): ButtonInterface
    {
        // TODO use $this->componentFactory->createGenericButton() if TYPO3 v14 is the minimum requirement
        return GeneralUtility::makeInstance(GenericButton::class)
            ->setTag('button')
            ->setLabel($this->getLanguageService()->sL('LLL:EXT:core/Resources/Private/Language/locallang_core.xlf:labels.clear_cache'))
            ->setClasses('t3js-clear-page-cache')
            ->setAttributes(['data-id' => (string)$this->pageRecord->getUid()])
            ->setIcon($this->iconFactory->getIcon('actions-system-cache-clear', IconSize::SMALL));
    }

    /**
     * Check if page can be edited by current user.
     */
    private function isPageEditable(int $languageId): bool
    {
        if (empty($this->pageRecord)) {
            return false;
        }

        if ($this->schema->hasCapability(TcaSchemaCapability::AccessReadOnly)) {
            return false;
        }

        $backendUser = $this->getBackendUser();
        if ($backendUser->isAdmin()) {
            return true;
        }

        if ($this->schema->hasCapability(TcaSchemaCapability::AccessAdminOnly)) {
            return false;
        }

        $isEditLocked = false;
        if ($this->schema->hasCapability(TcaSchemaCapability::EditLock)) {
            $isEditLocked = $this->pageRecord->get($this->schema->getCapability(TcaSchemaCapability::EditLock)->getFieldName()) ?? false;
        }

        if ($isEditLocked) {
            return false;
        }

        return $backendUser->doesUserHaveAccess($this->pageRecord->getRawRecord()->toArray(true), Permission::PAGE_EDIT)
            && $backendUser->checkLanguageAccess($languageId)
            && $backendUser->check('tables_modify', 'pages');
    }

    /**
     * This creates the dropdown menu with the different actions this module is able to provide.
     * For now, they are Columns and Languages.
     */
    private function makeLanguageMenu(ModuleTemplate $view, ServerRequestInterface $request): void
    {
        if ($this->typo3Version->getMajorVersion() <= 13) {
            return;
        }

        $pageContext = $request->getAttribute('pageContext');
        if (!$pageContext instanceof PageContext) {
            throw new InvalidArgumentException('PageContext is missing from request attributes', 1772441095);
        }

        $languageSelectorBuilder = GeneralUtility::makeInstance(LanguageSelectorBuilder::class);
        $languageSelector = $languageSelectorBuilder->build(
            $pageContext,
            LanguageSelectorMode::SINGLE_SELECT,
            fn(array $languageIds): string => (string)$this->uriBuilder->buildUriFromRoute('web_edit', [
                'id' => $pageContext->pageId,
                'languages' => $languageIds,
            ]),
        );
        $view->getDocHeaderComponent()->setLanguageSelector($languageSelector);
    }

    private function getLanguageService(): LanguageService
    {
        return $GLOBALS['LANG'];
    }


    private function getBackendUser(): BackendUserAuthentication
    {
        return $GLOBALS['BE_USER'];
    }

    private function makeAutoSaveButton(ButtonBar $buttonBar): ?GenericButton
    {
        if (
            $this->pageRecord->getVersionInfo()?->getState() === VersionState::DELETE_PLACEHOLDER
        ) {
            return null;
        }

        $previewUriBuilder = PreviewUriBuilder::create($this->pageRecord->getRawRecord()->toArray());
        if (!$previewUriBuilder->isPreviewable()) {
            return null;
        }

        if (!$this->packageManager->isPackageActive('workspaces')) {
            return null;
        }

        $button = $buttonBar->makeButton(GenericButton::class);
        assert($button instanceof GenericButton);
        $workspace = (string)$this->getBackendUser()->workspace;
        return $button
            ->setTag('ve-auto-save-toggle')
            ->setAttributes([
                ...($workspace ? [] : ['disabled' => 'true']),
                'workspace' => $workspace,
                'isWorkspaceInstalled' => (string)$this->packageManager->isPackageActive('workspaces'),
            ])
            ->setLabel(
                $this->getLanguageService()->sL(
                    $workspace ?
                        'LLL:EXT:visual_editor/Resources/Private/Language/locallang.xlf:autosave' :
                        'LLL:EXT:visual_editor/Resources/Private/Language/locallang.xlf:autosave.disabled',
                ),
            )
            ->setIcon($this->iconFactory->getIcon('actions-toggle-off', IconSize::SMALL))
            ->setShowLabelText(true);
    }


    private function makeSaveButton(ButtonBar $buttonBar): ?GenericButton
    {
        if (
            $this->pageRecord->getVersionInfo()?->getState() === VersionState::DELETE_PLACEHOLDER
        ) {
            return null;
        }

        $previewUriBuilder = PreviewUriBuilder::create($this->pageRecord->getRawRecord()->toArray());
        if (!$previewUriBuilder->isPreviewable()) {
            return null;
        }


        $button = $buttonBar->makeButton(GenericButton::class);
        assert($button instanceof GenericButton);
        return $button
            ->setTag('ve-backend-save-button')
            ->setAttributes(['disabled' => 'true'])
            ->setLabel($this->getLanguageService()->sL('LLL:EXT:visual_editor/Resources/Private/Language/locallang.xlf:save'))
            ->setIcon($this->iconFactory->getIcon('actions-save', IconSize::SMALL))
            ->setShowLabelText(true);
    }

    private function makeSpotlightToggleButton(ButtonBar $buttonBar): ?ButtonInterface
    {
        if (
            $this->pageRecord->getVersionInfo()?->getState() === VersionState::DELETE_PLACEHOLDER
        ) {
            return null;
        }

        $previewUriBuilder = PreviewUriBuilder::create($this->pageRecord->getRawRecord()->toArray());
        if (!$previewUriBuilder->isPreviewable()) {
            return null;
        }


        $button = $buttonBar->makeButton(GenericButton::class);
        assert($button instanceof GenericButton);
        return $button
            ->setTag('ve-spotlight-toggle')
            ->setLabel('Spotlight')
            ->setIcon($this->iconFactory->getIcon('actions-lightbulb', IconSize::SMALL))
            ->setShowLabelText(true);
    }

    private function makeShowEmptyToggleButton(ButtonBar $buttonBar): ?ButtonInterface
    {
        if (
            $this->pageRecord->getVersionInfo()?->getState() === VersionState::DELETE_PLACEHOLDER
        ) {
            return null;
        }

        $previewUriBuilder = PreviewUriBuilder::create($this->pageRecord->getRawRecord()->toArray());
        if (!$previewUriBuilder->isPreviewable()) {
            return null;
        }


        $button = $buttonBar->makeButton(GenericButton::class);
        assert($button instanceof GenericButton);
        return $button
            ->setTag('ve-show-empty-toggle')
            ->setLabel($this->getLanguageService()->sL('LLL:EXT:visual_editor/Resources/Private/Language/locallang_mod.xlf:showEmpty'))
            ->setIcon($this->iconFactory->getIcon('actions-hyphen', IconSize::SMALL))
            ->setShowLabelText(true);
    }

    /**
     * @deprecated will be removed after TYPO3 v13 support is dropped
     */
    private function makeLanguageSelect(ButtonBar $buttonBar): ?ButtonInterface
    {
        if ($this->typo3Version->getMajorVersion() >= 14) {
            // in v14 we use the new LanguageSelector component instead of a custom dropdown button, so we return null here to not add the old language dropdown
            return null;
        }

        $languageService = $this->getLanguageService();

        $languageDropDownButton = $buttonBar
            ->makeDropDownButton()
            ->setLabel($languageService->sL('LLL:EXT:core/Resources/Private/Language/locallang_core.xlf:labels.language'))
            ->setShowLabelText(true);

        $pageTranslations = BackendUtility::getExistingPageTranslations($this->pageRecord->getUid());
        $languageField = $this->schema->getCapability(TcaSchemaCapability::Language)->getLanguageField()->getName();
        $translationLanguageUids = array_map(fn(array $pageTranslation): int => (int)$pageTranslation[$languageField], $pageTranslations);
        $translationLanguageUids[] = 0;

        foreach ($this->availableLanguages as $language) {
            if (!in_array($language->getLanguageId(), $translationLanguageUids)) {
                continue;
            }

            $href = (string)$this->uriBuilder->buildUriFromRoute(
                'web_edit',
                [
                    'id' => $this->pageRecord->getUid(),
                    'languages' => [$language->getLanguageId()],
                ],
            );

            /** @var DropDownItemInterface $languageItem */
            $languageItem = GeneralUtility::makeInstance(DropDownRadio::class)
                ->setActive($language->getLanguageId() === $this->selectedLanguages[0]->getLanguageId())
                ->setIcon($this->iconFactory->getIcon($language->getFlagIdentifier()))
                ->setHref($href)
                ->setLabel($language->getTitle());
            $languageDropDownButton->addItem($languageItem);
        }

        if (count($languageDropDownButton->getItems()) <= 1) {
            return null;
        }

        return $languageDropDownButton;
    }
}
