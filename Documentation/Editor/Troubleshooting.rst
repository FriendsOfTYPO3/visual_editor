:navigation-title: Troubleshooting

..  include:: /Includes.rst.txt

..  _visual-editor-troubleshooting:

=================================
Troubleshooting the Visual Editor
=================================

Start by checking the selected page, language, workspace, and Save state. Then
use the matching problem below.

..  _visual-editor-troubleshooting-text:

Why can I not edit this text?
=============================

Possible reasons:

*   The template does not expose the field for inline editing.
*   The value is generated rather than stored in an editable record field.
*   The field type is not supported for inline editing.
*   The record, language, table, or field is not editable for your account.
*   The output comes from inherited content, a plugin, or another record.
*   A page or record edit lock is active.

Try :guilabel:`Spotlight`. If the text is not recognized, open the surrounding
content element with :guilabel:`Edit content element`. Contact support when the
field is missing there as well.

..  _visual-editor-troubleshooting-image:

Why can I not select this image?
================================

Direct image editing requires project integration and an editable image
relation. Decorative images, background images, plugin output, plain file
objects, or custom markup can remain unselectable.

Open the owning content element through its action bar. When the image does not
belong to that record, ask support where it is maintained.

..  _visual-editor-troubleshooting-add:

Why is there no Add Content button?
===================================

For an empty content area, check whether:

*   the area is truly empty
*   the area is integrated with the Visual Editor
*   new content is permitted in the current language mode
*   your account can create content
*   at least one content type is allowed in the area

For an area that already contains content, use
:guilabel:`Add content element` in an existing element's action bar. That action
inserts the new element before the selected element.

..  _visual-editor-troubleshooting-action-bar:

Why is there no action bar?
===========================

The rendered item might not be a recognized content element, or the current
account might not be allowed to modify it.

Try both pointer hover and keyboard focus. If no bar appears, open
:guilabel:`Content > Layout` temporarily to identify the record, then report the
missing Visual Editor integration to support.

..  _visual-editor-troubleshooting-visibility:

Why is there no visibility toggle?
==================================

The record can lack a visibility field, the field can be excluded from your
permissions, or the record can be read-only.

:guilabel:`Show hidden` cannot add a missing visibility action. It only controls
the preview of records that are already hidden.

..  _visual-editor-troubleshooting-drag:

Why is there no drag handle?
============================

Possible reasons:

*   The element is not a direct child of a recognized content area.
*   The element is a connected translation.
*   The record is not movable for your account.
*   The template wrapping prevents drag-and-drop integration.
*   The element is rendered from inherited or external content.

Use the full content element form or :guilabel:`Content > Layout` only as a
temporary fallback, then contact support.

..  _visual-editor-troubleshooting-drop-target:

Why is there no valid drop target?
==================================

The target can reject the content type, prevent recursive nesting, represent
the current position, or belong to an unsupported content area. Language mode
and permissions can also remove targets.

Release the element outside a drop zone to cancel the move. Choose another
visible target or ask an administrator about the area's content restrictions.

..  _visual-editor-troubleshooting-autosave:

Why is Autosave disabled or missing?
====================================

Autosave is disabled in the Live workspace. Switch to a non-Live workspace
when the project workflow permits it.

When the Workspaces system extension is not active, the Autosave control is not
shown. Continue with manual Save.

See the `TYPO3 Workspaces manual`_ for workspace concepts.

..  _visual-editor-troubleshooting-invalid:

Why can I not save an invalid field?
====================================

The Visual Editor prevents the combined save while at least one pending field
is invalid.

1.  Select the error action in the module header.
2.  Correct the first focused field.
3.  Repeat until no validation errors remain.
4.  Save again.

When the value should be valid, record the displayed validation message and
contact support. The project field configuration can differ from TYPO3's
defaults.

..  _visual-editor-troubleshooting-unsaved:

Why am I asked to save or discard changes?
==========================================

The Visual Editor protects pending changes when another action navigates away,
reloads a preview, or starts a workflow that needs a consistent saved state.

Review the Save button and choose one of the offered actions:

*   stay in the current view
*   discard pending changes
*   save valid changes and continue

Copying a content element has an additional confirmation because it saves all
valid pending Visual Editor changes before the preview reloads.

..  _visual-editor-troubleshooting-cross-origin:

Why does the editor ask me to use another backend origin?
=========================================================

The frontend preview and TYPO3 backend must use a compatible origin so that the
editing frame, dialogs, and saving messages can communicate securely.

Use the button offered by the Visual Editor to open the backend on the correct
origin. In a multi-domain project, you might also need to authenticate on that
domain. Contact support when the redirect repeats or authentication is not
shared.

..  _visual-editor-troubleshooting-save-error:

Why did saving fail?
====================

A failed save can result from:

*   a permission rejected by TYPO3 DataHandler
*   a field or record that changed in the meantime
*   an invalid move, copy, or delete command
*   an expired backend session
*   a server or network error
*   project-specific validation

Record the exact notification, page, language, workspace, and operation. Do not
repeat a destructive action until you know whether the first request succeeded.
Contact the service desk or TYPO3 administrator.

..  _visual-editor-troubleshooting-not-visible:

Why is my saved change not visible on the frontend?
===================================================

Check:

1.  Did the Save button finish without an error?
2.  Are you viewing the same page and language?
3.  Are you in a workspace whose changes are not published to Live?
4.  Is the element hidden or restricted by start time, end time, or frontend
    access?
5.  Is the normal page cache still serving an older result?

Use :guilabel:`Clear cache` for the current page when saving succeeded and the
normal frontend is stale. Ask support before changing access or workspace
settings you do not understand.

..  _visual-editor-troubleshooting-layout-only:

Why does the Layout module offer an action that the Visual Editor does not?
===========================================================================

The Layout module and the Visual Editor render and discover records in
different ways. The Layout module can show records that are inherited, not
rendered, unsupported by inline integration, or outside the visible frontend
output.

Use :guilabel:`Content > Layout` as a temporary workaround. Report the page,
record type, and missing Visual Editor action so that support can check the
project integration.

..  _visual-editor-troubleshooting-support:

What information should I send to support?
==========================================

Include:

*   the page URL or page UID
*   TYPO3 and Visual Editor versions
*   selected language and view mode
*   selected workspace
*   browser and operating system
*   the content element type or record UID, when visible
*   the exact action and expected result
*   the exact notification or validation message
*   a focused screenshot without sensitive data
*   whether the same task works in :guilabel:`Content > Layout`

When the problem is reproducible in the unmodified demo, it can also be
reported in the `Visual Editor issue tracker`_.
