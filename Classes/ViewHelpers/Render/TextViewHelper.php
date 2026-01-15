<?php

declare(strict_types=1);

namespace TYPO3\CMS\VisualEditor\ViewHelpers\Render;

use InvalidArgumentException;
use Symfony\Component\DependencyInjection\Attribute\Autoconfigure;
use TYPO3\CMS\Core\Domain\RecordInterface;
use TYPO3\CMS\Core\Schema\TcaSchemaFactory;
use TYPO3\CMS\Core\Utility\GeneralUtility;
use TYPO3\CMS\Extbase\Utility\LocalizationUtility;
use TYPO3\CMS\Frontend\Page\PageInformation;
use TYPO3\CMS\VisualEditor\EditableResult\Input;
use TYPO3\CMS\VisualEditor\Service\EditModeService;
use TYPO3\CMS\VisualEditor\Service\RecordService;
use TYPO3Fluid\Fluid\Core\ViewHelper\AbstractViewHelper;
use TYPO3Fluid\Fluid\Core\ViewHelper\TagBuilder;
use function get_debug_type;
use function htmlspecialchars;
use function str_replace;

#[Autoconfigure(public: true)]
final class TextViewHelper extends AbstractViewHelper
{
    protected $escapeOutput = false;

    public function __construct(
        private readonly EditModeService $editModeService,
        private readonly RecordService $recordService,
        private readonly TcaSchemaFactory $tcaSchema,
    )
    {
    }

    public function initializeArguments(): void
    {
        parent::initializeArguments();

        $this->registerArgument('record', 'object', 'A Record API Object (field is also needed)', true);
        $this->registerArgument('field', 'string', 'record', true);

        $this->registerArgument('allowNewLines', 'bool', 'allows newLines and converts them to <br>', false, false);
    }

    public function render(): Input|string
    {
        $this->editModeService->init();

        $record = $this->arguments['record'];
        $field = $this->arguments['field'];

        $allowNewLines = $this->arguments['allowNewLines'];

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
        $value = str_replace("\r\n", "\n", $value);
        if ($allowNewLines) {
            // convert <br> to new lines for editing (old content might have <br>)
            $value = str_replace('<br>', "\n", $value);
        }

        $escapedValue = htmlspecialchars($value);

        $canEdit = $this->editModeService->canEditField($record, $field);
        if (!$canEdit) {
            $escapedValue = htmlspecialchars($value ?: '');
        }

        if ($allowNewLines) {
            $escapedValue = str_replace("\r\n", "\n", $escapedValue);
            $escapedValue = str_replace("\r", "\n", $escapedValue);
            $escapedValue = str_replace("\n", '<br>', $escapedValue);
        }

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
        $tag->addAttribute('allowNewLines', $allowNewLines);

        $tag->setContent($escapedValue);

        $tag->forceClosingTag(true);
        return new Input($name, $tag->render(), !$value, $value ?: '');
    }
}
