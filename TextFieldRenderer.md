# Using TextFieldRenderer in custom rendering

Use `TextFieldRendererInterface` when a text field is rendered outside Fluid,
for example by a headless endpoint, a custom template engine, or a `pti/pti`
data processor. It applies the field's TCA configuration and returns either the
regular frontend HTML or the metadata required to make the field editable.

Pass a `RecordInterface`, the field name, the current PSR-7 request, and whether
the field is optional. If an integration starts with a raw database row, create
the record first:

```php
$record = $this->recordFactory->createResolvedRecordFromDatabaseRow('tt_content', $data);
```

## Render an annotated field

The following helper can be used from a headless or `pti/pti` rendering layer:

```php
use Psr\Http\Message\ServerRequestInterface;
use TYPO3\CMS\Core\Domain\RecordInterface;
use TYPO3\CMS\Core\Http\HtmlResponse;
use TYPO3\CMS\Core\Http\PropagateResponseException;
use TYPO3\CMS\Core\Page\PageRenderer;
use TYPO3\CMS\VisualEditor\Api\CustomElement;
use TYPO3\CMS\VisualEditor\Api\TextFieldRendererInterface;

final readonly class CustomTextRenderer
{
    public function __construct(
        private TextFieldRendererInterface $textApi,
        private PageRenderer $pageRenderer,
    ) {}

    public function renderField(
        RecordInterface $record,
        string $field,
        ServerRequestInterface $request,
        bool $optional = false,
    ): ?string {
        $component = $this->textApi->render($record, $field, $request, $optional);
        if ($component === null) {
            return null;
        }

        if (!($component instanceof CustomElement)) {
            return (string)$component;
        }

        $jsonString = json_encode(
            $component,
            JSON_THROW_ON_ERROR | JSON_HEX_QUOT | JSON_HEX_APOS,
        );
        return "<span data-ve-custom-element='" . $jsonString . "'>" . $component->getContent() . '</span>';
    }

    public function respond(
        RecordInterface $record,
        string $field,
        ServerRequestInterface $request,
        bool $optional = false,
    ): never {
        $html = $this->renderField($record, $field, $request, $optional) ?? '';

        // Include the assets collected while rendering the field.
        $assets = implode("\n", $this->pageRenderer->renderJavaScriptAndCss($request));

        $response = new HtmlResponse($html . $assets);
        throw new PropagateResponseException($response);
    }
}
```

`JsonableUnsafeHtmlString` represents non-editable frontend output and is
returned directly. A `CustomElement` is serialized into the
`data-ve-custom-element` attribute; its content remains visible until the
frontend JavaScript replaces the span with the editable web component.

In a `pti/pti` processor, return the result of `renderField()` in the processed
data and render that value without additional HTML escaping in the selected
template engine.

## Include the frontend assets

The provided `TextFieldRenderer` implementation initializes edit mode and queues
the required assets when `render()` is called. This includes the JavaScript module
`@typo3/visual-editor/Frontend/index`, which maps to
`Resources/Public/JavaScript/Frontend/index.js`, the editor stylesheet, the
inline `window.veInfo` configuration, and rich-text dependencies when needed.

If custom code creates the complete response, it must also call
`PageRenderer::renderJavaScriptAndCss()` and add the returned markup to the
response, as shown above. This emits the import map and starts the frontend
module that processes all `data-ve-custom-element` annotations.

If rendering continues through TYPO3's regular `PAGE` response, return only the
annotated field HTML. TYPO3 renders the collected assets later, so neither
`renderJavaScriptAndCss()` nor `PropagateResponseException` is needed. Do not
register `Frontend/index.js` a second time through `AssetCollector`.

## Supported fields

The renderer supports TCA `input` fields and plain or rich-text `text` fields.
With `$optional = true`, a field that does not exist returns `null`. Otherwise,
missing fields, unsupported field types, and non-string values raise an
exception.
