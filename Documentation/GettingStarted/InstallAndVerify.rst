:navigation-title: Install and verify

..  include:: /Includes.rst.txt
..  _visual-editor-install-and-verify:
..  index:: Visual Editor; Installation

================================
Install and verify Visual Editor
================================

Install the newest compatible Visual Editor 1.x release and verify that the
backend module can communicate with the page preview.

..  _visual-editor-install-composer:

Install with Composer
=====================

Run the following commands from the TYPO3 project root:

..  code-block:: bash
    :caption: Install and set up Visual Editor

    composer require friendsoftypo3/visual-editor
    vendor/bin/typo3 extension:setup
    vendor/bin/typo3 cache:flush

The `extension:setup` command sets up the Composer-installed extensions and
performs required initialization and database migrations. The cache flush makes
the backend module, Fluid namespace and frontend integration available
immediately.

..  note::

    In a non-Composer installation, install the extension with the TYPO3
    Extension Manager. Composer is the recommended installation method because
    it resolves the supported TYPO3 and PHP versions together with the package.

..  _visual-editor-no-configuration:

Do not add extension configuration
==================================

Visual Editor deliberately has no configuration step. Do not add:

*   Extension Configuration values,
*   a Visual Editor site set,
*   a manual TypoScript include, or
*   YAML configuration for the extension.

The extension registers its ViewHelpers in the existing `f` namespace and
loads the TypoScript needed for edit mode automatically. Project-specific work
starts in the Fluid templates in the next chapter.

Visual Editor intentionally favors automated behavior and sane defaults over
project-specific options. When an integration appears to require a new Visual
Editor setting, describe the use case in the
`Visual Editor issue tracker <https://github.com/FriendsOfTYPO3/visual_editor/issues>`_
instead of introducing private configuration.

A site set used by another extension, such as `b13/container-example`, is not
Visual Editor configuration.

..  admonition:: Expected result

    `vendor/bin/typo3 extension:list` lists `visual_editor` as active. No
    additional configuration form or site set is required.

..  _visual-editor-module-access:

Allow the backend module for non-admin users
============================================

Use an administrator account for the first check. Administrators can access all
backend modules.

For an editor account, edit the backend user group and open the
:guilabel:`Access Lists` tab. In :guilabel:`Modules`, enable
:guilabel:`Edit`. It is listed below :guilabel:`Content` in TYPO3 14 and
below :guilabel:`Web` in TYPO3 13.

Manage backend user groups in :guilabel:`Administration > Users` in TYPO3 14.
In TYPO3 13, use :guilabel:`System > Backend Users`.

Module access only makes the module visible. Existing page, table and field
permissions still determine what the account may edit. See the TYPO3
`access-control reference
<https://docs.typo3.org/permalink/t3coreapi:access-control-options>`_.

..  admonition:: Expected result

    The backend user sees the :guilabel:`Editor` module and can select the
    **Visual Editor demo** page in the page tree.

..  _visual-editor-open-module:

Open the page in Visual Editor
==============================

#.  Log in to the TYPO3 backend.
#.  Open the :guilabel:`Editor` module.
#.  Select the **Visual Editor demo** page.
#.  Wait until the frontend preview is visible.
#.  Move the pointer over an existing content element.

An action bar appears on the content element. It shows the element type and the
controls available to the current backend user. The exact controls depend on
permissions and the state of the record.

..  admonition:: Expected result

    Hovering a rendered content element displays its action bar. This confirms
    that installation, backend module access, preview communication and the
    automatic content element wrapper are working.

Continue with :ref:`visual-editor-enable-text-editing`.
