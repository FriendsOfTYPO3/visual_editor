<?php

declare(strict_types=1);

use TYPO3\CMS\VisualEditor\Backend\Controller\CrossOriginNavigationController;

return [
    'visual_editor_resolve_cross_origin_backend_url' => [
        'path' => '/visual-editor/resolve-cross-origin-backend-url',
        'target' => CrossOriginNavigationController::class . '::resolveBackendUrlAction',
        'methods' => ['POST'],
        'inheritAccessFromModule' => 'web_edit',
    ],
];
