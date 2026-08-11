:navigation-title: Toolbar

..  include:: /Includes.rst.txt

..  _visual-editor-toolbar:

===============================
Visual Editor toolbar reference
===============================

The module header contains controls for saving, finding editing targets,
changing the preview, and opening page-level actions. A control can be absent
or disabled when the current page, TYPO3 version, language view, workspace, or
permissions do not support it.

..  _visual-editor-toolbar-save:

Save
====

:guilabel:`Save` persists all valid pending Visual Editor changes shown in the
current module. These can include:

*   text and rich-text changes
*   inline field changes
*   visibility changes
*   queued deletions
*   queued moves
*   page field changes made inline

The label changes with the current state:

No pending changes
    The control is disabled.

One or more pending changes
    The label reports the number of changes.

Invalid fields
    The control reports one or more errors. Selecting it focuses the first
    invalid field instead of saving.

Saving
    The control indicates that saving is in progress.

Save is the recommended default workflow, even when Autosave is available.

..  _visual-editor-toolbar-autosave:

Autosave
========

:guilabel:`autosave` automatically invokes Save when valid pending changes are
available.

Autosave is available only when:

*   the Workspaces system extension is active, and
*   the current backend user is working in a non-Live workspace

In the Live workspace, the control is disabled. When Workspaces is not active,
the control is not shown. The browser remembers the selected Autosave state.

Autosave does not save invalid fields and does not replace a project's review
or publishing workflow.

..  _visual-editor-toolbar-spotlight:

Spotlight
=========

:guilabel:`Spotlight` dims the page and emphasizes recognized editing targets.
The current integration can include:

*   editable plain text
*   editable rich text
*   rich-text controls
*   integrated editable images

The exact result depends heavily on the project templates, field
configuration, rendered records, and user permissions. Spotlight is a discovery
aid. It is not a complete inventory of every record that could be edited
through a TYPO3 form.

..  _visual-editor-toolbar-show-empty:

Show empty
==========

:guilabel:`Show empty` reveals inline-editable fields whose current value is
empty. The browser remembers the selected state.

Use it when a field is configured for inline editing but has no visible content
to select.

:guilabel:`Show empty` does not:

*   reveal empty content areas
*   control the Add Content button
*   create a new field
*   change or save a value

..  _visual-editor-toolbar-show-hidden:

Show hidden
===========

:guilabel:`Show hidden` controls whether hidden content elements remain visible
inside the editing preview. The browser remembers the selected state and shows
hidden content by default in a new browser profile.

When shown, hidden elements use a distinct overlay. Turning
:guilabel:`Show hidden` off removes them from the editing preview but does not
change their stored visibility.

Use the action bar's visibility toggle to actually hide or unhide a content
element.

..  _visual-editor-toolbar-view-webpage:

View webpage
============

:guilabel:`View webpage` opens the page through TYPO3's preview handling. The
same action is sometimes described as *Show Page*. It can
be unavailable when the current page cannot be previewed or represents a record
scheduled for deletion.

Use it to check the result outside the editing frame. The displayed result can
still include workspace preview information, hidden content, or access tokens,
depending on the current TYPO3 context.

..  _visual-editor-toolbar-edit-page-properties:

Edit page properties
====================

:guilabel:`Edit page properties` opens the page record in a contextual editing
dialog in TYPO3 14.

The control is shown only when:

*   one language is displayed in the main editing frame, and
*   the backend user can edit the page record and selected language

In Multi language view, page-level actions can appear above each language
preview instead of in the main toolbar.

See `TYPO3 page properties`_ for a full field reference.

..  _visual-editor-toolbar-clear-cache:

Clear cache
===========

:guilabel:`Clear cache` clears the cache for the current page. Use it when a
saved change does not appear in a normal frontend request although saving
succeeded.

Do not use it as a replacement for Save. Clearing the cache does not persist
pending changes.

..  _visual-editor-toolbar-shortcut:

Shortcut
========

TYPO3 14 provides the standard backend shortcut control. Use it to add the
current page and Visual Editor module state to your TYPO3 shortcuts.

Shortcut availability follows TYPO3's backend configuration and user
permissions.

..  _visual-editor-toolbar-reload:

Reload
======

..  note::

    **TYPO3 13 only:** TYPO3 13 shows a :guilabel:`Reload` control where
    TYPO3 14 uses newer module header behavior and the standard shortcut
    context.

Reload refreshes the Visual Editor module. Pending changes invoke the
unsaved-changes protection. Review the dialog carefully before discarding or
saving changes.

..  _visual-editor-toolbar-language-selector:

Language selector
=================

The language selector chooses the site language or languages displayed in the
Visual Editor. Its available entries depend on:

*   site language configuration
*   existing page translations
*   backend user language access
*   Single language or Multi language view

See :ref:`visual-editor-languages`.

..  _visual-editor-toolbar-view-mode:

Single language and Multi language view
=======================================

..  note::

    **TYPO3 13:** Multi language view is not available in TYPO3 13.

:guilabel:`Single language`
    Displays one language in the main editing frame.

:guilabel:`Multi language`
    Displays the default language and selected translations side by side.
    Pending valid changes from all displayed previews are saved together.

The Multi language option appears only when the page has translations.
