<?php

declare(strict_types=1);

use TYPO3\TestingFramework\Core\Testbase;

(static function (): void {
    $testbase = new Testbase();
    $testbase->defineOriginalRootPath();

    $webRoot = $testbase->getWebRoot();
    $testbase->createDirectory($webRoot . 'typo3temp/var/tests');
    $testbase->createDirectory($webRoot . 'typo3temp/var/transient');
})();
