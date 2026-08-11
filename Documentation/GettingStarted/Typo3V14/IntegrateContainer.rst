:navigation-title: Container content areas

..  include:: /Includes.rst.txt
..  _visual-editor-v14-container:
..  index:: Visual Editor; EXT:container
..  index:: TYPO3 14; Container ContentAreaProcessor

==============================================
Enable container drag and drop with TYPO3 14
==============================================

Skip this chapter when the project does not use `EXT:container`.

This example assumes `b13/container` and `b13/container-example` are already
installed. It uses the **2 Column Container With Header** definition with these
columns:

*   Header, `colPos = 200`
*   Left side, `colPos = 201`
*   Right side, `colPos = 202`

The current example restricts the right side to one child element. Leave that
column empty at the start of the acceptance test.

..  _visual-editor-v14-container-setup:

Use the ContentArea container rendering
=======================================

The current `b13/container-example` package provides a site set named
`b13/container-example/content-area`. When the project uses the example package
directly, include the site set labeled **Container Example with Content Area
Renderer** instead of the legacy **Container Example** site set.

This is setup for the example container, not configuration for Visual Editor.
In a project-owned site package, use equivalent TypoScript:

..  code-block:: typoscript
    :caption: Container rendering for TYPO3 14
    :emphasize-lines: 5

    tt_content.b13-2cols-with-header-container < lib.contentElement
    tt_content.b13-2cols-with-header-container {
        templateName = 2ColsWithHeader
        templateRootPaths.10 = EXT:container_example/Resources/Private/ContentAreaTemplates
        dataProcessing.200 = B13\Container\DataProcessing\ContentAreaProcessor
    }

`ContentAreaProcessor` detects all columns configured for the current container
CType and exposes them below `{content}` as ContentArea objects.

..  admonition:: Expected result

    The container template receives `{content.200}`, `{content.201}` and
    `{content.202}`. Each value represents its configured container column,
    including a column with no child elements.

..  _visual-editor-v14-container-template:

Render every container column
=============================

A container template may render the records of a ContentArea manually:

..  code-block:: html
    :caption: Before

    <f:if condition="{content.201}">
        <f:for each="{content.201}" as="record">
            <f:render.record record="{record}" />
        </f:for>
    </f:if>

Replace the loop with `f:render.contentArea`:

..  code-block:: html
    :caption: After

    <f:render.contentArea contentArea="{content.201}" />

Apply the same change to every container column. Keep each ViewHelper in the
output even when its column is empty, so Visual Editor can display an empty drop
zone:

..  code-block:: html
    :caption: Resources/Private/ContentAreaTemplates/2ColsWithHeader.html
    :emphasize-lines: 2,6,9

    <div class="container-header">
        <f:render.contentArea contentArea="{content.200}" />
    </div>
    <div class="container-grid">
        <div class="container-grid__left">
            <f:render.contentArea contentArea="{content.201}" />
        </div>
        <div class="container-grid__right">
            <f:render.contentArea contentArea="{content.202}" />
        </div>
    </div>

The outer classes are examples only. Reuse the project's existing HTML and CSS.
Do not loop over ContentArea records when the whole area can be rendered by the
ViewHelper.

..  admonition:: Expected result

    The normal frontend renders all container children. In Visual Editor, the
    Header, Left side and Right side are separate drop zones. The empty Right
    side remains visible as a valid target in edit mode.

..  _visual-editor-v14-test-container-dnd:

Test nested drag and drop
=========================

#.  Add a **2 Column Container With Header** to the page Main column.
#.  Add two child content elements to the Left side.
#.  Leave the Right side empty.
#.  Open Visual Editor and reorder the two Left side elements.
#.  Move one element from Left side to Right side.
#.  Move that element from the container to the page Main column.
#.  Move it back into the container.
#.  Reload Visual Editor and the normal frontend.

..  admonition:: Expected result

    Reordering and moving work inside the container, between container columns
    and between the container and the page content area. The final placement
    remains after reload.

Continue with :ref:`visual-editor-verify-result`.
