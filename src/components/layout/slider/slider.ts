import type { EmblaCarouselType } from "embla-carousel";
import EmblaCarousel from "embla-carousel";
import Autoplay from "embla-carousel-autoplay";
import Fade from "embla-carousel-fade";
import { setupTween } from "./sliderTween";

const carousels = document.querySelectorAll<HTMLDivElement>("div.embla");
carousels.forEach(setupCarousel);

function setupCarousel(e: HTMLDivElement) {
  const wrapperNode = e;
  const viewportNode = e.querySelector<HTMLDivElement>("div.embla__viewport");
  const nextButtonNode =
    e.querySelector<HTMLButtonElement>("button.embla__next");
  const prevButtonNode =
    e.querySelector<HTMLButtonElement>("button.embla__prev");
  const dotsNode = e.querySelector<HTMLDivElement>("div.embla__dots");
  let dotNodes: HTMLElement[] = [];

  if (!(wrapperNode && viewportNode)) return;
  const transition = (e.dataset.transition ?? "slider") as
    | "slider"
    | "carousel"
    | "fader";
  const hoverpause = e.hasAttribute("data-hoverpause");
  const minSlideWidth = Number(e.dataset.minSlideWidth);

  const emblaApi = EmblaCarousel(
    viewportNode,
    {
      loop: transition !== "slider",
      duration: Number(e.dataset.duration) || 30,
      inViewMargin: "0px 10px 0px 0px",
      inViewThreshold: 0,
      align: (e.dataset.focus as "start" | "center" | "end") ?? "center",
      skipSnaps: true,
      containScroll: e.hasAttribute("data-bound") ? "trimSnaps" : false,
    },
    [
      Autoplay({
        active: !!e.dataset.autoplay,
        delay: Number(e.dataset.autoplay),
        defaultInteraction: false,
      }),
      Fade({ active: transition === "fader" }),
    ],
  );

  prevButtonNode?.addEventListener(
    "click",
    () => {
      emblaApi.goToPrev();
      emblaApi.plugins().autoplay?.reset();
    },
    false,
  );
  nextButtonNode?.addEventListener(
    "click",
    () => {
      emblaApi.goToNext();
      emblaApi.plugins().autoplay?.reset();
    },
    false,
  );

  if (prevButtonNode || nextButtonNode) {
    const toggleButtonsDisabled = (emblaApi: EmblaCarouselType) => {
      prevButtonNode?.toggleAttribute("disabled", !emblaApi.canGoToPrev());
      nextButtonNode?.toggleAttribute("disabled", !emblaApi.canGoToNext());
    };

    toggleButtonsDisabled(emblaApi);
    emblaApi.on("select", toggleButtonsDisabled);
    emblaApi.on("reinit", toggleButtonsDisabled);
  }

  if (dotsNode) {
    const setupDots = (emblaApi: EmblaCarouselType, dotsNode: HTMLElement) => {
      dotNodes = createDotButtons(emblaApi, dotsNode);
      dotNodes.length && toggleDotButtonActive(emblaApi, dotNodes);
    };

    setupDots(emblaApi, dotsNode);

    emblaApi.on("select", (emblaApi) => {
      dotNodes.length && toggleDotButtonActive(emblaApi, dotNodes);
    });
    emblaApi.on("reinit", (emblaApi) => setupDots(emblaApi, dotsNode));
  }

  // Pause autoplay if mouse is within slider
  emblaApi.on("autoplay:interaction", (emblaApi, event) => {
    const { isMouseOver, isPointerDown } = event.detail;
    if ((isMouseOver && hoverpause) || isPointerDown)
      emblaApi.plugins().autoplay?.pause();
    else emblaApi.plugins().autoplay?.play();
  });

  if (dotsNode) {
    emblaApi.on("autoplay:timerset", (emblaApi, _event) => {
      const autoplay = emblaApi.plugins().autoplay;
      if (!autoplay) return;
      const untilNext = autoplay.timeUntilNext();
      if (!untilNext) {
        dotsNode.classList.toggle("embla__autoplay", false);
        return;
      }

      dotsNode.classList.toggle("embla__autoplay", true);
      dotsNode.style.setProperty(
        "--embla-autoplay-animation-duration",
        `${untilNext}ms`,
      );
    });
    emblaApi.on("autoplay:timerstopped", (emblaApi, _event) => {
      const autoplay = emblaApi.plugins().autoplay;
      if (!autoplay) return;
      dotsNode.classList.toggle("embla__autoplay", false);
    });
  }

  if (minSlideWidth) {
    emblaApi.on("resize", (emblaApi, { detail }) => {
      const containerResize = detail.find((e) =>
        e.target.classList.contains("embla__container"),
      );
      if (!containerResize) return;

      const width = containerResize.contentRect.width;

      const styles = window.getComputedStyle(containerResize.target);
      const perView = Number(styles.getPropertyValue("--perView"));
      if (isNaN(perView)) return;

      const newPerView = Math.floor(width / minSlideWidth);

      if (
        newPerView >= 1 &&
        newPerView !== perView &&
        newPerView + Number(transition !== "slider") <=
          emblaApi.slideNodes().length
      ) {
        e.style.setProperty("--perView", newPerView.toString());
      }
    });
  }

  emblaApi.plugins().autoplay?.play();
  emblaApi.on("reinit", (emblaApi) => emblaApi.plugins().autoplay?.play());
  setupTween(emblaApi);
}

function createDotButtons(emblaApi: EmblaCarouselType, dotsNode: HTMLElement) {
  const emblaNode = emblaApi.rootNode().parentElement;
  if (!emblaNode) return [];
  const dotTemplate = emblaNode.querySelector<HTMLTemplateElement>(
    "template.embla__dot__template",
  );
  if (!dotTemplate) return [];
  const snapList = emblaApi.snapList();

  // Clear all existing dots
  dotsNode.replaceChildren();

  snapList.forEach((_snap, index) => {
    const dotClone = document.importNode(
      dotTemplate.content,
      true,
    )?.firstElementChild;
    if (!dotClone) return;
    const dotNode = dotsNode.appendChild(dotClone);
    dotNode.addEventListener(
      "click",
      () => {
        emblaApi.goTo(index);
        emblaApi.plugins().autoplay?.reset();
      },
      false,
    );
  });

  return Array.from(dotsNode.querySelectorAll<HTMLElement>(".embla__dot"));
}

function toggleDotButtonActive(
  emblaApi: EmblaCarouselType,
  dotNodes: NodeListOf<HTMLElement> | HTMLElement[],
) {
  if (!dotNodes.length) return;
  const prev = emblaApi.previousSnap();
  const selected = emblaApi.selectedSnap();
  dotNodes[prev].classList.remove("embla__dot--selected");
  dotNodes[selected].classList.add("embla__dot--selected");
}
