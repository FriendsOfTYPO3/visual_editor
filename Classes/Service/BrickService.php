<?php

declare(strict_types=1);

namespace Andersundsehr\Editara\Service;

use Andersundsehr\Editara\Dto\Editable;
use Andersundsehr\Editara\Enum\EditableType;
use Psr\Http\Message\ServerRequestInterface;
use RuntimeException;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use TYPO3\CMS\Core\Cache\Frontend\FrontendInterface;
use TYPO3\CMS\Core\Database\ConnectionPool;
use TYPO3\CMS\Core\Database\Query\Restriction\EndTimeRestriction;
use TYPO3\CMS\Core\Database\Query\Restriction\FrontendGroupRestriction;
use TYPO3\CMS\Core\Database\Query\Restriction\HiddenRestriction;
use TYPO3\CMS\Core\Database\Query\Restriction\StartTimeRestriction;
use TYPO3\CMS\Core\Domain\Record;
use TYPO3\CMS\Core\Domain\RecordFactory;
use TYPO3\CMS\Core\Domain\RecordInterface;
use TYPO3\CMS\Core\Page\AssetCollector;
use TYPO3\CMS\Core\Site\SiteFinder;
use TYPO3\CMS\Frontend\Page\PageInformation;
use TYPO3Fluid\Fluid\Core\Rendering\RenderingContextInterface;
use function assert;
use function str_replace;

