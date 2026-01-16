<?php

declare(strict_types=1);

namespace TYPO3\CMS\VisualEditor\Service;

use Symfony\Component\DependencyInjection\Attribute\Autoconfigure;
use TYPO3\CMS\Backend\Routing\UriBuilder;
use TYPO3\CMS\Core\Authentication\BackendUserAuthentication;
use TYPO3\CMS\Core\Context\Context;
use TYPO3\CMS\Core\Domain\Record;
use TYPO3\CMS\Core\Domain\RecordFactory;
use TYPO3\CMS\Core\Schema\Capability\TcaSchemaCapability;
use TYPO3\CMS\Core\Schema\TcaSchemaFactory;
use TYPO3\CMS\Core\Utility\GeneralUtility;
use TYPO3\CMS\Extbase\Utility\LocalizationUtility;
use TYPO3\CMS\VisualEditor\ViewHelpers\ContentAreaViewHelper;
use TYPO3Fluid\Fluid\Core\ViewHelper\TagBuilder;
use function assert;
use function json_encode;
use function str_starts_with;
use const JSON_THROW_ON_ERROR;

#[Autoconfigure(public: true)]
final readonly class ContentElementWrapperService
{
    public function __construct(
        private RecordFactory $recordFactory,
        private EditModeService $editModeService,
        private TcaSchemaFactory $tcaSchema,
        private UriBuilder $backendUriBuilder,
    )
    {
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
        if ($table === 'tt_content') {
            if (!$beUser->check('explicit_allowdeny', 'tt_content:CType:' . $data['CType'])) {
                $canModifyRecord = false; // no access to this content element type
            }
        }

        $record = $this->recordFactory->createResolvedRecordFromDatabaseRow($table, $data);
        assert($record instanceof Record);
        $schema = $this->tcaSchema->get($record->getMainType()); // TODO use getFullType (if flux is not used)

        $hiddenFieldType = $schema->getCapability(TcaSchemaCapability::RestrictionDisabledField);
        $hiddenFieldName = $hiddenFieldType->getFieldName();
        if ($schema->getField($hiddenFieldName)->supportsAccessControl() && !$beUser->check(
                'non_exclude_fields',
                $record->getMainType() . ':' . $hiddenFieldName,
            )) {
            $hiddenFieldName = ''; // user has no access to hidden field
        }

        $div = GeneralUtility::makeInstance(TagBuilder::class, 've-content-element', $content);
        $div->addAttribute('elementName', $this->getContentTypeLabel($record));
        $div->addAttribute('table', $table);
        $div->addAttribute('id', $table . ':' . $record->getUid());
        $div->addAttribute('uid', (string)$record->getUid());
        $div->addAttribute('pid', (string)$record->getPid());
        $div->addAttribute('colPos', $record->get('colPos'));
        $div->addAttribute('hiddenFieldName', $hiddenFieldName);
        if ($canModifyRecord) {
            $div->addAttribute('canModifyRecord', 'true');
        }
        if ($record->getSystemProperties()->isDisabled()) {
            $div->addAttribute('isHidden', 'true');
        }
        $updateFields = [
            'sys_language_uid' => $record->getLanguageId(),
        ];
        if ($record->has('tx_container_parent')) {
            // EXT:container compatibility
            $updateFields['tx_container_parent'] = $record->getRawRecord()->get('tx_container_parent');
        }
        $div->addAttribute('updateFields', json_encode($updateFields, JSON_THROW_ON_ERROR));

        return $div->render();
    }

    private function getContentTypeLabel(Record $record): string
    {
        $recordType = $record->getRecordType();
        foreach ($GLOBALS['TCA']['tt_content']['columns']['CType']['config']['items'] as $item) {
            if ($item['value'] === $recordType) {
                return str_starts_with($item['label'], 'LLL:') ? LocalizationUtility::translate($item['label']) : $item['label'];
            }
        }
        return $recordType;
    }

    private function getEditUrl(Record $record): string
    {
        $returnUrl = (string)$this->backendUriBuilder->buildUriFromRoute('web_edit', [
            'id' => $record->getPid(),
        ]);
        $params = [
            'edit' => [
                $record->getMainType() => [
                    $record->getUid() => 'edit',
                ],
            ],
            'returnUrl' => $returnUrl,
        ];

        return (string)$this->backendUriBuilder->buildUriFromRoute('record_edit', $params);
    }
}
