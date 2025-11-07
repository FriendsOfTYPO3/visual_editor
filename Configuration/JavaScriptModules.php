<?php

declare(strict_types=1);

return [
    // required import configurations of other extensions,
    // in case a module imports from another package
    'dependencies' => ['backend', 'rte_ckeditor'],
    'imports' => [
        // recursive definition, all *.js files in this folder are import-mapped
        // trailing slash is required per importmap-specification
        '@andersundsehr/editara/' => 'EXT:editara/Resources/Public/JavaScript/',
    ],
];
