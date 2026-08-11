:navigation-title: Getting started

..  include:: /Includes.rst.txt

..  _visual-editor-getting-started:

======================================
Getting started with the Visual Editor
======================================

In this tutorial you update wording and content on the default Camino home
page. The exercise introduces all important Visual Editor workflows. The main
path takes about 15 to 30 minutes. Reading every explanation and reference can
take up to one hour.

..  _visual-editor-getting-started-goal:

What you will learn
===================

After completing the tutorial, you can:

*   find editable text, rich text, and images
*   distinguish inline editing from content element settings
*   save pending changes and reset one field
*   recognize and correct a validation error
*   reveal empty fields and hidden content
*   add, edit, hide, unhide, and delete content elements
*   move and copy content by drag-and-drop
*   recognize content restrictions and permission limits
*   use the module toolbar
*   understand when Autosave is available
*   find the separate language workflow

..  _visual-editor-getting-started-before:

Before you start
================

You need:

*   the backend URL of the TYPO3 installation
*   a backend account that can access the Camino site
*   access to :guilabel:`Content > Edit`
*   permission to change the training page
*   a desktop browser with JavaScript and cookies enabled

The public demo can be used for this exercise when a demo account is
available:

`https://demo.andersundsehr.com/typo3/module/web/edit?id=1 <https://demo.andersundsehr.com/typo3/module/web/edit?id=1>`_

For general login help, see `TYPO3 backend login`_.


..  figure:: /_Images/Editor/ContentEditOverview.png
    :alt: TYPO3 Content Edit module displaying the Camino home page in the\n        Visual Editor.
    :class: with-shadow
    :zoom: lightbox

    The Camino home page opened in :guilabel:`Content > Edit`.

..  warning::

    Use a training page or workspace when possible. The tutorial includes
    hiding, deleting, moving, and copying content. Review the Save button before
    you persist these changes.

..  _visual-editor-getting-started-open:

Log in and open the Camino home page
====================================

1.  Open the TYPO3 backend URL in your browser.
2.  Enter your username and password.
3.  Select :guilabel:`Login`.
4.  In the module menu, open :guilabel:`Content > Edit`.
5.  In the page tree, select the Camino home page used for the exercise.
6.  Wait until the rendered page appears in the editing frame.

You are now viewing the frontend page inside the TYPO3 backend. The page looks
close to what visitors see, but integrated editing controls are available.

..  note::

    **TYPO3 13:** In TYPO3 13, the module is located below
    :guilabel:`Web` instead of :guilabel:`Content`. Some dialogs and header
    controls also differ.

..  Maintainer note:
    Add one desktop screenshot that shows Content > Edit, the page tree, the
    Camino page, and the document header. Suggested file:
    /_Images/Editor/ContentEditOverview.png

..  _visual-editor-getting-started-spotlight:

Find editing targets with Spotlight
===================================

1.  Select :guilabel:`Spotlight` in the module header.
2.  Observe which parts of the Camino page remain emphasized.
3.  Select :guilabel:`Spotlight` again to leave Spotlight mode.

Spotlight dims the page and emphasizes editing targets recognized by the
current project. These can include plain text, rich text, rich-text controls,
and integrated editable images.

Spotlight does not make a field editable. What can be edited depends on:

*   the project templates
*   the TYPO3 field configuration
*   how an image is rendered
*   the selected language
*   your permissions

A visible heading, paragraph, or image can therefore remain unchanged by
Spotlight and still be part of the page design.

..  _visual-editor-getting-started-plain-text:

Edit plain text and save it
===========================

1.  Select the editable Camino hero heading
    :guilabel:`Walk the Camino de Compostela`.
2.  Place the text cursor in the heading.
3.  Change it to:

    ..  code-block:: text

        Walk the Camino de Compostela with confidence

4.  Move focus out of the field.
5.  Look at the :guilabel:`Save` button in the module header.

The Save button now reports one or more pending changes. Changed fields are
also visually marked in the page.

6.  Select :guilabel:`Save`.
7.  Wait until saving has finished and the pending-change count disappears.

Manual Save is the primary workflow. Learn it before enabling Autosave.

..  _visual-editor-getting-started-reset:

Reset one pending field
=======================

