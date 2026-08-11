:navigation-title: Enable text editing

..  include:: /Includes.rst.txt
..  _visual-editor-enable-text-editing:
..  index:: Visual Editor; Inline editing
..  index:: Fluid; f:render.text

==========================
Enable inline text editing
==========================

Use `f:render.text` wherever a plain text or rich text TCA field should be
editable in the page preview.

The ViewHelper needs one of these record types:

*   a TYPO3 `RecordInterface` object,
*   the current `PageInformation` object, or
*   a persistent Extbase domain object.

A database row provided as a plain Fluid array is not sufficient.

..  _visual-editor-create-record-object:

Provide a Record object when the template only has `data`
==========================================================

Inspect the variables available in the content element template. When a
`record` object already exists, continue with the next section.

Many existing content elements only receive the database row as `{data}`. Add
the `record-transformation` data processor to create a Record object for content
element templates:

..  code-block:: typoscript
    :caption: packages/my_site_package/Configuration/Sets/SitePackage/setup.typoscript

    lib.contentElement.dataProcessing.1768551979 = record-transformation
    lib.contentElement.dataProcessing.1768551979.as = record

This project-wide setup is useful when many content element templates will be
integrated. To change only one custom content type, configure the processor on
that rendering definition instead:

..  code-block:: typoscript
    :caption: Configure one content type only

    tt_content.my_content_element.dataProcessing.1768551979 = record-transformation
    tt_content.my_content_element.dataProcessing.1768551979.as = record

Use an unused data processing key in your project. The numeric key shown here is
only chosen to avoid a collision with common low-numbered processors.

See the TYPO3 references for
`Record objects <https://docs.typo3.org/permalink/t3coreapi:record-objects>`_
and the
`record-transformation data processor
<https://docs.typo3.org/permalink/t3tsref:recordtransformationprocessor>`_.

..  note:: Extbase domain objects

    A persistent Extbase domain object can be passed directly. Visual Editor
    maps scalar model properties back to their TCA columns. Use the TCA column
    name in the `field` argument:

    ..  code-block:: html

        {article -> f:render.text(field: 'title')}

..  admonition:: Expected result

    The content element template has a `record` object. `{record.uid}` and
    `{record.header}` can be read without changing the existing `{data}`
    variable.

..  _visual-editor-render-plain-text:

Render the plain text header
============================

A common template renders the header only when the stored value is not empty:

..  code-block:: html
    :caption: Before

    <f:if condition="{record.header}">
        <h2>{record.header}</h2>
    </f:if>

Render the field first, store the result in a variable and use that same
variable in the condition and the output:

..  code-block:: html
    :caption: After
    :emphasize-lines: 1,2,3

    <f:variable name="header" value="{record -> f:render.text(field: 'header')}" />
    <f:if condition="{header}">
        <h2>{header}</h2>
    </f:if>

Updating the `f:if` condition is required for empty-field editing. When the
condition still checks `{record.header}`, Fluid removes the complete heading
from the output while the field is empty. Visual Editor then has no editable
position that the :guilabel:`Show empty` function could reveal.

Use the variable for both purposes. Do not call `f:render.text` once in the
condition and a second time in the output.

..  admonition:: Expected result

    The normal frontend output is unchanged for a populated header. In Visual
    Editor, an initially empty header can be revealed with
    :guilabel:`Show empty`.

..  _visual-editor-render-rich-text:

Render the rich text body
=========================

Replace the separate rich text formatter with `f:render.text`:

..  code-block:: html
    :caption: Before

    <f:if condition="{record.bodytext}">
        <div class="text">
            <f:format.html>{record.bodytext}</f:format.html>
        </div>
    </f:if>

..  code-block:: html
    :caption: After
    :emphasize-lines: 1,2,4

    <f:variable name="bodytext" value="{record -> f:render.text(field: 'bodytext')}" />
    <f:if condition="{bodytext}">
        <div class="text">
            {bodytext}
        </div>
    </f:if>

Do not wrap the result in `f:format.html`. The ViewHelper applies the configured
RTE processing in normal frontend mode and provides the rich text editor in edit
mode.

`f:render.text` supports TCA input fields and text fields. The field must be a
scalar string field that the backend user is allowed to edit.

..  admonition:: Expected result

    The normal frontend still renders processed rich text. In Visual Editor,
    selecting the body text opens the rich text editing controls.

..  _visual-editor-test-text-editing:

Test empty, plain and rich text editing
=======================================

#.  Make sure the example content element has an empty `header` and a
    non-empty `bodytext`.
#.  Open the page in the :guilabel:`Editor` module.
#.  Enable :guilabel:`Show empty`.
#.  Select the highlighted empty header and enter `Welcome`.
#.  Select the body text, change a sentence and apply one rich text format.
#.  Confirm that the save action reports pending changes.
#.  Save the changes.
#.  Open the normal frontend page outside Visual Editor.

..  admonition:: Expected result

    The new header and changed rich text appear in the normal frontend. The
    saved values remain after reloading the page.

Continue with :ref:`visual-editor-typo3-v14` or
:ref:`visual-editor-typo3-v13`.
