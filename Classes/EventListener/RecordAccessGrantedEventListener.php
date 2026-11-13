<?php

declare(strict_types=1);

namespace TYPO3\CMS\VisualEditor\EventListener;

use Symfony\Component\DependencyInjection\Attribute\Autoconfigure;
use TYPO3\CMS\Core\Attribute\AsEventListener;
use TYPO3\CMS\Core\Domain\Access\RecordAccessGrantedEvent;
use TYPO3\CMS\Core\Schema\Capability\TcaSchemaCapability;
use TYPO3\CMS\Core\Schema\TcaSchemaFactory;
use TYPO3\CMS\VisualEditor\Context\EditModeAspect;

/**
 * Shows hidden records of the tables of the extension configuration showHiddenRecordsOfTables
 * (by default tt_content) in edit mode in RecordAccessVoter::accessGranted(), which is used
 * e.g. by PageRepository::versionOL() in a workspace preview of TYPO3 v14.
 *
 * The voter checks the record without its hidden flag, so starttime, endtime and the user groups still apply.
 * All other tables keep the behavior of the core.
 */
#[AsEventListener('visual-editor/show-hidden-records-in-record-access')]
#[Autoconfigure(public: true)]
final readonly class RecordAccessGrantedEventListener
{
    public function __construct(
        private TcaSchemaFactory $tcaSchemaFactory,
    ) {
    }

    public function __invoke(RecordAccessGrantedEvent $event): void
    {
        $table = $event->getTable();
        if (!EditModeAspect::showsHiddenRecordsOf($event->getContext(), $table) || !$this->tcaSchemaFactory->has($table)) {
            return;
        }

        $schema = $this->tcaSchemaFactory->get($table);
        if (!$schema->hasCapability(TcaSchemaCapability::RestrictionDisabledField)) {
            return;
        }

        $hiddenFieldName = $schema->getCapability(TcaSchemaCapability::RestrictionDisabledField)->getFieldName();
        $record = $event->getRecord();
        if (!(bool)($record[$hiddenFieldName] ?? false)) {
            return;
        }

        $record[$hiddenFieldName] = 0;
        $event->updateRecord($record);
    }
}
