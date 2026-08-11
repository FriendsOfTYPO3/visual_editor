:navigation-title: New content wizard

..  include:: /Includes.rst.txt
..  _visual-editor-modify-new-content-element-wizard-url-parameter-event:
..  index:: PSR-14; ModifyNewContentElementWizardUrlParameterEvent

==============================================
Modify new content element wizard URL parameters
==============================================

Visual Editor dispatches
``ModifyNewContentElementWizardUrlParameterEvent``
immediately before it creates the backend URL for the new content element
wizard. Use this PSR-14 event to pass context from a frontend route to the
wizard.

The event class is
``TYPO3\CMS\VisualEditor\Events\ModifyNewContentElementWizardUrlParameterEvent``.

Event API
=========

``getParameters()`` returns the wizard URL parameters. Modify the complete
array and pass it back with ``setParameters()``. Keep Visual Editor's existing
parameters, including the placeholders used for the chosen content area:
``id``, ``colPos``, ``uid_pid`` and ``returnUrl``. When `EXT:container` is
installed, the array also contains ``tx_container_parent``.

``getUsedArguments()`` returns the current frontend routing arguments. It
combines page and route arguments, but excludes ``cHash`` and ``editMode``.
Use it to read a value from the frontend route; it does not modify routing.

``getRequest()`` returns the original PSR-7 frontend request.

Example: pass a route argument
==============================

The following listener forwards ``tx_myextension[context]`` to the wizard
when that route argument is present:

..  code-block:: php

    <?php

    declare(strict_types=1);

    namespace Vendor\MyExtension\EventListener;

    use TYPO3\CMS\Core\Attribute\AsEventListener;
    use TYPO3\CMS\VisualEditor\Events\ModifyNewContentElementWizardUrlParameterEvent;

    #[AsEventListener]
    final class ModifyNewContentElementWizardUrlParameterEventListener
    {
        public function __invoke(ModifyNewContentElementWizardUrlParameterEvent $event): void
        {
            $context = $event->getUsedArguments()['tx_myextension']['context'] ?? null;
            if ($context === null) {
                return;
            }

            $parameters = $event->getParameters();
            $parameters['myExtensionContext'] = $context;
            $event->setParameters($parameters);
        }
    }

The additional parameter is available from the request handled by TYPO3 Core's
``ModifyNewContentElementWizardItemsEvent``. A listener for that Core event can
use it to adjust the wizard items, for example by setting their default values.

..  important::

    ``setParameters()`` replaces the complete parameter array. Always start
    with ``getParameters()`` and add or change only the parameter required by
    the extension.
