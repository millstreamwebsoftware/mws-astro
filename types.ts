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

type FlickityOptions = {
    draggable?: object;
    freeScroll?: boolean;
    wrapAround?: boolean;
    groupCells?: object;
    autoPlay?: object;
    fullscreen?: boolean;
    fade?: boolean;
    adaptiveHeight?: boolean;
    watchCSS?: boolean;
    asNavFor?: object;
    hash?: boolean;
    dragThreshold?: number;
    selectedAttraction?: number;
    friction?: number;
    freeScrollFriction?: number;
    imagesLoaded?: boolean;
    lazyLoad?: object;
    bgLazyLoad?: object;
    cellSelector?: string;
    initialIndex?: object;
    accessibility?: boolean;
    setGallerySize?: boolean;
    resize?: boolean;
    cellAlign?: string;
    contain?: boolean;
    percentPosition: object;
    rightToLeft?: boolean;
    prevNextButtons?: boolean;
    pageDots?: boolean;
    arrowShape?: string;
}

type Slider = {
    images: GalleryItem[];
    options: FlickityOptions;
}

export type {
    GalleryItem,
    Gallery,
    FlickityOptions,
    Slider
}