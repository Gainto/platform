import './component';
import './config';
import './preview';

const { Application } = Shopware;

Application.getContainer('service').cmsService.registerCmsElement({
    name: 'youtube-video',
    label: 'YouTube video',
    component: 'sw-cms-el-youtube-video',
    configComponent: 'sw-cms-el-config-youtube-video',
    previewComponent: 'sw-cms-el-preview-youtube-video',
    defaultConfig: {
        videoID: {
            source: 'static',
            value: ''
        },
        autoPlay: {
            source: 'static',
            value: false
        },
        loop: {
            source: 'static',
            value: false
        },
        showControls: {
            source: 'static',
            value: true
        },
        start: {
            source: 'static',
            value: null
        },
        end: {
            source: 'static',
            value: null
        },
        displayMode: {
            source: 'static',
            value: 'standard'
        },
        advancedPrivacyMode: {
            source: 'static',
            value: true
        }
    }
});
