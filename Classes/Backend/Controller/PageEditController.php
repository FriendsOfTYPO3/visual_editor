<?php

declare(strict_types=1);

namespace TYPO3\CMS\VisualEditor\Backend\Controller;

use InvalidArgumentException;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Message\UriInterface;
use TYPO3\CMS\Backend\Attribute\AsController;
use TYPO3\CMS\Backend\Module\ModuleData;
use TYPO3\CMS\Backend\Routing\PreviewUriBuilder;
use TYPO3\CMS\Backend\Routing\UriBuilder;
use TYPO3\CMS\Backend\Template\Components\ButtonBar;
use TYPO3\CMS\Backend\Template\Components\Buttons\ButtonInterface;
use TYPO3\CMS\Backend\Template\Components\Buttons\GenericButton;
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
use TYPO3\CMS\Core\Localization\LanguageService;
use TYPO3\CMS\Core\Package\PackageManager;
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
use function array_key_first;
use function assert;
use function count;
use function is_array;


#[AsController]
class PageEditController
{
    protected SiteLanguage $selectedLanguage;

    protected ModuleData $moduleData;
    protected ?Record $pageRecord = null;

    /** @var list<SiteLanguage> */
    protected array $availableLanguages = [];
    protected Site $site;
    protected TcaSchema $schema;

    public function __construct(
        protected readonly ModuleTemplateFactory $moduleTemplateFactory,
        protected readonly PageRenderer $pageRenderer,
        protected readonly UriBuilder $uriBuilder,
        protected readonly IconFactory $iconFactory,
        protected readonly RecordFactory $recordFactory,
        protected readonly TcaSchemaFactory $tcaSchemaFactory,
        protected readonly PackageManager $packageManager,
        protected readonly PolicyRegistry $policyRegistry,
    ) {
    }

    protected function initialize(ServerRequestInterface $request): void
    {
        $backendUser = $this->getBackendUser();
        $pageUid = (int)($request->getParsedBody()['id'] ?? $request->getQueryParams()['id'] ?? throw new InvalidArgumentException('Missing "id" query parameter',));
        $this->moduleData = $request->getAttribute('moduleData');
        $pageInfo = BackendUtility::readPageAccess($pageUid, $backendUser->getPagePermsClause(Permission::PAGE_SHOW));
        if (!$pageInfo || count($pageInfo) === 1) {
            // if $pageInfo is "empty" it will have the property "_thePath"
            throw new InvalidArgumentException('Page record not found for id ' . (int)($request->getParsedBody()['id'] ?? $request->getQueryParams()['id'] ?? 0),);
        }
        $record = $this->recordFactory->createResolvedRecordFromDatabaseRow('pages', $pageInfo);
        if (!$record instanceof Record) {
            throw new InvalidArgumentException('RecordFactory did not return a Record for pages record, this should not happen');
        }
        $this->pageRecord = $record;

        $site = $request->getAttribute('site');
        if (!$site instanceof Site) {
            throw new InvalidArgumentException('No site found for page id ' . $pageUid);
        }
        $this->site = $site;
        $this->availableLanguages = $site->getAvailableLanguages($backendUser, false, $pageUid);
        $this->selectedLanguage = $site->getLanguageById((int)($this->moduleData->get('language') ?? 0));
        $this->pageRenderer->addInlineLanguageLabelFile('EXT:visual_editor/Resources/Private/Language/locallang.xlf');
        $this->schema = $this->tcaSchemaFactory->get('pages');
    }

    public function __invoke(ServerRequestInterface $request): ResponseInterface
    {
        try {
            $this->initialize($request);
        } catch (InvalidArgumentException $e) {
            $view = $this->moduleTemplateFactory->create($request);
            $languageService = $this->getLanguageService();

            // Page uid 0 or no access.
            $view->setTitle($languageService->sL('LLL:EXT:backend/Resources/Private/Language/locallang_mod.xlf:mlang_tabs_tab'));
            $view->assignMultiple([
                'pageId' => $request->getParsedBody()['id'] ?? $request->getQueryParams()['id'] ?? 0,
                'siteName' => $GLOBALS['TYPO3_CONF_VARS']['SYS']['sitename'] ?? '',
            ]);
            return $view->renderResponse('PageLayout/PageModuleNoAccess');
        }

        $this->pageRenderer->getJavaScriptRenderer()->addJavaScriptModuleInstruction(
            JavaScriptModuleInstruction::create('@typo3/visual-editor/Backend/index.mjs'),
        );


        $view = $this->moduleTemplateFactory->create($request);
        $view->setTitle('Edit Page · ' . $this->pageRecord->get('title'));
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
        $this->makeActionMenu($view);


        if ($iframeUrl->getScheme() !== '' && $iframeUrl->getHost() !== '') {
            // temporarily(!) extend the CSP `frame-src` directive with the URL to be shown in the `<iframe>`
            $mutation = new Mutation(MutationMode::Extend, Directive::FrameSrc, UriValue::fromUri($iframeUrl));
            $this->policyRegistry->appendMutationCollection(new MutationCollection($mutation));
        }

        return $view->renderResponse('PageEdit');
    }

