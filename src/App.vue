<script setup lang="ts">
import { onMounted } from "vue";
import { Emulator } from "./c8/Emulator";
import { ref } from "vue";
const container = ref<HTMLDivElement>();
onMounted(() => {
    Emulator.launch(container.value!);
});
</script>

<template>
    <div class="container" ref="container"></div>
</template>
