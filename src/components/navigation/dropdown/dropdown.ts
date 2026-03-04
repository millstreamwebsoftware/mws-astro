import {
  computePosition,
  type ComputePositionConfig,
  type Placement,
  autoUpdate,
  offset,
  shift,
  flip,
  size,
  arrow,
  type SizeOptions,
} from "@floating-ui/dom";

const dropdowns = Array.from(
  document.querySelectorAll<HTMLElement>(".dropdown"),
);

const navigation = document.getElementById("navigation");

if (navigation) {
  document.body.addEventListener("click", handleNavigationEvent);
  document.body.addEventListener("keydown", handleNavigationEvent);
  navigation.addEventListener("focusout", handleNavigationEvent);
}

function px(i?: number): string | undefined {
  if (typeof i === "undefined") return;
  return `${Math.floor(i)}px`;
}

function isMobileNav(): boolean {
  return document.body.classList.contains("mobile-nav");
}

/**
 * Close the dropdown of a given element, and cleanup
 * @param target element to close the dropdown of
 */
function closeDropdown(dropdown: HTMLElement) {
  if ("_cleanup" in dropdown && dropdown._cleanup instanceof Function) {
    dropdown._cleanup();
  }
}

/**
 * Close all dropdowns decending from target
 * @param target defaults to navigation if unset
 * @param inverse close all dropdowns outside of target
 */
function closeAllDropdowns(
  target?: HTMLElement | undefined,
  inverse: boolean = false,
) {
  dropdowns
    .filter((dropdown) =>
      target
        ? inverse
          ? !dropdown.contains(target)
          : target.contains(dropdown)
        : true,
    )
    .forEach(closeDropdown);
}

/**
 * Open the dropdown of the target element
 * @param target element to open the dropdown of
 * @param dropdownElement dropdown to open (optional)
 */
function openDropdown(dropdown: FloatingUIElement) {
  // Close all dropdowns that do not contain the new dropdown
  closeAllDropdowns(dropdown, true);

  // // const caret = dropdown.querySelector<HTMLElement>(
  // //   ":scope > .dropdown-overlay .dropdown-arrow",
  // );

  const dropdownItems = dropdown.querySelector<HTMLElement>(
    ":scope > .dropdown-items",
  );
  if (!dropdownItems) return;

  const caret = dropdownItems.querySelector<HTMLElement>(
    ":scope > .dropdown-arrow",
  );

  const options: ComputePositionConfig = dropdownOptions(
    dropdown,
    dropdownItems,
    caret,
  );

  const cleanup = autoUpdate(dropdown, dropdownItems, () => {
    computePosition(dropdown, dropdownItems, options).then(
      ({ x, y, middlewareData, placement }) => {
        if (document.body.classList.contains("mobile-nav")) {
          Object.assign(dropdownItems.style, {
            left: null,
            top: null,
          });

          dropdown.classList.remove("floating");
          return;
        }

        Object.assign(dropdownItems.style, {
          left: px(x),
          top: px(y),
        });

        dropdown.classList.add("floating");

        if (middlewareData.arrow && caret) {
          const direction = placement.replace(/-.*/, "") as
            | "top"
            | "left"
            | "right"
            | "bottom";
          const d = (dir: "top" | "left" | "right" | "bottom") =>
            dir === direction;
          const horizontal = d("left") || d("right");
          const rotation = `${
            { bottom: 0, left: 0.25, top: 0.5, right: 0.75 }[direction]
          }turn`;

          const caretOffset = `calc(var(--header-arrow-size) * -1)`;
          var transform = "rotate(var(--rotation))";
          if (horizontal) {
            // Compensate rotation for non-square shaped carets
            transform =
              (d("left")
                ? "translate(calc((var(--header-arrow-width) - var(--header-arrow-size)) * .5)) "
                : "translate(calc((var(--header-arrow-width) - var(--header-arrow-size)) * -.5)) ") +
              transform;
          }

          caret.style = ""; // Clear styles before updating
          Object.assign(caret.style, {
            transform,
            top: horizontal
              ? px(middlewareData.arrow.y)
              : d("bottom") && caretOffset,
            right: d("left") && caretOffset,
            bottom: d("top") && caretOffset,
            left: !horizontal
              ? px(middlewareData.arrow.x)
              : d("right") && caretOffset,
          });
          caret.style.setProperty("--rotation", rotation);
        }
      },
    );
  });

  dropdown._cleanup = () => {
    cleanup();

    dropdown.classList.remove("dropdown-open");
    dropdown.setAttribute("aria-expanded", "false");
    dropdownItems.setAttribute("style", "");
  };

  dropdown.setAttribute("aria-expanded", "true");
  dropdown.classList.add("dropdown-open");
}