    private function iframeUrl(): UriInterface
    {
        return $this->site->getRouter()->generateUri(
            $this->pageRecord->getUid(),
            [
                '_language' => $this->selectedLanguage->getLanguageId(),
                'editMode' => 1,
            ],
        );
    }

    private function makeButtons(ModuleTemplate $view, ServerRequestInterface $request): void
    {
        $buttonBar = $view->getDocHeaderComponent()->getButtonBar();

        // Auto Save
        if ($button = $this->makeAutoSaveButton($buttonBar)) {
            $buttonBar->addButton($button, buttonGroup: 1);
        }
        // Save
        if ($button = $this->makeSaveButton($buttonBar)) {
            $buttonBar->addButton($button, buttonGroup: 1);
        }

        // Spotlight Toggle
        if ($button = $this->makeSpotlightToggleButton($buttonBar)) {
            $buttonBar->addButton($button, buttonGroup: 2);
        }
        // Show Empty Toggle
        if ($button = $this->makeShowEmptyToggleButton($buttonBar)) {
            $buttonBar->addButton($button, buttonGroup: 2);
        }

        // View
        if ($button = $this->makeViewButton($buttonBar)) {
            $buttonBar->addButton($button, buttonGroup: 3);
        }
        // Edit Page Properties
        if ($button = $this->makeEditButton($buttonBar, $request)) {
            $buttonBar->addButton($button, buttonGroup: 3);
        }

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

        // Reload
        $reloadButton = $buttonBar->makeLinkButton()
            ->setHref($request->getAttribute('normalizedParams')->getRequestUri())
            ->setTitle($this->getLanguageService()->sL('LLL:EXT:core/Resources/Private/Language/locallang_core.xlf:labels.reload'))
            ->setIcon($this->iconFactory->getIcon('actions-refresh', IconSize::SMALL));
        $buttonBar->addButton($reloadButton, ButtonBar::BUTTON_POSITION_RIGHT);
    }

