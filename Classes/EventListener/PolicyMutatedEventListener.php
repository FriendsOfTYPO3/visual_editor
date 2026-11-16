<?php

declare(strict_types=1);

namespace TYPO3\CMS\VisualEditor\EventListener;

use TYPO3\CMS\Core\Attribute\AsEventListener;
use TYPO3\CMS\Core\Information\Typo3Version;
use TYPO3\CMS\Core\Security\ContentSecurityPolicy\Directive;
use TYPO3\CMS\Core\Security\ContentSecurityPolicy\Event\PolicyMutatedEvent;
use TYPO3\CMS\Core\Security\ContentSecurityPolicy\Event\PolicyPreparedEvent;
use TYPO3\CMS\Core\Security\ContentSecurityPolicy\HashProxy;
use TYPO3\CMS\Core\Security\ContentSecurityPolicy\HashValue;
use TYPO3\CMS\Core\Security\ContentSecurityPolicy\RawValue;
use TYPO3\CMS\Core\Security\ContentSecurityPolicy\SourceKeyword;
use TYPO3\CMS\Core\Security\ContentSecurityPolicy\SourceScheme;
use TYPO3\CMS\VisualEditor\Service\EditModeService;

use function str_starts_with;

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

        // we add all necessary CSP rules, so even if someone sets all Directives to 'none' we have a working Editor.

        // add style-src 'unsafe-inline' to allow a working ckeditor in the frontend.
        $policy = $policy->reduce(Directive::StyleSrc, SourceKeyword::nonceProxy, SourceKeyword::none); // to allow 'unsafe-inline' we first need to remove the nonces
        $policy = $policy->extend(Directive::StyleSrc, SourceKeyword::self, SourceKeyword::unsafeInline);

        if ($policy->has(Directive::StyleSrcAttr)) {
            // add the same to StyleSrcAttr if that is present (fallback chain otherwise)
            $policy = $policy->reduce(Directive::StyleSrcAttr, SourceKeyword::nonceProxy, SourceKeyword::none); // to allow 'unsafe-inline' we first need to remove the nonces
            $policy = $policy->extend(Directive::StyleSrcAttr, SourceKeyword::unsafeInline); // no self as that is not a thing for style-src-attr
        }

        if ($policy->has(Directive::StyleSrcElem)) {
            // add the same to StyleSrcElem if that is present (fallback chain otherwise)
            $policy = $policy->reduce(Directive::StyleSrcElem, SourceKeyword::nonceProxy, SourceKeyword::none); // to allow 'unsafe-inline' we first need to remove the nonces
            $policy = $policy->extend(Directive::StyleSrcElem, SourceKeyword::self, SourceKeyword::unsafeInline);
        }

        $policy = $policy->reduce(Directive::ScriptSrc, SourceKeyword::nonceProxy, SourceKeyword::none);
        $policy = $policy->extend(Directive::ScriptSrc, SourceKeyword::self, SourceKeyword::unsafeInline);

        if ($policy->has(Directive::ScriptSrcElem)) {
            $policy = $policy->reduce(Directive::ScriptSrcElem, SourceKeyword::nonceProxy, SourceKeyword::none);
            $policy = $policy->extend(Directive::ScriptSrcElem, SourceKeyword::self, SourceKeyword::unsafeInline);
        }


        if ($policy->has(Directive::ImgSrc)) {
            $policy = $policy->reduce(Directive::ImgSrc, SourceKeyword::none);
            $policy = $policy->extend(Directive::ImgSrc, SourceKeyword::self, SourceScheme::data);
        }

        if ($policy->has(Directive::FontSrc)) {
            $policy = $policy->reduce(Directive::FontSrc, SourceKeyword::none);
            $policy = $policy->extend(Directive::FontSrc, SourceKeyword::self);
        }

        if ($policy->has(Directive::FrameAncestors)) {
            $policy = $policy->reduce(Directive::FrameAncestors, SourceKeyword::none);
            $policy = $policy->extend(Directive::FrameAncestors, SourceKeyword::self);
        }

        if ($policy->has(Directive::ConnectSrc)) {
            $policy = $policy->reduce(Directive::ConnectSrc, SourceKeyword::none);
            $policy = $policy->extend(Directive::ConnectSrc, SourceKeyword::self);
        }

        if ($policy->has(Directive::TrustedTypes)) {
            $policy = $policy->reduce(Directive::TrustedTypes, SourceKeyword::none);
            $policy = $policy->extend(Directive::TrustedTypes, new RawValue('lit-html'));
        }

        if ($policy->has(Directive::RequireTrustedTypesFor)) {
            $policy = $policy->remove(Directive::RequireTrustedTypesFor);
        }

        if ($policy->has(Directive::Sandbox)) {
            $policy = $policy->remove(Directive::Sandbox);
        }

        // filter out all hashs and nonces
        foreach (Directive::cases() as $directive) {
            if (!$policy->has($directive)) {
                continue;
            }

            $sources = [];
            foreach ($policy->get($directive)->sources ?? [] as $source) {
                if ($source instanceof HashValue) {
                    continue;
                }

                if ($source instanceof HashProxy) {
                    continue;
                }

                if ($source instanceof RawValue) {
                    if (str_starts_with((string)$source, "'sha256-")) {
                        continue;
                    }

                    if (str_starts_with((string)$source, "'sha384-")) {
                        continue;
                    }

                    if (str_starts_with((string)$source, "'sha512-")) {
                        continue;
                    }

                    if (str_starts_with((string)$source, "'nonce-")) {
                        continue;
                    }
                }

                $sources[] = $source;
            }

            $policy = $policy->set($directive, ...$sources);
        }

        $event->setCurrentPolicy($policy);
    }
}
