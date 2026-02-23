# TYPO3 extension `visual_editor`

Next Generation Frontend Editing for TYPO3 CMS.

This extension provides visual editing features for content elements in TYPO3 CMS.

## Features
- ✍️ Inline editing it looks perfectly like the frontend output (WYSIWYG)
- 🧲 Drag-and-drop repositioning of content elements (➕ adding and 🗑️ deleting elements)
- ⚡ Real-time preview of changes without page reloads
- 😊 User-friendly interface for non-technical editors

TODO put gifs here

## Installation

1. 📦 `composer require friendsoftypo3/visual-editor` (or install via 🧩 Extension Manager)
2. 🧱 Add `f:render.text`, `f:mark.contentArea` to your templates (see below)
3. 🧹 Clear caches
4. 🚀 Start editing!

### Useful links:

- [ddev demo setup](https://github.com/andersundsehr/ddev-demo-setup-visual-editor) (test it locally)
- [fluid_styled_content addon](https://github.com/andersundsehr/visual_editor_fluid_styled_content_addon) (automatic text editing for fluid_styled_content)

## Where to add the ViewHelpers

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
If you do not have a Record object yet, there are two options:  
Add it via [DataProcessors](https://docs.typo3.org/permalink/t3tsref:recordtransformationprocessor):

````ts
// add record dataProcessor for all content elements
lib.contentElement.dataProcessing.1768551979 = record-transformation
````

### ContentArea
Add the `f:mark.contentArea` ViewHelper to the container element that holds your content elements.

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

## License and Authors: License type, contributors, contact information

This extension is licensed under the [GPL-2.0-or-later](https://spdx.org/licenses/GPL-2.0-or-later.html) license.

# with ♥️ from ![anders und sehr logo](https://www.andersundsehr.com/logo-claim/anders-und-sehr-logo_350px.svg)

> If something did not work 😮  
> or you appreciate this Extension 🥰 let us know.

> We are always looking for great people to join our team!  
> https://www.andersundsehr.com/karriere/
