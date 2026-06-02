<?php

declare(strict_types=1);

use TYPO3\CMS\VisualEditor\Middleware\DisableCacheInEditModeMiddleware;
use TYPO3\CMS\VisualEditor\Middleware\PersistenceMiddleware;

return [
    'frontend' => [
        'typo3/cms-visual-editor/persistence-middleware' => [
            'target' => PersistenceMiddleware::class,
            'after' => [
                'typo3/cms-frontend/prepare-tsfe-rendering',
                'typo3/cms-frontend/tsfe', // TODO typo3/cms-frontend/tsfe can be dropped if TYPO3 14 is lowest supported version
                'typo3/cms-frontend/page-resolver',
                'typo3/cms-adminpanel/sql-logging',
            ],
        ],
        'typo3/cms-visual-editor/disable-cache-in-edit-mode-middleware' => [
            'target' => DisableCacheInEditModeMiddleware::class,
            'before' => [
                'typo3/cms-frontend/page-argument-validator',
                'typo3/cms-frontend/prepare-tsfe-rendering',
                'typo3/cms-frontend/tsfe', // TODO typo3/cms-frontend/tsfe can be dropped if TYPO3 14 is lowest supported version
                'typo3/cms-frontend/page-resolver',
                'typo3/cms-adminpanel/sql-logging',
            ],
        ],
    ],
];