1.  Change the same heading again.
2.  Do not save yet.
3.  Select the reset control that appears next to the changed field.

The field returns to its last saved value. Other pending changes are not reset.

..  tip::

    Reset is useful when you have changed several fields but want to discard
    only one of them.

..  _visual-editor-getting-started-rich-text:

Edit rich text
==============

1.  Find :guilabel:`What Is the Camino de Compostela?` or another Camino
    section with an editable rich-text paragraph.
2.  Select the paragraph and improve one sentence without changing its meaning.
3.  Select part of the text.
4.  Apply one basic format available in the rich-text toolbar, for example
    bold text or a link.
5.  Save the changes.

The available formats depend on the rich-text configuration of the project.
Visual Editor uses the page's frontend styles while editing. A project can
therefore look different from TYPO3's standalone rich-text form.

For detailed rich-text concepts, continue in the
`TYPO3 rich-text editor`_ chapter.

..  _visual-editor-getting-started-paste:

Paste text
==========

Text copied from a word processor or another website can contain formatting
that does not belong in the current project.

*   Prefer plain-text paste when you do not need the original formatting.
*   Apply headings, lists, links, and emphasis with the project's rich-text
    toolbar after pasting.
*   Review pasted links and remove formatting that is not available in the
    toolbar.
*   Check the field for validation messages before saving.

In a plain-text field, pasted line breaks and characters are handled according
to the TYPO3 field configuration. In a rich-text field, the project's
rich-text configuration determines which markup is retained.

..  _visual-editor-getting-started-linked-text:

Edit text inside a link
=======================

Some projects place an editable text field inside a link. A normal selection
of such a field starts text editing instead of following the link.

To open the link without editing its text:

*   use the middle mouse button, or
*   hold :kbd:`Ctrl` on Windows or Linux, or :kbd:`Cmd` on macOS, while
    selecting the link

The exact browser behavior can differ when a project intercepts links with
custom JavaScript.

..  _visual-editor-getting-started-special-characters:

Enter special text characters
=============================

Plain editable text makes some otherwise invisible characters explicit while
the field has focus:

``&shy;``
    Represents a soft hyphen.

``&nbsp;``
    Represents a non-breaking space.

Entity-like text that begins with ``&`` can temporarily be displayed with an
escaped ampersand while editing. The Visual Editor converts the value back
before validation and storage.

Use these characters only when they are needed for the content. Do not use
repeated non-breaking spaces for visual layout.

..  _visual-editor-getting-started-images:

Edit an image
=============

1.  Turn on :guilabel:`Spotlight` and select the large image in the Camino
    hero, or another image that Spotlight identifies.
2.  Wait for the contextual editing dialog to open.
3.  Review the available image field and its image relations.
4.  Depending on the field, replace, add, remove, crop, or describe an image.
5.  Save and close the dialog, or close it without saving.

Selecting an integrated image opens the image options of the record that owns
it. A field can contain more than one image, so the dialog can show several
image relations.

..  important::

    Not every visible image can be edited by selecting it. Direct image editing
    depends on project integration, the source record, and your permissions.
    When an image is not selectable, open its content element with
    :guilabel:`Edit content element` and edit the image field there.

An image can also come from page properties, a plugin, another record, or
custom rendering. In that case the content element dialog might not contain
that image. For the complete TYPO3 image workflow, see
`TYPO3 image editing`_.

..  _visual-editor-getting-started-empty-area:

Add content to an empty content area
====================================

This exercise requires a Camino training page with an empty integrated
content area, for example an empty :guilabel:`Sidebar`.

1.  Select the training page in the page tree.
2.  Find a control such as :guilabel:`Create new Content in Sidebar`.
3.  Select the control to open the New Content Element Wizard.
4.  Choose :guilabel:`Author card`.
5.  Enter these example values:

    :guilabel:`Name`
        ``Camino Editorial Team``

    :guilabel:`Description`
        ``Practical guidance for planning and walking the route.``

6.  Leave :guilabel:`Position / Title of the person` empty.
7.  Save and close the content element form.
8.  Confirm that the Author card appears in the content area.

Creating a content element is handled by its TYPO3 form and is separate from
the Visual Editor's pending inline-change queue.

..  note::

    The large Add Content control appears only in an empty, integrated content
    area where the current language and permissions allow new content. When no
    empty area is available, use a private training copy of a Camino page.

