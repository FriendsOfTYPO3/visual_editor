<?php

declare(strict_types=1);

namespace TYPO3\CMS\VisualEditor\ViewHelpers\Render;

use InvalidArgumentException;
use Psr\Http\Message\ServerRequestInterface;
use TYPO3\CMS\Backend\Routing\UriBuilder;
use TYPO3\CMS\Core\Domain\Exception\RecordPropertyNotFoundException;
use TYPO3\CMS\Core\Domain\RecordFactory;
use TYPO3\CMS\Core\Domain\RecordInterface;
use TYPO3\CMS\Core\Information\Typo3Version;
use TYPO3\CMS\Core\LinkHandling\TypoLinkCodecService;
use TYPO3\CMS\Core\LinkHandling\TypolinkParameter;
use TYPO3\CMS\Core\Schema\Field\LinkFieldType;
use TYPO3\CMS\Core\Schema\TcaSchemaFactory;
use TYPO3\CMS\Core\Utility\GeneralUtility;
use TYPO3\CMS\Extbase\DomainObject\DomainObjectInterface;
use TYPO3\CMS\Frontend\ContentObject\ContentObjectRenderer;
use TYPO3\CMS\Frontend\Page\PageInformation;
use TYPO3\CMS\Frontend\Typolink\UnableToLinkException;
use TYPO3\CMS\VisualEditor\Service\EditModeService;
use TYPO3\CMS\VisualEditor\Service\LocalizationService;
use TYPO3\CMS\VisualEditor\Service\ModelToRawRecordService;
use TYPO3\CMS\VisualEditor\Service\UrlGenerationService;
use TYPO3Fluid\Fluid\Core\Parser\UnsafeHTML;
use TYPO3Fluid\Fluid\Core\Parser\UnsafeHTMLString;
use TYPO3Fluid\Fluid\Core\ViewHelper\AbstractViewHelper;
use TYPO3Fluid\Fluid\Core\ViewHelper\InvalidArgumentValueException;

use function get_debug_type;
use function htmlspecialchars;
use function json_encode;
use function sprintf;

use const ENT_QUOTES;
use const JSON_THROW_ON_ERROR;

/**
 * ViewHelper to render links based on records and fields from a TCA schema.
 *
 * ````html
 *   <f:render.typolink record="{page}" field="header_link" />
 *   {record -> f:render.typolink(field: 'header_link')}
 *   <f:render.typolink field="header_link">{record}</f:render.typolink>
 *   {record -> f:render.typolink(field: 'tx_themecamino_link', linkText: '{f:render.text(record: record, field: \'tx_themecamino_link_label\')}')}
 *   <!-- TODO -->
 *   <f:render.typolink record="{record}" field="tx_themecamino_link">
 *       <ui:icon name="click"/>
 *       {record -> f:render.text(field: \'tx_themecamino_link_label\')}
 *   </f:render.typolink>
 * ````
 */
final class TypolinkViewHelper extends AbstractViewHelper
{
    private const RECORD_TYPE = RecordInterface::class . '|' . PageInformation::class . '|' . DomainObjectInterface::class;

    /**
     * Extbase models have a __toString() method and Fluid calls that if we escape the Children (arguments)
     */
    protected $escapeChildren = false;

    public function __construct(
        private readonly EditModeService $editModeService,
        private readonly RecordFactory $recordFactory,
        private readonly TcaSchemaFactory $tcaSchema,
        private readonly Typo3Version $typo3Version,
        private readonly LocalizationService $localizationService,
        private readonly ModelToRawRecordService $modelToRawRecordService,
        private readonly UrlGenerationService $urlGenerationService,
        private readonly UriBuilder $uriBuilder,
    ) {
    }

    public function initializeArguments(): void
    {
        parent::initializeArguments();

        $type = 'object';
        // can not always use DI here because fluid initializes the class without DI. and calls initializeArguments.
        $typo3Version = $this->typo3Version ?? GeneralUtility::makeInstance(Typo3Version::class);
        if ($typo3Version->getMajorVersion() >= 14) {
            $type = self::RECORD_TYPE;
        }

        $this->registerArgument('record', $type, 'A Record API Object (field is also needed)');
        $this->registerArgument('field', 'string', 'the field that should be rendered', true);
        $this->registerArgument('optional', 'boolean', 'If the provided field does not exist in the record, null will be returned.', false, false);

//        $this->registerArgument('target', 'string', 'Define where to display the linked URL', false, '');
//        $this->registerArgument('class', 'string', 'Define classes for the link element', false, '');
//        $this->registerArgument('title', 'string', 'Define the title for the link element', false, '');
        $this->registerArgument('additionalAttributes', 'array', 'Additional tag attributes to be added directly to the resulting HTML tag', false, []);

        $this->registerArgument('linkText', 'string|Stringable', 'If the provided will replace the links text.', false, '');
    }

