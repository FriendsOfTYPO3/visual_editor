<?php

declare(strict_types=1);

return [
    // required import configurations of other extensions,
    // in case a module imports from another package
    'dependencies' => ['backend', 'rte_ckeditor'],
    'imports' => [
        // recursive definition, all *.js files in this folder are import-mapped
        // trailing slash is required per importmap-specification
        '@typo3/visual-editor/' => 'EXT:visual_editor/Resources/Public/JavaScript/',
        # add this, as it is missing from rte_ckeditor imports (can be removed with TYPO3 14)
        # missing patcheset:
        '@ckeditor/ckeditor5-editor-inline' => 'EXT:visual_editor/Resources/Public/Contrib/ckeditor5-editor-inline.js',
        # https://review.typo3.org/c/Packages/TYPO3.CMS/+/91561:
        '@typo3/rte-ckeditor/init-ckeditor-instance.js' => 'EXT:visual_editor/Resources/Public/Contrib/init-ckeditor-instance.js',
    ],
];
