<?php declare(strict_types=1);

namespace Shopware\Core\Framework\Test\DataAbstractionLayer\Write;

use Doctrine\DBAL\Connection;
use PHPUnit\Framework\TestCase;
use Shopware\Core\Framework\Context;
use Shopware\Core\Framework\DataAbstractionLayer\DefinitionInstanceRegistry;
use Shopware\Core\Framework\DataAbstractionLayer\Write\EntityWriter;
use Shopware\Core\Framework\DataAbstractionLayer\Write\WriteContext;
use Shopware\Core\Framework\Test\DataAbstractionLayer\Write\Entity\DeleteCascadeChildDefinition;
use Shopware\Core\Framework\Test\DataAbstractionLayer\Write\Entity\DeleteCascadeManyToOneDefinition;
use Shopware\Core\Framework\Test\DataAbstractionLayer\Write\Entity\DeleteCascadeParentDefinition;
use Shopware\Core\Framework\Test\TestCaseBase\IntegrationTestBehaviour;
use Shopware\Core\Framework\Uuid\Uuid;

class DeleteTest extends TestCase
{
    use IntegrationTestBehaviour;

    /**
     * @var EntityWriter
     */
    private $writer;

    protected function setUp(): void
    {
        $this->writer = $this->getContainer()->get(EntityWriter::class);

        $this->getContainer()->set(DeleteCascadeParentDefinition::class, new DeleteCascadeParentDefinition());
        $this->getContainer()->set(DeleteCascadeManyToOneDefinition::class, new DeleteCascadeManyToOneDefinition());
        $this->getContainer()->set(DeleteCascadeChildDefinition::class, new DeleteCascadeChildDefinition());

        $registry = $this->getContainer()->get(DefinitionInstanceRegistry::class);
        $this->getContainer()->get(DeleteCascadeParentDefinition::class)->compile($registry);
        $this->getContainer()->get(DeleteCascadeManyToOneDefinition::class)->compile($registry);
        $this->getContainer()->get(DeleteCascadeChildDefinition::class)->compile($registry);

        $this->getContainer()->get(Connection::class)->executeUpdate(
            'DROP TABLE IF EXISTS delete_cascade_child;
             DROP TABLE IF EXISTS delete_cascade_parent;
             DROP TABLE IF EXISTS delete_cascade_many_to_one;
             
             CREATE TABLE `delete_cascade_parent` (
               `id` binary(16) NOT NULL,
               `delete_cascade_many_to_one_id` binary(16) NOT NULL,
               `name` varchar(255) NOT NULL,
               `version_id` binary(16) NOT NULL,
               `created_at` DATETIME(3) NOT NULL,
               `updated_at` DATETIME(3) NULL,
               PRIMARY KEY `primary` (`id`, `version_id`)
             );
             
             CREATE TABLE `delete_cascade_child` (
               `id` binary(16) NOT NULL,
               `delete_cascade_parent_id` binary(16) NOT NULL,
               `delete_cascade_parent_version_id` binary(16) NOT NULL,
               `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
               `created_at` DATETIME(3) NOT NULL,
               `updated_at` DATETIME(3) NULL,
               KEY `delete_cascade_parent_id` (`delete_cascade_parent_id`,`delete_cascade_parent_version_id`),
               CONSTRAINT `delete_cascade_child_ibfk_1` FOREIGN KEY (`delete_cascade_parent_id`, `delete_cascade_parent_version_id`)
                   REFERENCES `delete_cascade_parent` (`id`, `version_id`) ON DELETE CASCADE
             ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
             
             CREATE TABLE `delete_cascade_many_to_one` (
               `id` binary(16) NOT NULL,
               `name` varchar(255) NOT NULL,
               `created_at` DATETIME(3) NOT NULL,
               `updated_at` DATETIME(3) NULL,
               PRIMARY KEY `primary` (`id`)
             );
             
             ALTER TABLE `delete_cascade_parent`
             ADD FOREIGN KEY (`delete_cascade_many_to_one_id`) REFERENCES `delete_cascade_many_to_one` (`id`) ON DELETE CASCADE;'
        );
    }

    public function tearDown(): void
    {
        $this->getContainer()->get(Connection::class)->exec(
            'DROP TABLE IF EXISTS delete_cascade_child;
             DROP TABLE IF EXISTS delete_cascade_parent;
             DROP TABLE IF EXISTS delete_cascade_many_to_one;'
        );
    }

    public function testDeleteOneToManyIfParentHasVersionId(): void
    {
        $id = Uuid::randomHex();

        $this->writer->insert(
            $this->getContainer()->get(DeleteCascadeParentDefinition::class),
            [
                [
                    'id' => $id,
                    'productNumber' => Uuid::randomHex(),
                    'name' => 'test',
                    'manyToOne' => [
                        'id' => $id,
                        'name' => 'test child',
                    ],
                    'cascades' => [
                        ['id' => $id, 'name' => 'test child'],
                    ],
                ],
            ],
            WriteContext::createFromContext(Context::createDefaultContext())
        );

        $parents = $this->getContainer()->get(Connection::class)->fetchAll('SELECT * FROM delete_cascade_parent');
        static::assertCount(1, $parents);

        $children = $this->getContainer()->get(Connection::class)->fetchAll('SELECT * FROM delete_cascade_child');
        static::assertCount(1, $children);

        $this->writer->delete(
            $this->getContainer()->get(DeleteCascadeParentDefinition::class),
            [
                ['id' => $id],
            ],
            WriteContext::createFromContext(Context::createDefaultContext())
        );

        $parents = $this->getContainer()->get(Connection::class)->fetchAll('SELECT * FROM delete_cascade_parent');
        static::assertCount(0, $parents);

        $children = $this->getContainer()->get(Connection::class)->fetchAll('SELECT * FROM delete_cascade_child');
        static::assertCount(0, $children);
    }

    public function testDeleteOneToManyIfChildHasVersionId(): void
    {
        $id = Uuid::randomHex();

        $this->writer->insert(
            $this->getContainer()->get(DeleteCascadeParentDefinition::class),
            [
                [
                    'id' => $id,
                    'productNumber' => Uuid::randomHex(),
                    'name' => 'test',
                    'manyToOne' => [
                        'id' => $id,
                        'name' => 'test child',
                    ],
                    'cascades' => [
                        ['id' => $id, 'name' => 'test child'],
                    ],
                ],
            ],
            WriteContext::createFromContext(Context::createDefaultContext())
        );

        $parents = $this->getContainer()->get(Connection::class)->fetchAll('SELECT * FROM delete_cascade_parent');
        static::assertCount(1, $parents);

        $children = $this->getContainer()->get(Connection::class)->fetchAll('SELECT * FROM delete_cascade_child');
        static::assertCount(1, $children);

        $manyToOne = $this->getContainer()->get(Connection::class)->fetchAll('SELECT * FROM delete_cascade_many_to_one');
        static::assertCount(1, $manyToOne);

        $this->writer->delete(
            $this->getContainer()->get(DeleteCascadeManyToOneDefinition::class),
            [
                ['id' => $id],
            ],
            WriteContext::createFromContext(Context::createDefaultContext())
        );

        $parents = $this->getContainer()->get(Connection::class)->fetchAll('SELECT * FROM delete_cascade_parent');
        static::assertCount(0, $parents);

        $children = $this->getContainer()->get(Connection::class)->fetchAll('SELECT * FROM delete_cascade_child');
        static::assertCount(0, $children);

        $manyToOne = $this->getContainer()->get(Connection::class)->fetchAll('SELECT * FROM delete_cascade_many_to_one');
        static::assertCount(0, $manyToOne);
    }
}
