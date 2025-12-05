# EXT:intuitive_editing

Next Generation Frontend Editing for TYPO3 CMS

This extension provides intuitive editing features for content elements in TYPO3 CMS.

## Features
- Inline editing It looks perfectly like the frontend output (WYSIWYG)
- Drag-and-drop repositioning of content elements
- Real-time preview of changes without page reloads
- User-friendly interface for non-technical editors

TODO put screenshots here

## Installation

1. `composer require andersundsehr/intuitive_editing` (or install via Extension Manager)
2. add the SiteSet to your site configuration
3. Add `e:input`, `e:rte`, `e:dropArea` to your templates (see below)
4. Clear caches
5. Start editing!

## Where to add the ViewHelpers

### Input/Rte Fields
Replace the output of your texts with the `e:input`/`e:rte` ViewHelper.

- record is already a [Record](https://docs.typo3.org/permalink/t3coreapi:record-objects) object:
````html
before:
<h1>{record.header}</h1>

after:
<h1><e:input record="{record}" field="header" /></h1>
````
- data is an array of the complete database row:
````html
before:
<h1>{data.header}</h1>

after:
<h1><e:input record="{e:record.fromArray(data: data, table: 'tt_content')}" field="header" /></h1>
````
- you only have the uid and the string you want to output:
````html
before:
<h1>{header}</h1>

after:
<h1><e:input record="{e:record.fromUid(uid: uid, table: 'tt_content')}" field="header" /></h1>
````  

### Drop Area
Add the `e:dropArea` ViewHelper to the container element that holds your content elements.

search for:
- `v:content.render`:
  ````html
  before:
  <v:content.render column="0"/>
  
  after:
  <e:dropArea colPos="0">
    <v:content.render column="0"/>
  </e:dropArea>
  ````
- `flux:content.render`:
  ````html
  before:
  <v:content.render column="0"/>
  
  after:
  <e:dropArea colPos="{data.uid}00">
    <flux:content.render area="column0"/>
  </e:dropArea>
  ````
- `f:cObject`:
  ````html
  before:
  <f:cObject typoscriptObjectPath="lib.dynamicContent" data="{pageUid: '{data.uid}', colPos: '3'}"/>
  
  after:
  <e:dropArea colPos="3">
    <f:cObject typoscriptObjectPath="lib.dynamicContent" data="{pageUid: '{data.uid}', colPos: '3'}"/>
  </e:dropArea>
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
