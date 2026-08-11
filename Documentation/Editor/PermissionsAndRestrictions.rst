:navigation-title: Permissions and restrictions

..  include:: /Includes.rst.txt

..  _visual-editor-permissions:

====================================
Permissions and content restrictions
====================================

The Visual Editor does not introduce a separate permission matrix for its
individual actions. Standard TYPO3 permissions, language rules, workspace
configuration, and content restrictions apply.

Seeing :guilabel:`Content > Edit` therefore does not mean that every rendered
record and field can be changed.

..  _visual-editor-permissions-module:

Access to the module
====================

A backend administrator grants access to the Visual Editor module through the
normal TYPO3 backend module permissions.

Without access, :guilabel:`Content > Edit` is not shown. With module access, the
editor can open the page preview, but record-level actions still depend on
other permissions.

..  _visual-editor-permissions-standard:

Standard TYPO3 checks
=====================

Depending on the operation, TYPO3 can check:

Page permissions
    Whether the user may view, edit, create, delete, or move records on the
    page.

Web mounts
    Whether the page belongs to a site area available to the user.

Language access
    Whether the user may edit the selected site language.

Table modification permissions
    Whether the user may modify pages, content elements, or another record
    table.

Content type permissions
    Whether the selected content element type is allowed for the user.

Field access
    Whether an excluded or protected field is available. This can affect inline
    fields and the visibility toggle.

Record and page locks
    Whether an administrator has marked a page or record as noneditable for
    normal backend users.

Workspace permissions
    Whether the user can work in a workspace and perform the requested
    versioning action.

DataHandler validation
    Whether TYPO3 accepts the final save, move, copy, or delete operation.

For administrative background, see `TYPO3 backend user groups`_.

..  _visual-editor-permissions-integration:

Permissions are not the only reason
===================================

A missing inline field, image action, content area, or drag handle does not
always indicate missing permissions. It can also mean that:

*   the project template does not mark the output for Visual Editor use
*   the field type is not supported for inline editing
*   the image does not belong to an editable file reference
*   the content area is not integrated
*   the element is rendered by a plugin or custom data source
*   the language mode prevents the operation
*   the current page is not previewable

Ask the project support team to distinguish configuration from permissions.
Do not request broader permissions until the reason has been identified.

..  _visual-editor-permissions-restrictions:

Content-area restrictions
=========================

A content area can allow only selected content types or reject specific types.
These rules affect:

*   the New Content Element Wizard
*   the large Add Content button
*   action-bar creation actions
*   drag-and-drop targets
*   nested containers and content areas

TYPO3 14
    Core backend layout configuration can provide allowed and disallowed
    content types for each content area. Container extensions can add further
    nested-area restrictions.

TYPO3 13
    Projects commonly use Page TSconfig, container configuration, custom
    integration, or extensions such as Content Defender.

When a drop target is not displayed, choose another visible target instead of
trying to bypass the restriction.

..  _visual-editor-permissions-camino-examples:

Examples from the Camino backend layouts
========================================

Camino demonstrates that a missing content type or drop target can be an
intentional layout rule:

:guilabel:`Hero area`
    Accepts the Camino hero and page-header variants.

:guilabel:`Content area`
    Rejects hero elements and selected navigation or teaser types that belong
    in other areas.

:guilabel:`Sidebar`
    Accepts selected compact types, including :guilabel:`Text teaser`,
    :guilabel:`Author card`, :guilabel:`Text-Media Teaser`, and the frontend
    login element.

Footer areas
    Accept selected link-list or social-media content types according to their
    purpose.

These are content restrictions, not additional Visual Editor permissions. The
New Content Element Wizard and drag-and-drop use the same destination rules.

..  _visual-editor-permissions-escalation:

When an action is unavailable
=============================

Use this order:

1.  Check :ref:`visual-editor-troubleshooting`.
2.  Confirm that you selected the correct page and language.
3.  Contact the project's support team, service desk, or TYPO3 administrator.
4.  Use :guilabel:`Content > Layout` only as a temporary fallback when the
    project permits it.
5.  Report a reproducible Visual Editor defect in the
    `Visual Editor issue tracker`_.

The Layout module is not a substitute for correcting a Visual Editor
integration or permission problem.
