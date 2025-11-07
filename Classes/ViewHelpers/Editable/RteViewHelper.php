<?php

declare(strict_types=1);

namespace Andersundsehr\Editara\ViewHelpers\Editable;

use Andersundsehr\Editara\Dto\Editable;
use Andersundsehr\Editara\Dto\Input;
use Andersundsehr\Editara\Enum\EditableType;
use Andersundsehr\Editara\Service\BrickService;
use Andersundsehr\Editara\Service\RecordService;
use InvalidArgumentException;
use Psr\Http\Message\ServerRequestInterface;
use Symfony\Component\DependencyInjection\Attribute\Autoconfigure;
use TYPO3\CMS\Core\Domain\RecordInterface;
use TYPO3\CMS\Core\Page\AssetCollector;
use TYPO3\CMS\Fluid\ViewHelpers\Format\HtmlViewHelper;
use TYPO3\CMS\Frontend\Page\PageInformation;
use TYPO3Fluid\Fluid\Core\ViewHelper\AbstractTagBasedViewHelper;
use function htmlspecialchars;
use function str_replace;

#[Autoconfigure(public: true)]
final class RteViewHelper extends AbstractTagBasedViewHelper
{
    protected $tagName = 'editable-rte';

    public function __construct(
        private readonly BrickService $brickService,
        private readonly RecordService $recordService,
    ) {
        parent::__construct();
    }

    public function initializeArguments()
    {
        parent::initializeArguments();

        $this->registerArgument('name', 'string', 'The editable name', false, '');
        $this->registerArgument('record', 'object', 'A Record API Object (field is also needed)');
        $this->registerArgument('field', 'string', 'record', false, '');

        $this->registerArgument('default', 'string', 'will be in .value but will not be saved in the DB', false, '');
    }

    public function render(): Input
    {
        $name = $this->arguments['name'];
        $record = $this->arguments['record'];
        $field = $this->arguments['field'];

        $default = $this->arguments['default'];

        if (!($name xor $record)) {
            throw new InvalidArgumentException('You must provide either "name" or "record"+"field" arguments not both or none.');
        }
        if ($record && !$field) {
            throw new InvalidArgumentException('When providing "record" argument you must also provide "field" argument.');
        }
        if ($record instanceof PageInformation) {
            $record = $this->recordService->getPageRecordAsRecordInterface($record);
        }
        if ($record && !$record instanceof RecordInterface) {
            throw new InvalidArgumentException(
                sprintf(
                    "The \"record\" argument must be an instance of %s or %s. %s given",
                    RecordInterface::class,
                    PageInformation::class,
                    is_object($record) ? $record::class : gettype($record),
                ),
            );
        }
        if ($record && $field) {
            $this->brickService->getScope($this->renderingContext); // ensure initialized
            $editable = new Editable(
                name: $record->getMainType() . '[' . $record->getUid() . ']' . $field,
                type: EditableType::input,
                field: $field,
                record: $record,
            );
        } else {
            $editable = $this->brickService->getEditable($this->renderingContext, $name, EditableType::input);
        }

        $value = $editable->getValue() ?? '';

        $escapedValue = $this->escapeRte($value);
        if (!$this->brickService->isEditMode()) {
            $escapedValue = $this->escapeRte($value ?: $default);
        }

        if (!$this->brickService->isEditMode()) {
            return new Input($name, $escapedValue, ($value ?: $default) === '', $value ?: $default);
        }

        $request = $this->renderingContext->getAttribute(ServerRequestInterface::class);
        $site = $request->getAttribute('site');
        $syncLanguage = $this->recordService->getSyncLanguageForField($site, $editable->record, 'value');

        $fieldId = $editable->record->getMainType() . '-' . $editable->record->getUid() . '-' . $editable->field;
        $this->tag->addAttribute('id', $fieldId . '-placeholder-ckeditor5');
        $this->tag->addAttribute('table', $editable->record->getMainType());
        $this->tag->addAttribute('uid', $editable->record->getUid());
        $this->tag->addAttribute('field', $editable->field);

        $this->tag->addAttribute('name', $editable->name);
        $this->tag->addAttribute('langSyncUid', $syncLanguage?->getLanguageId() ?? false);
        $this->tag->addAttribute('title', 'Edit field ' . $editable->name);
        $this->tag->addAttribute('placeholder', $default);

        $this->tag->setContent($escapedValue);

        $this->tag->forceClosingTag(true);
        return new Input($name, $this->tag->render(), ($value ?: $default) === '', $value ?: $default);
    }

    private function escapeRte(string $value): string
    {
        return $this->renderingContext->getViewHelperInvoker()->invoke(
            HtmlViewHelper::class,
            [], // TODO allow passing arguments?
            $this->renderingContext,
            fn() => $value,
        );
    }
}
