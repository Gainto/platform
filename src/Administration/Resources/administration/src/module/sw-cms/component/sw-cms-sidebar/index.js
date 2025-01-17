import template from './sw-cms-sidebar.html.twig';
import './sw-cms-sidebar.scss';

const { Component, Mixin } = Shopware;
const { cloneDeep } = Shopware.Utils.object;
const types = Shopware.Utils.types;


Component.register('sw-cms-sidebar', {
    template,

    inject: [
        'cmsService',
        'repositoryFactory',
        'context'
    ],

    mixins: [
        Mixin.getByName('placeholder')
    ],

    props: {
        page: {
            type: Object,
            required: true
        },

        currentBlock: {
            type: [Object, null],
            required: false,
            default: null
        },

        demoEntity: {
            type: String,
            required: false,
            default: null
        },

        demoEntityIdProp: {
            type: String,
            required: false,
            default: null
        },

        isSystemDefaultLanguage: {
            type: Boolean,
            required: false,
            default: true
        }
    },

    data() {
        return {
            demoEntityId: this.demoEntityIdProp,
            currentBlockCategory: 'text',
            currentDragSectionIndex: null
        };
    },

    computed: {
        blockRepository() {
            return this.repositoryFactory.create('cms_block');
        },

        slotRepository() {
            return this.repositoryFactory.create('cms_slot');
        },

        cmsBlocks() {
            return this.cmsService.getCmsBlockRegistry();
        },

        mediaRepository() {
            return this.repositoryFactory.create('media');
        },

        cmsPageState() {
            return this.$store.state.cmsPageState;
        },

        addBlockTitle() {
            if (!this.isSystemDefaultLanguage) {
                return this.$tc('sw-cms.general.disabledAddingBlocksToolTip');
            }

            return this.$tc('sw-cms.detail.sidebarTitleBlockOverview');
        },

        pageSections() {
            return this.page.sections;
        },

        currentDeviceView() {
            return this.$store.state.cmsPageState.currentCmsDeviceView;
        }
    },

    watch: {
        currentBlock: {
            handler() {
                if (this.currentBlock !== null) {
                    this.$refs.blockConfigSidebar.openContent();
                }
            }
        }
    },

    methods: {
        onPageTypeChange() {
            this.$emit('page-type-change');
        },

        onDemoEntityChange(demoEntityId) {
            this.$emit('demo-entity-change', demoEntityId);
        },

        onCloseBlockConfig() {
            this.$emit('current-block-change', null, null);
        },

        closeContent() {
            Object.values(this.$refs).forEach((item) => {
                if (typeof item.closeContent === 'function') {
                    item.closeContent();
                }
            });
        },

        openSectionSettings(sectionIndex) {
            this.$refs.pageConfigSidebar.openContent();
            this.$nextTick(() => {
                this.$refs.sectionConfigSidebar[sectionIndex].collapseItem();
            });
        },

        blockIsRemovable(block) {
            return (this.cmsBlocks[block.type].removable !== false) && this.isSystemDefaultLanguage;
        },

        onBlockDragSort(dragData, dropData, validDrop) {
            if (validDrop !== true) {
                return;
            }

            const dragSectionIndex = dragData.sectionIndex;
            const dropSectionIndex = dropData.sectionIndex;

            if (dragSectionIndex < 0 || dropSectionIndex < 0) {
                return;
            }

            if (dragData.block.sectionPosition !== dropData.block.sectionPosition) {
                dragData.block.isDragging = true;
                dragData.block.sectionPosition = dropData.block.sectionPosition;
            }

            // set current drag index to initial drag start index
            if (this.currentDragSectionIndex === null) {
                this.currentDragSectionIndex = dragSectionIndex;
            }

            // check if the section where the block is moved already has the block
            const dropSectionHasBlock = this.page.sections[dropSectionIndex].blocks.has(dragData.block.id);
            if (this.currentDragSectionIndex !== dropSectionIndex && !dropSectionHasBlock) {
                dragData.block.isDragging = true;

                // calculate the remove index (this may differ since the block is moved each time it enters a new
                // section while the dragSectionIndex is the static start index of the drag
                let removeIndex = dragSectionIndex;
                if (this.currentDragSectionIndex !== dragSectionIndex &&
                    Math.abs(this.currentDragSectionIndex - dropSectionIndex) === 1) {
                    removeIndex = this.currentDragSectionIndex;
                }

                // drag direction is upwards so the currentDragSectionIndex is incremented
                if (this.currentDragSectionIndex - dropSectionIndex < 0) {
                    this.currentDragSectionIndex += 1;
                }

                // drag direction is downwards so the currentDragSectionIndex is decremented
                if (this.currentDragSectionIndex - dropSectionIndex > 0) {
                    this.currentDragSectionIndex -= 1;
                }

                // delete block from old section and add it to the new one
                this.page.sections[removeIndex].blocks.remove(dragData.block.id);
                this.page.sections[dropSectionIndex].blocks.add(dragData.block);
            } else {
                // move item inside the section
                this.page.sections[dropSectionIndex].blocks.moveItem(dragData.block.position, dropData.block.position);
            }

            this.$emit('block-navigator-sort');
            this.pageUpdate();
        },

        getDragData(block, sectionIndex) {
            return {
                delay: 300,
                dragGroup: 'cms-navigator',
                data: { block, sectionIndex },
                validDragCls: null,
                onDragEnter: this.onBlockDragSort,
                onDrop: this.onBlockDragStop
            };
        },

        getDropData(block, sectionIndex) {
            return {
                dragGroup: 'cms-navigator',
                data: { block, sectionIndex },
                onDrop: this.onBlockDropAbort
            };
        },

        onBlockDragStop(dragData) {
            this.currentDragSectionIndex = null;
            dragData.block.isDragging = false;
        },

        onBlockDropAbort(dragData, dropData) {
            const dragSectionIndex = dragData.sectionIndex;
            const dropSectionIndex = dropData.sectionIndex;
            if (dragSectionIndex < 0 || dropSectionIndex < 0) {
                return;
            }

            const dragSectionHasBlock = this.page.sections[dragSectionIndex].blocks.has(dragData.block.id);
            const dropSectionHasBlock = this.page.sections[dropSectionIndex].blocks.has(dragData.block.id);
            if (!dragSectionHasBlock && !dropSectionHasBlock) {
                this.page.sections[dragSectionIndex].blocks.add(dragData.block);
            }
        },

        onBlockStageDrop(dragData, dropData) {
            if (!dropData || !dragData.block || dropData.dropIndex < 0 || !dropData.section) {
                return;
            }

            const section = dropData.section;
            const blockConfig = this.cmsBlocks[dragData.block.name];
            const newBlock = this.blockRepository.create(this.context);

            newBlock.type = dragData.block.name;
            newBlock.position = dropData.dropIndex;
            newBlock.sectionPosition = dropData.sectionPosition;
            newBlock.sectionId = section.id;

            Object.assign(
                newBlock,
                cloneDeep(this.blockConfigDefaults),
                cloneDeep(blockConfig.defaultConfig || {})
            );

            Object.keys(blockConfig.slots).forEach((slotName) => {
                const slotConfig = blockConfig.slots[slotName];
                const element = this.slotRepository.create(this.context);
                element.blockId = newBlock.id;
                element.slot = slotName;

                if (typeof slotConfig === 'string') {
                    element.type = slotConfig;
                } else if (types.isPlainObject(slotConfig)) {
                    element.type = slotConfig.type;

                    if (slotConfig.default && types.isPlainObject(slotConfig.default)) {
                        Object.assign(element, cloneDeep(slotConfig.default));
                    }
                }

                newBlock.slots.add(element);
            });

            this.page.sections[section.position].blocks.splice(dropData.dropIndex, 0, newBlock);

            this.$emit('block-stage-drop');
            this.$emit('current-block-change', section.id, newBlock);
        },

        moveSectionUp(section) {
            this.page.sections.moveItem(section.position, section.position - 1);

            this.pageUpdate();
        },

        moveSectionDown(section) {
            this.page.sections.moveItem(section.position, section.position + 1);

            this.pageUpdate();
        },

        onSectionDuplicate(section) {
            this.$emit('section-duplicate', section);
        },

        onSectionDelete(sectionId) {
            this.page.sections.remove(sectionId);
            this.pageUpdate();
        },

        onBlockDelete(blockId, section) {
            section.blocks.remove(blockId);

            if (this.currentBlock && this.currentBlock.id === blockId) {
                this.$emit('current-block-change', null, null);
            }

            this.pageUpdate();
        },

        onBlockDuplicate(block, section) {
            this.$emit('block-duplicate', block, section);
        },

        onRemoveSectionBackgroundMedia(section) {
            section.backgroundMediaId = null;
            section.backgroundMedia = null;

            this.pageUpdate();
        },

        onSetSectionBackgroundMedia([mediaItem], section) {
            section.backgroundMediaId = mediaItem.id;
            section.backgroundMedia = mediaItem;

            this.pageUpdate();
        },

        successfulUpload(media, section) {
            section.backgroundMediaId = media.targetId;

            this.mediaRepository.get(media.targetId, this.context).then((mediaItem) => {
                section.backgroundMedia = mediaItem;
                this.pageUpdate();
            });
        },

        uploadTag(section) {
            return `cms-section-media-config-${section.id}`;
        },

        getMainContentBlocks(sectionBlocks) {
            return sectionBlocks.filter((block) => block.sectionPosition === 'main');
        },

        getSidebarContentBlocks(sectionBlocks) {
            return sectionBlocks.filter((block) => block.sectionPosition === 'sidebar');
        },

        pageUpdate() {
            this.$emit('page-update');
        }
    }
});