..  Editorial note:
    Before publishing screenshots, prepare a Camino page with an empty
    integrated content area and replace the generic training-page wording with
    the exact page and content-area labels.

..  _visual-editor-getting-started-empty-fields:

Reveal and edit an empty field
==============================

1.  Select :guilabel:`Show empty` in the module header.
2.  Find :guilabel:`Position / Title of the person` in the Author card.
3.  Select the empty field and enter:

    ..  code-block:: text

        Camino content team

4.  Save the change.
5.  Select :guilabel:`Show empty` again if you no longer need empty fields.

:guilabel:`Show empty` reveals empty inline-editable fields. It does not reveal
empty content areas and does not control the Add Content button.

..  _visual-editor-getting-started-validation:

Recognize and correct a validation error
========================================

The :guilabel:`Name` field of the Camino Author card is required. Use it to see
how TYPO3 field validation is applied to inline editing.

1.  Select :guilabel:`Camino Editorial Team` in the Author card.
2.  Delete the complete value and move focus out of the field.
3.  Observe the validation message and invalid-field marker.
4.  Look at the Save control in the module header.

The invalid field prevents all pending Visual Editor changes from being saved.
The Save control changes into an error action.

5.  Select the error action.
6.  Confirm that focus moves to the first invalid field.
7.  Restore the last saved value with the field reset control, or enter another
    valid name.
8.  Save the changes.

..  note::

    Validation differs between projects and fields. This required-field example
    demonstrates that the Visual Editor respects TYPO3 field configuration. A
    project can also enforce length limits, allowed characters, whitespace
    handling, or line-break restrictions.

..  _visual-editor-getting-started-action-bar:

Discover the content element action bar
=======================================

With a pointer
    Move the pointer over a content element.

With a keyboard
    Move focus into the element or one of its available editing controls.

With a touch device
    Touch behavior depends on the browser and project. A control that depends
    only on hover can be difficult to discover. Use a desktop browser for this
    tutorial.

The action bar can contain the content type, a drag handle, and controls for
editing, visibility, deletion, and adding content. Some controls are omitted
when the record, language, content area, or current permissions do not support
the action.

..  figure:: /_Images/Editor/ContentElementActionBar.png
    :alt: Hovered content element action bar with controls for moving, editing,
        changing visibility, deleting, and adding content.
    :class: with-shadow

    The content element action bar: content type, drag handle, Edit content
    element, visibility toggle, Delete content element, and Add content element.

See :ref:`visual-editor-action-bar` for a complete reference.

..  _visual-editor-getting-started-edit-element:

Open the complete content element settings
==========================================

1.  Open the action bar of a content element.
2.  Select :guilabel:`Edit content element`.
3.  Change a field that is not available as an inline editing target.
4.  Save and close the contextual dialog.

Use this workflow for advanced fields, noneditable images, appearance options,
access settings, and other record fields exposed by the project.

..  _visual-editor-getting-started-visibility:

Hide and unhide a content element
=================================

Three visibility concepts are available and must not be confused:

:guilabel:`Show hidden`
    Controls whether already-hidden content elements are visible in the editing
    preview. It does not change their stored visibility.

Visibility toggle in the action bar
    Hides a visible content element or unhides a hidden content element. The
    change remains pending until Save or Autosave persists it.

Page or time-based access settings
    Are configured in the full record or page properties and are outside this
    quick exercise.

To try the visibility workflow:

1.  Ensure :guilabel:`Show hidden` is active.
2.  Open a content element's action bar.
3.  Use its visibility toggle to hide the element.
4.  Observe the hidden-element overlay.
5.  Save the change.
6.  Turn :guilabel:`Show hidden` off and on to compare the preview.
7.  Use the visibility toggle again to unhide the element.
8.  Save the change.

For broader visibility concepts, see `TYPO3 access control`_.

..  _visual-editor-getting-started-add-before:

Add content before an existing element
======================================

1.  Open the action bar of an existing content element.
2.  Select :guilabel:`Add content element`.
3.  Choose a content type and complete its fields.
4.  Save and close the dialog.

The new content element is inserted **before** the element whose action bar you
used. When inline changes are already pending, the Visual Editor can ask you to
save or discard them before the creation workflow continues.

