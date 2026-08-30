<script setup>
// Shape-matched loading placeholders. A spinner tells the admin "wait"; these
// tell them what is about to appear, so the page does not jump when it does.
defineProps({
  variant: { type: String, default: 'table' }, // table | cards | list | stats | chart
  rows: { type: Number, default: 6 },
});
</script>

<template>
  <div v-if="variant === 'stats'" class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
    <div v-for="i in rows" :key="i" class="card p-5">
      <div class="flex items-center justify-between">
        <span class="skeleton h-10 w-10 rounded-xl" />
        <span class="skeleton h-5 w-12 rounded-full" />
      </div>
      <span class="skeleton mt-4 block h-8 w-24" />
      <span class="skeleton mt-2 block h-4 w-32" />
    </div>
  </div>

  <div v-else-if="variant === 'cards'" class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
    <div v-for="i in rows" :key="i" class="card p-4">
      <div class="flex items-start gap-3">
        <span class="skeleton h-11 w-11 rounded-xl" />
        <div class="flex-1 space-y-2">
          <span class="skeleton block h-4 w-3/4" />
          <span class="skeleton block h-3 w-1/2" />
        </div>
      </div>
      <div class="mt-4 flex justify-between">
        <span class="skeleton h-5 w-20 rounded-full" />
        <span class="skeleton h-3 w-16" />
      </div>
    </div>
  </div>

  <div v-else-if="variant === 'list'" class="space-y-2.5">
    <div v-for="i in rows" :key="i" class="card flex items-center gap-3 p-4">
      <div class="flex-1 space-y-2">
        <span class="skeleton block h-4 w-1/3" />
        <span class="skeleton block h-3 w-2/3" />
      </div>
      <span class="skeleton h-6 w-20 rounded-full" />
    </div>
  </div>

  <div v-else-if="variant === 'chart'" class="flex h-56 items-end gap-2">
    <span
      v-for="i in 16"
      :key="i"
      class="skeleton flex-1 rounded-t-md"
      :style="{ height: `${28 + ((i * 37) % 62)}%` }"
    />
  </div>

  <div v-else class="card overflow-hidden">
    <div class="flex gap-4 border-b border-line bg-elev/70 px-4 py-3">
      <span class="skeleton h-3 w-32" />
      <span class="skeleton h-3 w-20" />
      <span class="skeleton ml-auto h-3 w-24" />
    </div>
    <div v-for="i in rows" :key="i" class="flex items-center gap-4 border-b border-line-2 px-4 py-3.5 last:border-0">
      <span class="skeleton h-9 w-9 rounded-full" />
      <div class="flex-1 space-y-2">
        <span class="skeleton block h-3.5 w-40" />
        <span class="skeleton block h-3 w-24" />
      </div>
      <span class="skeleton h-6 w-20 rounded-full" />
      <span class="skeleton hidden h-3 w-24 sm:block" />
    </div>
  </div>
</template>
