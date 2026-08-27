<template>
    <!-- Only the main pane scrolls: header, sidebar and footer stay put. -->
    <div class="h-screen grid grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden">
        <AppHeader />

        <div class="grid min-h-0 lg:grid-cols-[196px_minmax(0,1fr)]">
            <aside class="hidden min-h-0 overflow-y-auto border-r border-default p-2.5 lg:block">
                <WorkspaceNav />
            </aside>

            <main class="min-h-0 overflow-hidden">
                <slot />
            </main>
        </div>

        <AppFooter />
    </div>
</template>
