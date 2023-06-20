const components = {};
const componentImports = import.meta.glob("../../**/*.jsx", {
  eager: true,
});
Object.entries(componentImports).forEach(([path, obj]) => {
  const parts = path.replace("../../", "").split(".")[0].split("/");
  if (parts.length > 1 && parts[parts.length - 1] === parts[parts.length - 2]) {
    parts.pop();
  }
  const bookshopName = parts.join("/");
  components[bookshopName] = obj.default;
});

export default function Columns(block) {
  return (
    <section className="columns" style={{"--column-count": block.content_blocks.length}}>
      { block.content_blocks.map((column, i) => {
        const Component = components[column._bookshop_name];
        return (
          <div className={`column${i}`}>
            <Component {...column} key={i} />
          </div>
        );
      })}
    </section>
  );
}
