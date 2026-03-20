<?php

declare(strict_types=1);

namespace TYPO3\CMS\VisualEditor\ViewHelpers\Render;

use InvalidArgumentException;
use Psr\Http\Message\ServerRequestInterface;
use TYPO3\CMS\Core\Configuration\Richtext as RichtextConfiguration;
use TYPO3\CMS\Core\Domain\RecordFactory;
use TYPO3\CMS\Core\Domain\RecordInterface;
use TYPO3\CMS\Core\Html\RteHtmlParser;
use TYPO3\CMS\Core\Information\Typo3Version;
use TYPO3\CMS\Core\Page\AssetCollector;
use TYPO3\CMS\Core\Schema\Field\InputFieldType;
use TYPO3\CMS\Core\Schema\Field\TextFieldType;
use TYPO3\CMS\Core\Schema\TcaSchemaFactory;
use TYPO3\CMS\Core\Utility\GeneralUtility;
use TYPO3\CMS\Core\Utility\PathUtility;
use TYPO3\CMS\Extbase\DomainObject\DomainObjectInterface;
use TYPO3\CMS\Fluid\ViewHelpers\Format\HtmlViewHelper;
use TYPO3\CMS\Frontend\Page\PageInformation;
use TYPO3\CMS\VisualEditor\Core\RichtText\RichTextConfigurationService;
use TYPO3\CMS\VisualEditor\Core\RichtText\RichTextConfigurationServiceDto;
use TYPO3\CMS\VisualEditor\EditableResult\Input;
use TYPO3\CMS\VisualEditor\EditableResult\RichText;
use TYPO3\CMS\VisualEditor\Service\EditModeService;
use TYPO3\CMS\VisualEditor\Service\LocalizationService;
use TYPO3\CMS\VisualEditor\Service\ModelToRawRecordService;
use TYPO3Fluid\Fluid\Core\ViewHelper\AbstractViewHelper;
use TYPO3Fluid\Fluid\Core\ViewHelper\TagBuilder;

use function get_debug_type;
use function htmlspecialchars;
use function is_array;
use function is_string;
use function json_encode;
use function nl2br;
use function str_replace;

use const JSON_THROW_ON_ERROR;

/**
 * ViewHelper to render content based on records and fields from a TCA schema.
 * Handles the processing of both simple and rich text fields.
 *
 * ````html
 *   <f:render.text record="{page}" field="bodytext" />
 *   {record -> f:render.text(field: 'title')}
 *   <f:render.text field="subheader">{record}</f:render.text>
 * ````
 */
final class TextViewHelper extends AbstractViewHelper
{
    private const RECORD_TYPE = RecordInterface::class . '|' . PageInformation::class . '|' . DomainObjectInterface::class;

    private const DEFAULT_RTE_CONTENTS_CSS_RESOURCE = 'EXT:rte_ckeditor/Resources/Public/Css/contents.css';

    /**
     * Extbase models have a __toString() method and Fluid calls that if we escape the Children (arguments)
     */
    protected $escapeChildren = false;

    protected $escapeOutput = false;

    public function __construct(
        private readonly EditModeService $editModeService,
        private readonly RecordFactory $recordFactory,
        private readonly TcaSchemaFactory $tcaSchema,
        private readonly RteHtmlParser $rteHtmlParser,
        private readonly AssetCollector $assetCollector,
        private readonly RichTextConfigurationService $richTextConfigurationService,
        private readonly RichtextConfiguration $richtext,
        private readonly Typo3Version $typo3Version,
        private readonly LocalizationService $localizationService,
        private readonly ModelToRawRecordService $modelToRawRecordService,
    ) {
    }

    public function initializeArguments(): void
    {
        parent::initializeArguments();

        $type = 'object';
        // can not always use DI here because fluid initializes the class without DI. and calls initializeArguments.
        $typo3Version = $this->typo3Version ?? GeneralUtility::makeInstance(Typo3Version::class);
        if ($typo3Version->getMajorVersion() >= 14) {
            $type = self::RECORD_TYPE;
        }

        $this->registerArgument('record', $type, 'A Record API Object (field is also needed)');
        $this->registerArgument('field', 'string', 'the field that should be rendered', true);
    }

