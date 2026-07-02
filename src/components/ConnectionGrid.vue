<template>
    <div class="connection-grid">
        <h3 class="text-center mb-4">لطفا شعبه مورد نظر را انتخاب کنید</h3>
        <div class="back-button-container" v-if="isShowOrderPanelMode">
            <button @click="handleBack" class="back-button">
                <i class="fa fa-arrow-right"></i> بازگشت
            </button>
        </div>
        <div class="main-grid">
            <div class="grid">
                <div v-for="connection in connections" :key="connection.id" class="grid-item"
                    @click="$emit('select', connection)">
                    <div><img :src="`/img/branch/${connection.id}.png`" @error="handleImageError" class="branch-image"
                            :alt="connection.name" /></div>
                    <div class="connection-name">{{ connection.name }}</div>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
export default {
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
                this.$emit('go-to-main')
            } else {
                this.$emit('back')
            }
        }
    }
}

function handleImageError(event) {
    event.target.src = '/img/goods/default.png'
}
</script>

<style scoped>
.connection-grid {
    max-width: 800px;
    margin: 0 auto;
    padding: 20px;
    position: relative;
}

.back-button-container {
    position: absolute;
    top: 20px;
    left: 20px;
}

.back-button {
    background-color: #f70505;
    border: 1px solid #dee2e6;
    border-radius: 8px;
    padding: 8px 16px;
    cursor: pointer;
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    gap: 8px;
}

.back-button:hover {
    background-color: #ff5252;
    transform: translateY(-2px);
}

.grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 20px;
    margin-top: 20px;
}

.grid-item {
    background-color: #f8f9fa;
    border: 1px solid #dee2e6;
    border-radius: 8px;
    padding: 20px;
    text-align: center;
    cursor: pointer;
    transition: all 0.3s ease;
}

.grid-item:hover {
    transform: translateY(-5px);
    box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
    background-color: #e9ecef;
}

.connection-name {
    font-weight: bold;
    font-size: 1.2rem;
    margin-bottom: 5px;
}

.main-grid {
    display: block;
    align-content: center;
    align-items: center;
    margin-top: 25%;
}

.branch-image {
    width: 50%;
    height: 50%;
    object-fit: contain;
    margin-bottom: 5px;
}
</style>