    public function getContentArgumentName(): string
    {
        return 'record';
    }

    public function render(): UnsafeHTMLString|string|null
    {
        $renderingContext = $this->renderingContext ?? throw new InvalidArgumentException('$this->renderingContext is not available', 1772464146);
        $request = $renderingContext->getAttribute(ServerRequestInterface::class);
        $this->editModeService->init($request);

        $record = $this->renderChildren();
        $field = $this->arguments['field'];

        if ($record instanceof PageInformation) {
            $record = $this->recordFactory->createResolvedRecordFromDatabaseRow('pages', $record->getPageRecord());
        }

        if ($record instanceof DomainObjectInterface) {
            $record = $this->modelToRawRecordService->modelToRawRecord($record);
        }

        if (!$record instanceof RecordInterface) {
            throw new InvalidArgumentException(
                'The record argument must be an instance of ' . self::RECORD_TYPE . '. Given: ' . get_debug_type(
                    $record,
                ),
                1770539910,
            );
        }

        try {
            $value = $record->get($field) ?? '';
        } catch (RecordPropertyNotFoundException $recordPropertyNotFoundException) {
            if ($this->arguments['optional']) {
                return null;
            }

            throw new InvalidArgumentValueException(
                'The field "' . $field . '" does not exist in the given record `' . $record->getFullType() . '`.',
                1775554099,
                $recordPropertyNotFoundException,
            );
        }

        if (!($value instanceof TypolinkParameter)) {
            $table = $record->getMainType();
            throw new InvalidArgumentException(
                'The value of the field "' . $table . '.' . $field . '" must be a ' . TypolinkParameter::class . '. Given: ' . get_debug_type($value),
                1770321858,
            );
        }

        $canEdit = $this->editModeService->canEditField($record, $field, $request);

        $schema = $this->tcaSchema->get($record->getFullType());
        $tableLabel = $schema->getTitle($this->localizationService->tryTranslation(...));

        $fieldSchema = $schema->getField($field);
        $label = $this->localizationService->tryTranslation($fieldSchema->getLabel());

        $label = $tableLabel . ': ' . $label;

        if ($fieldSchema instanceof LinkFieldType) {
            $additionalAttributes = $this->arguments['additionalAttributes'];

            if ($canEdit) {
                $backendEditUrl = (string)$this->urlGenerationService->getBackendEditUrl($request);
                $editParams = [
                    'edit' => [$record->getMainType() => [$record->getUid() => 'edit']],
                    'columnsOnly' => [$record->getMainType() => [$field]],
                    'returnUrl' => $backendEditUrl,
                ];

                $url = '';
                if ($this->typo3Version->getMajorVersion() >= 14) {
                    $url = (string)$this->uriBuilder->buildUriFromRoute('record_edit_contextual', $editParams, UriBuilder::ABSOLUTE_URL);
                }

                $dataVeEdit = json_encode([
                    'test' => time(),
                    'label' => $label,
                    'url' => $url,
                    'editUrl' => (string)$this->uriBuilder->buildUriFromRoute('record_edit', $editParams, UriBuilder::ABSOLUTE_URL),
                ], JSON_THROW_ON_ERROR);
                $additionalAttributes['data-ve-edit'] = $dataVeEdit;
                $additionalAttributes['data-url'] = $url;
                $additionalAttributes['data-edit-url'] = (string)$this->uriBuilder->buildUriFromRoute('record_edit', $editParams, UriBuilder::ABSOLUTE_URL);
            }

            $typoLinkCodecService = GeneralUtility::makeInstance(TypoLinkCodecService::class);
            $contentObject = GeneralUtility::makeInstance(ContentObjectRenderer::class);
            $contentObject->setRequest($request);

            $conf = [];
            $conf['parameter'] = $typoLinkCodecService->encode($value->toArray());
            try {
                $linkResult = $contentObject->createLink('', $conf);
            } catch (UnableToLinkException $e) {
                return $this->arguments['linkText'] ?: $e->getLinkText();
            }

            if ($this->arguments['linkText']) {
                $linkText = $this->arguments['linkText'];
                if ($linkText instanceof UnsafeHTML) {
                    $linkText = (string)$linkText;
                } else {
                    // escape the text for HTML:
                    $linkText = htmlspecialchars($linkText, ENT_QUOTES);
                }

                $linkResult = $linkResult->withLinkText($linkText);
            }

            $linkResult = $linkResult->withAttributes($additionalAttributes);
            $html = sprintf(
                '<a %s>%s</a>',
                GeneralUtility::implodeAttributes($linkResult->getAttributes(), true, true),
                $linkResult->getLinkText()
            );
            return new UnsafeHTMLString($html);
        }

        $table = $record->getMainType();
        throw new InvalidArgumentException('The field "' . $table . '.' . $field . '" is not supported. Given: ' . get_debug_type($fieldSchema), 1770618219);
    }
}
