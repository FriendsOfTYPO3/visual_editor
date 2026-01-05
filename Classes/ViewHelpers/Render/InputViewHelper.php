<?php

declare(strict_types=1);

namespace TYPO3\CMS\VisualEditor\ViewHelpers\Render;

use InvalidArgumentException;
use Symfony\Component\DependencyInjection\Attribute\Autoconfigure;
use TYPO3\CMS\Core\Domain\RecordInterface;
use TYPO3\CMS\Core\Schema\TcaSchemaFactory;
use TYPO3\CMS\Extbase\Utility\LocalizationUtility;
use TYPO3\CMS\Frontend\Page\PageInformation;
use TYPO3\CMS\VisualEditor\EditableResult\Input;
use TYPO3\CMS\VisualEditor\Service\EditModeService;
use TYPO3\CMS\VisualEditor\Service\RecordService;
use TYPO3Fluid\Fluid\Core\ViewHelper\AbstractTagBasedViewHelper;

use function get_debug_type;
use function htmlspecialchars;
use function str_replace;
use function trim;

#[Autoconfigure(public: true)]
final class InputViewHelper extends AbstractTagBasedViewHelper
{
    protected $tagName = 'editable-input';

    public function __construct(
        private readonly EditModeService $editModeService,
        private readonly RecordService $recordService,
        private readonly TcaSchemaFactory $tcaSchema,
    ) {
        parent::__construct();
    }

    public function initializeArguments()
    {
        parent::initializeArguments();

        $this->registerArgument('record', 'object', 'A Record API Object (field is also needed)', true);
        $this->registerArgument('field', 'string', 'record', true);

        $this->registerArgument('allowNewLines', 'bool', 'allows newLines and converts them to <br>', false, false);
        $this->registerArgument('default', 'string', 'will be in .value but will not be saved in the DB (children used first)', false, '');
    }

    public function render(): Input
    {
        $this->editModeService->init();

        $record = $this->arguments['record'];
        $field = $this->arguments['field'];

        $allowNewLines = $this->arguments['allowNewLines'];
        $default = trim($this->renderChildren() ?: '') ?: $this->arguments['default'];

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
        if (!$this->editModeService->isEditMode()) {
            $escapedValue = htmlspecialchars($value ?: $default ?: '');
        }

        if ($allowNewLines) {
            $escapedValue = str_replace("\r\n", "\n", $escapedValue);
            $escapedValue = str_replace("\r", "\n", $escapedValue);
            $escapedValue = str_replace("\n", '<br>', $escapedValue);
        }

        if (!$this->editModeService->isEditMode()) {
            return new Input($name, $escapedValue, ($value ?: $default) === '', $value ?: $default);
        }

        $this->tag->addAttribute('table', $record->getMainType());
        $this->tag->addAttribute('uid', $record->getUid());
        $this->tag->addAttribute('field', $field);

        $this->tag->addAttribute('name', $name);
        $this->tag->addAttribute('title', 'Edit field ' . $name);
        $this->tag->addAttribute('allowNewLines', $allowNewLines);
        $this->tag->addAttribute('placeholder', $default);

        $this->tag->setContent($escapedValue);

        $this->tag->forceClosingTag(true);
        return new Input($name, $this->tag->render(), ($value ?: $default ?: '') === '', $value ?: $default ?: '');
    }
}
