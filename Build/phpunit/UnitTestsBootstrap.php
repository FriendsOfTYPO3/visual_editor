<?php

declare(strict_types=1);

use TYPO3\TestingFramework\Core\Testbase;
use TYPO3\CMS\Core\Core\SystemEnvironmentBuilder;
use TYPO3\CMS\Core\Core\Environment;
use TYPO3\CMS\Core\Core\Bootstrap;
use TYPO3\CMS\Core\Configuration\ConfigurationManager;
use TYPO3\CMS\Core\Cache\Frontend\PhpFrontend;
use TYPO3\CMS\Core\Cache\Backend\NullBackend;
use TYPO3\CMS\Core\Package\UnitTestPackageManager;
use TYPO3\CMS\Core\Utility\GeneralUtility;
use TYPO3\CMS\Core\Package\PackageManager;
use TYPO3\CMS\Core\Utility\ExtensionManagementUtility;

(static function (): void {
    $testbase = new Testbase();

    if (!getenv('TYPO3_PATH_ROOT')) {
        putenv('TYPO3_PATH_ROOT=' . rtrim($testbase->getWebRoot(), '/'));
    }

    if (!getenv('TYPO3_PATH_WEB')) {
        putenv('TYPO3_PATH_WEB=' . rtrim($testbase->getWebRoot(), '/'));
    }

    $testbase->defineSitePath();

    $requestType = SystemEnvironmentBuilder::REQUESTTYPE_BE | SystemEnvironmentBuilder::REQUESTTYPE_CLI;
    SystemEnvironmentBuilder::run(0, $requestType);

    $testbase->createDirectory(Environment::getPublicPath() . '/typo3conf/ext');
    $testbase->createDirectory(Environment::getPublicPath() . '/typo3temp/assets');
    $testbase->createDirectory(Environment::getPublicPath() . '/typo3temp/var/tests');
    $testbase->createDirectory(Environment::getPublicPath() . '/typo3temp/var/transient');

    $classLoader = require $testbase->getPackagesPath() . '/autoload.php';
    Bootstrap::initializeClassLoader($classLoader);

    $configurationManager = new ConfigurationManager();
    $GLOBALS['TYPO3_CONF_VARS'] = $configurationManager->getDefaultConfiguration();

    $cache = new PhpFrontend(
        'core',
        new NullBackend('production', [])
    );
    $packageManager = Bootstrap::createPackageManager(
        UnitTestPackageManager::class,
        Bootstrap::createPackageCache($cache)
    );
    GeneralUtility::setSingletonInstance(PackageManager::class, $packageManager);
    ExtensionManagementUtility::setPackageManager($packageManager);

    $testbase->dumpClassLoadingInformation();

    GeneralUtility::purgeInstances();
})();
