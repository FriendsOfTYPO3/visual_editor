# TYPO3 extension `visual_editor`

Next Generation Frontend Editing for TYPO3 CMS.

This extension provides visual editing features for content elements in TYPO3 CMS.

## Features
- ✍️ Inline editing it looks perfectly like the frontend output (WYSIWYG)
- 🧲 Drag-and-drop repositioning of content elements (➕ adding and 🗑️ deleting elements)
- ⚡ Real-time preview of changes without page reloads
- 😊 User-friendly interface for non-technical editors
- ♿ Accessibility-aware editing controls for TYPO3 editors

<https://github.com/user-attachments/assets/a4d2a536-40dd-4df8-a980-0b0362654d24>

## Compatibility

| Visual Editor | TYPO3   | PHP       | Support / Development                |
|---------------|---------|-----------|--------------------------------------|
| 1.x           | 13 - 14 | 8.2 - 8.5 | features, bugfixes, security updates |

## Installation

1. 📦 `composer require friendsoftypo3/visual-editor` (or install via 🧩 Extension Manager)
2. 🧱 Add `f:render.text`, `f:mark.contentArea` to your templates (see below)
3. 🧹 Clear caches
4. 🚀 Start editing!

### Useful links:

- [Try the Demo](https://demo.andersundsehr.com/typo3/module/web/edit?id=1) Try the editor without any setup.
- [ddev local demo setup](https://github.com/andersundsehr/ddev-demo-setup-visual-editor) test it locally
- [fluid_styled_content addon](https://github.com/andersundsehr/visual_editor_fluid_styled_content_addon) automatic text editing for fluid_styled_content
- [Example Commit](https://github.com/TYPO3/typo3/commit/b0ee1530107b30ece5475ea890b62b3d8919c609) How to integrate `f:render.text`
- [Example Commit](https://github.com/TYPO3/typo3/commit/a99a339634b7caed123576b6ca2bb49dfb5d8cbf) How to integrate `f:render.contentArea`
- [Slack Channel](https://typo3.slack.com/archives/C0ALHJR23U4) ask questions

## For editors

- 🔗 **Opening editable links:** when editable text is inside a link, left click starts editing the text. To open the link instead, use the middle mouse button or Ctrl/Cmd + click.
- 💾 **Saving changes:** use the save button. Autosave is available only when enabled, and the UI says to switch to a workspace if autosave is disabled.
- 🔦 **Finding editable areas:** use Spotlight to highlight editable text, rich text, images, and content elements.
- 👻 **Showing empty fields:** use "show empty" when editable but currently empty fields are hard to see.
- 🌐 **Multi language edits:** available with TYPO3 v14. Use the "Multi language" view to compare translations side by side, edit visible fields in each preview, and save pending changes together.
- 🎨 **Changing the appearance:** available with TYPO3 v14. The action bar of a content element has buttons for appearance fields such as the frame or the grid class (see [Appearance fields](#appearance-fields)). Click a button, choose an option, and the element changes immediately. The change is saved with the other changes. A dot in front of a button marks a value that is not saved yet.
- ↔️ **Moving content:** drag content elements by their handle. Hold Ctrl while dropping to copy instead of moving.
- ✍️ **Editing special text characters:** type `&shy;` for a soft hyphen and `&nbsp;` for a non-breaking space. Entity-like text that starts with `&`, such as `&nbsp;`, is shown with `&amp;` while editing so it stays literal text.

## Template Integration

`visual_editor` uses ViewHelpers in Fluid templates to mark the areas that should be editable.
In TYPO3 v14, the extension uses existing ViewHelpers in TYPO3 Core to hook into the rendering.
This means that the extension works out-of-the-box for the new theme "Camino" and also for
the default `fluid_styled_content` templates.

If you want to add visual editing to your own templates, you need to add some ViewHelpers
to all locations that should be editable:

### Text/RichText Fields
Replace the output of your texts with the `f:render.text` ViewHelper.

- record is already a [Record](https://docs.typo3.org/permalink/t3coreapi:record-objects) object:
````html
before:
<f:if condition="{record.header}">
  <h1>{record.header}</h1>
</f:if>

after:
<f:variable name="header" value="{record -> f:render.text(field: 'header')}" />
<f:if condition="{header}">
  <h1>{header}</h1>
</f:if>
````
````html
before:
<h1>{record.header}</h1>

after:
<h1>{record -> f:render.text(field: 'header')}</h1>
````
If you do not have a Record object yet, you can create one with the `record-transformation` [DataProcessors](https://docs.typo3.org/permalink/t3tsref:recordtransformationprocessor):

````ts
// add record dataProcessor for all content elements
lib.contentElement.dataProcessing.1768551979 = record-transformation
````

#### Editable text entities
For plain editable text fields, Visual Editor makes some otherwise hard-to-see characters explicit while the field is focused.
Soft hyphens are shown as `&shy;`, and non-breaking spaces are shown as `&nbsp;`.
Plain ampersands stay visible as `&`, but ampersands that start an entity-like sequence, such as `&nbsp;`, `&#160;`, or `&#xA0;`, are shown as `&amp;` while editing so the sequence stays literal text.
When the editor changes or leaves the field, these values are converted back before validation and storage.

````html
<h1>{record -> f:render.text(field: 'header')}</h1>
````

#### Fluid components
When you use Fluid components, render the editable text outside the component and pass the rendered value into the component.
This keeps the component decoupled from records and TCA fields, and lets callers pass either a plain string or the result of `f:render.text`.

````html
<my:component.card header="{record -> f:render.text(field: 'header')}" />
````

Inside the component, accept the argument as a string or stringable value:

````html
<f:argument name="header" type="string|Stringable" />
````

### ContentArea

#### ViewHelper `f:render.contentArea` (v14)

This newly introduced ViewHelper (v14) is the recommended way to render content areas in the TYPO3 in general.

Short description what you need to change in your templates:

````html
before:
<f:cObject typoscriptObjectPath="lib.dynamicContent" data="{colPos: '3'}"/>

after:
<f:render.contentArea contentArea="{content.main}" />
````

`content.main` here is automatically filled if you use `PAGEVIEW` and a `BackendLayout` with a column with an Identifier named `main`.

More information in the [Official Documentation](https://docs.typo3.org/permalink/t3viewhelper:typo3-fluid-render-contentarea).

> If you can not use the `f:render.contentArea` ViewHelper, you can also use the `f:mark.contentArea` ViewHelper.

#### ViewHelper `f:mark.contentArea` (v13)

> Use `f:render.contentArea` if possible!

Add the `f:mark.contentArea` ViewHelper to the Fluid template that renders your content elements.

search for:
- `f:cObject` (typoscript rendering):
  ````html
  before:
  <f:cObject typoscriptObjectPath="lib.dynamicContent" data="{colPos: '3'}"/>

  after:
  <f:mark.contentArea colPos="3">
    <f:cObject typoscriptObjectPath="lib.dynamicContent" data="{colPos: '3'}"/>
  </f:mark.contentArea>
  ````
- `each="{children_` (EXT:container):
  ````html
  before:
  <f:for each="{children_201}" as="element">
    {element.renderedContent -> f:format.raw()}
  </f:for>

  after:
  <f:mark.contentArea colPos="201" txContainerParent="{record.uid}">
    <f:for each="{children_201}" as="element">
      {element.renderedContent -> f:format.raw()}
    </f:for>
  </f:mark.contentArea>
  ````
- `v:content.render` (EXT:vhs):
  ````html
  before:
  <v:content.render column="0"/>

  after:
  <f:mark.contentArea colPos="0">
    <v:content.render column="0"/>
  </f:mark.contentArea>
  ````
- `flux:content.render` (EXT:flux):
  ````html
  before:
  <flux:content.render area="column0"/>

  after:
  <f:mark.contentArea colPos="{data.uid}00">
    <flux:content.render area="column0"/>
  </f:mark.contentArea>
  ````

## Appearance fields

*TYPO3 v14 only.* The action bar of a content element offers select fields of the record as buttons, for example the frame class. A click opens the options like the select in the edit form of the backend. A change is shown immediately and is saved with the other changes.

By default these fields of `tt_content` are offered: `frame_class`, `space_before_class`, `space_after_class`.

You can add fields, or remove a default by prefixing it with `-`, in the page TSconfig:

````typoscript
mod.web_edit.appearanceFields.tt_content = grid_class, grid_class_position, -space_before_class
````

A field is offered only if:

- it is a single select field without `foreign_table` (the items may still come from an `itemsProcFunc`) and is shown in the edit form for the CType of the element,
- the editor may edit it (access to the field, language and table),
- it is not hidden in the edit form with `TCEFORM.tt_content.<field>.disabled = 1` (also per type with `types.<CType>.disabled`),
- it is not excluded from the translation (`l10n_mode = exclude`) when the element is a translation.

The options are the ones of the edit form: `itemsProcFunc` is called with the unsaved values of the record, `removeItems`, `keepItems` and `addItems` of `TCEFORM` are applied, and a value that is no longer allowed after a change of another field is reset.

### How the immediate change works

While the editor changes a value, the frontend page is rendered again with the unsaved values (a `POST` request with `veDraft[<table>][<uid>][<field>]` to the URL of the page). The values only exist for this request, nothing is saved. Only fields from the configuration above with values that are items of the field are accepted, and only for a backend user in edit mode.

Then the `class` attributes of the content element and of its direct child elements are taken over from the response. All other attributes and all texts stay as they are, so unsaved text changes are not lost. If your template does not put the classes there, the change is visible after saving.

Fields that are excluded from the translation are changed in the translations of a multi language view as well.

## PSR-14 events

### `ModifyNewContentElementWizardUrlParameterEvent`

This event allows extensions to modify the URL parameters used to open the new content element wizard. It provides the current parameters, the route arguments used to render the frontend page, and the current request.

For example, a listener can pass a frontend route argument to the wizard:

````php
<?php

namespace Vendor\MyExtension\EventListener;

use TYPO3\CMS\Core\Attribute\AsEventListener;
use TYPO3\CMS\VisualEditor\Events\ModifyNewContentElementWizardUrlParameterEvent;

#[AsEventListener]
final class ModifyNewContentElementWizardUrlParameterEventListener
{
    public function __invoke(ModifyNewContentElementWizardUrlParameterEvent $event): void
    {
        $context = $event->getUsedArguments()['tx_myextension']['context'] ?? null;
        if ($context === null) {
            return;
        }

        $parameters = $event->getParameters();
        $parameters['myExtensionContext'] = $context;
        $event->setParameters($parameters);
    }
}
````

The additional parameter is then available from the request of TYPO3 Core's `ModifyNewContentElementWizardItemsEvent`, where it can be used, for example, to adjust the `defaultValues` of wizard items.

## Known limitations

- Wrapped content elements rendered with `f:render.contentArea` and `recordAs` are not currently supported for drag-and-drop. In this setup, drag handles may disappear. Move the wrapping markup into the content element rendering instead of wrapping elements at the `contentArea` level.
- Headless and non-Fluid setups are not first-class integration targets. Visual Editor relies heavily on Fluid ViewHelpers that wrap output in web components and load the required JavaScript, so robust headless integration would need a public API.
- Cross-domain headless setups are further limited because backend-module frame messaging does not work reliably across domains due to TYPO3 core limitations. General multi-domain setups are effectively excluded for this approach.

## Multi Site/Domain Setup

You need to be Logged in to every Domain separately to use the Visual Editor.

OR you can use [EXT:multisite_belogin](https://extensions.typo3.org/extension/multisite_belogin) it automatically logs you in to all sites/domains.

## Rich Text Styling

Visual Editor uses your regular frontend CSS for the editing view. CSS that is configured only in the TYPO3 RTE configuration (`contentsCss`) is not applied there.

If your project defines custom rich-text styles, add the relevant rules to your frontend CSS so the page output and the editor share the same styling. Projects with custom `lib.parseFunc_RTE` setups may also need matching frontend rules.

## Accessibility

Visual Editor is designed with WCAG 2.2 AA as a goal, but this is not a full compliance claim for every TYPO3 project.

The editor interface includes accessible labels, keyboard-focusable controls, validation announcements, and semantic roles. It has been tested with axe DevTools and NVDA.

Final accessibility depends on the project templates, CSS, semantic HTML, and editor-authored content. Drag-and-drop workflows are pointer-oriented, so projects should verify alternative workflows for their editor needs. Project-level accessibility should be checked in the integrated TYPO3 site.

## License and Authors: License type, contributors, contact information

This extension is licensed under the [GPL-2.0-or-later](https://spdx.org/licenses/GPL-2.0-or-later.html) license.

# with ♥️ from ![anders und sehr logo](https://www.andersundsehr.com/logo-claim/anders-und-sehr-logo_350px.svg)

> If something did not work 😮  
> or you appreciate this Extension 🥰 let us know.

> We are always looking for great people to join our team!  
> https://www.andersundsehr.com/karriere/