    public function getContentArgumentName(): string
    {
        return 'record';
    }

    public function render(): Input|RichText
    {
        $renderingContext = $this->renderingContext ?? throw new InvalidArgumentException('$this->renderingContext is not available', 1772464146);
        $request = $renderingContext->getAttribute(ServerRequestInterface::class);
        $this->editModeService->init($request);

        $record = $this->renderChildren();
        $field = $this->arguments['field'];

        if ($record instanceof PageInformation) {
            $record = $this->recordFactory->createResolvedRecordFromDatabaseRow('pages', $record->getPageRecord());
        }

        if ($record instanceof DomainObjectInterface) {
            $record = $this->modelToRawRecordService->modelToRawRecord($record);
        }

        if (!$record instanceof RecordInterface) {
            throw new InvalidArgumentException(
                'The record argument must be an instance of ' . self::RECORD_TYPE . '. Given: ' . get_debug_type(
                    $record,
                ),
                1770539910,
            );
        }

        $value = $record->get($field) ?? '';

        if (!is_string($value)) {
            $table = $record->getMainType();
            throw new InvalidArgumentException(
                'The value of the field "' . $table . '.' . $field . '" must be a string. Given: ' . get_debug_type($value),
                1770321858,
            );
        }

        $canEdit = $this->editModeService->canEditField($record, $field, $request);

        $schema = $this->tcaSchema->get($record->getFullType());
        $tableLabel = $schema->getTitle($this->localizationService->tryTranslation(...));

        $fieldSchema = $schema->getField($field);
        $label = $this->localizationService->tryTranslation($fieldSchema->getLabel());

        $label = $tableLabel . ': ' . $label;

        if ($fieldSchema instanceof InputFieldType) {
            return $this->renderInput($value, $record, $fieldSchema, $label, $canEdit);
        }

        if ($fieldSchema instanceof TextFieldType) {
            if (!$fieldSchema->isRichText()) {
                return $this->renderInput($value, $record, $fieldSchema, $label, $canEdit, allowNewlines: true);
            }

            return $this->renderRichText($value, $record, $fieldSchema, $label, $canEdit);
        }

        $table = $record->getMainType();
        throw new InvalidArgumentException('The field "' . $table . '.' . $field . '" is not supported. Given: ' . get_debug_type($fieldSchema), 1770618219);
    }

    private function renderInput(
        string $value,
        RecordInterface $record,
        InputFieldType|TextFieldType $field,
        string $label,
        bool $editMode,
        bool $allowNewlines = false
    ): Input {
        $html = htmlspecialchars($value);
        if ($allowNewlines) {
            $html = nl2br(htmlspecialchars(str_replace('<br>', "\n", $value)));
        }

        if (!$editMode) {
            return new Input($label, $html, !$value, $value); // TODO maybe we should remove the Input and RichText classes?
        }

        $tag = GeneralUtility::makeInstance(TagBuilder::class);
        $tag->setTagName('ve-editable-text');
        $tag->addAttribute('table', $record->getMainType());
        $tag->addAttribute('uid', (string)($record->getComputedProperties()->getLocalizedUid() ?: $record->getComputedProperties()->getVersionedUid() ?: $record->getUid()));
        $tag->addAttribute('field', $field->getName());

        $tag->addAttribute('name', $label);

        $title = $this->localizationService->tryTranslation(
            'LLL:EXT:visual_editor/Resources/Private/Language/locallang.xlf:editable.title',
            arguments: [$label],
        );
        $tag->addAttribute('title', $title);
        $tag->addAttribute('allowNewlines', $allowNewlines);
        $tag->addAttribute('value', str_replace('<br>', "\n", $value));

        $tag->setContent($html);

        $tag->forceClosingTag(true);

        return new Input($label, $tag->render(), !$value, $value ?: '');
    }

