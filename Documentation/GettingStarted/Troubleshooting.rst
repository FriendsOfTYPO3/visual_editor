:navigation-title: Troubleshooting

..  include:: /Includes.rst.txt
..  _visual-editor-troubleshooting:
..  index:: Visual Editor; Troubleshooting

===============
Troubleshooting
===============

There is no Visual Editor configuration screen to inspect. Start with the
rendering path, record type and backend permissions described below.

The Editor module is missing
============================

*   Run `vendor/bin/typo3 extension:setup` and
    `vendor/bin/typo3 cache:flush`.
*   Check that `visual_editor` is active.
*   For a non-admin account, enable the :guilabel:`Editor` backend module in the
    user or group access list.

The preview loads but no action bar appears
===========================================

*   Open the page through the :guilabel:`Editor` module, not as a normal
    frontend preview.
*   Hover the rendered content element itself. The action bar is intentionally
    hidden when the pointer is outside the element.
*   Inspect the edit-mode HTML for a `ve-content-element` wrapper. Custom
    rendering that bypasses the normal `tt_content` rendering and its
    `stdWrap` can also bypass the automatically added wrapper.
*   Confirm that the backend user may access and edit the content record.

A text field is not editable
============================

*   Pass a Record object, `PageInformation` object or persistent Extbase domain
    object to `f:render.text`. A plain array is not supported.
*   Use the TCA column name in the `field` argument.
*   Confirm that the field is a TCA input or text field containing a string.
*   Check backend field permissions and record edit permissions.
*   Make sure the output is not escaped or processed a second time after
    `f:render.text`.

Show empty does not reveal the field
====================================

Render the editable result before the condition and use the result in the
condition:

..  code-block:: html

    <f:variable name="header" value="{record -> f:render.text(field: 'header')}" />
    <f:if condition="{header}">
        <h2>{header}</h2>
    </f:if>

A condition such as `<f:if condition="{record.header}">` removes the editable
position when the stored value is empty.

Page drag handles are missing in TYPO3 14
=========================================

*   Render the ContentArea object with `f:render.contentArea`.
*   Confirm that the backend layout column has an `identifier` and that the
    `page-content` data processor exposes it under `{content.<identifier>}`.
*   Avoid the `recordAs` argument while testing Visual Editor. Wrapping records
    at the content area level is a known limitation and can make drag handles
    disappear. Put wrapping markup in the content element template instead.

Page drag handles are missing in TYPO3 13
=========================================

*   Wrap the complete output of each column in `f:mark.contentArea`.
*   Pass the actual numeric `colPos` from the backend layout.
*   Do not place only individual child elements inside the marker. The marker
    represents the complete drop zone.

A container column is not a drop zone
=====================================

TYPO3 14
    Add `B13\\Container\\DataProcessing\\ContentAreaProcessor` and render each
    container ContentArea with `f:render.contentArea`.

TYPO3 13
    Use `B13\\Container\\DataProcessing\\ContainerProcessor`, wrap each
    `children_<colPos>` loop in `f:mark.contentArea` and pass the current
    container UID as `txContainerParent`.

Also check restrictions such as `allowedContentTypes`, `disallowedContentTypes`
and `maxitems` in the container configuration. The example right column accepts
only one item.

The page preview uses another domain
====================================

The backend and preview must use the same origin for browser messaging. Log in
to the backend on the site domain used by the selected language. In a
multi-domain installation, a backend login is required on each domain unless a
project-specific single-login solution is used.

Rich text looks different while editing
=======================================

Visual Editor uses the regular frontend CSS. CSS configured only as CKEditor
`contentsCss` is not automatically part of the frontend preview. Add the
relevant rich text rules to the frontend stylesheet so edit mode and normal
frontend output use the same styling.
