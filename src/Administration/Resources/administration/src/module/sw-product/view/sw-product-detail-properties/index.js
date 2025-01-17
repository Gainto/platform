import { mapState, mapGetters } from 'vuex';
import template from './sw-product-detail-properties.html.twig';
import './sw-product-detail-properties.scss';

const { Component } = Shopware;
const { Criteria } = Shopware.Data;

Component.register('sw-product-detail-properties', {
    template,

    inject: ['repositoryFactory'],

    data() {
        return {
            propertiesAvailable: true
        };
    },

    computed: {
        ...mapState('swProductDetail', [
            'product',
            'context'
        ]),

        ...mapGetters('swProductDetail', [
            'isLoading'
        ]),

        propertyRepository() {
            return this.repositoryFactory.create('property_group_option');
        }
    },

    created() {
        this.createdComponent();
    },

    methods: {
        createdComponent() {
            this.checkIfPropertiesExists();
        },

        checkIfPropertiesExists() {
            this.propertyRepository.search(new Criteria(1, 1), this.context).then((res) => {
                this.propertiesAvailable = res.total > 0;
            });
        }
    }
});
