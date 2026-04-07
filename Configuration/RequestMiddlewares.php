<?php

declare(strict_types=1);

use TYPO3\CMS\VisualEditor\Middleware\PersistenceMiddleware;

return [
    'frontend' => [
        'typo3/cms-visual-editor/persistence-middleware' => [
            'target' => PersistenceMiddleware::class,
            'before' => [
                'typo3/cms-frontend/prepare-tsfe-rendering',
            ],
            'after' => [
                'typo3/cms-frontend/tsfe',
                'typo3/cms-frontend/page-resolver',
                'typo3/cms-adminpanel/sql-logging',
            ],
        ],
    ],
];
