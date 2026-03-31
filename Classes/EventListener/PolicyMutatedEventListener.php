<?php

declare(strict_types=1);

namespace TYPO3\CMS\VisualEditor\EventListener;

use TYPO3\CMS\Core\Attribute\AsEventListener;
use TYPO3\CMS\Core\Security\ContentSecurityPolicy\Directive;
use TYPO3\CMS\Core\Security\ContentSecurityPolicy\Event\PolicyMutatedEvent;
use TYPO3\CMS\Core\Security\ContentSecurityPolicy\Mutation;
use TYPO3\CMS\Core\Security\ContentSecurityPolicy\MutationMode;
use TYPO3\CMS\Core\Security\ContentSecurityPolicy\SourceKeyword;
use TYPO3\CMS\VisualEditor\Service\EditModeService;

final readonly class PolicyMutatedEventListener
{
    public function __construct(private EditModeService $editModeService)
    {
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

        // add style-src 'unsafe-inline' to allow a working ckeditor in the frontend.
        $mutation = new Mutation(MutationMode::Extend, Directive::StyleSrc, SourceKeyword::self, SourceKeyword::unsafeInline);
        $event->getCurrentPolicy()->mutate($mutation);

        if ($event->getCurrentPolicy()->get(Directive::StyleSrcAttr)) {
            $mutation = new Mutation(MutationMode::Extend, Directive::StyleSrcAttr, SourceKeyword::unsafeInline);
            $event->getCurrentPolicy()->mutate($mutation);
        }
    }
}
