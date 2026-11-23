/**
 * Shared Cloudinary & Unsplash URL optimization helpers.
 * Kept in a standalone module so route-level bundles don't pull in HomepageMediaGallery.
 */
export const getOptimizedMediaUrl = (
  url: string,
  targetWidth = 640,
  mediaType: "image" | "video" = "image"
): string => {
  if (!url) return "";

  if (url.includes("res.cloudinary.com") && url.includes("/upload/")) {
    if (url.includes("/f_auto,q_auto") || url.includes("/w_")) {
      return url;
    }
    if (mediaType === "video") {
      return url.replace(
        "/upload/",
        `/upload/f_auto,q_auto:eco,vc_auto,w_${targetWidth},c_limit/`
      );
    }
    return url.replace(
      "/upload/",
      `/upload/f_auto,q_auto:good,w_${targetWidth},c_limit/`
    );
  }

  if (url.includes("images.unsplash.com") && !url.includes("w=")) {
    const separator = url.includes("?") ? "&" : "?";
    return `${url}${separator}auto=format&fit=crop&w=${targetWidth}&q=80`;
  }

  return url;
};
