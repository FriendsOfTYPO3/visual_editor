:navigation-title: Action bar

..  include:: /Includes.rst.txt

..  _visual-editor-action-bar:

====================================
Content element action bar reference
====================================

The content element action bar provides record-level actions directly above a
rendered content element.

..  _visual-editor-action-bar-find:

Find the action bar
===================

With a pointer
    Move the pointer over the content element.

With a keyboard
    Move focus into the content element or one of its controls.

With touch input
    Behavior depends on the browser and project. A desktop browser is
    recommended for workflows that use hover or drag-and-drop.

The action bar is not displayed when the rendered content is not integrated as
a Visual Editor content element or when the current user cannot modify the
record.

The bar can show the content type and, when enabled by TYPO3 user settings, the
record UID.

..  _visual-editor-action-bar-drag:

Drag handle
===========

Use the drag handle to move or copy the content element.

The handle is active only when:

*   the content element is inside a recognized content area
*   the record can be moved
*   the language mode permits an independent move
*   the user has the required TYPO3 permissions

Connected translations are not independently movable. Use
:ref:`visual-editor-languages-connected-free` to understand the difference.

Move
----

1.  Drag the element by its handle.
2.  Read the available drop-zone labels.
3.  Release the element on a valid target.
4.  Save the pending move.

Copy
----

1.  Start dragging the element.
2.  Hold :kbd:`Ctrl` while dropping it on a valid target.
3.  Confirm the copy operation.

On macOS, use the :kbd:`Control` key for this workflow.

..  warning::

    Copying immediately saves the copy and all other valid pending Visual
    Editor changes. The preview reloads afterwards.

..  _visual-editor-action-bar-edit:

Edit content element
====================

:guilabel:`Edit content element` opens the complete record form. TYPO3 14 uses a
contextual dialog over the current page.

Use it for:

*   fields that are not inline editable
*   image fields when direct image selection is unavailable
*   appearance and layout options
*   access settings
*   project-specific fields

The available tabs and fields depend on the content type, project
configuration, language, and permissions. Save or reset unrelated inline
changes before opening the form when you want to avoid a decision about
pending changes.

..  _visual-editor-action-bar-visibility:

Visibility toggle
=================

The visibility control hides a visible element or unhides a hidden element.
The change is pending until Save or Autosave persists it.

The control can be absent when:

*   the record type has no visibility field
*   the field is excluded from the user's permissions
*   the record cannot be modified

This control is different from :guilabel:`Show hidden`, which changes only the
editing preview.

..  _visual-editor-action-bar-delete:

Delete content element
======================

:guilabel:`Delete content element` queues a delete command and immediately
removes the element from the current preview. Select :guilabel:`Save` to persist
the deletion.

..  warning::

    The action can run without a dedicated delete confirmation. Check the
    selected element before saving. When the deletion is still pending, leave
    the view and choose to discard pending changes to restore the saved state.

With Autosave enabled, a valid queued deletion can be saved automatically.

..  _visual-editor-action-bar-add:

Add content element
===================

:guilabel:`Add content element` opens the New Content Element Wizard and inserts
the new record **before** the element whose action bar you used.

The action appears only when new content is permitted for the current page and
language.

This action is different from the large Add Content button in an empty content
area. The empty-area button creates the first element in that area.

..  _visual-editor-action-bar-restrictions:

Valid targets and content restrictions
======================================

During drag-and-drop, the Visual Editor displays only valid drop zones. A
possible target can be suppressed when:

*   the content type is not allowed in that content area
*   the content type is explicitly disallowed
*   the element would be nested inside itself
*   the target is equivalent to its current position
*   a container or nested-area rule rejects it
*   the translation is connected to a source element
*   permissions do not allow the operation
*   the target area is not integrated with the Visual Editor

TYPO3 14 can define allowed and disallowed content types directly for backend
layout content areas. TYPO3 13 projects commonly use project-specific rules or
extensions such as Content Defender.

See :ref:`visual-editor-permissions-restrictions` for more information.
