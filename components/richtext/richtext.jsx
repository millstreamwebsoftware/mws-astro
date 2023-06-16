import MarkdownIt from "markdown-it";
const md = new MarkdownIt({ html: true });

export default function Sample(block) {
  return (
    <section className="richtext">
      <div className="richtext-content"
        dangerouslySetInnerHTML={{
          __html: md.render(block.markdown),
        }}
      />
    </section>
  );
}