function dropdownOptions(
  target: HTMLElement,
  dropdown: HTMLElement,
  caret?: HTMLElement | null,
): ComputePositionConfig {
  const dropdownComputedStyles = window.getComputedStyle(dropdown);
  const placement =
    (target.dataset.placement as Placement | undefined) || "bottom-start";
  const vertical =
    placement?.startsWith("bottom") || placement?.startsWith("top");
  const caretOffset = caret
    ? parseLength(
        dropdownComputedStyles.getPropertyValue("--header-arrow-height") ||
          dropdownComputedStyles.getPropertyValue("--header-arrow-size"),
      )
    : 0;
  var dropdownMainOffset = 0,
    dropdownCrossOffset = 0;

  if (!vertical) {
    dropdownMainOffset = parseLength(dropdownComputedStyles.paddingRight);
    dropdownCrossOffset = parseLength(dropdownComputedStyles.paddingTop);
  }

  const resizeHandler: SizeOptions["apply"] = ({
    rects,
    elements,
    availableHeight,
  }) => {
    if (isMobileNav()) {
      Object.assign(elements.floating.style, {
        maxHeight: null,
        minWidth: null,
      });
      return;
    }

    // Unset minWidth so scrollWidth can collapse
    Object.assign(elements.floating.style, {
      minWidth: null,
    });

    // Set minWidth to at least scrollWidth to fix incorrect flexbox column sizing in firefox
    Object.assign(elements.floating.style, {
      maxHeight: px(availableHeight),
      minWidth: px(
        Math.max(rects.reference.width, elements.floating.scrollWidth),
      ),
    });
  };

  return {
    placement,
    strategy: "fixed",
    middleware: [
      offset({
        mainAxis: caretOffset + dropdownMainOffset,
        crossAxis: -dropdownCrossOffset,
      }),
      shift({ padding: 10 }),
      size({ apply: resizeHandler, padding: 10 }),
      !vertical && flip(),
      caret && arrow({ element: caret }),
    ],
  };
}

/**
 * Attempt to convert a css length value string (px/rem) to pixels, otherwise return 0
 * @param length css pixel length string
 */
function parseLength(length: string): number {
  if (length.endsWith("px")) return Number.parseInt(length);
  if (length.endsWith("rem"))
    return convertRemToPixels(Number.parseFloat(length));
  console.warn(`String '${length}' could not be parsed as a length.`);
  return 0;
}

/** Convert rem to pixels if required */
function convertRemToPixels(rem: number): number {
  return rem * parseFloat(getComputedStyle(document.documentElement).fontSize);
}

/**
 * Update dropdown state after event
 * @param this
 * @param e
 */
function handleNavigationEvent(this: HTMLElement, e: Event) {
  if (e instanceof FocusEvent && e.type === "focusout") {
    if (e.relatedTarget && !navigation?.contains(e.relatedTarget as Element))
      closeAllDropdowns();
    return;
  }

  if (e instanceof KeyboardEvent) {
    switch (e.key) {
      case "Escape":
        closeAllDropdowns();

      default:
        return;

      case " ":
      case "Enter":
    }
  }

  const target: HTMLElement | null = (e.target as HTMLElement).closest(
    ".dropdown, .dropdown-items, #navigation",
  );

  if (!target || target.id === "navigation") {
    closeAllDropdowns();
    return;
  } else if (target.classList.contains("dropdown-items")) {
    return;
  }

  const state = !target.classList.contains("dropdown-open");

  if (state) {
    openDropdown(target);
  } else {
    // closeDropdown(target);
    closeAllDropdowns(target);
  }
}
