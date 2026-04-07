<?php

declare(strict_types=1);

use TYPO3\CMS\VisualEditor\Backend\Controller\PageEditController;

return [
    'web_edit' => [
        'parent' => 'web',
        'position' => ['before' => 'web_layout'],
        'access' => 'user',
        'path' => '/module/web/edit',
        'iconIdentifier' => 'module-page-edit',
        'labels' => 'LLL:EXT:visual_editor/Resources/Private/Language/locallang_mod.xlf',
        'routes' => [
            '_default' => [
                'target' => PageEditController::class . '::__invoke',
            ],
        ],
        'moduleData' => [
            'function' => 1,
            'languages' => [0],
            'showHidden' => true,
        ],
    ],

];
