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
use function json_encode;

#[Autoconfigure(public: true)]
final class RteViewHelper extends AbstractTagBasedViewHelper
{
    protected $tagName = 'editable-rte';

    public function __construct(
        private readonly BrickService $brickService,
        private readonly RecordService $recordService,
        private readonly AssetCollector $assetCollector,
    )
    {
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
        $options = $this->getOptions();

        $fieldId = $editable->record->getMainType() . '-' . $editable->record->getUid() . '-' . $editable->field;
        $this->tag->addAttribute('id', $fieldId . '-placeholder-ckeditor5');
        $this->tag->addAttribute('table', $editable->record->getMainType());
        $this->tag->addAttribute('uid', $editable->record->getUid());
        $this->tag->addAttribute('field', $editable->field);

        $this->tag->addAttribute('name', $editable->name);
        $this->tag->addAttribute('langSyncUid', $syncLanguage?->getLanguageId() ?? false);
        $this->tag->addAttribute('title', 'Edit field ' . $editable->name);
        $this->tag->addAttribute('placeholder', $default);
        $this->tag->addAttribute('options', $options);

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

    private function getOptions(): string
    {
        $data = [
            'customConfig' => '',
            'label' => 'Text',
            'alignment' => [
                'options' => [
                    0 => [
                        'name' => 'left',
                        'className' => 'text-start',
                    ],
                    1 => [
                        'name' => 'center',
                        'className' => 'text-center',
                    ],
                    2 => [
                        'name' => 'right',
                        'className' => 'text-end',
                    ],
                    3 => [
                        'name' => 'justify',
                        'className' => 'text-justify',
                    ],
                ],
            ],
            'contentsCss' => [
                0 => '/_assets/937be57c7660e085d41e9dabf38b8aa1/Css/contents.css?1760439210',
            ],
            'heading' => [
                'options' => [
                    0 => [
                        'model' => 'paragraph',
                        'title' => 'Paragraph',
                    ],
                    1 => [
                        'model' => 'heading2',
                        'view' => 'h2',
                        'title' => 'Heading 2',
                    ],
                    2 => [
                        'model' => 'heading3',
                        'view' => 'h3',
                        'title' => 'Heading 3',
                    ],
                    3 => [
                        'model' => 'formatted',
                        'view' => 'pre',
                        'title' => 'Pre-Formatted Text',
                    ],
                ],
            ],
            //'height' => 300, // TODO overwritten
            'importModules' => [
                0 => [
                    'module' => '@typo3/rte-ckeditor/plugin/whitespace.js',
                    'exports' => [
                        0 => 'Whitespace',
                    ],
                ],
                1 => [
                    'module' => '@typo3/rte-ckeditor/plugin/typo3-link.js',
                    'exports' => [
                        0 => 'Typo3Link',
                    ],
                ],
            ],
            'style' => [
                'definitions' => [
                    0 => [
                        'name' => 'Lead',
                        'element' => 'p',
                        'classes' => [
                            0 => 'lead',
                        ],
                    ],
                    1 => [
                        'name' => 'Small',
                        'element' => 'small',
                        'classes' => [
                            0 => '',
                        ],
                    ],
                    2 => [
                        'name' => 'Muted',
                        'element' => 'span',
                        'classes' => [
                            0 => 'text-muted',
                        ],
                    ],
                ],
            ],
            'table' => [
                'defaultHeadings' => [
                    'rows' => 1,
                ],
                'contentToolbar' => [
                    0 => 'tableColumn',
                    1 => 'tableRow',
                    2 => 'mergeTableCells',
                    3 => 'tableProperties',
                    4 => 'tableCellProperties',
                    5 => 'toggleTableCaption',
                ],
            ],
            'toolbar' => [
                'items' => [
                    0 => 'style',
                    1 => 'heading',
                    2 => '|',
                    3 => 'bold',
                    4 => 'italic',
                    5 => 'subscript',
                    6 => 'superscript',
                    7 => 'softhyphen',
                    8 => '|',
                    9 => 'bulletedList',
                    10 => 'numberedList',
                    11 => 'blockQuote',
                    12 => 'alignment',
                    13 => '|',
                    14 => 'findAndReplace',
                    15 => 'link',
                    16 => '|',
                    17 => 'removeFormat',
                    18 => 'undo',
                    19 => 'redo',
                    20 => '|',
                    21 => 'insertTable',
                    22 => '|',
                    23 => 'specialCharacters',
                    24 => 'horizontalLine',
                    25 => 'sourceEditing',
                ],
                'removeItems' => [
                ],
                'shouldNotGroupWhenFull' => true,
            ],
            'ui' => [
                'poweredBy' => [
                    'position' => 'inside',
                    'side' => 'right',
                    'label' => '',
                ],
            ],
            'width' => 'auto',
            'wordCount' => [
                'displayCharacters' => true,
                'displayWords' => true,
            ],
            'language' => [
                'ui' => 'de',
                'content' => 'en-us',
            ],
            'debug' => false,// TODO overwritten
            'typo3link' => [
                'route' => 'rteckeditor_wizard_browse_links',
                'routeUrl' => '/typo3/rte/wizard/browselinks?token=c081d81efce3a4f7a15d6cb3bae1bacb1fceff29&P%5Btable%5D=tt_content&P%5Buid%5D=5&P%5BfieldName%5D=bodytext&P%5BrecordType%5D=productTeaser&P%5Bpid%5D=1&P%5BrichtextConfigurationName%5D=default',
            ],
        ];
        $this->assetCollector->addJavaScriptModule('@typo3/ckeditor5/translations/' . $data['language']['ui'] . '.js');
        return json_encode($data, JSON_PRETTY_PRINT | JSON_THROW_ON_ERROR);
    }
}
