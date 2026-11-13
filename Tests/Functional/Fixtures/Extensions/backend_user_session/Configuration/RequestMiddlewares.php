<?php

declare(strict_types=1);

use TYPO3Tests\BackendUserSession\Middleware\BackendUserSessionHandler;

return [
    'frontend' => [
        'typo3tests/backend-user-session' => [
            'target' => BackendUserSessionHandler::class,
            'after' => [
                'typo3/json-response/backend-user-authentication',
            ],
            'before' => [
                'typo3/cms-frontend/base-redirect-resolver',
            ],
        ],
    ],
];
