<?php

declare(strict_types=1);

/** @var string $_EXTKEY */
$EM_CONF[$_EXTKEY] = [
    'title' => 'Backend user session for frontend functional tests',
    'description' => 'Starts a session for the backend user that the testing framework logs in',
    'category' => 'example',
    'state' => 'stable',
    'version' => '1.0.0',
    'constraints' => [
        'depends' => [
            'typo3' => '13.4.0-14.99.99',
        ],
        'conflicts' => [],
        'suggests' => [],
    ],
];
