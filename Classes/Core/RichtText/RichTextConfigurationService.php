<?php

declare(strict_types=1);

namespace TYPO3\CMS\VisualEditor\Core\RichtText;

use Psr\EventDispatcher\EventDispatcherInterface;
use TYPO3\CMS\Backend\Routing\UriBuilder;
use TYPO3\CMS\Core\Authentication\BackendUserAuthentication;
use TYPO3\CMS\Core\Core\Environment;
use TYPO3\CMS\Core\Localization\LanguageService;
use TYPO3\CMS\Core\Localization\Locales;
use TYPO3\CMS\Core\Utility\GeneralUtility;
use TYPO3\CMS\Core\Utility\PathUtility;
use TYPO3\CMS\RteCKEditor\Form\Element\Event\AfterGetExternalPluginsEvent;
use TYPO3\CMS\RteCKEditor\Form\Element\Event\AfterPrepareConfigurationForEditorEvent;
use TYPO3\CMS\RteCKEditor\Form\Element\Event\BeforeGetExternalPluginsEvent;
use TYPO3\CMS\RteCKEditor\Form\Element\Event\BeforePrepareConfigurationForEditorEvent;

use function array_replace_recursive;
use function explode;
use function is_array;
use function is_string;
use function max;
use function strtolower;
use function strtoupper;

