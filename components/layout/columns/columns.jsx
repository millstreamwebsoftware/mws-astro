export default function Columns(block) {
  return (
    <section className="columns" style={{"--column-count": block.content_blocks.length}}>
      { block.content_blocks.map((column, i) => (
        <div className={`column${i}`}>
          <p>Column Test</p>
        </div>
      ))}
    </section>
  );
}
