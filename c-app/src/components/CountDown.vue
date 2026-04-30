<template>
  <view class="countdown">
    <text v-if="prefix">{{ prefix }}</text>
    <text v-if="hours > 0" class="num">{{ pad(hours) }}</text>
    <text v-if="hours > 0" class="sep">:</text>
    <text class="num">{{ pad(minutes) }}</text>
    <text class="sep">:</text>
    <text class="num">{{ pad(seconds) }}</text>
  </view>
</template>

<script setup lang="ts">
import { ref, watch, onUnmounted, computed } from 'vue';

const props = withDefaults(
  defineProps<{
    seconds: number; // 总秒数
    prefix?: string;
    autoStart?: boolean;
  }>(),
  { prefix: '', autoStart: true },
);

const emit = defineEmits<{ (e: 'finish'): void }>();

const remain = ref(props.seconds);
let timer: ReturnType<typeof setInterval> | null = null;

const hours = computed(() => Math.floor(remain.value / 3600));
const minutes = computed(() => Math.floor((remain.value % 3600) / 60));
const seconds = computed(() => remain.value % 60);

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function start() {
  if (timer) clearInterval(timer);
  timer = setInterval(() => {
    if (remain.value <= 0) {
      stop();
      emit('finish');
      return;
    }
    remain.value -= 1;
  }, 1000);
}

function stop() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

watch(
  () => props.seconds,
  (val) => {
    remain.value = val;
    if (props.autoStart && val > 0) start();
    else stop();
  },
  { immediate: true },
);

onUnmounted(stop);
</script>

<style lang="scss" scoped>
.countdown {
  display: inline-flex;
  align-items: center;
  font-feature-settings: 'tnum';
  color: $color-price;
  font-weight: 600;
  font-size: $font-base;
}
.num {
  background: $color-price;
  color: #fff;
  padding: 0 8rpx;
  border-radius: 4rpx;
  min-width: 36rpx;
  text-align: center;
}
.sep {
  margin: 0 4rpx;
  color: $color-price;
}
</style>
