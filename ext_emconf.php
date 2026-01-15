<?php

$EM_CONF[$_EXTKEY] = [
    'title' => 'TYPO3 CMS Visual Editor',
    'description' => 'brings a modern WYSIWYG editing experience to TYPO3 CMS.',
    'category' => 'be',
    'author' => 'Matthis Vogel',
    'author_email' => 'm.vogel@andersundsehr.com',
    'state' => 'stable',
    'version' => '14.0.1',
    'constraints' => [
        'depends' => [
            'php' => '8.2.0-8.5.99',
            'typo3' => '14.0.0-14.4.99',
        ],
        'conflicts' => [],
        'suggests' => [],
    ],
    'autoload' => [
        'psr-4' => [
            'TYPO3\\CMS\\VisualEditor\\' => 'Classes',
        ],
    ],
];
