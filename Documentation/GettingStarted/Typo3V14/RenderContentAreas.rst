:navigation-title: Page content areas

..  include:: /Includes.rst.txt
..  _visual-editor-v14-page-content-areas:
..  index:: Visual Editor; f:render.contentArea
..  index:: TYPO3 14; ContentArea

=============================================
Render page content areas with TYPO3 14
=============================================

TYPO3 14.2 introduced `f:render.contentArea`. Visual Editor 1.x supports
TYPO3 14.3 or newer, so use this ViewHelper for new and modernized page
templates.

The ViewHelper expects a ContentArea object. The `page-content` data processor
creates one object for every configured backend layout column and exposes it by
the column identifier. See the official
`f:render.contentArea reference
<https://docs.typo3.org/permalink/t3viewhelper:typo3-fluid-render-contentarea>`_.

..  _visual-editor-v14-backend-layout:

Check the backend layout identifier
===================================

The running example uses a Main column with `colPos = 0` and identifier `main`:

..  code-block:: typoscript
    :caption: packages/my_site_package/Configuration/page.tsconfig
    :emphasize-lines: 10

    mod.web_layout.BackendLayouts {
        default {
            title = Default
            config.backend_layout {
                colCount = 1
                rowCount = 1
                rows.1.columns.1 {
                    name = Main
                    colPos = 0
                    identifier = main
                }
            }
        }
    }

Keep the project's existing backend layout. Add an identifier when it has none.
Use the actual identifier in the Fluid template.

..  admonition:: Expected result

    The selected page uses a backend layout whose Main column has a stable
    identifier. In this guide, the corresponding Fluid variable will be
    `{content.main}`.

..  _visual-editor-v14-pageview:

Prefer PAGEVIEW
================================

Use the `PAGEVIEW` TypoScript content object when the project can adopt it. It
reduces page template boilerplate and is the recommended new way:

..  code-block:: typoscript
    :caption: packages/my_site_package/Configuration/Sets/SitePackage/setup.typoscript
    :emphasize-lines: 3,7

    page = PAGE
    page {
        10 = PAGEVIEW
        10 {
            paths.100 = EXT:my_site_package/Resources/Private/PageView/
        }
    }

`PAGEVIEW` resolves the page template from the selected backend layout
and makes the backend layout columns available below the
default `{content}` variable.

Read more about
`PAGEVIEW <https://docs.typo3.org/permalink/t3tsref:cobj-pageview>`_.

..  _visual-editor-v14-fluidtemplate:

Add page-content to an existing FLUIDTEMPLATE
=============================================

A complete migration to `PAGEVIEW` is recommended but not required for the
Visual Editor integration. When the project must keep an existing
`FLUIDTEMPLATE`, add the same data processor to that object:

..  code-block:: typoscript
    :caption: Add to an existing FLUIDTEMPLATE

    page.10.dataProcessing.1768552680 = page-content

If the processor uses a custom `as` value, replace `content` in the following
Fluid examples with that variable name.

..  admonition:: Expected result

    The page template receives `{content.main}` as a ContentArea object. The
    object exists even when the column currently contains no content elements.

Read more about the `page-content data processor
<https://docs.typo3.org/permalink/t3tsref:pagecontentfetchingprocessor>`_.

..  _visual-editor-v14-render-contentarea:

Replace the old column rendering
================================

A legacy page template commonly renders the Main column through a custom
TypoScript object:

..  code-block:: html
    :caption: Before

    <f:cObject
        typoscriptObjectPath="lib.dynamicContent"
        data="{colPos: 0}"
    />

Render the ContentArea object instead:

..  code-block:: html
    :caption: After
    :emphasize-lines: 1

    <f:render.contentArea contentArea="{content.main}" />

Inline syntax is equivalent:

..  code-block:: html

    {content.main -> f:render.contentArea()}

Keep semantic layout wrappers around the ViewHelper when needed:

..  code-block:: html

    <main class="page-main">
        <f:render.contentArea contentArea="{content.main}" />
    </main>

Do not use the `recordAs` argument for the first Visual Editor integration.
Wrapping each record at the ContentArea level is a known drag-and-drop
limitation. Put record-specific wrappers in the content element template.

..  admonition:: Expected result

    The normal frontend renders the same content elements in the same order. In
    Visual Editor, the Main column is represented by one content-area drop zone.

..  _visual-editor-v14-test-page-dnd:

Test page-level drag and drop
=============================

#.  Put at least two content elements in the Main column.
#.  Open the page in the :guilabel:`Editor` module.
#.  Drag the second element above the first one.
#.  Reload the Visual Editor page.
#.  Open the normal frontend.

When the page has another integrated content area, also move one element between
the two areas.

..  admonition:: Expected result

    Drag handles are visible. The new element order remains after reloading
    Visual Editor and the normal frontend.

Continue with the optional :ref:`visual-editor-v14-container` or go directly to
:ref:`visual-editor-verify-result`.
