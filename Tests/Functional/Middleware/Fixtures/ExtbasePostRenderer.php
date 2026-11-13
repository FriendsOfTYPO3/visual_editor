<?php

declare(strict_types=1);

namespace TYPO3\CMS\VisualEditor\Tests\Functional\Middleware\Fixtures;

use Psr\Http\Message\ServerRequestInterface;
use TYPO3\CMS\Core\Attribute\AsAllowedCallable;
use TYPO3\CMS\Core\Utility\GeneralUtility;
use TYPO3\CMS\Extbase\Configuration\ConfigurationManagerInterface;
use TYPO3\CMS\Extbase\Persistence\QueryInterface;
use TYPO3Tests\BlogExample\Domain\Repository\PostRepository;

use function htmlspecialchars;

/**
 * Renders the blog posts with an Extbase repository, so the hidden records test covers the Extbase
 * query parser and its language and workspace overlays.
 *
 * Called as USER content object, which creates it with GeneralUtility::makeInstance() without constructor
 * arguments, and classes in Tests/ are no services. So the services are taken from the container directly.
 */
final readonly class ExtbasePostRenderer
{
    /**
     * @param array<string, mixed> $configuration
     */
    #[AsAllowedCallable]
    public function render(string $content, array $configuration, ServerRequestInterface $request): string
    {
        GeneralUtility::getContainer()->get(ConfigurationManagerInterface::class)->setRequest($request);

        $query = GeneralUtility::makeInstance(PostRepository::class)->createQuery();
        $query->getQuerySettings()->setStoragePageIds([1]);
        if ((bool)($configuration['ignoreHiddenField'] ?? false)) {
            $query->getQuerySettings()->setIgnoreEnableFields(true)->setEnableFieldsToBeIgnored(['disabled']);
        }

        $query->setOrderings(['uid' => QueryInterface::ORDER_ASCENDING]);

        foreach ($query->execute() as $post) {
            $content .= '<li>' . htmlspecialchars($post->getTitle()) . '</li>';
        }

        return $content;
    }
}
