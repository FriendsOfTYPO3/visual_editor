<?php

declare(strict_types=1);

namespace Andersundsehr\Editara\ViewHelpers\Editable;

use Andersundsehr\Editara\Core\RichtText\RichTextConfigurationService;
use Andersundsehr\Editara\Core\RichtText\RichTextConfigurationServiceDto;
use Andersundsehr\Editara\Dto\Editable;
use Andersundsehr\Editara\Dto\Input;
use Andersundsehr\Editara\Dto\Rte;
use Andersundsehr\Editara\Enum\EditableType;
use Andersundsehr\Editara\Service\BrickService;
use Andersundsehr\Editara\Service\RecordService;
use InvalidArgumentException;
use Psr\Http\Message\ServerRequestInterface;
use Symfony\Component\DependencyInjection\Attribute\Autoconfigure;
use TYPO3\CMS\Core\Configuration\Richtext;
use TYPO3\CMS\Core\Domain\RecordInterface;
use TYPO3\CMS\Core\Html\RteHtmlParser;
use TYPO3\CMS\Core\Page\AssetCollector;
use TYPO3\CMS\Core\Schema\TcaSchemaFactory;
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
        private readonly RichTextConfigurationService $richTextConfigurationService,
        private readonly Richtext $richtext,
        private readonly TcaSchemaFactory $tcaSchema,
        private readonly RteHtmlParser $rteHtmlParser,
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

    public function render(): Rte
    {
        $name = $this->arguments['name'];
        $record = $this->arguments['record'];
        $field = $this->arguments['field'];

        $default = trim($this->renderChildren() ?: '') ?: $this->arguments['default'];

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
            $this->brickService->getTemplateBrick($this->renderingContext); // ensure initialized
            $editable = new Editable(
                name: $record->getMainType() . '[' . $record->getUid() . ']' . $field,
                type: EditableType::rte,
                field: $field,
                record: $record,
            );
        } else {
            $editable = $this->brickService->getEditable($this->renderingContext, $name, EditableType::rte);
        }

        $value = $editable->getValue() ?? '';


        if (!$this->brickService->isEditMode()) {
            $escapedValue = $this->text2html($value ?: $default);
            return new Rte($name, $escapedValue, ($value ?: $default) === '', $value ?: $default);
        }

        [$options, $processingConfiguration] = $this->getOptions($editable, $default);
        $escapedValue = $this->rteHtmlParser->transformTextForRichTextEditor($value, $processingConfiguration);

        $request = $this->renderingContext->getAttribute(ServerRequestInterface::class);
        $site = $request->getAttribute('site');
        $syncLanguage = $this->recordService->getSyncLanguageForField($site, $editable->record, 'value');

        $this->tag->addAttribute('class', 'editara-focus');
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
        return new Rte($name, $this->tag->render(), ($value ?: $default) === '', $value ?: $default);
    }

    private function text2html(string $value): string
    {
        return $this->renderingContext->getViewHelperInvoker()->invoke(
            HtmlViewHelper::class,
            [], // TODO allow passing arguments?
            $this->renderingContext,
            fn() => $value,
        );
    }

    /**
     * @return array{0:string, 1:array<mixed>}
     */
    private function getOptions(Editable $editable, string $placeholder): array
    {
        $schema = $this->tcaSchema->get($editable->record->getFullType());
        $richtextConfiguration = $this->richtext->getConfiguration(
            $editable->record->getMainType(),
            $editable->field,
            $editable->record->getPid(),
            $editable->record->getRecordType(),
            $schema->getField($editable->field)->getConfiguration(),
        );

        $richTextConfigurationServiceDto = new RichTextConfigurationServiceDto(
            tableName: $editable->record->getMainType(),
            uid: $editable->record->getUid(),
            fieldName: $editable->field,
            recordTypeValue: $editable->record->getRecordType(),
            effectivePid: $editable->record->getPid(),
            richtextConfigurationName: $richtextConfiguration['preset'],
            label: 'Text',
            placeholder: $placeholder,
            readOnly: false,
            data: $editable->record->getRawRecord()->toArray(),
            additionalConfiguration: $richtextConfiguration['editor']['config'],
            externalPlugins: $richtextConfiguration['editor']['externalPlugins'],
        );

        $config = $this->richTextConfigurationService->resolveCkEditorConfiguration($richTextConfigurationServiceDto);

        unset($config['height']); // height is set by the content itself and css
        $config['debug'] = false; // for now we disable debug mode

        $this->assetCollector->addJavaScriptModule('@typo3/ckeditor5/translations/' . $config['language']['ui'] . '.js');
        return [json_encode($config, JSON_PRETTY_PRINT | JSON_THROW_ON_ERROR), $richtextConfiguration['proc.'] ?? []];
    }
}
