<?php

declare(strict_types=1);

use TYPO3\CMS\VisualEditor\Backend\Controller\AppearanceItemsController;
use TYPO3\CMS\VisualEditor\Backend\Controller\CrossOriginNavigationController;
use TYPO3\CMS\VisualEditor\Backend\Controller\PersistenceController;

return [
    'visual_editor_resolve_cross_origin_backend_url' => [
        'path' => '/visual-editor/resolve-cross-origin-backend-url',
        'target' => CrossOriginNavigationController::class . '::resolveBackendUrlAction',
        'methods' => ['POST'],
        'inheritAccessFromModule' => 'web_edit',
    ],
    'visual_editor_save' => [
        'path' => '/visual-editor/save',
        'target' => PersistenceController::class . '::saveAction',
        'methods' => ['POST'],
        'inheritAccessFromModule' => 'web_edit',
    ],
    'visual_editor_appearance_items' => [
        'path' => '/visual-editor/appearance-items',
        'target' => AppearanceItemsController::class . '::itemsAction',
        'methods' => ['POST'],
        'inheritAccessFromModule' => 'web_edit',
    ],
];
