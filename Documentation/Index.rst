:navigation-title: Visual Editor

..  include:: /Includes.rst.txt
..  _start:
..  index:: Visual Editor

=============
Visual Editor
=============

Visual Editor provides inline text editing and visual content placement for
TYPO3 pages. Developers integrate it into Fluid templates by rendering editable
fields and content areas with the ViewHelpers described in this manual.

The developer guide starts with an existing TYPO3 website. It adds inline
editing for a plain text field and a rich text field, then enables drag and drop
for page columns and nested container columns.

----

..  card-grid::
    :columns: 1
    :columns-md: 2
    :gap: 4
    :class: pb-4
    :card-height: 100

    ..  card:: Integrate Visual Editor

        Install the extension, enable inline editing and add drag and drop to an
        existing site package. The guide contains separate paths for TYPO3 14
        and TYPO3 13.

        ..  card-footer:: :ref:`Start the developer guide <visual-editor-getting-started>`
            :button-style: btn btn-secondary stretched-link

    ..  card:: Troubleshooting

        Diagnose a missing module, action bar, editable field or drag handle.

        ..  card-footer:: :ref:`Open troubleshooting <visual-editor-troubleshooting>`
            :button-style: btn btn-secondary stretched-link

    ..  card:: Using the Visual Editor

        Install the extension, enable inline editing and add drag and drop to an
        existing site package. The guide contains separate paths for TYPO3 14
        and TYPO3 13.

        ..  card-footer:: :ref:`Start the developer guide <visual-editor-editor-manual>`
            :button-style: btn btn-secondary stretched-link

    ..  card:: Extend Visual Editor

        Pass frontend route context to the new content element wizard from an
        extension.

        ..  card-footer:: :ref:`Open the extension guide <visual-editor-extending>`
            :button-style: btn btn-secondary stretched-link

..  toctree::
    :hidden:
    :titlesonly:

    GettingStarted/Index
    Editor/Index
    Extending/Index

..  Meta Menu

..  toctree::
    :hidden:

    Sitemap

----

:Extension key:
    |extension-key|

:Package name:
    |package-name|

:Version:
    |release|

:Language:
    en

:Author:
    TYPO3 contributors

:License:
    This document is published under the
    `Creative Commons BY 4.0 <https://creativecommons.org/licenses/by/4.0/>`__
    license.

:Rendered:
    |today|
