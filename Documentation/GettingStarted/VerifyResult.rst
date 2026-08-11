:navigation-title: Verify the integration

..  include:: /Includes.rst.txt
..  _visual-editor-verify-result:
..  index:: Visual Editor; Acceptance test

======================
Verify the integration
======================

Run this acceptance check after completing the TYPO3 14 or TYPO3 13 path.
Use the same **Visual Editor demo** page from the previous chapters.

Installation and module
=======================

#.  Open the :guilabel:`Editor` module as an administrator.
#.  When the project uses restricted accounts, switch to an editor account and
    repeat the check.
#.  Hover a content element.

The action bar must show the content element type and the controls permitted for
the account.

Inline editing
==============

#.  Empty the example header in the regular backend form and save it.
#.  Open Visual Editor and enable :guilabel:`Show empty`.
#.  Enter a new header value.
#.  Change the rich text body.
#.  Save all pending changes.
#.  Open the normal frontend.

Both values must be visible in the normal frontend after saving.

Page-level drag and drop
========================

#.  Place at least two content elements in the Main column.
#.  Reorder them inside the column.
#.  When another page content area is available, move one element between the
    two areas.
#.  Reload Visual Editor and the normal frontend.

The new placement must remain after both reloads.

Container drag and drop
=======================

Skip this check when the project does not use `EXT:container`.

#.  Add the **2 Column Container With Header** example container.
#.  Put two child elements in the left column and leave the right column empty.
#.  Reorder the two elements in the left column.
#.  Move one element from left to right.
#.  Move it from the container to the page Main column.
#.  Move it back into the container.
#.  Reload Visual Editor and the normal frontend.

All drop zones must remain usable, including an empty container column. The
final order and parent container must remain after reload.

..  admonition:: Completed outcome

    A developer can edit plain text and rich text in context, reveal an empty
    editable field and reposition content elements in page and container
    content areas. The normal frontend displays the saved result without edit
    mode markup.
