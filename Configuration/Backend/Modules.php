<?php

use Andersundsehr\Editara\Backend\Controller\PageEditController;

return [
    'web_edit' => [
        'parent' => 'web',
        'position' => ['before' => 'web_layout'],
        'access' => 'user',
        'path' => '/module/web/edit',
        'iconIdentifier' => 'module-page-edit',
        'labels' => 'LLL:EXT:editara/Resources/Private/Language/locallang_mod.xlf',
        'routes' => [
            '_default' => [
                'target' => PageEditController::class . '::__invoke',
            ],
        ],
        'moduleData' => [
            'function' => 1,
            'language' => 0,
            'showHidden' => true,
        ],
    ],

];
