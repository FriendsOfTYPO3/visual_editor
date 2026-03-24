<?php

declare(strict_types=1);

namespace TYPO3\CMS\VisualEditor\Tests\Unit\BackwardsCompatibility;

use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\TestCase;
use TYPO3\CMS\VisualEditor\BackwardsCompatibility\ContentArea;

final class ContentAreaTest extends TestCase
{
    #[Test]
    public function exposesConstructorValuesAndConfiguration(): void
    {
        $subject = new ContentArea(
            colPos: 42,
            name: 'main',
            tx_container_parent: 17,
            allowedContentTypes: ['text', 'textmedia'],
            disallowedContentTypes: ['shortcut']
        );

        self::assertSame(42, $subject->getColPos());
        self::assertSame('main', $subject->getName());
        self::assertSame(
            ['tx_container_parent' => 17],
            $subject->getConfiguration()
        );
        self::assertSame(['text', 'textmedia'], $subject->getAllowedContentTypes());
        self::assertSame(['shortcut'], $subject->getDisallowedContentTypes());
    }

    #[Test]
    public function returnsEmptyListsByDefault(): void
    {
        $subject = new ContentArea(
            colPos: 0,
            name: 'empty',
            tx_container_parent: 0
        );

        self::assertSame([], $subject->getAllowedContentTypes());
        self::assertSame([], $subject->getDisallowedContentTypes());
        self::assertSame(['tx_container_parent' => 0], $subject->getConfiguration());
    }
}