    private function renderRichText(string $value, RecordInterface $record, TextFieldType $field, string $label, bool $editMode): RichText
    {
        if (!$editMode) {
            $renderingContext = $this->renderingContext ?? throw new InvalidArgumentException('$this->renderingContext is not available', 1772464098);
            $escapedValue = $renderingContext->getViewHelperInvoker()->invoke(
                HtmlViewHelper::class,
                [],
                $renderingContext,
                fn(): string => $value,
            );
            return new RichText($label, $escapedValue, $value === '', $value);
        }

        [$options, $processingConfiguration] = $this->getOptions($record, $field->getName());
        $escapedValue = $this->rteHtmlParser->transformTextForRichTextEditor($value, $processingConfiguration);

        $tag = GeneralUtility::makeInstance(TagBuilder::class);
        $tag->setTagName('ve-editable-rich-text');
        $tag->addAttribute('table', $record->getMainType());
        $tag->addAttribute('uid', (string)($record->getComputedProperties()->getLocalizedUid() ?: $record->getComputedProperties()->getVersionedUid() ?: $record->getUid()));
        $tag->addAttribute('field', $field->getName());
        $tag->addAttribute('name', $label);

        $title = $this->localizationService->tryTranslation(
            'LLL:EXT:visual_editor/Resources/Private/Language/locallang.xlf:editable.title',
            arguments: [$label],
        );
        $tag->addAttribute('title', $title);
        $tag->addAttribute('options', $options);

        $tag->setContent($escapedValue);

        $tag->forceClosingTag(true);
        return new RichText($label, $tag->render(), $value === '', $value);
    }

    /**
     * @return array{0:string, 1:array<mixed>}
     */
    private function getOptions(RecordInterface $record, string $field): array
    {
        $schema = $this->tcaSchema->get($record->getFullType());
        $richtextConfiguration = $this->richtext->getConfiguration(
            $record->getMainType(),
            $field,
            $record->getPid(),
            $record->getRecordType() ?? '',
            $schema->getField($field)->getConfiguration(),
        );

        $rawRecord = $record->getRawRecord() ?? $record;
        $richTextConfigurationServiceDto = new RichTextConfigurationServiceDto(
            tableName: $record->getMainType(),
            uid: $record->getComputedProperties()->getLocalizedUid() ?: $record->getComputedProperties()->getVersionedUid() ?: $record->getUid(),
            fieldName: $field,
            recordTypeValue: $record->getRecordType() ?? '',
            effectivePid: $record->getPid(),
            richtextConfigurationName: $richtextConfiguration['preset'],
            label: 'Text',
            placeholder: '',
            readOnly: false,
            data: $rawRecord->toArray(),
            additionalConfiguration: $richtextConfiguration['editor']['config'],
            externalPlugins: $richtextConfiguration['editor']['externalPlugins'],
        );

        $config = $this->richTextConfigurationService->resolveCkEditorConfiguration($richTextConfigurationServiceDto);
        if (is_array($config['contentsCss'] ?? null)) {
            $defaultRteContentsCss = PathUtility::getAbsoluteWebPath(
                GeneralUtility::createVersionNumberedFilename(
                    GeneralUtility::getFileAbsFileName(self::DEFAULT_RTE_CONTENTS_CSS_RESOURCE),
                ),
            );
            $contentsCss = [];
            foreach ($config['contentsCss'] as $path) {
                if (is_string($path) && $path === $defaultRteContentsCss) {
                    continue;
                }

                $contentsCss[] = $path;
            }

            $config['contentsCss'] = $contentsCss;
        }

        unset($config['height']); // height is set by the content itself and css
        $config['debug'] = false; // for now we disable debug mode

        $this->assetCollector->addJavaScriptModule('@typo3/ckeditor5/translations/' . $config['language']['ui'] . '.js');
        return [json_encode($config, JSON_THROW_ON_ERROR), $richtextConfiguration['proc.'] ?? []];
    }
}
