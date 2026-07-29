const CAFE = 'https://calabasascoffeehouse.com';

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-line/70">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-3">
        <div>
          <h2 className="font-display text-base font-semibold text-cch-blue">
            Calabasas Coffee House
          </h2>
          <address className="mt-2 text-sm not-italic leading-relaxed text-ink-soft">
            23500 Park Sorrento, A3
            <br />
            Calabasas, CA 91302
            <br />
            <a href="tel:+17472637008" className="hover:text-cch-blue">
              (747) 263-7008
            </a>
          </address>
        </div>

        <nav aria-label="Shop" className="text-sm">
          <h2 className="mb-2 font-semibold text-ink">Shop</h2>
          <ul className="space-y-1.5 text-ink-soft">
            <li><a href="/merch" className="hover:text-cch-blue">CCH Merch</a></li>
            <li><a href="/good-things-brewing" className="hover:text-cch-blue">Good Things Brewing</a></li>
            <li><a href="/track" className="hover:text-cch-blue">Track your order</a></li>
            <li><a href="/shipping-returns" className="hover:text-cch-blue">Shipping &amp; returns</a></li>
            <li>
              <a href="mailto:info@calabasascoffeehouse.com" className="hover:text-cch-blue">
                info@calabasascoffeehouse.com
              </a>
            </li>
          </ul>
        </nav>

        <nav aria-label="Cafe" className="text-sm">
          <h2 className="mb-2 font-semibold text-ink">Cafe</h2>
          <ul className="space-y-1.5 text-ink-soft">
            <li><a href={CAFE} className="hover:text-cch-blue">Home</a></li>
            <li><a href={`${CAFE}/order`} className="hover:text-cch-blue">Order online</a></li>
            <li><a href={`${CAFE}/coffee-cart`} className="hover:text-cch-blue">Coffee cart events</a></li>
            <li>
              <a
                href="https://www.instagram.com/calabasascoffeehouse/"
                className="hover:text-cch-blue"
                rel="noopener noreferrer"
                target="_blank"
              >
                Instagram
              </a>
            </li>
          </ul>
        </nav>
      </div>

      <div className="border-t border-line/70 py-6 text-center text-xs text-ink-faint">
        © {new Date().getFullYear()} Calabasas Coffee House. All rights reserved.
      </div>
    </footer>
  );
}
