<?php

declare(strict_types=1);

namespace TYPO3\CMS\VisualEditor\Tests\Functional\Service;

use InvalidArgumentException;
use PHPUnit\Framework\Attributes\Test;
use TYPO3\CMS\VisualEditor\Service\ModelToRawRecordService;
use TYPO3\TestingFramework\Core\Functional\FunctionalTestCase;
use TYPO3Tests\BlogExample\Domain\Model\Administrator;
use TYPO3Tests\BlogExample\Domain\Model\Blog;
use TYPO3Tests\BlogExample\Domain\Model\Post;
use TYPO3Tests\BlogExample\Domain\Model\TtContent;
use TYPO3Tests\BlogExample\Domain\Repository\AdministratorRepository;
use TYPO3Tests\BlogExample\Domain\Repository\BlogRepository;
use TYPO3Tests\BlogExample\Domain\Repository\PostRepository;

final class ModelToRawRecordServiceTest extends FunctionalTestCase
{
    protected array $testExtensionsToLoad = [
        __DIR__ . '/../Fixtures/Extensions/blog_example',
        'typo3conf/ext/visual_editor',
    ];

    protected function setUp(): void
    {
        parent::setUp();
        $this->importCSVDataSet(__DIR__ . '/Fixtures/convert_model_to_raw_record.csv');
    }

    #[Test]
    public function mapsAdministratorToFeUsersAndAddsTypeField(): void
    {
        $administrator = $this->get(AdministratorRepository::class)->findByUid(1);
        self::assertInstanceOf(Administrator::class, $administrator);

        $record = $this->get(ModelToRawRecordService::class)->modelToRawRecord($administrator);

        self::assertSame('fe_users.' . Administrator::class, $record->getFullType());
        self::assertSame('John Doe', $record->get('name'));

        // basic identity + computed properties
        self::assertSame($administrator->getUid(), $record->getUid());
        self::assertSame($administrator->getPid(), $record->getPid());
        self::assertSame($administrator->_getProperty('_versionedUid'), $record->getComputedProperties()->getVersionedUid());
        self::assertSame($administrator->_getProperty('_localizedUid'), $record->getComputedProperties()->getLocalizedUid());

        // record type field should be set for Administrator mapping (Classes.php defines recordType)
        self::assertSame(Administrator::class, $record->get('tx_extbase_type'));

        // fe_users doesn't have a language column in the data map -> must not create an empty/null key
        self::assertFalse($record->has('sys_language_uid'));
    }

    #[Test]
    public function mapsBlogScalarsAndLanguageMetadata(): void
    {
        $blog = $this->get(BlogRepository::class)->findByUid(1);
        self::assertInstanceOf(Blog::class, $blog);

        $record = $this->get(ModelToRawRecordService::class)->modelToRawRecord($blog);

        self::assertSame('tx_blogexample_domain_model_blog', $record->getFullType());
        self::assertSame('New Blog Post', $record->get('title'));
        self::assertSame('This is a new blog post.', $record->get('description'));

        self::assertSame($blog->getUid(), $record->getUid());
        self::assertSame($blog->getPid(), $record->getPid());
        self::assertSame($blog->_getProperty('_versionedUid'), $record->getComputedProperties()->getVersionedUid());
        self::assertSame($blog->_getProperty('_localizedUid'), $record->getComputedProperties()->getLocalizedUid());

        // language uid is mapped to sys_language_uid for this table
        self::assertSame(0, $record->get('sys_language_uid'));

        // record type field should not be added for Blog (no recordType in mapping)
        self::assertFalse($record->has('tx_extbase_type'));

        self::assertFalse($record->has('posts'));
        self::assertFalse($record->has('categories'));
        self::assertFalse($record->has('administrator'));
        self::assertFalse($record->has('logo'));
    }

    #[Test]
    public function includesNullableScalarsAndSkipsRelationsOnNewBlog(): void
    {
        $blog = new Blog();
        $blog->setPid(1);
        $blog->setTitle('t');
        $blog->setDescription('d');
        $blog->setSubtitle(null);

        $record = $this->get(ModelToRawRecordService::class)->modelToRawRecord($blog);

        self::assertSame('tx_blogexample_domain_model_blog', $record->getFullType());
        self::assertSame(0, $record->getUid());
        self::assertSame(1, $record->getPid());
        self::assertSame('t', $record->get('title'));
        self::assertSame('d', $record->get('description'));
        self::assertTrue($record->has('subtitle'), 'The subtitle property should be included in the raw record even if it is null, as it is a scalar value and has a column mapping.');
        self::assertNull($record->get('subtitle'));
        self::assertFalse($record->has('posts'));
        self::assertFalse($record->has('logo'));
        self::assertFalse($record->has('categories'));
        self::assertTrue($record->has('administrator'));
        self::assertNull($record->get('administrator'));
    }

    #[Test]
    public function throwsForTtContentWithoutRequiredTypeField(): void
    {
        $content = new TtContent();
        $content->setPid(1);
        $content->setHeader('Hello');

        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('Missing typeField "CType" in record of requested table "tt_content".');

        $this->get(ModelToRawRecordService::class)->modelToRawRecord($content);
    }

    #[Test]
    public function mapsPostScalarsAndSkipsRelations(): void
    {
        $post = $this->get(PostRepository::class)->findByUid(1);
        self::assertInstanceOf(Post::class, $post);

        $record = $this->get(ModelToRawRecordService::class)->modelToRawRecord($post);

        self::assertSame('tx_blogexample_domain_model_post', $record->getFullType());

        self::assertSame($post->getUid(), $record->getUid());
        self::assertSame($post->getPid(), $record->getPid());
        self::assertSame($post->_getProperty('_versionedUid'), $record->getComputedProperties()->getVersionedUid());
        self::assertSame($post->_getProperty('_localizedUid'), $record->getComputedProperties()->getLocalizedUid());

        self::assertSame('First post for blog 1', $record->get('title'));
        self::assertFalse($record->has('date'));
        self::assertFalse($record->has('blog'));
        self::assertFalse($record->has('categories'));
        self::assertFalse($record->has('related_posts'));
    }
}
