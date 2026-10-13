<?php

declare(strict_types=1);

namespace TYPO3\CMS\VisualEditor\Service;

use Psr\Http\Message\ServerRequestInterface;
use TYPO3\CMS\Backend\Form\FormDataCompiler;
use TYPO3\CMS\Backend\Form\FormDataGroup\TcaDatabaseRecord;
use TYPO3\CMS\Backend\Form\FormDataProvider\TcaSelectItems;
use TYPO3\CMS\Backend\Utility\BackendUtility;
use TYPO3\CMS\Core\Authentication\BackendUserAuthentication;
use TYPO3\CMS\Core\Imaging\IconRegistry;
use TYPO3\CMS\Core\Schema\Struct\SelectItem;
use TYPO3\CMS\Core\Utility\ArrayUtility;

use function array_column;
use function array_filter;
use function array_values;
use function in_array;
use function is_array;
use function is_string;

/**
 * Resolves the items of select fields like the edit form of the backend does.
 * That includes itemsProcFunc, which can depend on the other values of the record, and the page TSconfig (TCEFORM).
 *
 * @phpstan-type ResolvedItem array{label: string, value: string, icon: string|null}
 * @phpstan-type ResolvedField array{value: string, items: list<ResolvedItem>}
 */
final readonly class AppearanceItemsService
{
    public function __construct(
        private FormDataCompiler $formDataCompiler,
        private TcaDatabaseRecord $formDataGroup,
        private TcaSelectItems $tcaSelectItems,
        private AppearanceFieldsService $appearanceFieldsService,
        private LocalizationService $localizationService,
        private IconRegistry $iconRegistry,
    ) {
    }

    /**
     * @param list<string> $requestedFields
     * @param array<string, string> $pendingValues unsaved values by field name
     * @return array<string, ResolvedField> only the fields that the user sees in the edit form of the record
     */
    public function resolve(
        ServerRequestInterface $request,
        string $table,
        int $uid,
        int $pageId,
        array $requestedFields,
        array $pendingValues,
    ): array {
        $result = $this->formDataCompiler->compile(
            [
                'request' => $request,
                'tableName' => $table,
                'vanillaUid' => $uid,
                'command' => 'edit',
            ],
            $this->formDataGroup,
        );

        $configuredFields = $this->appearanceFieldsService->resolveFieldNames($table, BackendUtility::getPagesTSconfig($pageId));
        $fieldNames = array_values(array_filter(
            $requestedFields,
            fn(string $fieldName): bool => in_array($fieldName, $configuredFields, true) && $this->isFieldVisible($result, $table, $fieldName),
        ));
        if ($fieldNames === []) {
            return [];
        }

        // process the items again with the unsaved values of the editor
        $recordType = (string)($result['recordTypeValue'] ?? '');
        $values = [];
        $columns = [];
        foreach ($fieldNames as $fieldName) {
            $values[$fieldName] = $pendingValues[$fieldName] ?? $this->toString($result['databaseRow'][$fieldName] ?? '');
            $columns[$fieldName] = $this->getUnprocessedColumn($table, $recordType, $fieldName);
        }

        $result['databaseRow'] = [...$result['databaseRow'], ...$values];
        $result['processedTca']['columns'] = $columns;
        $result = $this->tcaSelectItems->addData($result);

        $fields = [];
        foreach ($fieldNames as $fieldName) {
            $items = $this->getItems($result['processedTca']['columns'][$fieldName]['config']['items'] ?? []);
            $fields[$fieldName] = [
                'value' => $this->getValidValue($values[$fieldName], $items, $columns[$fieldName]['config']['default'] ?? null),
                'items' => $items,
            ];
        }

        return $fields;
    }

    /**
     * @param array<string, mixed> $result
     */
    private function isFieldVisible(array $result, string $table, string $fieldName): bool
    {
        $column = $result['processedTca']['columns'][$fieldName] ?? null;
        if (!is_array($column) || ($column['config']['type'] ?? '') !== 'select' || ($column['config']['renderType'] ?? 'selectSingle') !== 'selectSingle') {
            return false;
        }

        if ($result['pageTsConfig']['TCEFORM.'][$table . '.'][$fieldName . '.']['disabled'] ?? false) {
            return false;
        }

        $backendUser = $GLOBALS['BE_USER'];

        return !($column['exclude'] ?? false)
            || ($backendUser instanceof BackendUserAuthentication && $backendUser->check('non_exclude_fields', $table . ':' . $fieldName));
    }

    /**
     * @return array<string, mixed>
     */
    private function getUnprocessedColumn(string $table, string $recordType, string $fieldName): array
    {
        $column = $GLOBALS['TCA'][$table]['columns'][$fieldName];
        ArrayUtility::mergeRecursiveWithOverrule(
            $column,
            $GLOBALS['TCA'][$table]['types'][$recordType]['columnsOverrides'][$fieldName] ?? [],
        );
        // a value that is not an item any more must not be offered as an "invalid value" item, it is reset instead
        $column['config']['disableNoMatchingValueElement'] = true;

        return $column;
    }

    /**
     * @param array<array-key, SelectItem|array<string, mixed>> $items
     * @return list<ResolvedItem>
     */
    private function getItems(array $items): array
    {
        $resolvedItems = [];
        foreach ($items as $item) {
            $item = $item instanceof SelectItem ? $item->toArray() : $item;
            if (($item['value'] ?? '') === '--div--') {
                continue;
            }

            $icon = $item['icon'] ?? null;
            $resolvedItems[] = [
                'label' => $this->localizationService->tryTranslation((string)($item['label'] ?? '')),
                'value' => (string)($item['value'] ?? ''),
                // only icons of the icon registry can be shown, not files
                'icon' => is_string($icon) && $this->iconRegistry->isRegistered($icon) ? $icon : null,
            ];
        }

        return $resolvedItems;
    }

    /**
     * @param list<ResolvedItem> $items
     */
    private function getValidValue(string $value, array $items, mixed $default): string
    {
        $values = array_column($items, 'value');
        if (in_array($value, $values, true)) {
            return $value;
        }

        if ($default !== null && in_array((string)$default, $values, true)) {
            return (string)$default;
        }

        return $values[0] ?? '';
    }

    private function toString(mixed $value): string
    {
        return is_array($value) ? (string)($value[0] ?? '') : (string)$value;
    }
}
