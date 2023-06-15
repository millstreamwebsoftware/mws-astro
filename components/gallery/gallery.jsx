export default function Gallery(gallery) {
  return (
    <div className="gallery">
      {
        gallery.images.map((img) => (
          <div class="gallery-item">
            <img src={img.file} />
            <h3>{img.title}</h3>
            <p>{img.description}</p>
          </div>
        ))
      }
    </div>
  );
}