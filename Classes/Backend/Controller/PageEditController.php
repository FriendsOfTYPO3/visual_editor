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
use TYPO3\CMS\Backend\Template\Components\ComponentFactory;
use TYPO3\CMS\Backend\Template\ModuleTemplate;
use TYPO3\CMS\Backend\Template\ModuleTemplateFactory;
use TYPO3\CMS\Backend\Utility\BackendUtility;
use TYPO3\CMS\Backend\View\BackendLayout\ContentFetcher;
use TYPO3\CMS\Backend\View\BackendLayoutView;
use TYPO3\CMS\Backend\View\Drawing\DrawingConfiguration;
use TYPO3\CMS\Backend\View\PageLayoutContext;
use TYPO3\CMS\Backend\View\PageViewMode;
use TYPO3\CMS\Core\Authentication\BackendUserAuthentication;
use TYPO3\CMS\Core\Context\Context;
use TYPO3\CMS\Core\Database\Connection;
use TYPO3\CMS\Core\Database\ConnectionPool;
use TYPO3\CMS\Core\Database\Query\Restriction\DeletedRestriction;
use TYPO3\CMS\Core\Database\Query\Restriction\WorkspaceRestriction;
use TYPO3\CMS\Core\DataHandling\PageDoktypeRegistry;
use TYPO3\CMS\Core\Domain\Record;
use TYPO3\CMS\Core\Domain\RecordFactory;
use TYPO3\CMS\Core\Http\HtmlResponse;
use TYPO3\CMS\Core\Http\ImmediateResponseException;
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
use TYPO3\CMS\Core\Site\Entity\Site;
use TYPO3\CMS\Core\Site\Entity\SiteLanguage;
use TYPO3\CMS\Core\Type\Bitmask\Permission;
use TYPO3\CMS\Core\Utility\GeneralUtility;
use TYPO3\CMS\Core\Versioning\VersionState;
use TYPO3\CMS\VisualEditor\Backend\View\PageEditViewMode;
use TYPO3\CMS\VisualEditor\Service\AllowedOriginService;

use function array_column;
use function array_filter;
use function array_key_exists;
use function array_key_first;
use function array_map;
use function array_unique;
use function array_values;
use function assert;
use function count;
use function in_array;
use function is_array;
use function json_encode;
use function sprintf;

