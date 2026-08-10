<?php

declare(strict_types=1);

namespace TYPO3\CMS\VisualEditor\Events;

use Psr\Http\Message\ServerRequestInterface;

final class ModifyNewContentElementWizardUrlParameterEvent
{
    /**
     * @param array<string, mixed> $parameters
     * @param array<string, mixed> $usedArguments
     */
    public function __construct(
        private array $parameters,
        private readonly array $usedArguments,
        private readonly ServerRequestInterface $request,
    ) {
    }

    /**
     * @return array<string, mixed>
     */
    public function getParameters(): array
    {
        return $this->parameters;
    }

    /**
     * @param array<string, mixed> $parameters
     */
    public function setParameters(array $parameters): void
    {
        $this->parameters = $parameters;
    }

    /**
     * @return array<string, mixed>
     */
    public function getUsedArguments(): array
    {
        return $this->usedArguments;
    }

    public function getRequest(): ServerRequestInterface
    {
        return $this->request;
    }
}
