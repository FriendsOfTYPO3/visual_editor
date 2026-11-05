<?php

declare(strict_types=1);

namespace TYPO3\CMS\VisualEditor\Service;

use Psr\Http\Message\ServerRequestInterface;
use TYPO3\CMS\Backend\Form\Exception as FormException;
use TYPO3\CMS\Backend\Utility\BackendUtility;
use TYPO3\CMS\Core\Schema\TcaSchemaFactory;
use TYPO3\CMS\Frontend\Page\PageInformation;

use function array_column;
use function array_keys;
use function array_replace;
use function in_array;
use function is_array;
use function is_string;

/**
 * Holds unsaved values of appearance fields for the preview in the edit mode.
 *
 * The values are sent with the body of a POST request to the page: veDraft[<table>][<uid>][<field>]=<value>
 * They are only laid over the record data while the page is rendered. Nothing is saved.
 */
final class AppearanceDraftService
{
    /**
     * @var array<string, array<int, array<string, string>>>
     */
    private array $draft = [];

    public function __construct(
        private readonly TcaSchemaFactory $tcaSchemaFactory,
        private readonly AppearanceFieldsService $appearanceFieldsService,
        private readonly AppearanceItemsService $appearanceItemsService,
    ) {
    }

    public function load(ServerRequestInterface $request): void
    {
        $this->draft = [];

        $body = $request->getParsedBody();
        $draft = is_array($body) ? ($body['veDraft'] ?? null) : null;
        $pageInformation = $request->getAttribute('frontend.page.information');
        if (!is_array($draft) || !$pageInformation instanceof PageInformation) {
            return;
        }

        $pageTsConfig = BackendUtility::getPagesTSconfig($pageInformation->getId());
        foreach ($draft as $table => $rows) {
            if (!is_string($table) || !is_array($rows) || !$this->tcaSchemaFactory->has($table)) {
                continue;
            }

            $allowedFields = $this->appearanceFieldsService->resolveFieldNames($table, $pageTsConfig);
            foreach ($rows as $uid => $fields) {
                if (!is_array($fields) || (int)$uid <= 0) {
                    continue;
                }

                $pendingValues = [];
                foreach ($fields as $fieldName => $value) {
                    if (is_string($fieldName) && is_string($value) && in_array($fieldName, $allowedFields, true)) {
                        $pendingValues[$fieldName] = $value;
                    }
                }

                foreach ($this->filterItemValues($request, $table, (int)$uid, $pageInformation->getId(), $pendingValues) as $fieldName => $value) {
                    $this->draft[$table][(int)$uid][$fieldName] = $value;
                }
            }
        }
    }

    /**
     * @param array<string, mixed> $row
     * @return array<string, mixed>
     */
    public function overlay(string $table, array $row): array
    {
        if (!isset($this->draft[$table])) {
            return $row;
        }

        // the uid shown in the edit mode is the localized, the versioned or the uid of the record
        foreach (['_LOCALIZED_UID', '_ORIG_uid', 'uid'] as $uidKey) {
            $uid = (int)($row[$uidKey] ?? 0);
            if ($uid > 0 && isset($this->draft[$table][$uid])) {
                return array_replace($row, $this->draft[$table][$uid]);
            }
        }

        return $row;
    }

    /**
     * Keeps the values that are items of the field in the edit form of the record. That includes the items
     * that the page TSconfig adds (TCEFORM addItems) and the items of an itemsProcFunc, not only the items of the TCA.
     *
     * @param array<string, string> $pendingValues
     * @return array<string, string>
     */
    private function filterItemValues(ServerRequestInterface $request, string $table, int $uid, int $pageId, array $pendingValues): array
    {
        if ($pendingValues === []) {
            return [];
        }

        try {
            $resolvedFields = $this->appearanceItemsService->resolve($request, $table, $uid, $pageId, array_keys($pendingValues), $pendingValues);
        } catch (FormException) {
            // the record does not exist, or the user may not edit it
            return [];
        }

        $itemValues = [];
        foreach ($resolvedFields as $fieldName => $resolvedField) {
            if (in_array($pendingValues[$fieldName], array_column($resolvedField['items'], 'value'), true)) {
                $itemValues[$fieldName] = $pendingValues[$fieldName];
            }
        }

        return $itemValues;
    }
}
