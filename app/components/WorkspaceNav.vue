<script lang="ts" setup>
const { t } = useI18n();
const localePath = useLocalePath();
const { pending } = useDocumentQueue();

const items = computed(() => [
    {
        label: t("workspace.documents"),
        icon: "i-lucide-files",
        to: localePath("/documents"),
        badge: pending.value.length
            ? { label: String(pending.value.length), variant: "subtle" as const }
            : undefined
    },
    {
        label: t("workspace.new"),
        icon: "i-lucide-plus-circle",
        to: localePath("/new")
    },
    {
        label: t("workspace.entities"),
        icon: "i-lucide-tags",
        to: localePath("/entities")
    }
]);
</script>

<template>
    <nav class="flex flex-col gap-1">
        <div
            class="px-2 pb-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.08em] text-dimmed"
        >
            {{ t("workspace.title") }}
        </div>

        <UNavigationMenu
            orientation="vertical"
            :items="items"
            :ui="{
                link: 'px-2.5 py-1.5 text-[0.8rem] gap-2.5',
                linkLeadingIcon: 'size-4'
            }"
        />
    </nav>
</template>
