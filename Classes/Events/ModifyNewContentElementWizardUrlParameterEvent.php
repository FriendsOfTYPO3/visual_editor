<?php

declare(strict_types=1);

namespace TYPO3\CMS\VisualEditor\Events;

use Psr\Http\Message\ServerRequestInterface;

final class ModifyNewContentElementWizardUrlParameterEvent
{
    public function __construct(
        private array $parameters,
        private readonly array $usedArguments,
        private readonly ServerRequestInterface $request,
    ) {
    }

    public function getParameters(): array
    {
        return $this->parameters;
    }

    public function setParameters(array $parameters): void
    {
        $this->parameters = $parameters;
    }

    public function getUsedArguments(): array
    {
        return $this->usedArguments;
    }

    public function getRequest(): ServerRequestInterface
    {
        return $this->request;
    }
}