readonly class RichTextConfigurationService
{
    public function __construct(
        private EventDispatcherInterface $eventDispatcher,
        private UriBuilder $uriBuilder,
        private Locales $locales,
    ) {
    }

    public function resolveCkEditorConfiguration(RichTextConfigurationServiceDto $richTextConfigurationServiceDto): array
    {
        $configuration = $this->prepareConfigurationForEditor($richTextConfigurationServiceDto);

        foreach ($this->getExtraPlugins($richTextConfigurationServiceDto) as $extraPluginName => $extraPluginConfig) {
            $configName = $extraPluginConfig['configName'] ?? $extraPluginName;
            if (!empty($extraPluginConfig['config']) && is_array($extraPluginConfig['config'])) {
                if (empty($configuration[$configName])) {
                    $configuration[$configName] = $extraPluginConfig['config'];
                } elseif (is_array($configuration[$configName])) {
                    $configuration[$configName] = array_replace_recursive($extraPluginConfig['config'], $configuration[$configName]);
                }
            }
        }

        if ($richTextConfigurationServiceDto->placeholder) {
            // Note that HTML tags are stripped here, because CKEditor does not parse placeholder text.
            // Without it, the HTML code would be displayed as-is.
            $configuration['placeholder'] = $richTextConfigurationServiceDto->placeholder;
        }

        return $configuration;
    }

    /**
     * Compiles the configuration set from the outside
     * to have it easily injected into the CKEditor.
     *
     * @return array the configuration
     */
    protected function prepareConfigurationForEditor(RichTextConfigurationServiceDto $richTextConfigurationServiceDto): array
    {
        // Ensure custom config is empty so nothing additional is loaded
        // Of course this can be overridden by the editor configuration below
        $configuration = [
            'customConfig' => '',
            'label' => $richTextConfigurationServiceDto->label,
        ];

        if ($richTextConfigurationServiceDto->readOnly) {
            $configuration['readOnly'] = true;
        }

        $configuration = array_replace_recursive($configuration, $richTextConfigurationServiceDto->getAdditionalConfiguration());

        $configuration = $this->eventDispatcher
            ->dispatch(new BeforePrepareConfigurationForEditorEvent($configuration, $richTextConfigurationServiceDto->getData()))->getConfiguration();

        // Set the UI language of the editor if not hard-coded by the existing configuration
        if (empty($configuration['language']) || (is_array($configuration['language']) && empty($configuration['language']['ui']))) {
            $userLang = (string)($this->getBackendUser()->user['lang'] ?: 'en');
            $configuration['language']['ui'] = $userLang === 'default' ? 'en' : $userLang;
        } elseif (!is_array($configuration['language'])) {
            $configuration['language'] = [
                'ui' => $configuration['language'],
            ];
        }

        $configuration['language']['content'] = $this->getLanguageIsoCodeOfContent($richTextConfigurationServiceDto);

        // Replace all label references
        $configuration = $this->replaceLanguageFileReferences($configuration);
        // Replace all paths
        $configuration = $this->replaceAbsolutePathsToRelativeResourcesPath($configuration);

        // unless explicitly set, the debug mode is enabled in development context
        if (!isset($configuration['debug'])) {
            $configuration['debug'] = ($GLOBALS['TYPO3_CONF_VARS']['BE']['debug'] ?? false) && Environment::getContext()->isDevelopment();
        }

        return $this->eventDispatcher
            ->dispatch(new AfterPrepareConfigurationForEditorEvent($configuration, $richTextConfigurationServiceDto->getData()))->getConfiguration();
    }

    /**
     * Get configuration of external/additional plugins
     */
    protected function getExtraPlugins(RichTextConfigurationServiceDto $richTextConfigurationServiceDto): array
    {
        $externalPlugins = $richTextConfigurationServiceDto->getExternalPlugins();
        $data = $richTextConfigurationServiceDto->getData();
        $externalPlugins = $this->eventDispatcher
            ->dispatch(new BeforeGetExternalPluginsEvent($externalPlugins, $data))->getConfiguration();

        $urlParameters = [
            'P' => [
                'table' => $richTextConfigurationServiceDto->tableName,
                'uid' => $richTextConfigurationServiceDto->uid,
                'fieldName' => $richTextConfigurationServiceDto->fieldName,
                'recordType' => $richTextConfigurationServiceDto->recordTypeValue,
                'pid' => $richTextConfigurationServiceDto->effectivePid,
                'richtextConfigurationName' => $richTextConfigurationServiceDto->richtextConfigurationName,
            ],
        ];

        $pluginConfiguration = [];
        foreach ($externalPlugins as $pluginName => $configuration) {
            $pluginConfiguration[$pluginName] = [
                'configName' => $configuration['configName'] ?? $pluginName,
            ];
            unset($configuration['configName']);
            // CKEditor 4 style config, unused in CKEditor 5 and not forwarded to the resutling plugin config
            unset($configuration['resource']);

            if ($configuration['route'] ?? null) {
                $configuration['routeUrl'] = (string)$this->uriBuilder->buildUriFromRoute($configuration['route'], $urlParameters);
            }

            $pluginConfiguration[$pluginName]['config'] = $configuration;
        }

        return $this->eventDispatcher
            ->dispatch(new AfterGetExternalPluginsEvent($pluginConfiguration, $data))->getConfiguration();
    }

    /**
     * Determine the contents language iso code
     */
    protected function getLanguageIsoCodeOfContent(RichTextConfigurationServiceDto $richTextConfigurationServiceDto): string
    {
        $data = $richTextConfigurationServiceDto->getData();
        $currentLanguageUid = ($data['databaseRow']['sys_language_uid'] ?? 0);
        if (is_array($currentLanguageUid)) {
            $currentLanguageUid = $currentLanguageUid[0];
        }

        $contentLanguageUid = (int)max($currentLanguageUid, 0);
        if ($contentLanguageUid) {
            // the language rows might not be fully initialized, so we fall back to en-US in this case
            $contentLanguage = $data['systemLanguageRows'][$currentLanguageUid]['iso'] ?? 'en-US';
        } else {
            $contentLanguage = $richTextConfigurationServiceDto->getAdditionalConfiguration()['defaultContentLanguage'] ?? 'en-US';
        }

        $languageCodeParts = explode('_', $contentLanguage);
        $contentLanguage = strtolower($languageCodeParts[0]) . (empty($languageCodeParts[1]) ? '' : '_' . strtoupper($languageCodeParts[1]));
        // Find the configured language in the list of localization locales, if not found, default to 'en'.
        if ($contentLanguage === 'default' || !$this->locales->isValidLanguageKey($contentLanguage)) {
            return 'en';
        }

        return $contentLanguage;
    }

    /**
     * Add configuration to replace LLL: references with the translated value
     */
    protected function replaceLanguageFileReferences(array $configuration): array
    {
        foreach ($configuration as $key => $value) {
            if (is_array($value)) {
                $configuration[$key] = $this->replaceLanguageFileReferences($value);
            } elseif (is_string($value)) {
                $configuration[$key] = $this->getLanguageService()->sL($value);
            }
        }

        return $configuration;
    }

    /**
     * Add configuration to replace absolute EXT: paths with relative ones
     */
    protected function replaceAbsolutePathsToRelativeResourcesPath(array $configuration): array
    {
        foreach ($configuration as $key => $value) {
            if (is_array($value)) {
                $configuration[$key] = $this->replaceAbsolutePathsToRelativeResourcesPath($value);
            } elseif (is_string($value) && PathUtility::isExtensionPath(strtoupper($value))) {
                $configuration[$key] = $this->resolveUrlPath($value);
            }
        }

        return $configuration;
    }

    /**
     * Resolves an EXT: syntax file to an absolute web URL
     */
    protected function resolveUrlPath(string $value): string
    {
        if (str_contains($value, '?')) {
            return PathUtility::getPublicResourceWebPath($value);
        }

        $value = GeneralUtility::getFileAbsFileName($value);
        $value = GeneralUtility::createVersionNumberedFilename($value);
        return PathUtility::getAbsoluteWebPath($value);
    }

    protected function getBackendUser(): BackendUserAuthentication
    {
        return $GLOBALS['BE_USER'];
    }

    protected function getLanguageService(): LanguageService
    {
        return $GLOBALS['LANG'];
    }
}
