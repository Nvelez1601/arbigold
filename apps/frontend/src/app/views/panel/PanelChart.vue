<script setup lang="ts">
import { computed } from 'vue';
import type { ChartPoint } from './usePanelSummary.ts';

const props = defineProps<{ points: readonly ChartPoint[] }>();

const WIDTH = 560;
const HEIGHT = 220;
const PAD = { top: 12, right: 12, bottom: 28, left: 44 };
const BAR = 14;

const plot = {
  width: WIDTH - PAD.left - PAD.right,
  height: HEIGHT - PAD.top - PAD.bottom,
};
const base = PAD.top + plot.height;

const max = computed(() =>
  Math.max(1, ...props.points.flatMap((point) => [point.client, point.supplier])),
);

const bars = computed(() => {
  const step = plot.width / Math.max(1, props.points.length);
  return props.points.map((point, index) => {
    const center = PAD.left + step * index + step / 2;
    const heightOf = (value: number) => (value / max.value) * plot.height;
    return {
      key: `${point.label}-${index}`,
      label: point.label,
      center,
      client: { x: center - BAR - 3, height: heightOf(point.client), value: point.client },
      supplier: { x: center + 3, height: heightOf(point.supplier), value: point.supplier },
    };
  });
});

const ticks = computed(() =>
  [0, 0.25, 0.5, 0.75, 1].map((ratio) => ({
    y: base - ratio * plot.height,
    value: Math.round(max.value * ratio),
  })),
);
</script>

<template>
  <div v-if="points.length === 0" class="flex h-52 items-center justify-center text-sm text-muted">
    Aún no hay operaciones para graficar.
  </div>
  <svg
    v-else
    :viewBox="`0 0 ${WIDTH} ${HEIGHT}`"
    width="100%"
    role="img"
    aria-label="Gramos del cliente y del proveedor en las últimas operaciones"
    class="h-52 w-full"
  >
    <g v-for="tick in ticks" :key="tick.y">
      <line :x1="PAD.left" :x2="WIDTH - PAD.right" :y1="tick.y" :y2="tick.y" stroke="#e8e1f4" />
      <text :x="PAD.left - 8" :y="tick.y + 4" text-anchor="end" font-size="11" fill="#766a8c">
        {{ tick.value }}
      </text>
    </g>
    <g v-for="bar in bars" :key="bar.key">
      <rect
        :x="bar.client.x"
        :y="base - bar.client.height"
        :width="BAR"
        :height="bar.client.height"
        rx="4"
        fill="#6d3fd1"
      >
        <title>Cliente: {{ bar.client.value }} g</title>
      </rect>
      <rect
        :x="bar.supplier.x"
        :y="base - bar.supplier.height"
        :width="BAR"
        :height="bar.supplier.height"
        rx="4"
        fill="#e8579b"
      >
        <title>Proveedor: {{ bar.supplier.value }} g</title>
      </rect>
      <text :x="bar.center" :y="HEIGHT - 8" text-anchor="middle" font-size="11" fill="#766a8c">
        {{ bar.label }}
      </text>
    </g>
  </svg>
</template>
