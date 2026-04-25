<?php

declare(strict_types=1);

namespace TYPO3\CMS\VisualEditor\ViewHelpers;

use Psr\Http\Message\ServerRequestInterface;
use ReflectionClass;
use RuntimeException;
use Throwable;
use TYPO3\CMS\Backend\Routing\UriBuilder;
use TYPO3\CMS\Core\Http\NormalizedParams;
use TYPO3\CMS\Core\Information\Typo3Version;
use TYPO3\CMS\Core\Resource\File;
use TYPO3\CMS\Core\Resource\FileReference;
use TYPO3\CMS\Extbase\Service\ImageService;
use TYPO3\CMS\Fluid\ViewHelpers\ImageViewHelper as CoreImageViewHelper;
use TYPO3\CMS\VisualEditor\Service\EditModeService;
use TYPO3Fluid\Fluid\Core\ViewHelper\AbstractTagBasedViewHelper;

use function htmlspecialchars;
use function json_encode;

use const ENT_QUOTES;
use const ENT_SUBSTITUTE;
use const JSON_THROW_ON_ERROR;

final class ImageViewHelper extends AbstractTagBasedViewHelper
{
    /**
     * We shadow TYPO3's core f:image and delegate rendering to the core ViewHelper.
     * Only the data-veedit enrichment belongs to this class.
     *
     * @var string
     */
    protected $tagName = 'img';

    public function __construct(
        private readonly UriBuilder $uriBuilder,
        private readonly ImageService $imageService,
        private readonly EditModeService $editModeService,
        private readonly Typo3Version $typo3Version,
    ) {
        parent::__construct();
    }

    public function initializeArguments(): void
    {
        $reflection = new ReflectionClass(CoreImageViewHelper::class);
        $instance = $reflection->newInstanceWithoutConstructor();
        $instance->initializeArguments();

        $this->argumentDefinitions = $instance->argumentDefinitions;
    }

    public function render(): string
    {
        $renderingContext = $this->renderingContext ?? throw new RuntimeException('$this->renderingContext is not available', 1772888895);
        $renderedTag = $renderingContext->getViewHelperInvoker()->invoke(
            CoreImageViewHelper::class,
            array_merge($this->arguments, $this->additionalArguments),
            $renderingContext,
        );

        if (!$this->renderingContext->hasAttribute(ServerRequestInterface::class)) {
            return $renderedTag;
        }

        $request = $this->renderingContext->getAttribute(ServerRequestInterface::class);
        if (!$this->editModeService->isEditMode($request)) {
            return $renderedTag;
        }

        $visualEditorPayload = $this->buildVisualEditorPayload($request);
        if ($visualEditorPayload === null) {
            return $renderedTag;
        }

        $attributeValue = json_encode($visualEditorPayload, JSON_THROW_ON_ERROR);
        return $this->injectAttribute($renderedTag, 'data-veedit', $attributeValue);
    }

    /**
     * @return array{url: string, editUrl: string}|null
     */
    private function buildVisualEditorPayload(ServerRequestInterface $request): ?array
    {
        $image = $this->resolveImage();
        if (!$image instanceof File && !$image instanceof FileReference) {
            return null;
        }

        if ($image instanceof File) {
            $fields = [];
            $table = 'sys_file';
            $uid = (int)$image->getProperty('uid');
        } else {
            $fields = [(string)$image->getProperty('fieldname')];
            $table = (string)$image->getProperty('tablenames');
            $uid = (int)$image->getProperty('uid_foreign');
        }

        if ($uid <= 0 || $table === '') {
            return null;
        }

        $normalizedParams = $request->getAttribute('normalizedParams');
        if (!$normalizedParams instanceof NormalizedParams) {
            return null;
        }

        $backendEditUrl = (string)$this->editModeService->getBackendEditUrl($request);
        $editParams = [
            'edit' => [$table => [$uid => 'edit']],
            'columnsOnly' => [$table => $fields],
            'returnUrl' => $backendEditUrl,
        ];

        $url = '';
        if ($this->typo3Version->getMajorVersion() >= 14) {
            $url = (string)$this->uriBuilder->buildUriFromRoute('record_edit_contextual', $editParams);
        }

        return [
            'url' => $url,
            'editUrl' => (string)$this->uriBuilder->buildUriFromRoute('record_edit', $editParams),
        ];
    }

    private function resolveImage(): File|FileReference|null
    {
        try {
            $image = $this->imageService->getImage(
                (string)$this->arguments['src'],
                $this->arguments['image'],
                (bool)$this->arguments['treatIdAsReference'],
            );
        } catch (Throwable) {
            return null;
        }

        return ($image instanceof File || $image instanceof FileReference) ? $image : null;
    }

    private function injectAttribute(string $tag, string $attributeName, string $attributeValue): string
    {
        $tagEndPosition = strrpos($tag, '>');
        if ($tagEndPosition === false) {
            return $tag;
        }

        $insertPosition = $tagEndPosition;
        if ($tagEndPosition > 0 && $tag[$tagEndPosition - 1] === '/') {
            $insertPosition--;
        }

        return substr($tag, 0, $insertPosition)
            . ' '
            . $attributeName
            . '="'
            . htmlspecialchars($attributeValue, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8')
            . '"'
            . substr($tag, $insertPosition);
    }
}
