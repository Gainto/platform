<?php declare(strict_types=1);

namespace Shopware\Api\Product\Definition;

use Shopware\Api\Entity\EntityDefinition;
use Shopware\Api\Entity\EntityExtensionInterface;
use Shopware\Api\Entity\Field\DateField;
use Shopware\Api\Entity\Field\FkField;
use Shopware\Api\Entity\Field\IdField;
use Shopware\Api\Entity\Field\LongTextField;
use Shopware\Api\Entity\Field\ManyToOneAssociationField;
use Shopware\Api\Entity\Field\OneToManyAssociationField;
use Shopware\Api\Entity\Field\ReferenceVersionField;
use Shopware\Api\Entity\Field\StringField;
use Shopware\Api\Entity\Field\TranslatedField;
use Shopware\Api\Entity\Field\TranslationsAssociationField;
use Shopware\Api\Entity\FieldCollection;
use Shopware\Api\Entity\Write\Flag\CascadeDelete;
use Shopware\Api\Entity\Write\Flag\PrimaryKey;
use Shopware\Api\Entity\Write\Flag\Required;
use Shopware\Api\Entity\Write\Flag\RestrictDelete;
use Shopware\Api\Media\Definition\MediaDefinition;
use Shopware\Api\Product\Collection\ProductManufacturerBasicCollection;
use Shopware\Api\Product\Collection\ProductManufacturerDetailCollection;
use Shopware\Api\Product\Event\ProductManufacturer\ProductManufacturerDeletedEvent;
use Shopware\Api\Product\Event\ProductManufacturer\ProductManufacturerWrittenEvent;
use Shopware\Api\Product\Repository\ProductManufacturerRepository;
use Shopware\Api\Product\Struct\ProductManufacturerBasicStruct;
use Shopware\Api\Product\Struct\ProductManufacturerDetailStruct;
use Shopware\Api\Entity\Field\VersionField;
class ProductManufacturerDefinition extends EntityDefinition
{
    /**
     * @var FieldCollection
     */
    protected static $primaryKeys;

    /**
     * @var FieldCollection
     */
    protected static $fields;

    /**
     * @var EntityExtensionInterface[]
     */
    protected static $extensions = [];

    public static function getEntityName(): string
    {
        return 'product_manufacturer';
    }

    public static function getFields(): FieldCollection
    {
        if (self::$fields) {
            return self::$fields;
        }

        self::$fields = new FieldCollection([ 
            (new IdField('id', 'id'))->setFlags(new PrimaryKey(), new Required()),
            new VersionField(),
            new FkField('media_id', 'mediaId', MediaDefinition::class),
            new ReferenceVersionField(MediaDefinition::class),

            new TranslatedField(new StringField('name', 'name')),
            new StringField('link', 'link'),
            new DateField('updated_at', 'updatedAt'),
            new DateField('created_at', 'createdAt'),
            new TranslatedField(new LongTextField('description', 'description')),
            new TranslatedField(new StringField('meta_title', 'metaTitle')),
            new TranslatedField(new StringField('meta_description', 'metaDescription')),
            new TranslatedField(new StringField('meta_keywords', 'metaKeywords')),
            new ManyToOneAssociationField('media', 'media_id', MediaDefinition::class, false),
            (new OneToManyAssociationField('products', ProductDefinition::class, 'manufacturer_join_id', false, 'id'))->setFlags(new RestrictDelete()),
            (new TranslationsAssociationField('translations', ProductManufacturerTranslationDefinition::class, 'product_manufacturer_id', false, 'id'))->setFlags(new CascadeDelete(), new Required()),
        ]);

        foreach (self::$extensions as $extension) {
            $extension->extendFields(self::$fields);
        }

        return self::$fields;
    }

    public static function getRepositoryClass(): string
    {
        return ProductManufacturerRepository::class;
    }

    public static function getBasicCollectionClass(): string
    {
        return ProductManufacturerBasicCollection::class;
    }

    public static function getDeletedEventClass(): string
    {
        return ProductManufacturerDeletedEvent::class;
    }

    public static function getWrittenEventClass(): string
    {
        return ProductManufacturerWrittenEvent::class;
    }

    public static function getBasicStructClass(): string
    {
        return ProductManufacturerBasicStruct::class;
    }

    public static function getTranslationDefinitionClass(): ?string
    {
        return ProductManufacturerTranslationDefinition::class;
    }

    public static function getDetailStructClass(): string
    {
        return ProductManufacturerDetailStruct::class;
    }

    public static function getDetailCollectionClass(): string
    {
        return ProductManufacturerDetailCollection::class;
    }
}
