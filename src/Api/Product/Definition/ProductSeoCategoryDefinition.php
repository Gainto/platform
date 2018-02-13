<?php declare(strict_types=1);

namespace Shopware\Api\Product\Definition;

use Shopware\Api\Category\Definition\CategoryDefinition;
use Shopware\Api\Entity\Field\DateField;
use Shopware\Api\Entity\Field\FkField;
use Shopware\Api\Entity\Field\ManyToOneAssociationField;
use Shopware\Api\Entity\Field\ReferenceVersionField;
use Shopware\Api\Entity\FieldCollection;
use Shopware\Api\Entity\MappingEntityDefinition;
use Shopware\Api\Entity\Write\Flag\PrimaryKey;
use Shopware\Api\Entity\Write\Flag\Required;
use Shopware\Api\Product\Event\ProductSeoCategory\ProductSeoCategoryDeletedEvent;
use Shopware\Api\Product\Event\ProductSeoCategory\ProductSeoCategoryWrittenEvent;
use Shopware\Api\Shop\Definition\ShopDefinition;
use Shopware\Api\Entity\Field\VersionField;
class ProductSeoCategoryDefinition extends MappingEntityDefinition
{
    /**
     * @var FieldCollection
     */
    protected static $fields;

    /**
     * @var FieldCollection
     */
    protected static $primaryKeys;

    public static function getEntityName(): string
    {
        return 'product_seo_category';
    }

    public static function isVersionAware(): bool
    {
        return true;
    }

    public static function getFields(): FieldCollection
    {
        if (self::$fields) {
            return self::$fields;
        }

        return self::$fields = new FieldCollection([ 
            (new FkField('shop_id', 'shopId', ShopDefinition::class))->setFlags(new PrimaryKey(), new Required()),
            (new ReferenceVersionField(ShopDefinition::class))->setFlags(new PrimaryKey(), new Required()),

            (new FkField('product_id', 'productId', ProductDefinition::class))->setFlags(new PrimaryKey(), new Required()),
            (new ReferenceVersionField(ProductDefinition::class))->setFlags(new PrimaryKey(), new Required()),

            (new FkField('category_id', 'categoryId', CategoryDefinition::class))->setFlags(new PrimaryKey(), new Required()),
            (new ReferenceVersionField(CategoryDefinition::class))->setFlags(new PrimaryKey(), new Required()),

            new DateField('created_at', 'createdAt'),
            new DateField('updated_at', 'updatedAt'),
            new ManyToOneAssociationField('shop', 'shop_id', ShopDefinition::class, false),
            new ManyToOneAssociationField('product', 'product_id', ProductDefinition::class, false),
            new ManyToOneAssociationField('category', 'category_id', CategoryDefinition::class, false),
        ]);
    }

    public static function getWrittenEventClass(): string
    {
        return ProductSeoCategoryWrittenEvent::class;
    }

    public static function getDeletedEventClass(): string
    {
        return ProductSeoCategoryDeletedEvent::class;
    }
}
