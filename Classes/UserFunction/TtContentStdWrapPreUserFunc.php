<?php

declare(strict_types=1);

namespace Andersundsehr\Editara\UserFunction;

use Andersundsehr\Editara\Service\EditaraService;
use Psr\Http\Message\ServerRequestInterface;
use Symfony\Component\DependencyInjection\Attribute\Autoconfigure;
use TYPO3\CMS\Core\Domain\Record;
use TYPO3\CMS\Core\Domain\RecordFactory;
use TYPO3\CMS\Core\Schema\Capability\TcaSchemaCapability;
use TYPO3\CMS\Core\Schema\TcaSchemaFactory;
use TYPO3\CMS\Core\Utility\GeneralUtility;
use TYPO3\CMS\Extbase\Utility\LocalizationUtility;
use TYPO3\CMS\Frontend\ContentObject\ContentObjectRenderer;
use TYPO3Fluid\Fluid\Core\ViewHelper\TagBuilder;
use function assert;

#[Autoconfigure(public: true)]
final readonly class TtContentStdWrapPreUserFunc
{
    public function __construct(
        private RecordFactory $recordFactory,
        private EditaraService $editaraService,
        private TcaSchemaFactory $tcaSchema,
    )
    {
    }

    public function __invoke(string $content, array $conf, ServerRequestInterface $request): string
    {
        if (!$this->editaraService->isEditMode()) {
            return $content;
        }

        $currentContentObject = $request->getAttribute('currentContentObject');
        assert($currentContentObject instanceof ContentObjectRenderer);

        $table = $currentContentObject->getCurrentTable();
        $data = $currentContentObject->data;
        $record = $this->recordFactory->createResolvedRecordFromDatabaseRow($table, $data);
        assert($record instanceof Record);
        $schema = $this->tcaSchema->get($record->getMainType()); // TODO use getFullType (if flux is not used)

        $div = GeneralUtility::makeInstance(TagBuilder::class, 'editara-content-element');
        $contentTypeLabel = $this->getContentTypeLabel($record);
        $div->addAttribute('elementName', $contentTypeLabel);
        $div->addAttribute('table', $table);
        $div->addAttribute('id', $table. ':' . $record->getUid());
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
}
