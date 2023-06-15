var components: Record<string, any>;

export function getComponents(): Record<string, any> {
  if (!components) {
    components = {};

    const componentImports = import.meta.glob("./components/**/*.jsx", {
      eager: true,
    });

    for (const path in componentImports) {
      const parts = path
        .replace(/^.*?components\//, "")
        .split(".")[0]
        .split("/");

      if (
        parts.length > 1 &&
        parts[parts.length - 1] === parts[parts.length - 2]
      ) {
        parts.pop();
      }
      const bookshopName = parts.join("/");

      components[bookshopName] = (<any>componentImports[path]).default;
    }

    // Object.entries(componentImports).forEach(([path, obj]: [string, object]) => {
    //   const parts = path
    //     .replace("../../components/", "")
    //     .split(".")[0]
    //     .split("/");
    //   if (
    //     parts.length > 1 &&
    //     parts[parts.length - 1] === parts[parts.length - 2]
    //   ) {
    //     parts.pop();
    //   }
    //   const bookshopName = parts.join("/");
    //   components[bookshopName] = obj.default;
    // });
  }

  return components;
}

export function getComponent(bookshop: string): any {
  const c = getComponents();
  if (bookshop in c) {
    return c[bookshop];
  }
  return null;
}
