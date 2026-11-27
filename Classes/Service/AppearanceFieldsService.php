<?php

declare(strict_types=1);

namespace TYPO3\CMS\VisualEditor\Service;

use Psr\Http\Message\ServerRequestInterface;
use TYPO3\CMS\Backend\Utility\BackendUtility;
use TYPO3\CMS\Core\Domain\Record;
use TYPO3\CMS\Core\Imaging\IconRegistry;
use TYPO3\CMS\Core\Schema\Field\FieldTranslationBehaviour;
use TYPO3\CMS\Core\Schema\Field\StaticSelectFieldType;
use TYPO3\CMS\Core\Schema\TcaSchemaFactory;
use TYPO3\CMS\Core\Utility\GeneralUtility;
use TYPO3\CMS\Frontend\Page\PageInformation;

use function array_diff;
use function array_unique;
use function array_values;
use function is_array;
use function is_string;
use function str_starts_with;
use function substr;

/**
 * Describes the fields of a record that can be edited inline from the action bar of a content element.
 *
 * The fields are configured per table with page TSconfig:
 * mod.web_edit.appearanceFields.tt_content = grid_class, -space_after_class
 * A field name prefixed with "-" removes a field of the defaults.
 *
 * The items of the fields are not part of the description. They depend on the record and on the other values,
 * so they are resolved when the editor opens the fields, see AppearanceItemsService.
 *
 * @phpstan-type AppearanceField array{name: string, label: string, value: string, valueLabel: string, valueIcon: string|null, translationExcluded: bool}
 */
final readonly class AppearanceFieldsService
{
    /**
     * @var array<string, list<string>>
     */
    private const DEFAULT_FIELDS = [
        'tt_content' => ['frame_class', 'space_before_class', 'space_after_class'],
    ];

    public function __construct(
        private TcaSchemaFactory $tcaSchema,
        private EditModeService $editModeService,
        private LocalizationService $localizationService,
        private IconRegistry $iconRegistry,
    ) {
    }

    /**
     * @param array<string, mixed> $data the raw database row
     * @return list<AppearanceField>
     */
    public function getFields(Record $record, array $data, ServerRequestInterface $request): array
    {
        $pageInformation = $request->getAttribute('frontend.page.information');
        if (!$pageInformation instanceof PageInformation) {
            return [];
        }

        $table = $record->getMainType();
        $pageTsConfig = BackendUtility::getPagesTSconfig($pageInformation->getId());
        $fieldNames = $this->resolveFieldNames($table, $pageTsConfig);
        if ($fieldNames === []) {
            return [];
        }

        $schema = $this->tcaSchema->get($record->getFullType());
        $isTranslation = (int)$record->getLanguageInfo()?->getTranslationParent() > 0;

        $fields = [];
        foreach ($fieldNames as $fieldName) {
            if (!$schema->hasField($fieldName)) {
                continue;
            }

            $field = $schema->getField($fieldName);
            if (!$field instanceof StaticSelectFieldType) {
                continue;
            }

            if ($isTranslation && $field->getTranslationBehaviour() === FieldTranslationBehaviour::Excluded) {
                continue;
            }

            if ($this->isDisabledByTsConfig($pageTsConfig, $table, $fieldName, (string)$record->getRecordType())) {
                continue;
            }

            if (!$this->editModeService->canEditField($record, $fieldName, $request)) {
                continue;
            }

            $fields[] = $this->describeField($field, (string)($data[$fieldName] ?? ''));
        }

        return $fields;
    }

    /**
     * @param array<array-key, mixed> $pageTsConfig result of BackendUtility::getPagesTSconfig()
     * @return list<string>
     */
    public function resolveFieldNames(string $table, array $pageTsConfig): array
    {
        $configured = $pageTsConfig['mod.']['web_edit.']['appearanceFields.'][$table] ?? '';
        $names = self::DEFAULT_FIELDS[$table] ?? [];
        $removed = [];
        foreach (GeneralUtility::trimExplode(',', is_string($configured) ? $configured : '', true) as $name) {
            if (str_starts_with($name, '-')) {
                $removed[] = substr($name, 1);
                continue;
            }

            $names[] = $name;
        }

        return array_values(array_diff(array_unique($names), $removed));
    }

    /**
     * TCEFORM.<table>.<field>.disabled and TCEFORM.<table>.<field>.types.<type>.disabled
     *
     * @param array<array-key, mixed> $pageTsConfig result of BackendUtility::getPagesTSconfig()
     */
    public function isDisabledByTsConfig(array $pageTsConfig, string $table, string $fieldName, string $recordType): bool
    {
        $fieldTsConfig = $pageTsConfig['TCEFORM.'][$table . '.'][$fieldName . '.'] ?? [];
        if (!is_array($fieldTsConfig)) {
            return false;
        }

        $typeTsConfig = $fieldTsConfig['types.'][$recordType . '.'] ?? [];
        if (is_array($typeTsConfig) && isset($typeTsConfig['disabled'])) {
            return (bool)(int)$typeTsConfig['disabled'];
        }

        return (bool)(int)($fieldTsConfig['disabled'] ?? 0);
    }

    /**
     * @return AppearanceField
     */
    public function describeField(StaticSelectFieldType $field, string $value): array
    {
        $valueLabel = $value;
        $valueIcon = null;
        foreach ($field->getItems() as $item) {
            if ((string)$item->getValue() === $value) {
                $valueLabel = $item->getLabel();
                $valueIcon = $item->getIcon();
                break;
            }
        }

        return [
            'name' => $field->getName(),
            'label' => $this->localizationService->tryTranslation($field->getLabel()),
            'value' => $value,
            'valueLabel' => $this->localizationService->tryTranslation($valueLabel),
            // only icons of the icon registry can be shown, not files
            'valueIcon' => $valueIcon !== null && $this->iconRegistry->isRegistered($valueIcon) ? $valueIcon : null,
            'translationExcluded' => $field->getTranslationBehaviour() === FieldTranslationBehaviour::Excluded,
        ];
    }
}