final readonly class BrickService
{
    public function __construct(
        private AssetCollector $assetCollector,
        private RecordFactory $recordFactory,
        private DataHandlerService $dataHandlerService,
        private ConnectionPool $connectionPool,
        private SiteFinder $siteFinder,
        #[Autowire(service: 'cache.runtime')]
        private FrontendInterface $runtimeCache,
    )
    {
    }

    public function getEditable(RenderingContextInterface $renderingContext, string $name, EditableType $type): Editable
    {
        $templateBrick = $this->getTemplateBrick($renderingContext);
        return $this->getEditableFromTemplateBrick($templateBrick, $name, $type);
    }

    private function getEditableFromTemplateBrick(Record $templateBrick, string $name, EditableType $type): Editable
    {
        if (!$name) {
            throw new \Exception('name must be not empty');
        }

        $cacheKey = str_replace('\\','_', __CLASS__ . '_' . $templateBrick->getUid() . '_' . $name);
        if ($this->runtimeCache->has($cacheKey)) {
            // enforce single call per editable per rendering
            throw new \RuntimeException('Editable with name "' . $name . '" already exists in templateBrick:' . $templateBrick->getUid());
        }
        $this->runtimeCache->set($cacheKey, true);

        $record = null;
        foreach ($templateBrick->get('editables') as $editable) {
            if ($editable->get('name') === $name) {
                $record = $editable;
                break;
            }
        }
        if (!$record) {
            $record = $this->createEditableRecord($templateBrick, $name, $type);
        }
        return new Editable($name, $type, $type->getField(), $record);
    }

    public function getTemplateBrick(RenderingContextInterface $renderingContext): Record
    {
        $templateVariableContainer = $renderingContext->getVariableProvider();
        $templateBrick = $templateVariableContainer->get('editara___templateBrick');
        if (!$templateBrick) {
            $pageRecord = $this->findPageRecordObject($renderingContext);
            $this->init($pageRecord->getUid(), $pageRecord->getLanguageId());
            $templateBrick = $pageRecord->get('template_brick')[0] ?? null; // ensure loaded
            if (!$templateBrick) {
                assert($pageRecord instanceof Record, 'pageRecord must be a Record, not only RecordInterface');
                $templateBrick = $this->createTemplateBrickForPage($pageRecord);
            }
            $templateVariableContainer->add('editara___templateBrick', $templateBrick);
        }
        return $templateBrick;
    }

    private function findPageRecordObject(RenderingContextInterface $renderingContext): RecordInterface
    {
        $request = $renderingContext->getAttribute(ServerRequestInterface::class);
        $pageInformation = $request->getAttribute('frontend.page.information');
        if (!$pageInformation instanceof PageInformation) {
            throw new RuntimeException('Can only be used in Frontend Context with attribute frontend.page.information in Request');
        }
        // cached inside the resolved record
        return $this->recordFactory->createResolvedRecordFromDatabaseRow('pages', $pageInformation->getPageRecord());
    }

    private function init(int $defaultLangPagUid, int $currentRenderingLanguage): void
    {
        if (!$this->isEditMode()) {
            return;
        }
        $this->assetCollector->addStyleSheet('editable', 'EXT:editara/Resources/Public/Css/editable.css');
        $this->assetCollector->addJavaScriptModule('@andersundsehr/editara/index.js');

        if (!$this->assetCollector->hasInlineJavaScript('editaraLangInfo')) {
            $data = [
                'currentPageId' => $defaultLangPagUid,
                'currentLanguageId' => $currentRenderingLanguage,
                'pageLanguages' => $this->getPageLanguages($defaultLangPagUid),
            ];
            $this->assetCollector->addInlineJavaScript(
                'editaraLangInfo',
                'window.TYPO3 = window.TYPO3 || {};
window.editaraInfo = ' . json_encode($data, JSON_THROW_ON_ERROR) . ';',
                [
                    'type' => 'text/javascript',
                ],
            );
        }
    }

    private function createTemplateBrickForPage(Record $pageRecord): Record
    {
        $parentDefaultLangUid = $pageRecord->getLanguageInfo()?->getTranslationParent();
        $uidDefaultLang = 0;
        if ($pageRecord->getLanguageId() > 0) {
            $query = "SELECT uid FROM template_brick WHERE parent_table = 'pages' AND parent_uid = ? AND sys_language_uid = 0 AND deleted = 0";
            $uidDefaultLang = $this->connectionPool->getConnectionForTable('template_brick')->fetchOne($query, [$parentDefaultLangUid]);
            if (!$uidDefaultLang) {
                $uidDefaultLang = $this->dataHandlerService->createRow('template_brick', [
                    'pid' => $pageRecord->getUid(),
                    'area_name' => 'page',
                    'parent_table' => 'pages',
                    'parent_uid' => $pageRecord->getUid(),
                    'hidden' => 0,
                    'sys_language_uid' => 0,
                    'l10n_parent' => 0,
                ]);
            }
        }

        $parentUid = $pageRecord->getComputedProperties()->getLocalizedUid() ?? $pageRecord->getUid();
        return $this->dataHandlerService->createRecordInDb('template_brick', [
            'pid' => $pageRecord->getUid(),
            'area_name' => 'page',
            'parent_table' => 'pages',
            'parent_uid' => $parentUid,
            'hidden' => 0,
            'sys_language_uid' => $pageRecord->getLanguageId(),
            'l10n_parent' => $uidDefaultLang,
        ]);
    }

    public function isEditMode(): bool
    {
        return (bool)($_GET['editara'] ?? false); // TODO use Request object
    }

    /**
     * @return list<array{uid: int, title: string, flag: string}>
     */
    private function getPageLanguages(int $defaultLangPagUid): array
    {
        $queryBuilder = $this->connectionPool->getQueryBuilderForTable('pages');
        $queryBuilder
            ->getRestrictions()
            ->removeByType(HiddenRestriction::class)
            ->removeByType(EndTimeRestriction::class)
            ->removeByType(StartTimeRestriction::class)
            ->removeByType(FrontendGroupRestriction::class);
        $pageTranslationByLanguage = $queryBuilder
            ->select('sys_language_uid', 'uid', 'title')
            ->from('pages')
            ->where(
                $queryBuilder->expr()->or(
                    $queryBuilder->expr()->eq('uid', $defaultLangPagUid),
                    $queryBuilder->expr()->eq('l10n_parent', $defaultLangPagUid),
                ),
            )
            ->executeQuery()
            ->fetchAllAssociativeIndexed();

        $site = $this->siteFinder->getSiteByPageId($defaultLangPagUid);
        $pageLanguages = [];
        foreach ($site->getLanguages() as $language) {
            if (!isset($pageTranslationByLanguage[$language->getLanguageId()])) {
                continue;
            }
            $pageLanguages[] = [
                'uid' => $language->getLanguageId(),
                'title' => $language->getTitle(),
                'flag' => str_replace('flags-', '', $language->getFlagIdentifier()),
            ];
        }
        return $pageLanguages;
    }

    public function createEditableRecord(Record $templateBrick, string $name, EditableType $type): Record
    {
        $parentDefaultLangUid = $templateBrick->getLanguageInfo()?->getTranslationParent();
        $uidDefaultLang = 0;
        if ($templateBrick->getLanguageId() > 0) {
            $query = "SELECT uid FROM editable WHERE template_brick = ? AND sys_language_uid = 0 AND deleted = 0 AND name = ?";
            $uidDefaultLang = $this->connectionPool->getConnectionForTable('editable')->fetchOne($query, [$parentDefaultLangUid, $name]);
            if (!$uidDefaultLang) {
                $uidDefaultLang = $this->dataHandlerService->createRow('editable', [
                    'pid' => $templateBrick->getPid(),
                    'template_brick' => $templateBrick->getUid(),
                    'name' => $name,
                    $type->getField() => '',
                    'type' => $type->name,
                    'hidden' => 0,
                    'sys_language_uid' => 0,
                    'l10n_parent' => 0,
                ]);
            }
        }

        $templateBrickUid = $templateBrick->getComputedProperties()->getLocalizedUid() ?? $templateBrick->getUid();
        $row = [
            'pid' => $templateBrick->getPid(),
            'template_brick' => $templateBrickUid,
            'name' => $name,
            $type->getField() => '',
            'type' => $type->name,
            'hidden' => 0,
            'sys_language_uid' => $templateBrick->getLanguageId(),
            'l10n_parent' => $uidDefaultLang,
        ];
        return $this->dataHandlerService->createRecordInDb('editable', $row);
    }
}
