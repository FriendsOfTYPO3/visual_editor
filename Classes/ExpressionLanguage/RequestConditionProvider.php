<?php

declare(strict_types=1);

namespace TYPO3\CMS\VisualEditor\ExpressionLanguage;

use TYPO3\CMS\Core\Authentication\BackendUserAuthentication;
use TYPO3\CMS\Core\ExpressionLanguage\AbstractProvider;
use TYPO3\CMS\Core\Utility\GeneralUtility;

use function str_starts_with;

final class RequestConditionProvider extends AbstractProvider
{
    public static bool $forceGeneration = false;

    public function __construct()
    {
        if (empty($_SERVER['REQUEST_METHOD'])) {
            // only change the base Urls if it is a request.
            return;
        }

        if (empty($_COOKIE[BackendUserAuthentication::getCookieName()])) {
            // only change the base Urls if backend user cookie is set. (reduce duplicate content in SEO)
            return;
        }

        $prefix = '';
        // Add a prefix if TYPO3 is behind a proxy: ext-domain.com => int-server.com/prefix
        if (
            isset($_SERVER['REMOTE_ADDR'], $GLOBALS['TYPO3_CONF_VARS']['SYS']['reverseProxyIP'])
            && GeneralUtility::cmpIP($_SERVER['REMOTE_ADDR'], $GLOBALS['TYPO3_CONF_VARS']['SYS']['reverseProxyIP'])
        ) {
            if (GeneralUtility::getIndpEnv('TYPO3_SSL') && !empty($GLOBALS['TYPO3_CONF_VARS']['SYS']['reverseProxyPrefixSSL'])) {
                $prefix = $GLOBALS['TYPO3_CONF_VARS']['SYS']['reverseProxyPrefixSSL'];
                $isVePreviewReverseProxyPrefixSSL = true;
            } elseif (!empty($GLOBALS['TYPO3_CONF_VARS']['SYS']['reverseProxyPrefix'])) {
                $prefix = $GLOBALS['TYPO3_CONF_VARS']['SYS']['reverseProxyPrefix'];
                $isVePreviewReverseProxyPrefix = true;
            }
        }

        if (!self::$forceGeneration && !str_starts_with((string)GeneralUtility::getIndpEnv('REQUEST_URI'), rtrim((string) $prefix, '/') . '/ve-preview/')) {
            // only change the base Urls if requested
            return;
        }

        $this->expressionLanguageVariables = [
            'isVePreviewReverseProxyPrefixSSL' => $isVePreviewReverseProxyPrefixSSL ?? false,
            'isVePreviewReverseProxyPrefix' => $isVePreviewReverseProxyPrefix ?? false,
            'isVePreview' => true,
        ];
    }
}
