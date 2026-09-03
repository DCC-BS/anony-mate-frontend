<script lang="ts" setup>
/** Write redactions as black bars rather than as their placeholder. */
const blackout = defineModel<boolean>({ default: false });

const { t } = useI18n();

const styles = [
    { blacked: false, key: "placeholder" },
    { blacked: true, key: "blacked" }
] as const;
</script>

<template>
    <!-- Both options are named, always. A single switch would have to say what
         it swaps — "bars instead of placeholders" — which never tells the
         reader what turning it off gives them. -->
    <UFieldGroup>
        <UButton
            v-for="style in styles"
            :key="style.key"
            variant="subtle"
            :color="blackout === style.blacked ? 'primary' : 'neutral'"
            :aria-pressed="blackout === style.blacked"
            :title="t(`redactionStyle.${style.key}Hint`)"
            @click="blackout = style.blacked"
        >
            <template #leading>
                <ReviewRedactionStyleMark :blacked="style.blacked" />
            </template>

            {{ t(`redactionStyle.${style.key}`) }}
        </UButton>
    </UFieldGroup>
</template>
