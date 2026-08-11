<?php

declare(strict_types=1);

namespace TYPO3\CMS\VisualEditor\Api;

use Exception;
use InvalidArgumentException;
use Psr\Http\Message\ServerRequestInterface;
use TYPO3\CMS\Core\Configuration\Richtext as RichtextConfiguration;
use TYPO3\CMS\Core\Domain\Exception\RecordPropertyNotFoundException;
use TYPO3\CMS\Core\Domain\RawRecord;
use TYPO3\CMS\Core\Domain\Record\ComputedProperties;
use TYPO3\CMS\Core\Domain\RecordInterface;
use TYPO3\CMS\Core\Html\RteHtmlParser;
use TYPO3\CMS\Core\Page\AssetCollector;
use TYPO3\CMS\Core\Schema\Field\InputFieldType;
use TYPO3\CMS\Core\Schema\Field\TextFieldType;
use TYPO3\CMS\Core\Schema\TcaSchemaFactory;
use TYPO3\CMS\Core\Utility\GeneralUtility;
use TYPO3\CMS\Frontend\ContentObject\ContentObjectRenderer;
use TYPO3\CMS\VisualEditor\Core\RichtText\RichTextConfigurationService;
use TYPO3\CMS\VisualEditor\Core\RichtText\RichTextConfigurationServiceDto;
use TYPO3\CMS\VisualEditor\Service\EditModeService;
use TYPO3\CMS\VisualEditor\Service\LocalizationService;
use TYPO3Fluid\Fluid\Core\ViewHelper\InvalidArgumentValueException;

