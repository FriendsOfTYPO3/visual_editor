<?php

declare(strict_types=1);

namespace TYPO3\CMS\VisualEditor\ViewHelpers\Render;

use InvalidArgumentException;
use Psr\Http\Message\ServerRequestInterface;
use TYPO3\CMS\Core\Domain\Exception\RecordPropertyNotFoundException;
use TYPO3\CMS\Core\Domain\RecordFactory;
use TYPO3\CMS\Core\Domain\RecordInterface;
use TYPO3\CMS\Core\Information\Typo3Version;
use TYPO3\CMS\Core\Schema\Field\NumberFieldType;
use TYPO3\CMS\Core\Schema\TcaSchemaFactory;
use TYPO3\CMS\Core\Utility\GeneralUtility;
use TYPO3\CMS\Extbase\DomainObject\DomainObjectInterface;
use TYPO3\CMS\Frontend\Page\PageInformation;
use TYPO3\CMS\VisualEditor\EditableResult\Input;
use TYPO3\CMS\VisualEditor\Service\EditModeService;
use TYPO3\CMS\VisualEditor\Service\LocalizationService;
use TYPO3\CMS\VisualEditor\Service\ModelToRawRecordService;
use TYPO3Fluid\Fluid\Core\ViewHelper\AbstractViewHelper;
use TYPO3Fluid\Fluid\Core\ViewHelper\InvalidArgumentValueException;
use TYPO3Fluid\Fluid\Core\ViewHelper\TagBuilder;

use function get_debug_type;
use function htmlspecialchars;
use function is_float;
use function is_int;
use function is_numeric;
use function is_string;
use function json_encode;
use function number_format;

use const JSON_THROW_ON_ERROR;

/**
 * ViewHelper to render a TCA field of type "number" from a record.
 * The number is formatted like f:format.number, while the edit mode shows and edits the raw value.
 *
 * If "decimals" is not given, it defaults to 0 for fields with format "integer" and to 2 for format "decimal".
 *
 * ````html
 *   <f:render.number record="{record}" field="price" decimals="2" decimalSeparator="," thousandsSeparator="." />
 *   {record -> f:render.number(field: 'myNumberField', thousandsSeparator: '.')}
 * ````
 */
final class NumberViewHelper extends AbstractViewHelper
{
    private const RECORD_TYPE = RecordInterface::class . '|' . PageInformation::class . '|' . DomainObjectInterface::class;

    /**
     * Extbase models have a __toString() method and Fluid calls that if we escape the Children (arguments)
     */
    protected $escapeChildren = false;

    protected $escapeOutput = false;

    public function __construct(
        private readonly EditModeService $editModeService,
        private readonly RecordFactory $recordFactory,
        private readonly TcaSchemaFactory $tcaSchema,
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
        $this->registerArgument('optional', 'boolean', 'If the provided field does not exist in the record, null will be returned.', false, false);
        $this->registerArgument('decimals', 'int', 'The number of digits after the decimal point. Defaults to 0 for TCA format "integer" and 2 for "decimal"');
        $this->registerArgument('decimalSeparator', 'string', 'The decimal point character', false, '.');
        $this->registerArgument('thousandsSeparator', 'string', 'The character for grouping the thousand digits', false, ',');
    }

    public function getContentArgumentName(): string
    {
        return 'record';
    }

    public function render(): ?Input
    {
        $renderingContext = $this->renderingContext ?? throw new InvalidArgumentException('$this->renderingContext is not available', 1778400001);
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
                'The record argument must be an instance of ' . self::RECORD_TYPE . '. Given: ' . get_debug_type($record),
                1778400002,
            );
        }

        try {
            $value = $record->get($field);
        } catch (RecordPropertyNotFoundException $recordPropertyNotFoundException) {
            if ($this->arguments['optional']) {
                return null;
            }

            throw new InvalidArgumentValueException(
                'The field "' . $field . '" does not exist in the given record `' . $record->getFullType() . '`.',
                1778400003,
                $recordPropertyNotFoundException,
            );
        }

        $table = $record->getMainType();
        $schema = $this->tcaSchema->get($record->getFullType());
        $fieldSchema = $schema->getField($field);
        if (!$fieldSchema instanceof NumberFieldType) {
            throw new InvalidArgumentException(
                'The field "' . $table . '.' . $field . '" must be of TCA type "number". Given: ' . get_debug_type($fieldSchema),
                1778400004,
            );
        }

        $rawValue = $this->getRawValue($value, $table . '.' . $field);
        $isEmpty = $rawValue === '';
        $formattedValue = $isEmpty ? '' : number_format(
            (float)$rawValue,
            $this->getDecimals($fieldSchema),
            (string)$this->arguments['decimalSeparator'],
            (string)$this->arguments['thousandsSeparator'],
        );

        $label = $schema->getTitle($this->localizationService->tryTranslation(...))
            . ': ' . $this->localizationService->tryTranslation($fieldSchema->getLabel());

        if (!$this->editModeService->canEditField($record, $field, $request)) {
            return new Input($label, htmlspecialchars($formattedValue), $isEmpty, $rawValue);
        }

        $tag = GeneralUtility::makeInstance(TagBuilder::class);
        $tag->setTagName('ve-editable-text');
        $tag->addAttribute('table', $table);
        $tag->addAttribute('uid', (string)($record->getComputedProperties()->getLocalizedUid() ?: $record->getComputedProperties()->getVersionedUid() ?: $record->getUid()));
        $tag->addAttribute('field', $field);
        $tag->addAttribute('fieldPositionId', $table . ':' . $record->getUid() . ':' . $field);
        $tag->addAttribute('name', $label);
        $tag->addAttribute('title', $this->localizationService->tryTranslation(
            'LLL:EXT:visual_editor/Resources/Private/Language/locallang.xlf:editable.title',
            [$label],
        ));
        $tag->addAttribute('allowNewlines', false);
        $tag->addAttribute('value', $rawValue);
        $tag->addAttribute('validation', $this->getValidationConfiguration($fieldSchema));
        $tag->setContent(htmlspecialchars($formattedValue));
        $tag->forceClosingTag(true);

        return new Input($label, $tag->render(), $isEmpty, $rawValue);
    }

    private function getRawValue(mixed $value, string $fieldIdentifier): string
    {
        if ($value === null || $value === '') {
            return '';
        }

        if (is_int($value) || is_float($value) || (is_string($value) && is_numeric($value))) {
            return (string)$value;
        }

        throw new InvalidArgumentException(
            'The value of the field "' . $fieldIdentifier . '" must be numeric. Given: ' . get_debug_type($value),
            1778400005,
        );
    }

    private function getDecimals(NumberFieldType $field): int
    {
        if ($this->arguments['decimals'] !== null) {
            return (int)$this->arguments['decimals'];
        }

        return $field->getFormat() === 'decimal' ? 2 : 0;
    }

    private function getValidationConfiguration(NumberFieldType $field): string
    {
        $config = $field->getConfiguration();
        $number = [
            'format' => $field->getFormat() === 'decimal' ? 'decimal' : 'integer',
        ];

        foreach (['lower', 'upper'] as $boundary) {
            $limit = $config['range'][$boundary] ?? null;
            if (is_numeric($limit)) {
                $number[$boundary] = (float)$limit;
            }
        }

        return json_encode([
            'required' => $field->isRequired(),
            'nullable' => $field->isNullable(),
            'allowNewlines' => false,
            'number' => $number,
        ], JSON_THROW_ON_ERROR);
    }
}
