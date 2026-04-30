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

## Installation

1. 📦 `composer require friendsoftypo3/visual-editor` (or install via 🧩 Extension Manager)
2. 🧱 Add `f:render.text`, `f:mark.contentArea` to your templates (see below)
3. 🧹 Clear caches
4. 🚀 Start editing!

### Useful links:

- [ddev demo setup](https://github.com/andersundsehr/ddev-demo-setup-visual-editor) test it locally
- [fluid_styled_content addon](https://github.com/andersundsehr/visual_editor_fluid_styled_content_addon) automatic text editing for fluid_styled_content
- [Example Commit](https://github.com/TYPO3/typo3/commit/b0ee1530107b30ece5475ea890b62b3d8919c609) How to integrate `f:render.text`
- [Example Commit](https://github.com/TYPO3/typo3/commit/a99a339634b7caed123576b6ca2bb49dfb5d8cbf) How to integrate `f:render.contentArea`
- [Slack Channel](https://typo3.slack.com/archives/C0ALHJR23U4) ask questions

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