    /**
     * View Button
     */
    protected function makeViewButton(ButtonBar $buttonBar): ?ButtonInterface
    {
        if (
            $this->pageRecord->getVersionInfo()->getState() === VersionState::DELETE_PLACEHOLDER
        ) {
            return null;
        }

        $previewUriBuilder = PreviewUriBuilder::create($this->pageRecord->getRawRecord()->toArray());
        if (!$previewUriBuilder->isPreviewable()) {
            return null;
        }

        $previewDataAttributes = $previewUriBuilder
            ->withRootLine(BackendUtility::BEgetRootLine($this->pageRecord->getUid()))
            ->withLanguage($this->selectedLanguage->getLanguageId())
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
     * Check if page can be edited by current user.
     */
    protected function isPageEditable(int $languageId): bool
    {
        if ($this->pageRecord) {
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
            $isEditLocked = $this->pageinfo[$this->schema->getCapability(TcaSchemaCapability::EditLock)->getFieldName()] ?? false;
        }
        if ($isEditLocked) {
            return false;
        }
        return $backendUser->doesUserHaveAccess($this->pageRecord->getRawRecord()->toArray(), Permission::PAGE_EDIT)
            && $backendUser->checkLanguageAccess($languageId)
            && $backendUser->check('tables_modify', 'pages');
    }

    protected function getLocalizedPageRecord(int $languageId): ?array
    {
        if ($languageId === 0) {
            return null;
        }
        $queryBuilder = GeneralUtility::makeInstance(ConnectionPool::class)->getQueryBuilderForTable('pages');
        $queryBuilder->getRestrictions()
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
    protected function makeEditButton(ButtonBar $buttonBar, ServerRequestInterface $request): ?ButtonInterface
    {
        $pageUid = $this->pageRecord->getUid();
        if ($this->selectedLanguage->getLanguageId() > 0) {
            $overlayRecord = $this->getLocalizedPageRecord($this->selectedLanguage->getLanguageId());
            $pageUid = $overlayRecord['uid'];
        }

        $params = [
            'returnUrl' => $request->getAttribute('normalizedParams')->getRequestUri(),
            'edit' => [
                'pages' => [
                    $pageUid => 'edit',
                ],
            ],
        ];

        return $buttonBar->makeLinkButton()
            ->setHref((string)$this->uriBuilder->buildUriFromRoute('record_edit', $params))
            ->setTitle($this->getLanguageService()->sL('LLL:EXT:backend/Resources/Private/Language/locallang_layout.xlf:editPageProperties'))
            ->setIcon($this->iconFactory->getIcon('actions-page-open', IconSize::SMALL));
    }

    /**
     * This creates the dropdown menu with the different actions this module is able to provide.
     * For now, they are Columns and Languages.
     */
    protected function makeActionMenu(ModuleTemplate $view): void
    {
        $actionMenu = $view->getDocHeaderComponent()->getMenuRegistry()->makeMenu();
        $actionMenu->setIdentifier('languageMenu');
        $actionMenu->setLabel('HI');

        foreach ($this->availableLanguages as $language) {
            $href = (string)$this->uriBuilder->buildUriFromRoute('web_edit', ['id' => $this->pageRecord->getUid(), 'language' => $language->getLanguageId()]);
            $menuItem = $actionMenu
                ->makeMenuItem()
                ->setTitle($language->getTitle())
                ->setHref($href);
            if ($language->getLanguageId() === $this->selectedLanguage->getLanguageId()) {
                $menuItem->setActive(true);
                $defaultKey = null;
            }
            $actionMenu->addMenuItem($menuItem);
        }
        $view->getDocHeaderComponent()->getMenuRegistry()->addMenu($actionMenu);

        return;


        $languageService = $this->getLanguageService();
        $actions = [
            1 => $languageService->sL('LLL:EXT:core/Resources/Private/Language/locallang_core.xlf:labels.view.layout'),
        ];

        // Find if there are ANY languages at all (and if not, do not show the language option from function menu).
        // The second check is for an edge case: Only two languages in the site and the default is not allowed.
        if (count($this->availableLanguages) > 1 || (int)array_key_first($this->availableLanguages) > 0) {
            $actions[2] = $languageService->sL('LLL:EXT:core/Resources/Private/Language/locallang_core.xlf:labels.view.language_comparison');
        }

        $actionMenu = $view->getDocHeaderComponent()->getMenuRegistry()->makeMenu();
        $actionMenu->setIdentifier('actionMenu');
        $actionMenu->setLabel(
            $languageService->sL(
                'LLL:EXT:backend/Resources/Private/Language/locallang.xlf:pagelayout.moduleMenu.dropdown.label',
            ),
        );
        $defaultKey = null;
        $foundDefaultKey = false;
        foreach ($actions as $key => $action) {
            $menuItem = $actionMenu
                ->makeMenuItem()
                ->setTitle($action)
                ->setHref((string)$this->uriBuilder->buildUriFromRoute('web_edit', ['id' => $this->pageRecord->getUid(), 'function' => $key]));
            if (!$foundDefaultKey) {
                $defaultKey = $key;
                $foundDefaultKey = true;
            }
            if ((int)$this->moduleData->get('function') === $key) {
                $menuItem->setActive(true);
                $defaultKey = null;
            }
            $actionMenu->addMenuItem($menuItem);
        }
        if (isset($defaultKey)) {
            $this->moduleData->set('function', $defaultKey);
        }
        $view->getDocHeaderComponent()->getMenuRegistry()->addMenu($actionMenu);
    }

    protected function getLanguageService(): LanguageService
    {
        return $GLOBALS['LANG'];
    }


    protected function getBackendUser(): BackendUserAuthentication
    {
        return $GLOBALS['BE_USER'];
    }

    private function makeAutoSaveButton(ButtonBar $buttonBar)
    {
        if (
            $this->pageRecord->getVersionInfo()->getState() === VersionState::DELETE_PLACEHOLDER
        ) {
            return null;
        }

        $previewUriBuilder = PreviewUriBuilder::create($this->pageRecord->getRawRecord()->toArray());
        if (!$previewUriBuilder->isPreviewable()) {
            return null;
        }

        $button = $buttonBar->makeButton(GenericButton::class);
        assert($button instanceof GenericButton);
        $active = $this->getBackendUser()->workspace;
        return $button
            ->setTag('ve-auto-save-toggle')
            ->setAttributes([
                ...($active ? [] : ['disabled' => true]),
                'workspace' => $active,
                'isWorkspaceInstalled' => $this->packageManager->isPackageActive('workspaces'),
            ])
            ->setLabel(
                $this->getLanguageService()->sL($active ?
                'LLL:EXT:visual_editor/Resources/Private/Language/locallang.xlf:autosave':
                'LLL:EXT:visual_editor/Resources/Private/Language/locallang.xlf:autosave.disabled'
            ))
            ->setIcon($this->iconFactory->getIcon('actions-toggle-off', IconSize::SMALL))
            ->setShowLabelText(true);
    }


    private function makeSaveButton(ButtonBar $buttonBar)
    {
        if (
            $this->pageRecord->getVersionInfo()->getState() === VersionState::DELETE_PLACEHOLDER
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
            ->setAttributes(['disabled' => true])
            ->setLabel($this->getLanguageService()->sL('LLL:EXT:visual_editor/Resources/Private/Language/locallang.xlf:save'))
            ->setIcon($this->iconFactory->getIcon('actions-save', IconSize::SMALL))
            ->setShowLabelText(true);
    }

    private function makeSpotlightToggleButton(ButtonBar $buttonBar): ?ButtonInterface
    {
        if (
            $this->pageRecord->getVersionInfo()->getState() === VersionState::DELETE_PLACEHOLDER
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
            $this->pageRecord->getVersionInfo()->getState() === VersionState::DELETE_PLACEHOLDER
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
            ->setLabel('Show empty')
            ->setIcon($this->iconFactory->getIcon('actions-hyphen', IconSize::SMALL))
            ->setShowLabelText(true);
    }
}
