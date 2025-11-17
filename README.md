# Layout & Content Fusion

# TODOS:

Questions at Core Team:
- l10n_source as language select in TCA for the record.
  - allowLanguageSynchronization also in default language if l10n_source is set to other language?
- JS API for Link, Image, etc. for use in Frontend.
- How to handle Relations (TCA type "group")?
  - generate tca field for each table automatically?
- How to handle things like maxitems (config from ViewHelper into FormEngine TCA/DataHandler)?
- Besserer Typescript support für Extension entwickler!


- [ ] ignore hidden, start and endtime for editable and template_brick in edit mode for Record API
  - or remove the function from the tables
    - we could add a hideInLanguage option to editable

Improvements for UX:
- [ ] link
  - [ ] allow language synchronization in edit mode
  - [ ] show open target page in new tab button
    - [ ] if t3:// link open linked element in edit view (in new tab)
    - [ ] if external link open in new tab
- [ ] checkbox
  - [ ] save changes
  - [ ] allow langauge synchronization
- [ ] image
  - [ ] allow language synchronization
  - [ ] make the complete image the edit button
    - [ ] add a hover effect to indicate editability
  - nice to have (better UX):
    - [ ] inline alt text editing
    - [ ] inline title text editing
    - [ ] inline description editing ?? how is this shown?
    - [ ] drag and drop (upload) to change image
- [x] text
  - [x] reset changes button (revert to last saved version)

features:
- [ ] blocks
    - [ ] handle blocks like bricks? or with named indexes? => probably like bricks
    - [ ] how to handle Language synchronization?

- [ ] bricks/content elements
  - [ ] allow nesting of template bricks
  - [ ] how to handle Language synchronization?

- [ ] support arbitrary records in editable viewHelpers.
    - `<e:editable.input record="{page}" field="nav_title" />`
    - `<e:editable.input record="{product}" field="teaserText" />`

- [ ] snippets ? 
  - https://docs.pimcore.com/platform/Pimcore/Documents/Editables/Snippet
- [ ] scheduled blocks ? 
  - https://docs.pimcore.com/platform/Pimcore/Documents/Editables/Scheduled_Block
  - or is this something for the start- and end-time?

- [ ] make it possible to add custom editables

considerations:
- [ ] full workspaces support => hopefully yes
- [ ] permissions handling only per Document/Page? => probably yes
- [ ] migration tool from tt_content to template bricks?
- [ ] cache handling:
  - [ ] send response header to prevent caching of editable content in frontend?
  - [ ] Disable typo3 cache so no editable are saved to pages cache?

new editables:
- [ ] number
- [ ] email? (input with specific validation)
- [ ] uuid? (input with specific validation)
- [ ] slug? (should be similar to input, but with slug validation, unique check?)
- [ ] json? (would show a nice json editor)
- [ ] code? (would show a nice code editor) (html,css,javascript,...)
- [ ] textarea (multi-line text)
- [ ] rich text editor
- [ ] date picker
- [ ] file single/multi
- [ ] folder?
- [ ] select / dropdown
- [ ] multi-select
- [ ] radio buttons
- [ ] color picker
- [ ] Category?
- [ ] Country?
- [ ] relation (select related record from other tables) (single/multi?)
  - using TCA type group?
- [ ] video
- [ ] password??? no use case here?


## Commands that would be useful:
- remove area from template:
  - `typo3 editara:removeArea TemplateABC xyz`
  - if you removed an e:area name=xyz from Template ABC you need to remove all the necessary template_bricks from the DB
- remove editable from template:
  - `typo3 editara:removeEditable TemplateABC editableName`
- convert editable type:
  - `typo3 editara:convertEditable TemplateABC editableName newType`
  - e.g. convert an input editable to a rte editable
