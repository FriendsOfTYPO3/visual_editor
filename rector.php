<?php

declare(strict_types=1);

use Rector\Php80\Rector\Class_\StringableForToStringRector;
use PLUS\GrumPHPConfig\RectorSettings;
use Rector\Config\RectorConfig;
use Rector\Caching\ValueObject\Storage\FileCacheStorage;

return static function (RectorConfig $rectorConfig): void {
    $rectorConfig->parallel();
    $rectorConfig->importNames();
    $rectorConfig->importShortClasses();
    $rectorConfig->cacheClass(FileCacheStorage::class);
    $rectorConfig->cacheDirectory('./var/cache/rector');

    $rectorConfig->paths(
        array_filter(explode("\n", (string)shell_exec("git ls-files | xargs ls -d 2>/dev/null | grep -E '\.(php)$'")))
    );

    // define sets of rules
    $rectorConfig->sets(
        [
            ...RectorSettings::sets(true),
            ...RectorSettings::setsTypo3(true),
        ],
    );

    // remove some rules
    // ignore some files
    $rectorConfig->skip(
        [
            ...RectorSettings::skip(),
            ...RectorSettings::skipTypo3(),


            StringableForToStringRector::class,
            /**
             * rector should not touch these files
             */
            //__DIR__ . '/src/Example',
            //__DIR__ . '/src/Example.php',
        ]
    );
};
