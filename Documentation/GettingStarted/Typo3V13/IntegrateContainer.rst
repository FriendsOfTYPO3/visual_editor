:navigation-title: Mark container columns

..  include:: /Includes.rst.txt
..  _visual-editor-v13-container:
..  index:: Visual Editor; EXT:container
..  index:: TYPO3 13; ContainerProcessor

==============================================
Enable container drag and drop with TYPO3 13
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

..  _visual-editor-v13-container-setup:

Use the ContainerProcessor rendering
====================================

The `b13/container-example` site set named `b13/container-example` configures
the TYPO3 13 style rendering. Use this legacy site set, not the TYPO3 14
ContentArea variant. In a project-owned site package, use equivalent
TypoScript:

..  code-block:: typoscript
    :caption: Container rendering for TYPO3 13
    :emphasize-lines: 5

    tt_content.b13-2cols-with-header-container < lib.contentElement
    tt_content.b13-2cols-with-header-container {
        templateName = 2ColsWithHeader
        templateRootPaths.10 = EXT:container_example/Resources/Private/Templates
        dataProcessing.200 = B13\Container\DataProcessing\ContainerProcessor
    }

`ContainerProcessor` exposes child records in variables named
`children_<colPos>`, including `{children_200}`, `{children_201}` and
`{children_202}` for this example.

This setup belongs to the container rendering. Visual Editor itself still has no
configuration step.

..  admonition:: Expected result

    The existing container template renders its children from the
    `children_<colPos>` variables.

..  _visual-editor-v13-container-template:

Mark every container column
===========================

The existing template renders each child list directly:

..  code-block:: html
    :caption: Before

    <f:for each="{children_201}" as="element">
        {element.renderedContent -> f:format.raw()}
    </f:for>

Wrap each complete child loop with `f:mark.contentArea`. Pass both the child
column number and the UID of the current container record:

..  code-block:: html
    :caption: After: Resources/Private/Templates/2ColsWithHeader.html
    :emphasize-lines: 1,5,7,11,13,17

    <f:mark.contentArea colPos="200" txContainerParent="{record.uid}">
        <f:for each="{children_200}" as="element">
            {element.renderedContent -> f:format.raw()}
        </f:for>
    </f:mark.contentArea>

    <f:mark.contentArea colPos="201" txContainerParent="{record.uid}">
        <f:for each="{children_201}" as="element">
            {element.renderedContent -> f:format.raw()}
        </f:for>
    </f:mark.contentArea>

    <f:mark.contentArea colPos="202" txContainerParent="{record.uid}">
        <f:for each="{children_202}" as="element">
            {element.renderedContent -> f:format.raw()}
        </f:for>
    </f:mark.contentArea>

The common text-editing chapter creates `{record}` through the
`record-transformation` data processor. When the container template still only
has the raw `{data}` row, use `txContainerParent="{data.uid}"` instead.

`txContainerParent` identifies the current parent container. Do not pass the UID
of a child element.

Keep the marker in the output when a child list is empty. The marker is the
empty drop zone that Visual Editor needs.

..  admonition:: Expected result

    The normal frontend still renders all child elements. In Visual Editor, the
    Header, Left side and Right side are separate drop zones, including an empty
    column.

..  _visual-editor-v13-test-container-dnd:

Test nested drag and drop
=========================

#.  Add a **2 Column Container With Header** to the page.
#.  Add two child content elements to the Left side.
#.  Leave the Right side empty.
#.  Open Visual Editor and reorder the two Left side elements.
#.  Move one element from Left side to Right side.
#.  Move that element from the container to the page column.
#.  Move it back into the container.
#.  Reload Visual Editor and the normal frontend.

..  admonition:: Expected result

    Reordering and moving work inside the container, between container columns
    and between the container and the page column. The final placement remains
    after reload.

Continue with :ref:`visual-editor-verify-result`.
