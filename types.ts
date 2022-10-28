type GalleryItem = {
    image: string;
    title?: string;
    description?: string;
    alt?: string;
    link?: string;
}

type Gallery = {
    columns: number;
    images: GalleryItem[];
}

export type {
    GalleryItem,
    Gallery
}