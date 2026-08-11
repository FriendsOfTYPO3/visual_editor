:navigation-title: TYPO3 13

..  include:: /Includes.rst.txt
..  _visual-editor-typo3-v13:
..  index:: Visual Editor; TYPO3 13

================================
Enable drag and drop in TYPO3 13
================================

TYPO3 13 does not provide the core `f:render.contentArea` ViewHelper used by the
recommended TYPO3 14 integration. Visual Editor therefore provides
`f:mark.contentArea` as a compatibility ViewHelper. It wraps output that the
project already renders and turns the complete wrapper into a drop zone.

Complete these shared chapters first:

*   :ref:`visual-editor-install-and-verify`
*   :ref:`visual-editor-enable-text-editing`

Then complete:

#.  :ref:`visual-editor-v13-page-content-areas`
#.  :ref:`visual-editor-v13-container`
#.  :ref:`visual-editor-verify-result`

The container chapter is optional.

..  warning::

    `f:mark.contentArea` is a compatibility path for TYPO3 13. Use
    `f:render.contentArea` after upgrading to TYPO3 14. The compatibility
    ViewHelper is planned for removal with TYPO3 15 support.

..  toctree::
    :hidden:
    :titlesonly:

    MarkContentAreas
    IntegrateContainer
