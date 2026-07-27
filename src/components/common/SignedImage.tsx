import { ImgHTMLAttributes, useEffect, useState } from "react";
import { getSignedImageUrl, isProductBucketUrl } from "@/lib/signedImageUrls";

type SignedImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  src?: string | null;
  fallbackSrc?: string;
};

export function SignedImage({ src, fallbackSrc = "/placeholder.svg", onError, ...props }: SignedImageProps) {
  const [currentSrc, setCurrentSrc] = useState(src || fallbackSrc);
  const [triedSignedFallback, setTriedSignedFallback] = useState(false);

  useEffect(() => {
    setCurrentSrc(src || fallbackSrc);
    setTriedSignedFallback(false);
  }, [src, fallbackSrc]);

  return (
    <img
      {...props}
      src={currentSrc}
      decoding={props.decoding || "async"}
      onError={async (event) => {
        if (!triedSignedFallback && isProductBucketUrl(src)) {
          setTriedSignedFallback(true);
          const signed = await getSignedImageUrl(src);
          if (signed && signed !== currentSrc) {
            setCurrentSrc(signed);
            return;
          }
        }

        if (currentSrc !== fallbackSrc) {
          setCurrentSrc(fallbackSrc);
          return;
        }

        onError?.(event);
      }}
    />
  );
}
