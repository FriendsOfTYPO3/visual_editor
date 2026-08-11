:navigation-title: Languages

..  include:: /Includes.rst.txt

..  _visual-editor-languages:

=======================================
Editing pages in more than one language
=======================================

TYPO3 14 can display one language or compare several languages side by side in
the Visual Editor.

..  note::

    **TYPO3 13:** TYPO3 13 supports selecting an existing language but does
    not provide the TYPO3 14 Multi language view described on this page.

..  _visual-editor-languages-select:

Select languages
================

Use the language selector in the module header. Available languages depend on:

*   the languages configured for the site
*   existing translations of the selected page
*   the backend user's language access
*   the selected view mode

When a page translation does not yet exist, create it through the TYPO3
translation workflow before editing it in the Visual Editor.

For the complete TYPO3 workflow, see `TYPO3 languages`_.

..  _visual-editor-languages-single:

Single language view
====================

:guilabel:`Single language` displays one language in the main editing frame.
Use this view when you are working on one language and want the full available
width.

Page-level controls such as :guilabel:`View webpage` and
:guilabel:`Edit page properties` appear in the main module header when the page
and permissions support them.

..  _visual-editor-languages-multi:

Multi language view
===================

:guilabel:`Multi language` displays the default language and selected
translations side by side.

Use it to:

*   compare wording and structure
*   edit visible fields in more than one language
*   find missing translations
*   review changes before saving

Page-level actions can appear above each language preview. The language title
and flag identify the preview to which an action applies.

The Save button aggregates valid pending changes from all displayed language
previews and persists them together.

..  warning::

    Before saving, review every visible language. One Save action can persist
    pending changes from several language previews.

..  _visual-editor-languages-translation-action:

Translate missing content
=========================

TYPO3 14 can show a translation action above a language preview when content
from the source language has not yet been translated.

The translation wizard can offer two strategies:

:guilabel:`Translate`
    Creates connected translations.

:guilabel:`Copy`
    Creates independent records in free mode.

Which choices are available depends on the project configuration and user
permissions.

..  _visual-editor-languages-connected-free:

Connected content and free content
==================================

Connected content
    A translated record keeps a relationship with its source record. Structural
    properties such as position follow the source workflow. The translated
    element therefore cannot be moved independently in the Visual Editor.

Free content
    The translated record is independent. It can be positioned separately and
    can differ structurally from the default language.

Mixed content
    A page can contain both strategies when the project permits inconsistent
    language handling. The available Visual Editor actions can then differ from
    one element to the next.

When a translated page uses connected content, creating unrelated new content
can also be disabled to preserve a consistent translation structure.

For the complete conceptual explanation, see `TYPO3 localized content`_.

..  _visual-editor-languages-visibility:

Visibility in translated pages
==============================

Visibility is stored per record according to TYPO3's localization rules. Keep
these distinctions in mind:

*   :guilabel:`Show hidden` changes only the editing preview.
*   The action bar visibility toggle changes the selected translated record
    when that field is editable.
*   Page visibility is changed in the corresponding language's page
    properties.
*   Workspace preview can show records that are not published in Live.

..  _visual-editor-languages-restrictions:

Why an action can differ between languages
==========================================

An action shown in one language can be missing in another because of:

*   missing page translation
*   backend user language access
*   connected instead of free content
*   missing translated content
*   content-area restrictions
*   field or record permissions
*   a page or record edit lock

Use :ref:`visual-editor-troubleshooting` when the reason is not clear.
