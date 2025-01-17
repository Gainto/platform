import './component';
import './preview';

const { Application } = Shopware;

Application.getContainer('service').cmsService.registerCmsBlock({
    name: 'youtube-video',
    label: 'YouTube Video',
    category: 'image',
    component: 'sw-cms-block-youtube-video',
    previewComponent: 'sw-cms-preview-youtube-video',
    defaultConfig: {
        marginBottom: '20px',
        marginTop: '20px',
        marginLeft: '20px',
        marginRight: '20px',
        sizingMode: 'boxed'
    },
    slots: {
        video: 'youtube-video'
    }
});
