<?php

declare(strict_types=1);

namespace TYPO3\CMS\VisualEditor\ViewHelpers\Render;

use InvalidArgumentException;
use Psr\Http\Message\ServerRequestInterface;
use TYPO3\CMS\Core\Domain\RecordFactory;
use TYPO3\CMS\Core\Domain\RecordInterface;
use TYPO3\CMS\Core\Information\Typo3Version;
use TYPO3\CMS\Core\Utility\GeneralUtility;
use TYPO3\CMS\Extbase\DomainObject\DomainObjectInterface;
use TYPO3\CMS\Frontend\Page\PageInformation;
use TYPO3\CMS\VisualEditor\Api\TextFieldRendererInterface;
use TYPO3\CMS\VisualEditor\Service\ModelToRawRecordService;
use TYPO3Fluid\Fluid\Core\Parser\UnsafeHTML;
use TYPO3Fluid\Fluid\Core\ViewHelper\AbstractViewHelper;

use function get_debug_type;

/**
 * ViewHelper to render content based on records and fields from a TCA schema.
 * Handles the processing of both simple and rich text fields.
 *
 * ````html
 *   <f:render.text record="{page}" field="bodytext" />
 *   {record -> f:render.text(field: 'title')}
 *   <f:render.text field="subheader">{record}</f:render.text>
 * ````
 */
final class TextViewHelper extends AbstractViewHelper
{
    private const RECORD_TYPE = RecordInterface::class . '|' . PageInformation::class . '|' . DomainObjectInterface::class;

    /**
     * Extbase models have a __toString() method and Fluid calls that if we escape the Children (arguments)
     */
    protected $escapeChildren = false;

    protected $escapeOutput = false;

    public function __construct(
        private readonly RecordFactory $recordFactory,
        private readonly Typo3Version $typo3Version,
        private readonly ModelToRawRecordService $modelToRawRecordService,
        private readonly TextFieldRendererInterface $textApi,
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
    }

    public function getContentArgumentName(): string
    {
        return 'record';
    }

    public function render(): UnsafeHTML|null
    {
        $renderingContext = $this->renderingContext ?? throw new InvalidArgumentException('$this->renderingContext is not available', 1772464146);
        $request = $renderingContext->getAttribute(ServerRequestInterface::class);

        $record = $this->toRecordInterface($this->renderChildren());

        $field = $this->arguments['field'];

        $optional = $this->arguments['optional'];

        return $this->textApi->render($record, $field, $request, $optional);
    }

    private function toRecordInterface(mixed $record): RecordInterface
    {
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

        return $record;
    }
}
