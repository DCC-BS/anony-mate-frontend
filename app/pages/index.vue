<script lang="ts" setup>
const localePath = useLocalePath();

// The workspace starts at the document overview.
await navigateTo(localePath("/documents"), { replace: true });
</script>
