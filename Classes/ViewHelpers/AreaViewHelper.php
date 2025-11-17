<?php

declare(strict_types=1);

namespace Andersundsehr\Editara\ViewHelpers;

use Andersundsehr\Editara\Service\BrickService;
use Andersundsehr\Editara\Service\BrickTemplateService;
use Psr\Http\Message\ServerRequestInterface;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use TYPO3\CMS\Core\Cache\Frontend\FrontendInterface;
use TYPO3\CMS\Core\Domain\Record;
use TYPO3\CMS\Core\Utility\GeneralUtility;
use TYPO3\CMS\Core\View\ViewFactoryData;
use TYPO3\CMS\Core\View\ViewFactoryInterface;
use TYPO3Fluid\Fluid\Core\ViewHelper\AbstractViewHelper;
use function assert;
use function str_replace;

final class AreaViewHelper extends AbstractViewHelper
{
    /**
     * @var bool
     */
    protected $escapeOutput = false;

    public function __construct(
        private readonly BrickService $brickService,
        private readonly BrickTemplateService $brickTemplateService,
        private readonly ViewFactoryInterface $viewFactory,
        #[Autowire(service: 'cache.runtime')]
        private readonly FrontendInterface $runtimeCache,
    )
    {
    }

    public function initializeArguments(): void
    {
        parent::initializeArguments();
        $this->registerArgument('name', 'string', 'The area name', true);
    }

    public function render(): string
    {
        $name = $this->arguments['name'];

        $parent = $this->brickService->getTemplateBrick($this->renderingContext);

        $cacheKey = str_replace('\\', '_', __CLASS__) . '_' . $parent->getUid() . '_' . $name;
        if ($this->runtimeCache->has($cacheKey)) {
            // enforce single call per editable per rendering
            throw new \RuntimeException('area already exists in templateBrick:' . $parent->getUid());
        }
        $this->runtimeCache->set($cacheKey, true);

        $result = '';
        $editMode = $this->brickService->isEditMode();

        foreach ($parent->get('children') as $templateBrick) {
            assert($templateBrick instanceof Record);
            if ($templateBrick->get('area_name') !== $name) {
                continue;
            }

            if ($editMode) {
                $attributes = [
                    'area-name' => $name,
                    'uid' => $templateBrick->getUid(),
                    'parent-uid' => $parent->getUid(),
                ];
                $result .= '<editara-area-brick ' . GeneralUtility::implodeAttributes($attributes) . '>';
            }
            $result .= $this->renderTemplate($templateBrick);
            if ($editMode) {
                $result .= "</editara-area-brick>";
            }
        }
        if (!$result) {
            return 'HERE could be an area: ' . $name;
        }
        return $result;
    }

    private function renderTemplate(Record $templateBrick): string
    {
        $brickTemplate = $this->brickTemplateService->get($templateBrick->get('template_name'));

        $templatePaths = $this->renderingContext->getTemplatePaths();
        $request = $this->renderingContext->getAttribute(ServerRequestInterface::class);
        $viewFactoryData = GeneralUtility::makeInstance(
            ViewFactoryData::class,
            $templatePaths->getTemplateRootPaths(),
            $templatePaths->getPartialRootPaths(),
            $templatePaths->getLayoutRootPaths(),
            $brickTemplate->templatePath,
            $request,
        );
        $view = $this->viewFactory->create($viewFactoryData);

        // TODO give defined variables only
//        $view->assignMultiple($this->templateVariableContainer->getAll());
        $view->assign('editara___templateBrick', $templateBrick);

        return $view->render();
    }
}
