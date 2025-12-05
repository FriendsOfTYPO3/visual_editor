<?php

declare(strict_types=1);

namespace Andersundsehr\Editara\ViewHelpers;

use Andersundsehr\Editara\Service\EditaraService;
use TYPO3Fluid\Fluid\Core\ViewHelper\AbstractConditionViewHelper;

final class EditmodeViewHelper extends AbstractConditionViewHelper
{
    public function __construct(
        private readonly EditaraService $editaraService,
    ) {}


    /**
     * Renders <f:then> child if $condition is true, otherwise renders <f:else> child.
     *
     * @return mixed
     * @api
     */
    public function render()
    {
        if ($this->editaraService->isEditMode()) {
            return $this->renderThenChild();
        }
        return $this->renderElseChild();
    }
}
