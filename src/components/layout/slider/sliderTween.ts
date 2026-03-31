import type {
  EmblaCarouselType,
  EmblaEventListType,
  EmblaEventModelType,
} from "embla-carousel";

const TWEEN_FACTOR_BASE = 0.02;
let tweenFactor = 0;
let tweenNodes: HTMLElement[] = [];

const setTweenFactor = (emblaApi: EmblaCarouselType): void => {
  tweenFactor = TWEEN_FACTOR_BASE * emblaApi.snapList().length;
};

const tween = <EventType extends keyof EmblaEventListType>(
  emblaApi: EmblaCarouselType,
  event?: EmblaEventModelType<EventType>,
): void => {
  const engine = emblaApi.internalEngine();
  const scrollProgress = emblaApi.scrollProgress();
  const slidesInView = emblaApi.slidesInView();
  const isScrollEvent = event?.type === "scroll";

  emblaApi.snapList().forEach((scrollSnap, snapIndex) => {
    let diffToTarget = scrollSnap - scrollProgress;
    const slidesInSnap = engine.scrollSnapList.slidesBySnap[snapIndex];

    slidesInSnap.forEach((slideIndex) => {
      if (isScrollEvent && !slidesInView.includes(slideIndex)) return;

      if (engine.options.loop) {
        engine.slideLooper.loopPoints.forEach((loopItem) => {
          const target = loopItem.target();

          if (slideIndex === loopItem.index && target !== 0) {
            if (target < 0) {
              diffToTarget = scrollSnap - (1 + scrollProgress);
            } else {
              diffToTarget = scrollSnap + (1 - scrollProgress);
            }
          }
        });

        const slide = emblaApi.slideNodes()[slideIndex];

        if (slide)
          slide.style.setProperty("--embla-tween", diffToTarget.toFixed(3));
        else console.log("No slide :(");
      }
    });
  });
};

export const setupTween = (emblaApi: EmblaCarouselType): void => {
  setTweenFactor(emblaApi);
  tween(emblaApi);

  emblaApi
    .on("reinit", setTweenFactor)
    .on("reinit", tween)
    .on("scroll", tween)
    .on("slidefocus", tween);
};
