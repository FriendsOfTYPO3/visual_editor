<?php

declare(strict_types=1);

namespace TYPO3\CMS\VisualEditor\UserFunction;

use Psr\Http\Message\ServerRequestInterface;
use Symfony\Component\DependencyInjection\Attribute\Autoconfigure;
use TYPO3\CMS\Backend\Routing\UriBuilder;
use TYPO3\CMS\Core\Domain\Record;
use TYPO3\CMS\Core\Domain\RecordFactory;
use TYPO3\CMS\Core\Schema\Capability\TcaSchemaCapability;
use TYPO3\CMS\Core\Schema\TcaSchemaFactory;
use TYPO3\CMS\Core\Utility\GeneralUtility;
use TYPO3\CMS\Extbase\Utility\LocalizationUtility;
use TYPO3\CMS\Frontend\ContentObject\ContentObjectRenderer;
use TYPO3\CMS\VisualEditor\Service\EditModeService;
use TYPO3Fluid\Fluid\Core\ViewHelper\TagBuilder;
use function assert;

#[Autoconfigure(public: true)]
final readonly class TtContentStdWrapPostUserFunc
{
    public function __construct(
        private RecordFactory $recordFactory,
        private EditModeService $editModeService,
        private TcaSchemaFactory $tcaSchema,
        private UriBuilder $backendUriBuilder,
    )
    {
    }

    public function __invoke(string $content, array $conf, ServerRequestInterface $request): string
    {
        if (!$this->editModeService->isEditMode()) {
            return $content;
        }

        $currentContentObject = $request->getAttribute('currentContentObject');
        assert($currentContentObject instanceof ContentObjectRenderer);

        $table = $currentContentObject->getCurrentTable();
        $data = $currentContentObject->data;
        $record = $this->recordFactory->createResolvedRecordFromDatabaseRow($table, $data);
        assert($record instanceof Record);
        $schema = $this->tcaSchema->get($record->getMainType()); // TODO use getFullType (if flux is not used)

        $div = GeneralUtility::makeInstance(TagBuilder::class, 've-content-element');
        $contentTypeLabel = $this->getContentTypeLabel($record);
        $div->addAttribute('elementName', $contentTypeLabel);
        $div->addAttribute('editUrl', $this->getEditUrl($record));
        $div->addAttribute('table', $table);
        $div->addAttribute('id', $table . ':' . $record->getUid());
        $div->addAttribute('uid', (string)$record->getUid());
        $div->addAttribute('pid', (string)$record->getPid());
        $div->addAttribute('colPos', $record->get('colPos'));
        $div->addAttribute('hiddenFieldName', $schema->getCapability(TcaSchemaCapability::RestrictionDisabledField)->getFieldName());
        if ($record->getSystemProperties()->isDisabled()) {
            $div->addAttribute('isHidden', 'true');
        }
        $div->addAttribute('sys_language_uid', $record->getLanguageId());
        $div->setContent($content);

        return $div->render();
    }

    private function getContentTypeLabel(Record $record): string
    {
        $recordType = $record->getRecordType();
        foreach ($GLOBALS['TCA']['tt_content']['columns']['CType']['config']['items'] as $item) {
            if ($item['value'] === $recordType) {
                return LocalizationUtility::translate($item['label']);
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
            // Beispiel: tt_content Datensatz bearbeiten
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
