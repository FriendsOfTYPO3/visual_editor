<?php

use Composer\InstalledVersions;

/** @var string $_EXTKEY */
try {
    $version = InstalledVersions::getPrettyVersion('friendsoftypo3/visual-editor');
} catch (Exception) {
    $version = 'dev-';
}

$EM_CONF[$_EXTKEY] = [
    'title' => 'TYPO3 CMS Visual Editor',
    'description' => 'Brings a modern WYSIWYG editing experience to TYPO3 CMS.',
    'category' => 'be',
    'author' => 'Matthis Vogel',
    'author_email' => 'm.vogel@andersundsehr.com',
    'state' => 'stable',
    'version' => $version,
    'constraints' => [
        'depends' => [
            'php' => '8.2.0-8.5.99',
            'typo3' => '13.0.0-14.4.99',
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
