<?php

declare(strict_types=1);

return [
    'BE' => [
        'debug' => true,
        'installToolPassword' => 'foo',
    ],
    'DB' => [
        'Connections' => [
            'Default' => [
                'charset' => 'utf8mb4',
                'dbname' => getenv('typo3DatabaseName') !== false ? getenv('typo3DatabaseName') . '_at' : '',
                'driver' => getenv('typo3DatabaseDriver') ?: 'mysqli',
                'host' => getenv('typo3DatabaseHost') ?: '',
                'password' => getenv('typo3DatabasePassword') ?: '',
                'port' => (int)(getenv('typo3DatabasePort') ?: 3306),
                'defaultTableOptions' => [
                    'charset' => 'utf8mb4',
                    'collation' => 'utf8mb4_unicode_ci',
                ],
                'user' => getenv('typo3DatabaseUsername') ?: '',
            ],
        ],
    ],
    'SYS' => [
        'encryptionKey' => '2db7840443af8743e79865b25fcb7ea3c2684074f0924e676c90ddb31cad71fa5178e7c98de90dbc8b42bcc8d352402d',
        'sitename' => 'visual_editor-tests',
        'trustedHostsPattern' => '.*.*',
    ],
];
