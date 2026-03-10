<?php

declare(strict_types=1);

namespace TYPO3\CMS\VisualEditor\ViewHelpers;

use InvalidArgumentException;
use Psr\Http\Message\ServerRequestInterface;
use TYPO3\CMS\VisualEditor\Service\EditModeService;
use TYPO3Fluid\Fluid\Core\ViewHelper\AbstractConditionViewHelper;

/**
 * ViewHelper which renders the <f:then> child if the current request is in edit mode, otherwise renders the <f:else> child.
 *
 * For example, you have a Sticky header which should not be sticky in edit mode:
 *
 * ```html
 * <header class="{f:editMode(then: 'edit-mode')}">
 * ```
 *
 * and in CSS:
 * ```css
 * .edit-mode {
 *     position: absolute;
 * }
 * ```
 */
final class EditModeViewHelper extends AbstractConditionViewHelper
{
    public function __construct(
        private readonly EditModeService $editModeService,
    ) {
    }

    /**
     * Renders <f:then> child if $condition is true, otherwise renders <f:else> child.
     * @api
     */
    public function render(): mixed
    {
        $renderingContext = $this->renderingContext ?? throw new InvalidArgumentException('$this->renderingContext is not available', 1772464146);
        $request = $renderingContext->getAttribute(ServerRequestInterface::class);

        if ($this->editModeService->isEditMode($request)) {
            return $this->renderThenChild();
        }

        return $this->renderElseChild();
    }
}
