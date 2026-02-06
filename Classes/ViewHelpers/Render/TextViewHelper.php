<?php

declare(strict_types=1);

namespace TYPO3\CMS\VisualEditor\ViewHelpers\Render;

use TYPO3\CMS\Core\Domain\RecordFactory;
use TYPO3\CMS\Core\Domain\RecordInterface;
use TYPO3\CMS\Core\Schema\TcaSchemaFactory;
use TYPO3\CMS\Core\Utility\GeneralUtility;
use TYPO3\CMS\Extbase\Utility\LocalizationUtility;
use TYPO3\CMS\Frontend\Page\PageInformation;
use TYPO3\CMS\VisualEditor\EditableResult\Input;
use TYPO3\CMS\VisualEditor\Service\EditModeService;
use TYPO3Fluid\Fluid\Core\ViewHelper\AbstractViewHelper;
use TYPO3Fluid\Fluid\Core\ViewHelper\TagBuilder;

use function htmlspecialchars;
use function nl2br;
use function str_replace;

final class TextViewHelper extends AbstractViewHelper
{
    protected $escapeOutput = false;

    public function __construct(
        private readonly EditModeService $editModeService,
        private readonly RecordFactory $recordFactory,
        private readonly TcaSchemaFactory $tcaSchema,
    ) {
    }

    public function initializeArguments(): void
    {
        parent::initializeArguments();

        $this->registerArgument('record', RecordInterface::class . '|' . PageInformation::class, 'A Record API Object (field is also needed)', true);
        $this->registerArgument('field', 'string', 'the field that should be rendered', true);

        $this->registerArgument('allowNewlines', 'bool', 'allows newLines and converts them to <br>', false, false);
    }

    public function render(): Input
    {
        $this->editModeService->init();

        $record = $this->arguments['record'];
        $field = $this->arguments['field'];

        $allowNewlines = $this->arguments['allowNewlines'];

        if ($record instanceof PageInformation) {
            $record = $this->recordFactory->createResolvedRecordFromDatabaseRow('pages', $record->getPageRecord());
        }

        $name = LocalizationUtility::translate($this->tcaSchema->get($record->getMainType())->getField($field)->getLabel());

        $value = $record->get($field) ?? '';
        $value = str_replace("\r\n", "\n", $value);
        if ($allowNewlines) {
            // convert <br> to new lines for editing (old content might have <br>)
            $value = str_replace('<br>', "\n", $value);
        }

        $escapedValue = htmlspecialchars($value);

        if ($allowNewlines) {
            $escapedValue = nl2br($escapedValue);
        }

        $canEdit = $this->editModeService->canEditField($record, $field);
        if (!$canEdit) {
            return new Input($name, $escapedValue, !$value, $value);
        }

        $tag = GeneralUtility::makeInstance(TagBuilder::class);
        $tag->setTagName('ve-editable-text');
        $tag->addAttribute('table', $record->getMainType());
        $tag->addAttribute('uid', $record->getUid());
        $tag->addAttribute('field', $field);

        $tag->addAttribute('name', $name);
        $tag->addAttribute('title', 'Edit field ' . $name);
        $tag->addAttribute('allowNewlines', $allowNewlines);

        $tag->setContent($escapedValue);

        $tag->forceClosingTag(true);
        return new Input($name, $tag->render(), !$value, $value ?: '');
    }
}
