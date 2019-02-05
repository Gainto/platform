<?php declare(strict_types=1);

namespace Shopware\Core\Framework\Demodata\Generator;

use Shopware\Core\Content\Category\CategoryDefinition;
use Shopware\Core\Content\Product\Aggregate\ProductManufacturer\ProductManufacturerDefinition;
use Shopware\Core\Content\Product\ProductDefinition;
use Shopware\Core\Content\ProductStream\ProductStreamDefinition;
use Shopware\Core\Framework\DataAbstractionLayer\Search\Filter\RangeFilter;
use Shopware\Core\Framework\DataAbstractionLayer\Write\EntityWriterInterface;
use Shopware\Core\Framework\DataAbstractionLayer\Write\WriteContext;
use Shopware\Core\Framework\Demodata\DemodataContext;
use Shopware\Core\Framework\Demodata\DemodataGeneratorInterface;
use Shopware\Core\Framework\Struct\Uuid;

class ProductStreamGenerator implements DemodataGeneratorInterface
{
    /**
     * @var EntityWriterInterface
     */
    private $writer;

    public function __construct(EntityWriterInterface $writer)
    {
        $this->writer = $writer;
    }

    public function getDefinition(): string
    {
        return ProductStreamDefinition::class;
    }

    public function generate(int $numberOfItems, DemodataContext $context, array $options = []): void
    {
        $context->getConsole()->progressStart($numberOfItems);

        $categories = $context->getIds(CategoryDefinition::class);
        $manufacturer = $context->getIds(ProductManufacturerDefinition::class);
        $products = $context->getIds(ProductDefinition::class);

        $pool = [
            ['field' => 'height', 'type' => 'range', 'parameters' => [RangeFilter::GTE => random_int(1, 1000)]],
            ['field' => 'width', 'type' => 'range', 'parameters' => [RangeFilter::GTE => random_int(1, 1000)]],
            ['field' => 'weight', 'type' => 'range', 'parameters' => [RangeFilter::GTE => random_int(1, 1000)]],
            ['field' => 'height', 'type' => 'range', 'parameters' => [RangeFilter::LTE => random_int(1, 1000)]],
            ['field' => 'width', 'type' => 'range', 'parameters' => [RangeFilter::LTE => random_int(1, 1000)]],
            ['field' => 'weight', 'type' => 'range', 'parameters' => [RangeFilter::LTE => random_int(1, 1000)]],
            ['field' => 'height', 'type' => 'range', 'parameters' => [RangeFilter::GT => random_int(1, 500), RangeFilter::LT => random_int(500, 1000)]],
            ['field' => 'width', 'type' => 'range', 'parameters' => [RangeFilter::GT => random_int(1, 500), RangeFilter::LT => random_int(500, 1000)]],
            ['field' => 'weight', 'type' => 'range', 'parameters' => [RangeFilter::GT => random_int(1, 500), RangeFilter::LT => random_int(500, 1000)]],
            ['field' => 'stock', 'type' => 'equals', 'value' => '1000'],
            ['field' => 'maxDeliveryTime', 'type' => 'range', 'parameters' => [RangeFilter::LT => random_int(0, 5)]],
            ['field' => 'name', 'type' => 'contains', 'value' => 'Awesome'],
            ['field' => 'categories.id', 'type' => 'equalsAny', 'value' => join('|', [$categories[random_int(0, \count($categories) - 1)], $categories[random_int(0, \count($categories) - 1)]])],
            ['field' => 'id', 'type' => 'equalsAny', 'value' => join('|', [$products[random_int(0, \count($products) - 1)], $products[random_int(0, \count($products) - 1)]])],
            ['field' => 'manufacturerId', 'type' => 'equals', 'value' => $manufacturer[random_int(0, \count($manufacturer) - 1)]],
        ];

        $pool[] = ['type' => 'multi', 'queries' => [$pool[random_int(0, \count($pool) - 1)], $pool[random_int(0, \count($pool) - 1)]]];
        $pool[] = ['type' => 'multi', 'operator' => 'OR', 'queries' => [$pool[random_int(0, \count($pool) - 1)], $pool[random_int(0, \count($pool) - 1)]]];

        $payload = [];
        for ($i = 0; $i < $numberOfItems; ++$i) {
            $filters = [];

            for ($j = 0; $j < random_int(1, 5); ++$j) {
                $filters[] = $pool[random_int(0, \count($pool) - 1)];
            }

            $payload[] = [
                'id' => Uuid::uuid4()->getHex(),
                'name' => $context->getFaker()->productName,
                'description' => $context->getFaker()->text(),
                'filters' => [['type' => 'multi', 'operator' => 'OR', 'queries' => $filters]],
            ];
        }

        $this->writer->insert(ProductStreamDefinition::class, $payload, WriteContext::createFromContext($context->getContext()));

        $context->add(ProductStreamDefinition::class, ...array_column($payload, 'id'));

        $context->getConsole()->progressFinish();
    }
}