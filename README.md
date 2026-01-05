# TYPO3 extension `visual_editor`

Next Generation Frontend Editing for TYPO3 CMS.

This extension provides visual editing features for content elements in TYPO3 CMS.

## Features
- Inline editing It looks perfectly like the frontend output (WYSIWYG)
- Drag-and-drop repositioning of content elements (adding and deleting elements)
- Real-time preview of changes without page reloads
- User-friendly interface for non-technical editors

TODO put gifs here

## Installation

1. `composer require friendsoftypo3/visual-editor` (or install via Extension Manager)
2. add the SiteSet to your site configuration
3. Add `f:render.input`, `f:render.rte`, `f:render.dropArea` to your templates (see below)
4. Clear caches
5. Start editing!

## Where to add the ViewHelpers

### Input/Rte Fields
Replace the output of your texts with the `f:render.input`/`f:render.richText` ViewHelper.
Replace the output of your texts with the `f:render.text`/`f:render.richText` ViewHelper.

- record is already a [Record](https://docs.typo3.org/permalink/t3coreapi:record-objects) object:
````html
before:
<h1>{record.header}</h1>

after:
<h1><f:render.input record="{record}" field="header" /></h1>
````
- data is an array of the complete database row:
````html
before:
<h1>{data.header}</h1>

after:
<h1><f:render.input record="{f:record.fromArray(data: data, table: 'tt_content')}" field="header" /></h1>
````
- you only have the uid and the string you want to output:
````html
before:
<h1>{header}</h1>

after:
<h1><f:render.input record="{f:record.fromUid(uid: uid, table: 'tt_content')}" field="header" /></h1>
````  

### Drop Area
Add the `f:render.dropArea` ViewHelper to the container element that holds your content elements.

search for:
- `v:content.render`:
  ````html
  before:
  <v:content.render column="0"/>
  
  after:
  <f:render.dropArea colPos="0">
    <v:content.render column="0"/>
  </f:render.dropArea>
  ````
- `flux:content.render`:
  ````html
  before:
  <flux:content.render area="column0"/>
  
  after:
  <f:render.dropArea colPos="{data.uid}00">
    <flux:content.render area="column0"/>
  </f:render.dropArea>
  ````
- `f:cObject`:
  ````html
  before:
  <f:cObject typoscriptObjectPath="lib.dynamicContent" data="{pageUid: '{data.uid}', colPos: '3'}"/>
  
  after:
  <f:render.dropArea colPos="3">
    <f:cObject typoscriptObjectPath="lib.dynamicContent" data="{pageUid: '{data.uid}', colPos: '3'}"/>
  </f:render.dropArea>
  ````
- TODO example for EXT:container
- TODO example for EXT:gridelements
- TODO example for EXT:mask
- TODO example for CONTENT TypoScript object?

## License and Authors: License type, contributors, contact information

This extension is licensed under the [GPL-2.0-or-later](https://spdx.org/licenses/GPL-2.0-or-later.html) license.

# with ♥️ from anders und sehr GmbH

> If something did not work 😮  
> or you appreciate this Extension 🥰 let us know.

> We are always looking for great people to join our team!
> https://www.andersundsehr.com/karriere/
