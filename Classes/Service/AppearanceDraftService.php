<?php

declare(strict_types=1);

namespace TYPO3\CMS\VisualEditor\Service;

use Psr\Http\Message\ServerRequestInterface;
use TYPO3\CMS\Backend\Utility\BackendUtility;
use TYPO3\CMS\Core\Schema\Field\StaticSelectFieldType;
use TYPO3\CMS\Core\Schema\TcaSchemaFactory;
use TYPO3\CMS\Frontend\Page\PageInformation;

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

                foreach ($fields as $fieldName => $value) {
                    if (
                        is_string($value)
                        && in_array($fieldName, $allowedFields, true)
                        && $this->isItemValue($table, $fieldName, $value)
                    ) {
                        $this->draft[$table][(int)$uid][$fieldName] = $value;
                    }
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

    private function isItemValue(string $table, string $fieldName, string $value): bool
    {
        $schema = $this->tcaSchemaFactory->get($table);
        if (!$schema->hasField($fieldName)) {
            return false;
        }

        $field = $schema->getField($fieldName);
        if (!$field instanceof StaticSelectFieldType) {
            return false;
        }

        foreach ($field->getItems() as $item) {
            if ((string)$item->getValue() === $value) {
                return true;
            }
        }

        return false;
    }
}
