<?php

declare(strict_types=1);

namespace TYPO3\CMS\VisualEditor\ViewHelpers\Render;

use InvalidArgumentException;
use Symfony\Component\DependencyInjection\Attribute\Autoconfigure;
use TYPO3\CMS\Core\Configuration\Richtext as RichtextConfiguration;
use TYPO3\CMS\Core\Domain\Record;
use TYPO3\CMS\Core\Domain\RecordInterface;
use TYPO3\CMS\Core\Html\RteHtmlParser;
use TYPO3\CMS\Core\Page\AssetCollector;
use TYPO3\CMS\Core\Schema\TcaSchemaFactory;
use TYPO3\CMS\Extbase\Utility\LocalizationUtility;
use TYPO3\CMS\Fluid\ViewHelpers\Format\HtmlViewHelper;
use TYPO3\CMS\Frontend\Page\PageInformation;
use TYPO3\CMS\VisualEditor\Core\RichtText\RichTextConfigurationService;
use TYPO3\CMS\VisualEditor\Core\RichtText\RichTextConfigurationServiceDto;
use TYPO3\CMS\VisualEditor\EditableResult\RichText;
use TYPO3\CMS\VisualEditor\Service\EditModeService;
use TYPO3\CMS\VisualEditor\Service\RecordService;
use TYPO3Fluid\Fluid\Core\ViewHelper\AbstractTagBasedViewHelper;

use function array_all;
use function json_encode;
use function sprintf;

#[Autoconfigure(public: true)]
final class RichTextViewHelper extends AbstractTagBasedViewHelper
{
    protected $tagName = 've-editable-rich-text';

    public function __construct(
        private readonly EditModeService $editModeService,
        private readonly RecordService $recordService,
        private readonly AssetCollector $assetCollector,
        private readonly RichTextConfigurationService $richTextConfigurationService,
        private readonly RichtextConfiguration $richtext,
        private readonly TcaSchemaFactory $tcaSchema,
        private readonly RteHtmlParser $rteHtmlParser,
    )
    {
        parent::__construct();
    }

    public function initializeArguments()
    {
        parent::initializeArguments();

        $this->registerArgument('record', 'object', 'A Record API Object (field is also needed)');
        $this->registerArgument('field', 'string', 'record', false, '');

        $this->registerArgument('default', 'string', 'will be in .value but will not be saved in the DB (children used first)', false, '');
    }

    public function render(): RichText
    {
        $this->editModeService->init();

        $record = $this->arguments['record'];
        $field = $this->arguments['field'];

        $default = trim($this->renderChildren() ?: '') ?: $this->arguments['default'];

        if ($record instanceof PageInformation) {
            $record = $this->recordService->getPageRecordAsRecordInterface($record);
        }
        if (!$record instanceof RecordInterface) {
            throw new InvalidArgumentException(
                sprintf(
                    'The "record" argument must be an instance of %s or %s. %s given',
                    RecordInterface::class,
                    PageInformation::class,
                    get_debug_type($record),
                ),
            );
        }

        $name = LocalizationUtility::translate($this->tcaSchema->get($record->getMainType())->getField($field)->getLabel());

        $value = $record->get($field) ?? '';

        $canEdit = $this->editModeService->canEditField($record, $field);
        if (!$canEdit) {
            $escapedValue = $this->text2html($value ?: $default);
            return new RichText($name, $escapedValue, ($value ?: $default) === '', $value ?: $default);
        }

        [$options, $processingConfiguration] = $this->getOptions($record, $field, $default);
        $escapedValue = $this->rteHtmlParser->transformTextForRichTextEditor($value, $processingConfiguration);

        $this->tag->addAttribute('table', $record->getMainType());
        $this->tag->addAttribute('uid', $record->getUid());
        $this->tag->addAttribute('field', $field);

        $this->tag->addAttribute('name', $name);

        $title = LocalizationUtility::translate('LLL:EXT:visual_editor/Resources/Private/Language/locallang.xlf:editable.title', arguments: [$name]);
        $this->tag->addAttribute('title', $title);
        $this->tag->addAttribute('placeholder', $default);
        $this->tag->addAttribute('options', $options);

        $this->tag->setContent($escapedValue);

        $this->tag->forceClosingTag(true);
        return new RichText($name, $this->tag->render(), ($value ?: $default) === '', $value ?: $default);
    }

    private function text2html(string $value): string
    {
        return $this->renderingContext->getViewHelperInvoker()->invoke(
            HtmlViewHelper::class,
            [], // TODO allow passing arguments?
            $this->renderingContext,
            fn() => $value,
        );
    }

    /**
     * @return array{0:string, 1:array<mixed>}
     */
    private function getOptions(Record $record, string $field, string $placeholder): array
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
            placeholder: $placeholder,
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
