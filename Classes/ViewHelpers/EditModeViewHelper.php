<?php

declare(strict_types=1);

namespace TYPO3\CMS\VisualEditor\ViewHelpers;

use TYPO3\CMS\VisualEditor\Service\EditModeService;
use TYPO3Fluid\Fluid\Core\ViewHelper\AbstractConditionViewHelper;

final class EditModeViewHelper extends AbstractConditionViewHelper
{
    public function __construct(
        private readonly EditModeService $editModeService,
    ) {}


    /**
     * Renders <f:then> child if $condition is true, otherwise renders <f:else> child.
     * @api
     */
    public function render(): mixed
    {
        if ($this->editModeService->isEditMode()) {
            return $this->renderThenChild();
        }
        return $this->renderElseChild();
    }
}
