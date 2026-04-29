"use client";

import React from "react";
import { ReactCompareSlider, ReactCompareSliderImage } from "react-compare-slider";

interface ImageCompareProps {
  itemOne: string;
  itemTwo: string;
}

export const ImageCompare = ({ itemOne, itemTwo }: ImageCompareProps) => {
  return (
    <div className="rounded-xl overflow-hidden border border-border shadow-lg">
      <ReactCompareSlider
        itemOne={<ReactCompareSliderImage src={itemOne} alt="Original Image" />}
        itemTwo={<ReactCompareSliderImage src={itemTwo} alt="Processed Image" />}
        style={{ width: "100%", height: "100%", maxHeight: "500px" }}
      />
    </div>
  );
};
