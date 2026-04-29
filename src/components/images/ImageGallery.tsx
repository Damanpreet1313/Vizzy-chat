"use client";

import React from "react";
import ImageGallery from "react-image-gallery";
import "react-image-gallery/styles/css/image-gallery.css";
import { Card, CardContent } from "@/components/ui/card";

interface ImageItem {
  original: string;
  thumbnail: string;
  description?: string;
}

interface GalleryProps {
  images: ImageItem[];
}

export const Gallery = ({ images }: GalleryProps) => {
  if (!images || images.length === 0) {
    return (
      <div className="text-center p-8 border-2 border-dashed rounded-xl text-muted-foreground">
        No images yet. Generate some!
      </div>
    );
  }

  return (
    <Card className="overflow-hidden border-none shadow-none bg-transparent">
      <CardContent className="p-0">
        <ImageGallery 
          items={images} 
          showPlayButton={false} 
          showFullscreenButton={true}
          useBrowserFullscreen={false}
          additionalClass="rounded-xl overflow-hidden"
        />
      </CardContent>
    </Card>
  );
};
