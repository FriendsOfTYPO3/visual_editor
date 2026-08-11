:navigation-title: TYPO3 14

..  include:: /Includes.rst.txt
..  _visual-editor-typo3-v14:
..  index:: Visual Editor; TYPO3 14

================================
Enable drag and drop in TYPO3 14
================================

TYPO3 14 is the recommended integration path. It represents page and container
columns as ContentArea objects and renders them with `f:render.contentArea`.
Visual Editor listens to the core content-area rendering event and adds the edit
mode drop zone automatically.

Complete these shared chapters first:

*   :ref:`visual-editor-install-and-verify`
*   :ref:`visual-editor-enable-text-editing`

Then complete:

#.  :ref:`visual-editor-v14-page-content-areas`
#.  :ref:`visual-editor-v14-container`
#.  :ref:`visual-editor-verify-result`

The container chapter is optional.

..  toctree::
    :hidden:
    :titlesonly:

    RenderContentAreas
    IntegrateContainer
