// The package's ./types entry does not re-export the onboarding types yet.
import type {
    OnboadingStepBuilder,
    OnboardingStep,
    StepPopoverOverride,
} from "@dcc-bs/common-ui.bs.js/runtime/types/onboarding.js";

/** The pages the tour walks through. */
export type TourPhase = "documents" | "new" | "entities";

/** A tour, phased along the pages it walks through. */
export type AnonymateTour = OnboadingStepBuilder<TourPhase>;

type StepOptions = Pick<OnboardingStep, "element"> &
    Pick<StepPopoverOverride, "side" | "align">;

/**
 * Builds the AnonyMate onboarding tour for `<FirstRunOrchestrator>`, which the
 * "Hilfe" button in the navigation bar starts again.
 *
 * It walks the document list, the upload page and the entity settings. On the
 * upload page it explains the two outputs side by side, since they work
 * differently: text to review here, or the PDF itself with redaction marks to
 * review in a PDF editor.
 *
 * @returns The tour to hand to the orchestrator's `onboarding-builder` prop.
 */
export function useAnonymateTour(): AnonymateTour {
    const { t } = useI18n();
    const router = useRouter();
    const localePath = useLocalePath();
    const logger = useLogger();

    const { addPhases } = useOnboardingBuilder({
        showProgress: true,
        nextBtnText: t("onboarding.next"),
        prevBtnText: t("onboarding.previous"),
        doneBtnText: t("onboarding.done"),
        progressText: t("onboarding.progress"),
    });

    /**
     * Waits until a selector resolves, so a step never points at DOM that the
     * page it just navigated to has not rendered yet.
     *
     * @param selector - The element to wait for.
     * @param timeoutMs - How long to wait before giving up.
     */
    async function waitForElement(selector: string, timeoutMs = 5000) {
        const deadline = Date.now() + timeoutMs;

        while (Date.now() < deadline) {
            if (document.querySelector(selector)) {
                await nextTick();
                return;
            }
            await new Promise((resolve) => setTimeout(resolve, 50));
        }

        logger.warn(`Onboarding: "${selector}" did not appear in time`);
    }

    /**
     * Navigates to a page of the tour and waits for its anchor element.
     *
     * @param path - The route to show, without locale prefix.
     * @param selector - Anchor element that marks the page as ready.
     */
    async function goTo(path: string, selector: string) {
        const target = localePath(path);
        if (router.currentRoute.value.path !== target) {
            await router.push(target);
        }
        await waitForElement(selector);
    }

    /**
     * Builds a step whose popover texts come from `onboarding.<key>.title` and
     * `onboarding.<key>.description`.
     *
     * @param key - The i18n key of the step.
     * @param options - Highlighted element and popover placement.
     */
    function step(key: string, options: StepOptions): OnboardingStep {
        const { side, align, ...driveStep } = options;

        return {
            ...driveStep,
            popover: {
                title: () => t(`onboarding.${key}.title`),
                description: () => t(`onboarding.${key}.description`),
                side,
                align,
            },
        };
    }

    return addPhases<TourPhase>([
        {
            name: "documents",
            onEnter: () => goTo("/documents", "#document-list"),
        },
        {
            name: "new",
            onEnter: () => goTo("/new", "#upload-card"),
        },
        {
            name: "entities",
            onEnter: () => goTo("/entities", "#entity-panel"),
        },
    ])
        .switchPhase("documents")
        .addSteps([
            step("welcome", { side: "bottom", align: "center" }),
            step("documentList", {
                element: "#document-list",
                side: "top",
                align: "center",
            }),
            step("newDocument", {
                element: "#new-document-button",
                side: "bottom",
                align: "end",
            }),
        ])
        .switchPhase("new")
        .addSteps([
            step("upload", {
                element: "#upload-card",
                side: "right",
                align: "start",
            }),
            step("group", {
                element: "#group-select",
                side: "left",
                align: "start",
            }),
            step("outputText", {
                element: "#output-select",
                side: "left",
                align: "start",
            }),
            step("outputMarkedPdf", {
                element: "#output-select",
                side: "left",
                align: "start",
            }),
            step("start", {
                element: "#start-button",
                side: "left",
                align: "center",
            }),
        ])
        .switchPhase("entities")
        .addSteps([
            step("entityTypes", {
                element: "#entity-panel",
                side: "right",
                align: "start",
            }),
            step("entityGroups", {
                element: "#group-panel",
                side: "left",
                align: "start",
            }),
            step("blacklist", {
                element: "#blacklist-editor",
                side: "left",
                align: "start",
            }),
            step("complete", { side: "bottom", align: "center" }),
        ]);
}
