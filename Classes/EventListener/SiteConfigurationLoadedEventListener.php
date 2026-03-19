<?php

declare(strict_types=1);

namespace TYPO3\CMS\VisualEditor\EventListener;

use TYPO3\CMS\Core\Attribute\AsEventListener;
use TYPO3\CMS\Core\Configuration\Event\SiteConfigurationLoadedEvent;

use function array_unshift;
use function rtrim;

final readonly class SiteConfigurationLoadedEventListener
{
    #[AsEventListener]
    public function __invoke(SiteConfigurationLoadedEvent $event): void
    {
        $id = $event->getSiteIdentifier();
        $configuration = $event->getConfiguration();
        $configuration['baseVariants'] ??= [];


        array_unshift($configuration['baseVariants'], [
            'base' => '/ve-preview/' . $id . '/',
            'condition' => 'isVePreview',
        ]);

        if (!empty($GLOBALS['TYPO3_CONF_VARS']['SYS']['reverseProxyPrefix'])) {
            array_unshift($configuration['baseVariants'], [
                'base' => rtrim((string) $GLOBALS['TYPO3_CONF_VARS']['SYS']['reverseProxyPrefix'], '/') . '/ve-preview/' . $id . '/',
                'condition' => 'isVePreviewReverseProxyPrefix',
            ]);
        }

        if (!empty($GLOBALS['TYPO3_CONF_VARS']['SYS']['reverseProxyPrefixSSL'])) {
            array_unshift($configuration['baseVariants'], [
                'base' => rtrim((string) $GLOBALS['TYPO3_CONF_VARS']['SYS']['reverseProxyPrefixSSL'], '/') . '/ve-preview/' . $id . '/',
                'condition' => 'isVePreviewReverseProxyPrefixSSL',
            ]);
        }

        foreach ($configuration['languages'] as $key => $language) {
            $configuration['languages'][$key]['baseVariants'] ??= [];
            array_unshift($configuration['languages'][$key]['baseVariants'], [
                'base' => '/' . $language['languageId'] . '/',
                'condition' => 'isVePreview',
            ]);
        }

        $event->setConfiguration($configuration);
    }
}
