export function AvailableOnBanner() {
  return (
    <div className="container mx-auto px-3 sm:px-4 my-[5px]">
      <picture>
        <source
          media="(min-width: 768px)"
          srcSet="https://ik.imagekit.io/houskase/avialble%20on.avif"
          type="image/avif"
        />
        <img
          src="https://ik.imagekit.io/houskase/available.png"
          alt="Houskase available on app stores"
          loading="lazy"
          className="w-full rounded-xl border border-border object-contain"
        />
      </picture>
    </div>
  );
}