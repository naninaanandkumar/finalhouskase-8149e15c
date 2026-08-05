export function AvailableOnBanner() {
  return (
    <div className="w-full my-[5px]">
      <picture className="block w-full">
        <source
          media="(min-width: 768px)"
          srcSet="https://ik.imagekit.io/houskase/avialble%20on.avif"
          type="image/avif"
        />
        <img
          src="https://ik.imagekit.io/houskase/available.png"
          alt="Houskase available on app stores"
          loading="lazy"
          className="w-full object-cover"
        />
      </picture>
    </div>
  );
}