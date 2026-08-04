<?php

declare(strict_types=1);

namespace TYPO3\CMS\VisualEditor\EventListener;

use TYPO3\CMS\Core\Attribute\AsEventListener;
use TYPO3\CMS\Core\Information\Typo3Version;
use TYPO3\CMS\Core\Security\ContentSecurityPolicy\Directive;
use TYPO3\CMS\Core\Security\ContentSecurityPolicy\Event\PolicyMutatedEvent;
use TYPO3\CMS\Core\Security\ContentSecurityPolicy\Event\PolicyPreparedEvent;
use TYPO3\CMS\Core\Security\ContentSecurityPolicy\SourceKeyword;
use TYPO3\CMS\VisualEditor\Service\EditModeService;

final readonly class PolicyMutatedEventListener
{
    public function __construct(
        private EditModeService $editModeService,
        private Typo3Version $typo3Version,
    ) {
    }

    #[AsEventListener]
    public function policyPreparedEvent(PolicyPreparedEvent $event): void
    {
        if (!$this->editModeService->isEditMode($event->request)) {
            return;
        }

        if ($this->typo3Version->getMajorVersion() <= 13) {
            // hash is a TYPO3 >= 14 feature only
            return;
        }

        // until the BE context is using hashs we should enforce the usage if hashs (only in edit mode)
        // the ckeditor is not working nicely with CSP hashes so we need to use nonce for now.
        // as the Visual Editor disables the cache the main benefit of hash's are not important here.
        if ($event->policyBag->behavior->useHash === true) {
            $event->policyBag->behavior->useHash = false;
            $event->policyBag->behavior->useNonce = true;
        }
    }

    #[AsEventListener]
    public function __invoke(PolicyMutatedEvent $event): void
    {
        $request = $event->request ?? $GLOBALS['TYPO3_REQUEST'] ?? null;
        if (!$request) {
            return;
        }

        if (!$this->editModeService->isEditMode($request)) {
            return;
        }

        $policy = $event->getCurrentPolicy();

        // add style-src 'unsafe-inline' to allow a working ckeditor in the frontend.
        $policy = $policy->reduce(Directive::StyleSrc, SourceKeyword::nonceProxy); // to allow 'unsafe-inline' we first need to remove the nonces
        $policy = $policy->extend(Directive::StyleSrc, SourceKeyword::self, SourceKeyword::unsafeInline);

        if ($policy->has(Directive::StyleSrcAttr)) {
            // add the same to StyleSrcAttr if that is present
            $policy = $policy->reduce(Directive::StyleSrcAttr, SourceKeyword::nonceProxy); // to allow 'unsafe-inline' we first need to remove the nonces
            $policy = $policy->extend(Directive::StyleSrcAttr, SourceKeyword::unsafeInline);
        }

        $event->setCurrentPolicy($policy);
    }
}