..  _visual-editor-getting-started-delete:

Delete a content element
========================

1.  Choose a temporary element created for this exercise.
2.  Open its action bar.
3.  Select :guilabel:`Delete content element`.

The element is removed from the current preview and its deletion becomes a
pending change.

4.  Select :guilabel:`Save` to persist the deletion.

..  warning::

    The Visual Editor can queue a deletion without a separate delete
    confirmation. Before saving, check that you selected the intended element.
    To abandon an unsaved deletion, leave the current view and choose the option
    that discards pending changes.

When Autosave is active, the deletion can be saved automatically.

..  _visual-editor-getting-started-move:

Move a content element
======================

1.  Open the action bar of an element that has a drag handle.
2.  Drag the element by its handle.
3.  Observe the available drop zones.
4.  Read a drop-zone label before releasing the element.
5.  Drop the element in another position in the same content area.
6.  Repeat the exercise by moving it to another content area.
7.  When a supported container or nested content area is available, move the
    temporary element into an allowed nested target.
8.  Save the pending move.

Drop zones appear only for valid targets. A target can be unavailable because
of content-type restrictions, nesting rules, translation mode, permissions, or
missing Visual Editor integration.

..  note::

    Container and nested-area moves depend on project integration. The public
    Camino demo might not contain such a target. Use a project training page
    with an integrated container to complete this part of the exercise.

..  _visual-editor-getting-started-copy:

Copy a content element
======================

1.  Review the Save button and save or reset unrelated changes first.
2.  Start dragging an element by its handle.
3.  Hold :kbd:`Ctrl` while dropping it on a valid target.
4.  Confirm the copy operation.

On macOS, the current Visual Editor workflow uses the :kbd:`Control` key for
copying, not :kbd:`Command`.

..  warning::

    Copying an element saves the copy and all other valid pending Visual Editor
    changes. The preview reloads after the copy. Review pending changes before
    confirming the operation.

..  _visual-editor-getting-started-pending-dialog:

Test the unsaved-changes protection
===================================

1.  Make a small text change and do not save it.
2.  Select another page or trigger a module reload.
3.  Review the dialog about pending changes.

Depending on whether all fields are valid, the dialog can let you:

*   remain in the current view
*   discard the pending changes
*   save the changes and continue

Choose the option appropriate for the exercise. Invalid fields must be fixed or
discarded before they can be saved.

Actions that open another editing workflow, create or copy records, or reload
the preview can also require a decision about existing pending changes.

..  _visual-editor-getting-started-page-actions:

Use the page actions
====================

1.  Select :guilabel:`Edit page properties`.
2.  Review the available page fields in the contextual dialog.
3.  Close the dialog without changing unrelated configuration.
4.  Select :guilabel:`View webpage` to open the page preview.
5.  Return to :guilabel:`Content > Edit`.
6.  Select :guilabel:`Clear cache` only when a saved frontend result appears
    stale.
7.  Use TYPO3's shortcut control when you want quick access to the current page
    in the Visual Editor.

For detailed page configuration, see `TYPO3 page properties`_.

..  _visual-editor-getting-started-autosave:

Understand Autosave and workspaces
==================================

The tutorial starts in the Live workspace. In Live, the Autosave control is
unavailable. Continue using manual Save.

When the Workspaces system extension is installed and you switch to a
non-Live workspace, you can enable :guilabel:`autosave`. Its state is remembered
by the browser. Autosave persists valid pending changes. It does not bypass
validation.

Use Autosave only when the project's workspace workflow permits it. For a full
introduction to staging, review, and publishing, see the
`TYPO3 Workspaces manual`_.

..  _visual-editor-getting-started-languages:

Continue with languages
=======================

TYPO3 14 can display one language or compare several languages side by side.
Language selection, translation actions, connected content, and free content
are covered separately in :ref:`visual-editor-languages`.

..  _visual-editor-getting-started-finished:

You have finished the tutorial
==============================

You have used the main Visual Editor workflows on the Camino page. Keep these
references nearby while working:

*   :ref:`visual-editor-toolbar`
*   :ref:`visual-editor-action-bar`
*   :ref:`visual-editor-languages`
*   :ref:`visual-editor-permissions`
*   :ref:`visual-editor-troubleshooting`
