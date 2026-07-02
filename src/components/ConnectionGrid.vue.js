export default (await import('vue')).defineComponent({
    props: {
        connections: {
            type: Array,
            required: true
        },
        isShowOrderPanelMode: {
            type: Boolean,
            default: false
        }
    },
    methods: {
        handleBack() {
            if (this.isShowOrderPanelMode) {
                this.$emit('go-to-main');
            }
            else {
                this.$emit('back');
            }
        }
    }
});
function handleImageError(event) {
    event.target.src = '/img/goods/default.png';
}
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['back-button']} */ ;
/** @type {__VLS_StyleScopedClasses['grid-item']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "connection-grid" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({
    ...{ class: "text-center mb-4" },
});
if (__VLS_ctx.isShowOrderPanelMode) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "back-button-container" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.handleBack) },
        ...{ class: "back-button" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: "fa fa-arrow-right" },
    });
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "main-grid" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "grid" },
});
for (const [connection] of __VLS_getVForSourceType((__VLS_ctx.connections))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.$emit('select', connection);
            } },
        key: (connection.id),
        ...{ class: "grid-item" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.img)({
        ...{ onError: (__VLS_ctx.handleImageError) },
        src: (`/img/branch/${connection.id}.png`),
        ...{ class: "branch-image" },
        alt: (connection.name),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "connection-name" },
    });
    (connection.name);
}
/** @type {__VLS_StyleScopedClasses['connection-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['text-center']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
/** @type {__VLS_StyleScopedClasses['back-button-container']} */ ;
/** @type {__VLS_StyleScopedClasses['back-button']} */ ;
/** @type {__VLS_StyleScopedClasses['fa']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-arrow-right']} */ ;
/** @type {__VLS_StyleScopedClasses['main-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['grid']} */ ;
/** @type {__VLS_StyleScopedClasses['grid-item']} */ ;
/** @type {__VLS_StyleScopedClasses['branch-image']} */ ;
/** @type {__VLS_StyleScopedClasses['connection-name']} */ ;
var __VLS_dollars;
let __VLS_self;
