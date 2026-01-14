<?php

declare(strict_types=1);

namespace TYPO3\CMS\VisualEditor\Service;

use Psr\Http\Message\ServerRequestInterface;
use TYPO3\CMS\Backend\Routing\UriBuilder;
use TYPO3\CMS\Core\Authentication\BackendUserAuthentication;
use TYPO3\CMS\Core\Domain\Record;
use TYPO3\CMS\Core\Page\AssetCollector;
use TYPO3\CMS\Core\Page\PageRenderer;
use TYPO3\CMS\Core\Schema\Capability\TcaSchemaCapability;
use TYPO3\CMS\Core\Schema\TcaSchemaFactory;
use TYPO3\CMS\Frontend\Page\PageInformation;
use function assert;

final readonly class EditModeService
{
    public function __construct(
        private AssetCollector $assetCollector,
        private UriBuilder $uriBuilder,
        private PageRenderer $pageRenderer,
        private TcaSchemaFactory $tcaSchema,
    )
    {
    }

    public function isEditMode(): bool
    {
        $queryParams = $this->getRequest()->getQueryParams();

        if (!($queryParams['editMode'] ?? false)) {
            return false;
        }

        return $this->isBeUser();
    }


    public function init(): void
    {
        if (!$this->isEditMode()) {
            return;
        }
        $this->assetCollector->addStyleSheet('editable', 'EXT:visual_editor/Resources/Public/Css/editable.css');
        $this->assetCollector->addJavaScriptModule('@typo3/visual-editor/Frontend/index.mjs');
        $this->assetCollector->addJavaScriptModule('@typo3/visual-editor/Frontend/index.mjs');

        $this->pageRenderer->addInlineLanguageLabelFile('EXT:visual_editor/Resources/Private/Language/locallang.xlf');

        if (!$this->assetCollector->hasInlineJavaScript('veLangInfo')) {
            $request = $GLOBALS['TYPO3_REQUEST'];
            assert($request instanceof ServerRequestInterface);

            $attribute = $request->getAttribute('frontend.page.information');
            assert($attribute instanceof PageInformation);
            $pageId = $attribute->getId();


            $newContentUrl = (string)$this->uriBuilder->buildUriFromRoute('new_content_element_wizard', [
                'id' => $pageId,
                'sys_language_uid' => '__SYS_LANGUAGE_UID__',
                'colPos' => '__COL_POS__',
                'uid_pid' => '__UID_PID__',
                'returnUrl' => (string)$this->uriBuilder->buildUriFromRoute('web_edit', [
                    'id' => $pageId,
                ]),
            ]);
            $data = [
                'pageId' => $pageId,
                'newContentUrl' => $newContentUrl,
            ];
            $this->assetCollector->addInlineJavaScript(
                'veLangInfo',
                'window.TYPO3 = window.TYPO3 || {};
window.veInfo = ' . json_encode($data, JSON_THROW_ON_ERROR) . ';',
                [
                    'type' => 'text/javascript',
                ],
            );
        }
    }

    public function canEditField(Record $record, string $field): bool
    {
        if (!$this->isEditMode()) {
            return false; // not in edit mode
        }
        $tcaSchema = $this->tcaSchema->get($record->getFullType());
        $fieldType = $tcaSchema->getField($field);

        if ($tcaSchema->hasCapability(TcaSchemaCapability::AccessReadOnly)) {
            return false; // table readonly
        }
        if ($fieldType->getConfiguration()['readOnly'] ?? false) {
            return false; // field readonly
        }
        // user access check
        /** @var BackendUserAuthentication $beUser */
        $beUser = $GLOBALS['BE_USER'];
        if (!$beUser->checkLanguageAccess($record->getLanguageId())) {
            return false; // no access to this language
        }
        if (!$beUser->check('tables_modify', $record->getMainType())) {
            return false; // no access to this table
        }
        if (!$beUser->isInWebMount($record->getPid())) {
            return false; // no access to this page // TODO move this to the middleware
        }
        if ($record->getMainType() === 'tt_content') {
            if (!$beUser->check('explicit_allowdeny', 'tt_content:CType:' . $record->get('CType'))) {
                return false; // content element type not allowed
            }
        }
        if ($fieldType->supportsAccessControl() && !$beUser->check('non_exclude_fields', $record->getMainType() . ':' . $field)) {
            return false; // no access to this field
        }
        return true;
    }

    private function getRequest(): ServerRequestInterface
    {
        return $GLOBALS['TYPO3_REQUEST'];
    }

    private function isBeUser(): bool
    {
        return ($GLOBALS['BE_USER'] ?? null) instanceof BackendUserAuthentication;
    }
}
