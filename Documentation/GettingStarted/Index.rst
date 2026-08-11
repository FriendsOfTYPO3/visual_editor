:navigation-title: Developer quick start

..  include:: /Includes.rst.txt
..  _visual-editor-getting-started:
..  index:: Visual Editor; Getting started

===================================================
Integrate Visual Editor into an existing TYPO3 site
===================================================

After completing this guide, you can edit plain text and rich text directly in
the page preview and reposition content elements in page columns and nested
container columns.

The guide is written for site integrators, theme developers and Content Blocks
developers. It assumes an existing TYPO3 website and working frontend output.
Helpful links are included for TYPO3 concepts that are used without being
explained from first principles.

The complete path normally takes between 30 and 60 minutes. You can stop after
inline text editing or skip the container chapter when the project does not use
`EXT:container`.

..  _visual-editor-getting-started-prerequisites:

Prerequisites
=============

You need:

*   a Composer based TYPO3 installation running TYPO3 14.3 or newer, or
    TYPO3 13.4.22 or newer within the TYPO3 13 LTS series,
*   an existing site configuration and a page that renders in the frontend,
*   a site package or theme whose Fluid templates you can edit,
*   an existing backend layout,
*   a `tt_content` content element with the TCA fields `header` and
    `bodytext`, where `bodytext` is configured as rich text,
*   administrator access for the first verification, and
*   basic knowledge of Composer, Fluid, TypoScript, TCA and backend layouts.

See the TYPO3 documentation for
`Fluid templates <https://docs.typo3.org/permalink/t3start:fluid-templates>`_,
`TypoScript <https://docs.typo3.org/permalink/t3start:typoscript>`_,
`backend layouts <https://docs.typo3.org/permalink/t3tsref:mod-web-layout-backendlayouts>`_
and
`Record objects <https://docs.typo3.org/permalink/t3coreapi:record-objects>`_.

For the optional container chapters, `b13/container` and
`b13/container-example` must already be installed and available in the project.
The guide uses the example container named **2 Column Container With Header**.
See the `EXT:container repository <https://github.com/b13/container>`_ and the
`container-example repository <https://github.com/b13/container-example>`_.

..  _visual-editor-running-example:

One example page throughout the guide
=====================================

Use one existing page as the continuous example. In this guide it is called
**Visual Editor demo** and contains:

*   a backend layout column named **Main**, with identifier `main` and
    `colPos = 0`,
*   one content element with an initially empty `header` and a non-empty
    rich text `bodytext`, and
*   optionally, one **2 Column Container With Header** container from
    `b13/container-example`.

You will improve this same page step by step. The names are only examples. Keep
your existing frontend stack, CSS and content element implementation.

..  _visual-editor-guide-route:

Choose your route
=================

Complete the two shared chapters first:

1.  :ref:`Install and verify Visual Editor <visual-editor-install-and-verify>`
2.  :ref:`Enable inline text editing <visual-editor-enable-text-editing>`

Then continue with the TYPO3 version used by the project:

..  card-grid::
    :columns: 1
    :columns-md: 2
    :gap: 4
    :class: pb-4
    :card-height: 100

    ..  card:: TYPO3 14, recommended

        Render page and container columns as ContentArea objects with
        `f:render.contentArea`.

        ..  card-footer:: :ref:`Continue with TYPO3 14 <visual-editor-typo3-v14>`
            :button-style: btn btn-primary stretched-link

    ..  card:: TYPO3 13, compatibility path

        Mark existing page and container output with `f:mark.contentArea`.

        ..  card-footer:: :ref:`Continue with TYPO3 13 <visual-editor-typo3-v13>`
            :button-style: btn btn-secondary stretched-link

Finish with the shared
:ref:`acceptance check <visual-editor-verify-result>`.

..  toctree::
    :hidden:
    :titlesonly:

    InstallAndVerify
    EnableTextEditing
    Typo3V14/Index
    Typo3V13/Index
    VerifyResult
    Troubleshooting
