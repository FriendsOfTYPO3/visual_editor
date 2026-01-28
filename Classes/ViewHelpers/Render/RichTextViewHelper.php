<?php

declare(strict_types=1);

namespace TYPO3\CMS\VisualEditor\ViewHelpers\Render;

use InvalidArgumentException;
use Symfony\Component\DependencyInjection\Attribute\Autoconfigure;
use TYPO3\CMS\Core\Configuration\Richtext as RichtextConfiguration;
use TYPO3\CMS\Core\Domain\Record;
use TYPO3\CMS\Core\Domain\RecordFactory;
use TYPO3\CMS\Core\Domain\RecordInterface;
use TYPO3\CMS\Core\Html\RteHtmlParser;
use TYPO3\CMS\Core\Page\AssetCollector;
use TYPO3\CMS\Core\Schema\TcaSchemaFactory;
use TYPO3\CMS\Core\Utility\GeneralUtility;
use TYPO3\CMS\Extbase\Utility\LocalizationUtility;
use TYPO3\CMS\Fluid\ViewHelpers\Format\HtmlViewHelper;
use TYPO3\CMS\Frontend\Page\PageInformation;
use TYPO3\CMS\VisualEditor\Core\RichtText\RichTextConfigurationService;
use TYPO3\CMS\VisualEditor\Core\RichtText\RichTextConfigurationServiceDto;
use TYPO3\CMS\VisualEditor\EditableResult\RichText;
use TYPO3\CMS\VisualEditor\Service\EditModeService;
use TYPO3Fluid\Fluid\Core\ViewHelper\AbstractViewHelper;
use TYPO3Fluid\Fluid\Core\ViewHelper\TagBuilder;
use function json_encode;
use function sprintf;

#[Autoconfigure(public: true)]
final class RichTextViewHelper extends AbstractViewHelper
{
    protected $escapeOutput = false;

    public function __construct(
        private readonly EditModeService $editModeService,
        private readonly RecordFactory $recordFactory,
        private readonly AssetCollector $assetCollector,
        private readonly RichTextConfigurationService $richTextConfigurationService,
        private readonly RichtextConfiguration $richtext,
        private readonly TcaSchemaFactory $tcaSchema,
        private readonly RteHtmlParser $rteHtmlParser,
    )
    {
    }

    public function initializeArguments(): void
    {
        parent::initializeArguments();

        $this->registerArgument('record', RecordInterface::class . '|' . PageInformation::class, 'A Record API Object (field is also needed)');
        $this->registerArgument('field', 'string', 'the field that should be rendered', false, '');
        $this->registerArgument('htmlArguments', 'array', '@see f:format.html arguments', false, []);
    }

    public function render(): RichText
    {
        $this->editModeService->init();

        $record = $this->arguments['record'];
        $field = $this->arguments['field'];

        if ($record instanceof PageInformation) {
            $record = $this->recordFactory->createResolvedRecordFromDatabaseRow('pages', $record->getPageRecord());
        }

        $name = LocalizationUtility::translate($this->tcaSchema->get($record->getMainType())->getField($field)->getLabel());

        $value = $record->get($field) ?? '';

        $canEdit = $this->editModeService->canEditField($record, $field);
        if (!$canEdit) {
            $escapedValue = $this->text2html($value);
            return new RichText($name, $escapedValue, $value === '', $value);
        }

        [$options, $processingConfiguration] = $this->getOptions($record, $field);
        $escapedValue = $this->rteHtmlParser->transformTextForRichTextEditor($value, $processingConfiguration);

        $tag = GeneralUtility::makeInstance(TagBuilder::class);
        $tag->setTagName('ve-editable-rich-text');
        $tag->addAttribute('table', $record->getMainType());
        $tag->addAttribute('uid', $record->getUid());
        $tag->addAttribute('field', $field);

        $tag->addAttribute('name', $name);

        $title = LocalizationUtility::translate('LLL:EXT:visual_editor/Resources/Private/Language/locallang.xlf:editable.title', arguments: [$name]);
        $tag->addAttribute('title', $title);
        $tag->addAttribute('options', $options);

        $tag->setContent($escapedValue);

        $tag->forceClosingTag(true);
        return new RichText($name, $tag->render(), $value === '', $value);
    }

    private function text2html(string $value): string
    {
        return $this->renderingContext->getViewHelperInvoker()->invoke(
            HtmlViewHelper::class,
            $this->arguments['htmlArguments'],
            $this->renderingContext,
            fn() => $value,
        );
    }

    /**
     * @return array{0:string, 1:array<mixed>}
     */
    private function getOptions(Record $record, string $field): array
    {
        $schema = $this->tcaSchema->get($record->getFullType());
        $richtextConfiguration = $this->richtext->getConfiguration(
            $record->getMainType(),
            $field,
            $record->getPid(),
            $record->getRecordType(),
            $schema->getField($field)->getConfiguration(),
        );

        $richTextConfigurationServiceDto = new RichTextConfigurationServiceDto(
            tableName: $record->getMainType(),
            uid: $record->getUid(),
            fieldName: $field,
            recordTypeValue: $record->getRecordType(),
            effectivePid: $record->getPid(),
            richtextConfigurationName: $richtextConfiguration['preset'],
            label: 'Text',
            placeholder: '',
            readOnly: false,
            data: $record->getRawRecord()->toArray(),
            additionalConfiguration: $richtextConfiguration['editor']['config'],
            externalPlugins: $richtextConfiguration['editor']['externalPlugins'],
        );

        $config = $this->richTextConfigurationService->resolveCkEditorConfiguration($richTextConfigurationServiceDto);

        unset($config['height']); // height is set by the content itself and css
        $config['debug'] = false; // for now we disable debug mode

        $this->assetCollector->addJavaScriptModule('@typo3/ckeditor5/translations/' . $config['language']['ui'] . '.js');
        return [json_encode($config, JSON_PRETTY_PRINT | JSON_THROW_ON_ERROR), $richtextConfiguration['proc.'] ?? []];
    }
}
