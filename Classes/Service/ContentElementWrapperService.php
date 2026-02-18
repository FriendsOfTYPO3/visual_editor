<?php

declare(strict_types=1);

namespace TYPO3\CMS\VisualEditor\Service;

use InvalidArgumentException;
use Exception;
use Symfony\Component\DependencyInjection\Attribute\Autoconfigure;
use TYPO3\CMS\Backend\Routing\UriBuilder;
use TYPO3\CMS\Core\Authentication\BackendUserAuthentication;
use TYPO3\CMS\Core\Domain\Record;
use TYPO3\CMS\Core\Domain\RecordFactory;
use TYPO3\CMS\Core\Schema\Capability\TcaSchemaCapability;
use TYPO3\CMS\Core\Schema\TcaSchemaFactory;
use TYPO3\CMS\Core\Utility\GeneralUtility;
use TYPO3\CMS\Extbase\Utility\LocalizationUtility;
use TYPO3\CMS\VisualEditor\Service\LocalizationService;
use TYPO3Fluid\Fluid\Core\ViewHelper\TagBuilder;

use function assert;
use function json_encode;
use function str_contains;

use const JSON_THROW_ON_ERROR;

#[Autoconfigure(public: true)]
final readonly class ContentElementWrapperService
{
    public function __construct(
        private RecordFactory $recordFactory,
        private EditModeService $editModeService,
        private TcaSchemaFactory $tcaSchema,
        private UriBuilder $backendUriBuilder,
        private LocalizationService $localizationService,
    ) {
    }

    /**
     * @param array<string, mixed> $data the raw database row
     */
    public function wrapContentElementHtml(string $table, array $data, string $content): string
    {
        if (!$this->editModeService->isEditMode()) {
            return $content;
        }

        $this->editModeService->init();

        $canModifyRecord = true;
        /** @var BackendUserAuthentication $beUser */
        $beUser = $GLOBALS['BE_USER'];
        if (!$beUser->check('tables_modify', $table)) {
            $canModifyRecord = false; // no edit rights
        }

        if ($table === 'tt_content' && !$beUser->check('explicit_allowdeny', 'tt_content:CType:' . $data['CType'])) {
            $canModifyRecord = false;
            // no access to this content element type
        }

        $record = $this->recordFactory->createResolvedRecordFromDatabaseRow($table, $data);
        assert($record instanceof Record);
        $schema = $this->tcaSchema->get($record->getFullType());

        $hiddenFieldType = $schema->getCapability(TcaSchemaCapability::RestrictionDisabledField);
        $hiddenFieldName = $hiddenFieldType->getFieldName();
        if (
            $schema->getField($hiddenFieldName)->supportsAccessControl() && !$beUser->check(
                'non_exclude_fields',
                $record->getMainType() . ':' . $hiddenFieldName,
            )
        ) {
            $hiddenFieldName = ''; // user has no access to hidden field
        }

        $tag = GeneralUtility::makeInstance(TagBuilder::class, 've-content-element', $content);
        $tag->forceClosingTag(true);
        $tag->addAttribute('elementName', $this->getContentTypeLabel($record));
        $tag->addAttribute('CType', $record->get('CType'));
        $tag->addAttribute('table', $table);
        $uid = $record->getComputedProperties()->getLocalizedUid() ?: $record->getComputedProperties()->getVersionedUid() ?: $record->getUid();
        $tag->addAttribute('id', $table . ':' . $uid);
        $tag->addAttribute('uid', (string)$uid);
        $tag->addAttribute('pid', (string)$record->getPid());
        $tag->addAttribute('colPos', $record->get('colPos'));
        $tag->addAttribute('hiddenFieldName', $hiddenFieldName);
        if ($canModifyRecord) {
            $tag->addAttribute('canModifyRecord', 'true');
        }
        if (!$record->getLanguageInfo()->getTranslationParent()) {
            $tag->addAttribute('canBeMoved', 'true');
        }

        if ($record->getSystemProperties()->isDisabled()) {
            $tag->addAttribute('isHidden', 'true');
        }

        if ($record->has('tx_container_parent')) {
            // EXT:container compatibility
            $tag->addAttribute('tx_container_parent', $record->getRawRecord()->get('tx_container_parent'));
            // TODO (test with sys_language_uid > 1) (test with workspace) possibly we need to find the correct overlay uid
        }

        return $tag->render();
    }

    private function getContentTypeLabel(Record $record): string
    {
        $recordType = $record->getRecordType();
        foreach ($GLOBALS['TCA']['tt_content']['columns']['CType']['config']['items'] as $item) {
            if ($item['value'] === $recordType && $item['label']) {
                return $this->localizationService->tryTranslation($item['label']);
            }
        }

        return $recordType;
    }
}