final readonly class TextFieldRenderer implements TextFieldRendererInterface
{
    public function __construct(
        private TcaSchemaFactory $tcaSchema,
        private RteHtmlParser $rteHtmlParser,
        private AssetCollector $assetCollector,
        private RichtextConfiguration $richtext,
        private EditModeService $editModeService,
        private LocalizationService $localizationService,
        private RichTextConfigurationService $richTextConfigurationService,
    ) {
    }

    public function renderFromValues(
        string $fullType,
        int $uid,
        int $pid,
        int $localizedUid,
        int $versionedUid,
        string $field,
        string $value,
        ServerRequestInterface $request,
        ?string $typeValue = null
    ): CustomElement|JsonableUnsafeHtmlString|null {
        $properties = [$field => $value];

        $tcaSchema = $this->tcaSchema->get($fullType);
        if ($tcaSchema->supportsSubSchema() && $typeValue === null) {
            throw new Exception('TCA schema supports subschema, typeValue required.', 7710906108);
        }

        if (!$tcaSchema->supportsSubSchema() && $typeValue !== null) {
            throw new Exception('TCA schema dose not supports subschema, typeValue must be null.', 7434102561);
        }

        if ($tcaSchema->supportsSubSchema()) {
            $typeColumn = $tcaSchema->getSubSchemaTypeInformation()->getFieldName();
            $properties[$typeColumn] = $typeValue;
        }

        $computedProperties = new ComputedProperties(
            versionedUid: $versionedUid,
            localizedUid: $localizedUid,
        );
        $record = new RawRecord($uid, $pid, $properties, $computedProperties, $fullType);
        return $this->render($record, $field, $request);
    }

    public function render(RecordInterface $record, string $field, ServerRequestInterface $request, bool $optional = false): CustomElement|JsonableUnsafeHtmlString|null
    {
        $this->editModeService->init($request);

        try {
            $value = $record->get($field) ?? '';
        } catch (RecordPropertyNotFoundException $recordPropertyNotFoundException) {
            if ($optional) {
                return null;
            }

            throw new InvalidArgumentValueException(
                'The field "' . $field . '" does not exist in the given record `' . $record->getFullType() . '`.',
                1775554099,
                $recordPropertyNotFoundException,
            );
        }

        if (!is_string($value)) {
            $table = $record->getMainType();
            throw new InvalidArgumentException(
                'The value of the field "' . $table . '.' . $field . '" must be a string. Given: ' . get_debug_type($value),
                1770321858,
            );
        }

        $fullType = $record->getFullType();

        $canEdit = $this->editModeService->canEditField($record, $field, $request);

        $schema = $this->tcaSchema->get($fullType);
        $tableLabel = $schema->getTitle($this->localizationService->tryTranslation(...));

        $fieldSchema = $schema->getField($field);
        $label = $this->localizationService->tryTranslation($fieldSchema->getLabel());

        $label = $tableLabel . ': ' . $label;

        if ($fieldSchema instanceof InputFieldType) {
            return $this->renderInput($value, $record, $fieldSchema, $label, $canEdit);
        }

        if ($fieldSchema instanceof TextFieldType) {
            if (!$fieldSchema->isRichText()) {
                return $this->renderInput($value, $record, $fieldSchema, $label, $canEdit, true);
            }

            return $this->renderRichText($value, $record, $fieldSchema, $label, $canEdit, $request);
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
        bool $allowNewlines = false,
    ): CustomElement|JsonableUnsafeHtmlString {
        $html = htmlspecialchars($value);
        if ($allowNewlines) {
            $html = nl2br(htmlspecialchars(str_replace('<br>', "\n", $value)));
        }

        if (!$editMode) {
            return new JsonableUnsafeHtmlString($html);
        }

        $tag = GeneralUtility::makeInstance(CustomElement::class);
        $tag->setTagName('ve-editable-text');
        $tag->addAttribute('table', $record->getMainType());
        $tag->addAttribute(
            'uid',
            (string)($record->getComputedProperties()->getLocalizedUid() ?: $record->getComputedProperties()->getVersionedUid() ?: $record->getUid()),
        );
        $tag->addAttribute('field', $field->getName());
        $tag->addAttribute('fieldPositionId', $record->getMainType() . ':' . $record->getUid() . ':' . $field->getName());

        $tag->addAttribute('name', $label);

        $title = $this->localizationService->tryTranslation(
            'LLL:EXT:visual_editor/Resources/Private/Language/locallang.xlf:editable.title',
            [$label],
        );
        $tag->addAttribute('title', $title);
        $tag->addAttribute('allowNewlines', $allowNewlines);
        $tag->addAttribute('value', str_replace('<br>', "\n", $value));
        $tag->addAttribute('validation', $this->getInputValidationConfiguration($field, $allowNewlines));

        $tag->setContent($html);

        return $tag;
    }

    private function getInputValidationConfiguration(InputFieldType|TextFieldType $field, bool $allowNewlines): string
    {
        $config = $field->getConfiguration();
        $validation = [
            'required' => $field->isRequired(),
            'allowNewlines' => $allowNewlines,
        ];

        $min = $config['min'] ?? null;
        if (is_int($min) || (is_string($min) && $min !== '')) {
            $min = (int)$min;
            if ($min > 0) {
                $validation['min'] = $min;
            }
        }

        $max = $config['max'] ?? null;
        if (is_int($max) || (is_string($max) && $max !== '')) {
            $max = (int)$max;
            if ($max > 0) {
                $validation['max'] = $max;
            }
        }

        $evalList = array_flip(GeneralUtility::trimExplode(',', (string)($config['eval'] ?? ''), true));

        $evals = [];
        $evalOrder = ['trim', 'upper', 'lower', 'alpha', 'num', 'alphanum', 'alphanum_x', 'nospace'];
        foreach ($evalOrder as $rule) {
            if (array_key_exists($rule, $evalList)) {
                $evals[] = $rule;
            }
        }

        if ($evals !== []) {
            $validation['eval'] = $evals;
        }

        return json_encode($validation, JSON_THROW_ON_ERROR);
    }

    private function renderRichText(
        string $value,
        RecordInterface $record,
        TextFieldType $field,
        string $label,
        bool $editMode,
        ServerRequestInterface $request,
    ): CustomElement|JsonableUnsafeHtmlString {
        if (!$editMode) {
            $contentObject = GeneralUtility::makeInstance(ContentObjectRenderer::class);
            $contentObject->setRequest($request);
            $contentObject->start([]);
            $contentObject->setCurrentVal($value);
            $escapedValue = $contentObject->parseFunc($value, null, '< lib.parseFunc_RTE');

            return new JsonableUnsafeHtmlString($escapedValue);
        }

        [$options, $processingConfiguration] = $this->getOptions($record, $field->getName());
        $escapedValue = $this->rteHtmlParser->transformTextForRichTextEditor($value, $processingConfiguration);

        $tag = GeneralUtility::makeInstance(CustomElement::class);
        $tag->setTagName('ve-editable-rich-text');
        $tag->addAttribute('table', $record->getMainType());
        $tag->addAttribute(
            'uid',
            (string)($record->getComputedProperties()->getLocalizedUid() ?: $record->getComputedProperties()->getVersionedUid() ?: $record->getUid()),
        );
        $tag->addAttribute('field', $field->getName());
        $tag->addAttribute('fieldPositionId', $record->getMainType() . ':' . $record->getUid() . ':' . $field->getName());
        $tag->addAttribute('name', $label);

        $title = $this->localizationService->tryTranslation(
            'LLL:EXT:visual_editor/Resources/Private/Language/locallang.xlf:editable.title',
            [$label],
        );
        $tag->addAttribute('title', $title);
        $tag->addAttribute('options', $options);

        $tag->setContent($escapedValue);

        $tag->forceClosingTag(true);
        return $tag;
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

        unset($config['height']); // height is set by the content itself and css
        $config['debug'] = false; // for now we disable debug mode

        // load required JavaScript modules:
        foreach ($config['importModules'] as $importModule) {
            $this->assetCollector->addJavaScriptModule($importModule['module']);
        }

        $this->assetCollector->addJavaScriptModule('@typo3/ckeditor5/translations/' . $config['language']['ui'] . '.js');
        return [json_encode($config, JSON_THROW_ON_ERROR), $richtextConfiguration['proc.'] ?? []];
    }
}