use const JSON_THROW_ON_ERROR;
use const JSON_UNESCAPED_SLASHES;

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

    private TcaSchema $schema;

    public function __construct(
        private readonly ModuleTemplateFactory $moduleTemplateFactory,
        private readonly PageRenderer $pageRenderer,
        private readonly UriBuilder $uriBuilder,
        private readonly IconFactory $iconFactory,
        private readonly RecordFactory $recordFactory,
        private readonly TcaSchemaFactory $tcaSchemaFactory,
        private readonly PackageManager $packageManager,
        private readonly Typo3Version $typo3Version,
        private readonly ConnectionPool $connectionPool,
        private readonly AssetCollector $assetCollector,
        private readonly Context $context,
        private readonly PageDoktypeRegistry $pageDoktypeRegistry,
        private readonly AllowedOriginService $allowedOriginService,
        private readonly BackendLayoutView $backendLayoutView,
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

        $this->availableLanguages = $site->getAvailableLanguages($backendUser, false, $pageUid);
        $languages = $this->moduleData->get('languages') ?? [0];
        $this->selectedLanguages = array_values(array_map(fn($languageUid): SiteLanguage => $site->getLanguageById((int)$languageUid), $languages));
        sort($this->selectedLanguages);
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

        if ($this->typo3Version->getMajorVersion() >= 14 && !$this->pageDoktypeRegistry->isPageViewable((int)$record->getRecordType(), $pageUid)) {
            throw new InvalidArgumentException('Page record is not viewable and cannot be edited with the Visual Editor', 5965019515);
        }

        $this->pageRecord = $record;

        foreach ($this->selectedLanguages as $key => $language) {
            if ($language->getLanguageId() === 0) {
                continue;
            }

            $localizedPageRecord = $this->getLocalizedPageRecord($language->getLanguageId());
            if ($localizedPageRecord === null) {
                // if no translation is found for that language, we remove it from the list.
                unset($this->selectedLanguages[$key]);
            }
        }

        // TODO filter out by origin, and only allow the first origin (no cross origin)

        $this->selectedLanguages = array_values($this->selectedLanguages);

        if (!$this->selectedLanguages) {
            // if no selectedLanguages are left, we set the langauge to the default language
            $this->selectedLanguages = [$site->getDefaultLanguage()];
        }

        $this->applyViewModeToSelectedLanguages($site);
        $this->updateModuleData();
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

        $langauges = [];
        foreach ($this->selectedLanguages as $siteLanguage) {
            $buttonBar = GeneralUtility::makeInstance(ButtonBar::class);
            $iframeUrl = $this->iframeUrl($request, $siteLanguage);
            $isSameOrigin = $this->isSameOrigin($iframeUrl, $request);
            $langauges[] = [
                'id' => $siteLanguage->getLanguageId(),
                'flagIdentifier' => $siteLanguage->getFlagIdentifier(),
                'title' => $siteLanguage->getTitle(),
                'sameOrigin' => $isSameOrigin,
                'iframeUrl' => $iframeUrl,
                'backendUrl' => $request->getUri()->withHost($iframeUrl->getHost())->withScheme($iframeUrl->getScheme())->withPort($iframeUrl->getPort()),
                'iframeTitle' => sprintf(
                    '%s: %s',
                    $this->getLanguageService()->sL('LLL:EXT:visual_editor/Resources/Private/Language/locallang_mod.xlf:edit_page'),
                    (string)$this->pageRecord->get('title'),
                ),
                'viewButton' => $this->makeViewButton($buttonBar, $request, $siteLanguage)?->render(),
                'editButton' => $this->makeEditButton($buttonBar, $request, $siteLanguage)?->render(),
                'translateButton' => $this->makeTranslateButton($siteLanguage, $request)?->render(),
            ];
        }

        if (array_sum(array_column($langauges, 'sameOrigin')) === 0) {
            $this->forceSameOrigin($langauges[0]['iframeUrl']);
        }

        $allowedOrigin = $this->allowedOriginService->getAllowedOrigins();
        $veInfo = [
            'allowedOrigins' => $allowedOrigin,
        ];

        $this->assetCollector->addInlineJavaScript(
            'veLangInfo',
            'window.TYPO3 = window.TYPO3 || {};window.veInfo = ' . json_encode($veInfo, JSON_THROW_ON_ERROR) . ';',
            [
                'type' => 'text/javascript',
            ],
            [
                'useNonce' => true,
            ],
        );

        $view->assignMultiple([
            'pageId' => $this->pageRecord->getUid(),
            'languages' => $langauges,
            'iframeTitle' => sprintf(
                '%s: %s',
                $this->getLanguageService()->sL('LLL:EXT:visual_editor/Resources/Private/Language/locallang_mod.xlf:edit_page'),
                (string)$this->pageRecord->get('title'),
            ),
        ]);

        $this->makeButtons($view, $request);
        $this->makeViewModeSelection($view, $request);
        $this->makeLanguageMenu($view, $request);
//        foreach($iframeUrls as $iframeUrl) {
//            if ($iframeUrl->getScheme() !== '' && $iframeUrl->getHost() !== '') {
//                // temporarily(!) extend the CSP `frame-src` directive with the URL to be shown in the `<iframe>`
//                $mutation = new Mutation(MutationMode::Extend, Directive::FrameSrc, UriValue::fromUri($iframeUrl->withQuery('')));
//                $this->policyRegistry->appendMutationCollection(new MutationCollection($mutation));
//            }
//        }

        return $view->renderResponse('PageEdit')
            // disable cache to force new context for each iframe, otherwise the iframes will sometimes keep their location.
            ->withHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
            ->withHeader('Pragma', 'no-cache')
            ->withHeader('Expires', '0');
    }

    private function updateModuleData(): void
    {
        $viewMode = PageEditViewMode::tryFrom((int)$this->moduleData->get('viewMode')) ?? PageEditViewMode::SingleLanguage;
        $this->moduleData->set('viewMode', $viewMode->value);
        $this->moduleData->set('languages', array_map(fn(SiteLanguage $siteLanguage): int => $siteLanguage->getLanguageId(), $this->selectedLanguages));
        $this->getBackendUser()->pushModuleData($this->moduleData->getModuleIdentifier(), $this->moduleData->toArray());
    }

    private function applyViewModeToSelectedLanguages(Site $site): void
    {
        $viewMode = PageEditViewMode::tryFrom((int)$this->moduleData->get('viewMode')) ?? PageEditViewMode::SingleLanguage;
        if ($viewMode === PageEditViewMode::MultiLanguage) {
            $nonDefaultLanguages = array_values(array_filter(
                $this->selectedLanguages,
                static fn(SiteLanguage $siteLanguage): bool => $siteLanguage->getLanguageId() > 0,
            ));
            $this->selectedLanguages = [$site->getDefaultLanguage(), ...$nonDefaultLanguages];
            return;
        }

        if (count($this->selectedLanguages) <= 1) {
            return;
        }

        $nonDefaultLanguages = array_values(array_filter(
            $this->selectedLanguages,
            static fn(SiteLanguage $siteLanguage): bool => $siteLanguage->getLanguageId() > 0,
        ));
        $this->selectedLanguages = [
            count($nonDefaultLanguages) === 1
                ? $nonDefaultLanguages[0]
                : $site->getDefaultLanguage(),
        ];
    }

    private function iframeUrl(ServerRequestInterface $request, SiteLanguage $siteLanguage): UriInterface
    {
        $parameters = [
            ...$request->getQueryParams()['params'] ?? [],
            '_language' => $siteLanguage->getLanguageId(),
            'editMode' => 1,
        ];
        $previewUriBuilder = PreviewUriBuilder::create($this->pageRecord->getRawRecord()->toArray())
            ->withAdditionalQueryParameters($parameters);

        // unset the context workspace so we do not get the split screen workspace preview in the editor.
        $context = clone $this->context;
        $context->unsetAspect('workspace');

        // setting the workspace in $GLOBALS['BE_USER'] is needed until https://review.typo3.org/c/Packages/TYPO3.CMS/+/93603 is merged and than the lowest supported version includes it.
        $workspace = $this->getBackendUser()->workspace;
        $this->getBackendUser()->workspace = 0;
        try {
            $uri = $previewUriBuilder->buildUri(null, $context);
        } finally {
            $this->getBackendUser()->workspace = $workspace;
        }

        if (!$uri instanceof UriInterface) {
            throw new InvalidArgumentException('Could not generate preview URI for page ' . $this->pageRecord->getUid(), 4148517490);
        }

        return $uri;
    }

    private function makeButtons(ModuleTemplate $view, ServerRequestInterface $request): void
    {
        $buttonBar = $view->getDocHeaderComponent()->getButtonBar();

        // Language Select in v13
        if ($button = $this->makeLanguageSelect($buttonBar)) {
            $buttonBar->addButton($button, ButtonBar::BUTTON_POSITION_LEFT, 1);
        }

        // Auto Save
        if ($button = $this->makeAutoSaveButton($buttonBar)) {
            $buttonBar->addButton($button, ButtonBar::BUTTON_POSITION_LEFT, 2);
        }

        // Save
        if ($button = $this->makeSaveButton($buttonBar)) {
            $buttonBar->addButton($button, ButtonBar::BUTTON_POSITION_LEFT, 2);
        }

        // Spotlight Toggle
        if ($button = $this->makeSpotlightToggleButton($buttonBar)) {
            $buttonBar->addButton($button, ButtonBar::BUTTON_POSITION_LEFT, 3);
        }

        // Show Empty Toggle
        if ($button = $this->makeShowEmptyToggleButton($buttonBar)) {
            $buttonBar->addButton($button, ButtonBar::BUTTON_POSITION_LEFT, 3);
        }

        // Show Hidden Toggle
        if ($button = $this->makeShowHiddenToggleButton($buttonBar)) {
            $buttonBar->addButton($button, ButtonBar::BUTTON_POSITION_LEFT, 3);
        }

        if (count($this->selectedLanguages) === 1) {
            // View
            if ($button = $this->makeViewButton($buttonBar, $request, $this->selectedLanguages[0])) {
                $buttonBar->addButton($button, ButtonBar::BUTTON_POSITION_LEFT, 4);
            }

            // Edit Page Properties
            if ($button = $this->makeEditButton($buttonBar, $request, $this->selectedLanguages[0])) {
                $buttonBar->addButton($button, ButtonBar::BUTTON_POSITION_LEFT, 4);
            }
        }

        // Clear Cache
        $button = $this->makeClearCacheButton();
        $buttonBar->addButton($button, ButtonBar::BUTTON_POSITION_RIGHT, 1);

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
                'web_edit',
                sprintf(
                    '%s: %s [%d]',
                    $this->getLanguageService()->sL('LLL:EXT:visual_editor/Resources/Private/Language/locallang_mod.xlf:edit_page'),
                    $this->pageRecord->get('title'),
                    $this->pageRecord->getUid(),
                ),
                [
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
    private function makeViewButton(ButtonBar $buttonBar, ServerRequestInterface $request, SiteLanguage $language): ?ButtonInterface
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
            ->withLanguage($language->getLanguageId())
            ->withAdditionalQueryParameters($request->getQueryParams()['params'] ?? [])
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
    private function makeEditButton(ButtonBar $buttonBar, ServerRequestInterface $request, SiteLanguage $language): ?ButtonInterface
    {
        $primaryLanguageId = $language->getLanguageId();
        if (!$this->isPageEditable($primaryLanguageId)) {
            return null;
        }

        $pageUid = $this->pageRecord->getUid();
        if ($language->getLanguageId() > 0) {
            $localizedPageRecord = $this->getLocalizedPageRecord($language->getLanguageId());
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

    /**
     * Translate Button
     */
    private function makeTranslateButton(SiteLanguage $language, ServerRequestInterface $request): ?ButtonInterface
    {
        if ($this->typo3Version->getMajorVersion() <= 13) {
            return null;
        }

        if ($language->getLanguageId() <= 0 || !$this->hasUntranslatedContentForLanguage($language, $request)) {
            return null;
        }

        return GeneralUtility::makeInstance(GenericButton::class)
            ->setTag('typo3-backend-localization-button')
            ->setAttributes([
                'record-type' => 'pages',
                'record-uid' => (string)$this->pageRecord->getUid(),
                'target-language' => (string)$language->getLanguageId(),
            ])
            ->setLabel($this->getLanguageService()->sL('LLL:EXT:backend/Resources/Private/Language/locallang_layout.xlf:localize.wizard.button.translate'))
            ->setIcon($this->iconFactory->getIcon('actions-localize', IconSize::SMALL))
            ->setTitle($this->getLanguageService()->sL('LLL:EXT:backend/Resources/Private/Language/locallang_layout.xlf:newPageContent_translate'));
    }

    private function hasUntranslatedContentForLanguage(SiteLanguage $language, ServerRequestInterface $request): bool
    {
        if ($this->typo3Version->getMajorVersion() <= 13) {
            return false;
        }

        if (!$this->getBackendUser()->check('tables_modify', 'tt_content')) {
            return false;
        }

        $pageContext = $request->getAttribute('pageContext');
        if (!$pageContext instanceof PageContext) {
            throw new InvalidArgumentException('PageContext is missing from request attributes', 1782284431);
        }

        $backendLayout = $this->backendLayoutView->getBackendLayoutForPage($pageContext->pageId);
        $viewMode = PageEditViewMode::tryFrom((int)$this->moduleData->get('viewMode')) === PageEditViewMode::MultiLanguage
            ? PageViewMode::LanguageComparisonView
            : PageViewMode::LayoutView;
        $drawingConfiguration = DrawingConfiguration::create($backendLayout, $pageContext->pageTsConfig, $viewMode);
        $drawingConfiguration->setSelectedLanguageIds(
            array_map(
                static fn(SiteLanguage $siteLanguage): int => $siteLanguage->getLanguageId(),
                $this->selectedLanguages,
            ),
        );

        $pageLayoutContext = new PageLayoutContext($pageContext, $backendLayout, $drawingConfiguration, $request);
        // TODO use DI if v14 is the minimum requirement
        $contentFetcher = GeneralUtility::makeInstance(ContentFetcher::class);
        $contentElements = $contentFetcher->getFlatContentRecords($pageLayoutContext, $language->getLanguageId());
        $translationData = $contentFetcher->getTranslationData($pageLayoutContext, $contentElements, $language->getLanguageId());

        return !empty($translationData['untranslatedRecordUids']);
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
            $isEditLocked = $this->pageRecord->getRawRecord()->get($this->schema->getCapability(TcaSchemaCapability::EditLock)->getFieldName()) ?? false;
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

        // TODO use DI if v14 is the minimum requirement
        $languageSelectorBuilder = GeneralUtility::makeInstance(LanguageSelectorBuilder::class);
        $viewMode = PageEditViewMode::tryFrom((int)$this->moduleData->get('viewMode')) ?? PageEditViewMode::SingleLanguage;
        $isMultiLanguageMode = $viewMode === PageEditViewMode::MultiLanguage;
        $languageSelector = $languageSelectorBuilder->build(
            $pageContext,
            $isMultiLanguageMode ? LanguageSelectorMode::MULTI_SELECT : LanguageSelectorMode::SINGLE_SELECT,
            fn(array $languageIds): string => (string)$this->uriBuilder->buildUriFromRoute('web_edit', [
                'id' => $pageContext->pageId,
                'viewMode' => $viewMode->value,
                'languages' => $languageIds,
            ]),
            $isMultiLanguageMode && $pageContext->languageInformation->existingTranslations !== [],
        );
        $view->getDocHeaderComponent()->setLanguageSelector($languageSelector);
    }

    private function makeViewModeSelection(ModuleTemplate $view, ServerRequestInterface $request): void
    {
        if ($this->typo3Version->getMajorVersion() <= 13) {
            return;
        }

        $pageContext = $request->getAttribute('pageContext');
        if (!$pageContext instanceof PageContext) {
            throw new InvalidArgumentException('PageContext is missing from request attributes', 1772441095);
        }

        $languageService = $this->getLanguageService();
        $modes = [
            PageEditViewMode::SingleLanguage->value => $languageService->sL(PageEditViewMode::SingleLanguage->getLabel()),
        ];
        if ($pageContext->languageInformation->existingTranslations !== []) {
            $modes[PageEditViewMode::MultiLanguage->value] = $languageService->sL(PageEditViewMode::MultiLanguage->getLabel());
        }

        if (count($modes) <= 1) {
            $onlyMode = (int)array_key_first($modes);
            if ((int)$this->moduleData->get('viewMode') !== $onlyMode) {
                $this->moduleData->set('viewMode', $onlyMode);
                $this->updateModuleData();
            }
        }

        $selectedMode = (int)$this->moduleData->get('viewMode');
        if (!array_key_exists($selectedMode, $modes)) {
            $this->moduleData->set('viewMode', (int)array_key_first($modes));
            $this->updateModuleData();
            $selectedMode = (int)array_key_first($modes);
        }

        // TODO use DI if TYPO3 v14 is the minimum requirement
        $componentFactory = GeneralUtility::makeInstance(ComponentFactory::class);
        $actionMenu = $componentFactory->createMenu();
        $actionMenu->setIdentifier('actionMenu');
        $actionMenu->setLabel(
            $languageService->sL('LLL:EXT:backend/Resources/Private/Language/locallang.xlf:pagelayout.moduleMenu.dropdown.label'),
        );

        foreach ($modes as $modeValue => $label) {
            $menuItem = $componentFactory
                ->createMenuItem()
                ->setTitle($label)
                ->setHref((string)$this->uriBuilder->buildUriFromRoute('web_edit', $this->buildViewModeSwitchParams($pageContext, $modeValue)));

            if ($selectedMode === $modeValue) {
                $menuItem->setActive(true);
            }

            $actionMenu->addMenuItem($menuItem);
        }

        $view->getDocHeaderComponent()->getMenuRegistry()->addMenu($actionMenu);
    }

    /**
     * @return array{id: int, viewMode: int, languages?: list<int>}
     */
    private function buildViewModeSwitchParams(PageContext $pageContext, int $targetModeValue): array
    {
        $params = [
            'id' => $pageContext->pageId,
            'viewMode' => $targetModeValue,
        ];
        $targetMode = PageEditViewMode::tryFrom($targetModeValue);

        if ($targetMode === PageEditViewMode::SingleLanguage && $pageContext->hasMultipleLanguagesSelected()) {
            $nonDefaultLanguages = array_values(array_filter(
                $pageContext->selectedLanguageIds,
                static fn(int $languageId): bool => $languageId > 0,
            ));
            $params['languages'] = [
                count($nonDefaultLanguages) === 1
                    ? $nonDefaultLanguages[0]
                    : 0,
            ];
        }

        if ($targetMode === PageEditViewMode::MultiLanguage) {
            $params['languages'] = array_values(array_unique([0, ...$pageContext->selectedLanguageIds]));
        }

        return $params;
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
            ->setTitle('')
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

    private function makeShowHiddenToggleButton(ButtonBar $buttonBar): ?ButtonInterface
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
            ->setTag('ve-show-hidden-toggle')
            ->setLabel($this->getLanguageService()->sL('LLL:EXT:visual_editor/Resources/Private/Language/locallang_mod.xlf:showHidden'))
            ->setIcon($this->iconFactory->getIcon('actions-toggle-on', IconSize::SMALL))
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

        $languageField = $this->schema->getCapability(TcaSchemaCapability::Language)->getLanguageField()->getName();

        // @extensionScannerIgnoreLine will be removed after TYPO3 v13 support is dropped
        $pageTranslations = BackendUtility::getExistingPageTranslations($this->pageRecord->getUid());
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

    private function forceSameOrigin(UriInterface $iframeUrl): never
    {
        // redirect to the correct backend origin:
        $backendUrl = $this->uriBuilder
            ->buildUriFromRoute(
                'web_edit',
                [
                    'id' => $this->pageRecord->getUid(),
                    'languages' => array_map(fn(SiteLanguage $siteLanguage): int => $siteLanguage->getLanguageId(), $this->selectedLanguages),
                ],
                UriBuilder::ABSOLUTE_URL,
            )
            ->withScheme($iframeUrl->getScheme())
            ->withHost($iframeUrl->getHost())
            ->withPort($iframeUrl->getPort());
        $html = '<script>window.top.location.href = ' . json_encode((string)$backendUrl, JSON_UNESCAPED_SLASHES) . ';</script>';
        throw new ImmediateResponseException(new HtmlResponse($html, 406), 3234807219);
    }

    private function isSameOrigin(UriInterface $uri, ServerRequestInterface $request): bool
    {
        if ($uri->getScheme() === '' && $uri->getHost() === '') {
            return true;
        }

        return $uri->getScheme() === $request->getUri()->getScheme()
        && $uri->getHost() === $request->getUri()->getHost()
        && $uri->getPort() === $request->getUri()->getPort();
    }
}
