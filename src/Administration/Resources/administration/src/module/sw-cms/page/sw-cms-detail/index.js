import template from './sw-cms-detail.html.twig';
import './sw-cms-detail.scss';

const { Component, Mixin } = Shopware;
const { cloneDeep, getObjectDiff } = Shopware.Utils.object;
const { warn } = Shopware.Utils.debug;
const Criteria = Shopware.Data.Criteria;

Component.register('sw-cms-detail', {
    template,

    inject: [
        'repositoryFactory',
        'entityFactory',
        'entityHydrator',
        'loginService',
        'cmsPageService',
        'cmsService',
        'cmsDataResolverService',
        'context'
    ],

    mixins: [
        Mixin.getByName('notification'),
        Mixin.getByName('placeholder')
    ],

    shortcuts: {
        'SYSTEMKEY+S': 'onSave'
    },

    data() {
        return {
            pageId: null,
            pageOrigin: null,
            page: {
                sections: []
            },
            cmsPageState: this.$store.state.cmsPageState,
            salesChannels: [],
            isLoading: false,
            isSaveSuccessful: false,
            currentSalesChannelKey: null,
            currentBlock: null,
            currentBlockSectionId: null,
            currentBlockCategory: 'text',
            currentMappingEntity: null,
            currentMappingEntityRepo: null,
            demoEntityId: null,
            currentLanguageId: this.context.languageId
        };
    },

    metaInfo() {
        return {
            title: this.$createTitle(this.identifier)
        };
    },

    computed: {
        identifier() {
            return this.placeholder(this.page, 'name');
        },

        pageRepository() {
            return this.repositoryFactory.create('cms_page');
        },

        sectionRepository() {
            return this.repositoryFactory.create('cms_section');
        },

        blockRepository() {
            return this.repositoryFactory.create('cms_block');
        },

        slotRepository() {
            return this.repositoryFactory.create('cms_slot');
        },

        salesChannelRepository() {
            return this.repositoryFactory.create('sales_channel');
        },

        defaultFolderRepository() {
            return this.repositoryFactory.create('media_default_folder');
        },

        cmsBlocks() {
            return this.cmsService.getCmsBlockRegistry();
        },

        cmsStageClasses() {
            return [
                `is--${this.currentDeviceView}`
            ];
        },

        cmsTypeMappingEntities() {
            return {
                product_detail: {
                    entity: 'product',
                    mode: 'single'
                },
                product_list: {
                    entity: 'category',
                    mode: 'single'
                }
            };
        },

        cmsPageTypes() {
            return {
                page: this.$tc('sw-cms.detail.labelPageTypeShopPage'),
                landingpage: this.$tc('sw-cms.detail.labelPageTypeLandingpage'),
                product_list: this.$tc('sw-cms.detail.labelPageTypeCategory'),
                product_detail: this.$tc('sw-cms.detail.labelPageTypeProduct')
            };
        },

        cmsPageTypeSettings() {
            if (this.cmsTypeMappingEntities[this.page.type]) {
                return this.cmsTypeMappingEntities[this.page.type];
            }

            return {
                entity: null,
                mode: 'static'
            };
        },

        blockConfigDefaults() {
            return {
                name: null,
                marginBottom: null,
                marginTop: null,
                marginLeft: null,
                marginRight: null,
                sizingMode: 'boxed'
            };
        },

        tooltipSave() {
            const systemKey = this.$device.getSystemKey();

            return {
                message: `${systemKey} + S`,
                appearance: 'light'
            };
        },

        isSystemDefaultLanguage() {
            return this.currentLanguageId === this.context.systemLanguageId;
        },

        addBlockTitle() {
            if (!this.isSystemDefaultLanguage) {
                return this.$tc('sw-cms.general.disabledAddingBlocksToolTip');
            }

            return this.$tc('sw-cms.detail.sidebarTitleBlockOverview');
        },

        pageHasSections() {
            return this.page.sections.length > 0;
        },

        loadPageCriteria() {
            const criteria = new Criteria(1, 1);
            const sortCriteria = Criteria.sort('position', 'ASC', true);

            criteria.getAssociation('sections')
                .addSorting(sortCriteria)
                .addAssociation('backgroundMedia')
                .getAssociation('blocks')
                .addSorting(sortCriteria)
                .addAssociation('backgroundMedia')
                .addAssociation('slots');

            return criteria;
        },

        currentDeviceView() {
            return this.cmsPageState.currentCmsDeviceView;
        }
    },

    created() {
        this.createdComponent();
    },

    beforeDestroy() {
        this.beforeDestroyedComponent();
    },

    methods: {
        createdComponent() {
            this.$store.commit('adminMenu/collapseSidebar');

            this.resetCmsPageState();

            if (this.$route.params.id) {
                this.pageId = this.$route.params.id;
                this.isLoading = true;
                const defaultStorefrontId = '8A243080F92E4C719546314B577CF82B';

                const criteria = new Criteria();
                criteria.addFilter(
                    Criteria.equals('typeId', defaultStorefrontId)
                );

                this.salesChannelRepository.search(criteria, this.context).then((response) => {
                    this.salesChannels = response;

                    if (this.salesChannels.length > 0) {
                        this.currentSalesChannelKey = this.salesChannels[0].id;
                        this.loadPage(this.pageId);
                    }
                });
            }

            this.setPageContext();
        },

        setPageContext() {
            this.getDefaultFolderId().then((folderId) => {
                this.$store.commit('cmsPageState/setDefaultMediaFolderId', folderId);
            });
        },

        resetCmsPageState() {
            this.$store.dispatch('cmsPageState/resetCmsPageState');
        },

        getDefaultFolderId() {
            const criteria = new Criteria(1, 1);
            criteria.addAssociation('folder');
            criteria.addFilter(Criteria.equals('entity', this.cmsPageState.pageEntityName));

            return this.defaultFolderRepository.search(criteria, this.context).then((searchResult) => {
                const defaultFolder = searchResult.first();
                if (defaultFolder.folder.id) {
                    return defaultFolder.folder.id;
                }

                return null;
            });
        },

        beforeDestroyedComponent() {
            this.$store.commit('cmsPageState/removeCurrentPage');
        },

        loadPage(pageId) {
            this.isLoading = true;

            this.pageRepository.get(pageId, this.context, this.loadPageCriteria).then((page) => {
                this.page = { sections: [] };
                this.page = page;

                this.cmsDataResolverService.resolve(this.page).then(() => {
                    this.updateSectionAndBlockPositions();
                    this.$store.commit('cmsPageState/setCurrentPage', this.page);

                    if (this.currentBlock !== null) {
                        const blockSection = this.page.sections.get(this.currentBlockSectionId);
                        this.currentBlock = blockSection.blocks.get(this.currentBlock.id);
                    }

                    this.updateDataMapping();
                    this.pageOrigin = cloneDeep(this.page);

                    this.isLoading = false;
                }).catch((exception) => {
                    this.isLoading = false;
                    this.createNotificationError({
                        title: exception.message,
                        message: exception.response.statusText
                    });

                    warn(this._name, exception.message, exception.response);
                });
            }).catch((exception) => {
                this.isLoading = false;
                this.createNotificationError({
                    title: exception.message,
                    message: exception.response.statusText
                });

                warn(this._name, exception.message, exception.response);
            });
        },

        updateDataMapping() {
            const mappingEntity = this.cmsPageTypeSettings.entity;

            if (!mappingEntity) {
                this.$store.commit('cmsPageState/removeCurrentMappingEntity');
                this.$store.commit('cmsPageState/removeCurrentMappingTypes');
                this.$store.commit('cmsPageState/removeCurrentDemoEntity');

                this.currentMappingEntity = null;
                this.currentMappingEntityRepo = null;
                this.demoEntityId = null;
                return;
            }

            if (this.cmsPageState.currentMappingEntity !== mappingEntity) {
                this.$store.commit('cmsPageState/setCurrentMappingEntity', mappingEntity);
                this.$store.commit(
                    'cmsPageState/setCurrentMappingTypes',
                    this.cmsService.getEntityMappingTypes(mappingEntity)
                );

                this.currentMappingEntity = mappingEntity;
                this.currentMappingEntityRepo = this.repositoryFactory.create(mappingEntity);

                this.loadFirstDemoEntity();
            }
        },

        loadFirstDemoEntity() {
            const criteria = new Criteria();

            if (this.cmsPageState.currentMappingEntity === 'category') {
                criteria.addAssociation('media');
            }

            this.currentMappingEntityRepo.search(criteria, this.context).then((response) => {
                this.demoEntityId = response[0].id;
                this.$store.commit('cmsPageState/setCurrentDemoEntity', response[0]);
            });
        },

        onDeviceViewChange(view) {
            this.$store.commit('cmsPageState/setCurrentCmsDeviceView', view);

            if (view === 'form') {
                this.setCurrentBlock(null, null);
            }
        },

        setCurrentBlock(sectionId, block = null) {
            this.currentBlock = block;
            this.currentBlockSectionId = sectionId;
        },

        onChangeLanguage() {
            this.isLoading = true;

            return this.salesChannelRepository.search(new Criteria(), this.context).then((response) => {
                this.salesChannels = response;
                this.currentLanguageId = this.context.languageId;
                return this.loadPage(this.pageId);
            });
        },

        abortOnLanguageChange() {
            return Object.keys(getObjectDiff(this.page, this.pageOrigin)).length > 0;
        },

        saveOnLanguageChange() {
            return this.onSave();
        },

        onSalesChannelChange() {
            this.loadPage(this.pageId);
        },

        onDemoEntityChange(demoEntityId) {
            this.$store.commit('cmsPageState/removeCurrentDemoEntity');

            if (!demoEntityId) {
                return;
            }

            const demoEntity = this.currentMappingEntityRepo.get(demoEntityId, this.context);

            if (!demoEntity) {
                return;
            }

            if (this.cmsPageState.currentMappingEntity === 'category' && demoEntity.mediaId !== null) {
                this.repositoryFactory.create('media').get(demoEntity.mediaId, this.context).then((media) => {
                    demoEntity.media = media;
                });
            }

            this.$store.commit('cmsPageState/setCurrentDemoEntity', demoEntity);
        },

        onAddSection(type, index) {
            if (!type || index === 'undefined') {
                return;
            }

            const section = this.sectionRepository.create(this.context);
            section.type = type;
            section.sizingMode = 'boxed';
            section.position = index;
            section.pageId = this.page.id;

            this.page.sections.splice(index, 0, section);
            this.updateSectionAndBlockPositions();
        },

        onCloseBlockConfig() {
            this.currentBlock = null;
        },

        pageConfigOpen(mode = null) {
            const sideBarRefs = this.$refs.cmsSidebar.$refs;

            if (mode === 'blocks') {
                sideBarRefs.blockSelectionSidebar.openContent();
                return;
            }

            sideBarRefs.pageConfigSidebar.openContent();
        },

        saveFinish() {
            this.isSaveSuccessful = false;
        },

        onSave() {
            this.isSaveSuccessful = false;

            if ((this.isSystemDefaultLanguage && !this.page.name) || !this.page.type) {
                this.pageConfigOpen();

                const warningTitle = this.$tc('sw-cms.detail.notificationTitleMissingFields');
                const warningMessage = this.$tc('sw-cms.detail.notificationMessageMissingFields');
                this.createNotificationWarning({
                    title: warningTitle,
                    message: warningMessage
                });

                return Promise.reject();
            }

            const sections = this.page.sections;
            let foundEmptyRequiredField = [];

            sections.forEach((section) => {
                section.blocks.forEach((block) => {
                    block.backgroundMedia = null;

                    block.slots.forEach((slot) => {
                        foundEmptyRequiredField.push(...this.checkRequiredSlotConfigField(slot));
                    });
                });
            });

            if (foundEmptyRequiredField.length > 0) {
                const warningTitle = this.$tc('sw-cms.detail.notificationTitleMissingBlockFields');
                const warningMessage = this.$tc('sw-cms.detail.notificationMessageMissingBlockFields');
                this.createNotificationWarning({
                    title: warningTitle,
                    message: warningMessage
                });

                foundEmptyRequiredField = [];
                return Promise.reject();
            }

            this.deleteEntityAndRequiredConfigKey(this.page.sections);

            this.isLoading = true;

            return this.pageRepository.save(this.page, this.context).then(() => {
                this.isLoading = false;
                this.isSaveSuccessful = true;

                return this.loadPage(this.page.id);
            }).catch((exception) => {
                this.isLoading = false;

                const errorNotificationTitle = this.$tc('sw-cms.detail.notificationTitlePageError');
                this.createNotificationError({
                    title: errorNotificationTitle,
                    message: exception.message
                });

                let hasEmptyConfig = false;
                if (exception.response.data && exception.response.data.errors) {
                    exception.response.data.errors.forEach((error) => {
                        if (error.code === 'c1051bb4-d103-4f74-8988-acbcafc7fdc3') {
                            hasEmptyConfig = true;
                        }
                    });
                }

                if (hasEmptyConfig === true) {
                    const warningTitle = this.$tc('sw-cms.detail.notificationTitleMissingElements');
                    const warningMessage = this.$tc('sw-cms.detail.notificationMessageMissingElements');
                    this.createNotificationWarning({
                        title: warningTitle,
                        message: warningMessage,
                        duration: 10000
                    });

                    this.currentBlock = null;
                    this.pageConfigOpen();
                }

                return Promise.reject(exception);
            });
        },

        deleteEntityAndRequiredConfigKey(sections) {
            sections.forEach((section) => {
                section.blocks.forEach((block) => {
                    block.slots.forEach((slot) => {
                        Object.values(slot.config).forEach((configField) => {
                            if (configField.entity) {
                                delete configField.entity;
                            }
                            if (configField.required) {
                                delete configField.required;
                            }
                        });
                    });
                });
            });
        },

        checkRequiredSlotConfigField(slot) {
            return Object.values(slot.config).filter((configField) => {
                return !!configField.required &&
                    (configField.value === null || configField.value.length < 1);
            });
        },

        updateSectionAndBlockPositions() {
            this.page.sections.forEach((section, index) => {
                section.position = index;
                this.updateBlockPositions(section);
            });
        },

        updateBlockPositions(section) {
            section.blocks.forEach((block, index) => {
                block.position = index;
            });
        },

        onPageUpdate() {
            this.updateSectionAndBlockPositions();
            this.updateDataMapping();
        },

        onBlockDuplicate(block, section) {
            const newBlock = this.blockRepository.create();

            const blockClone = cloneDeep(block);
            blockClone.id = newBlock.id;
            blockClone.position = block.position + 1;
            blockClone.sectionId = section.id;
            blockClone.slots = [];

            Object.assign(newBlock, blockClone);

            this.cloneSlotsInBlock(block, newBlock);

            section.blocks.splice(newBlock.position, 0, newBlock);
            this.updateSectionAndBlockPositions();
        },

        cloneSlotsInBlock(block, newBlock) {
            block.slots.forEach((slot) => {
                const element = this.slotRepository.create();
                element.blockId = newBlock.id;
                element.slot = slot.slot;
                element.type = slot.type;
                element.config = cloneDeep(slot.config);
                element.data = cloneDeep(slot.data);

                newBlock.slots.push(element);
            });
        },

        onSectionDuplicate(section) {
            const newSection = this.sectionRepository.create();

            const sectionClone = cloneDeep(section);
            sectionClone.id = newSection.id;
            sectionClone.position = section.position + 1;
            sectionClone.pageId = this.page.id;
            sectionClone.blocks = [];

            Object.assign(newSection, sectionClone);

            section.blocks.forEach((block) => {
                const clonedBlock = this.blockRepository.create();
                clonedBlock.sectionId = newSection.id;
                clonedBlock.slot = block.slot;
                clonedBlock.type = block.type;
                clonedBlock.config = cloneDeep(block.config);
                clonedBlock.data = cloneDeep(block.data);

                this.cloneSlotsInBlock(block, clonedBlock);
                newSection.blocks.push(clonedBlock);
            });

            this.page.sections.splice(newSection.position, 0, newSection);
            this.updateSectionAndBlockPositions();
        },

        onPageTypeChange() {
            if (this.page.type === 'product_list') {
                const listingBlock = this.blockRepository.create();
                const blockConfig = this.cmsBlocks['product-listing'];

                listingBlock.type = 'product-listing';
                listingBlock.position = 0;
                // ToDo: Fix with NEXT-5073
                listingBlock.sectionId = this.page.sections[0].id;
                listingBlock.setionPosition = 'main';

                Object.assign(
                    listingBlock,
                    cloneDeep(this.blockConfigDefaults),
                    cloneDeep(blockConfig.defaultConfig || {})
                );

                const listingEl = this.slotRepository.create();
                listingEl.blockId = listingBlock.id;
                listingEl.slot = 'content';
                listingEl.type = 'product-listing';
                listingEl.config = {};

                listingBlock.slots.push(listingEl);
                // ToDo: Fix with NEXT-5073
                this.page.sections[0].blocks.splice(0, 0, listingBlock);
            } else {
                this.page.sections.forEach((section) => {
                    section.blocks.forEach((block) => {
                        if (block.type === 'product-listing') {
                            section.blocks.remove(block.id);
                        }
                    });
                });
            }

            this.checkSlotMappings();
            this.onPageUpdate();
        },

        checkSlotMappings() {
            this.page.sections.forEach((sections) => {
                sections.blocks.forEach((block) => {
                    block.slots.forEach((slot) => {
                        Object.keys(slot.config).forEach((key) => {
                            if (slot.config[key].source && slot.config[key].source === 'mapped') {
                                const mappingPath = slot.config[key].value.split('.');

                                if (mappingPath[0] !== this.demoEntity) {
                                    slot.config[key].value = null;
                                    slot.config[key].source = 'static';
                                }
                            }
                        });
                    });
                });
            });
        }
    }
});
