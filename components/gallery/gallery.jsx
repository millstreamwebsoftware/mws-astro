export default function Gallery(gallery) {
  console.log(gallery.images);
  return (
    <div className="gallery">
      {
        gallery.images.map((img) => (
          <div className="gallery-item">
            <img src={img.image_path} />
            <h3>{img.title}</h3>
            <p>{img.description}</p>
          </div>
        ))
      }
    </div>
  );
}