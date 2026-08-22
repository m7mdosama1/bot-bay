import Link from "next/link";
import { useMemo } from "react";

const navigation = {
  product: [
    { name: "Browse Bots", href: "/bots" },
    { name: "Pricing", href: "/#pricing" },
    { name: "Documentation", href: "https://github.com/kilo-org/bot-bay#readme" },
  ],
  company: [
    { name: "About", href: "/about" },
    { name: "Blog", href: "/blog" },
    { name: "Careers", href: "/careers" },
  ],
  legal: [
    { name: "Privacy Policy", href: "/privacy-policy" },
    { name: "Terms of Service", href: "/terms" },
    { name: "Cookie Policy", href: "/cookies" },
  ],
  social: [
    {
      name: "GitHub",
      href: "https://github.com",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 0C5.373 0 0 5.373 0 12.005 0 17.377 3.438 21.977 8.205 23.317.842 23.717 0 22.365 0 21.778C0 21.027 3.02 21.242 3.02 21.242 6.386 21.58 6.386 20.52 6.386 20.52C6.386 19.23 7.215 19.005 8.129 18.928C15.079 19.028 18.779 14.318 18.779 8.612C18.779 7.049 18.199 5.622 17.092 4.492C17.242 4.217 17.729 3.185 16.212 3.872C16.212 3.872 15.104 4.21 12.956 5.397C11.206 4.775 9.342 4.722 7.429 5.257C7.429 5.257 6.312 5.618 4.548 5.618C2.818 5.618 1.667 5.279 1.667 5.279C3.159 3.997 4.62 3.733 4.62 3.733C9.859 2.818 10.01 5.042 10.01 5.397C6.974 5.864 4.878 8.089 4.878 11.226C4.878 15.458 7.944 19.81 11.559 21.667C12.036 21.538 12.502 21.262 12.915 20.877C12.915 20.877 12.468 17.691 12.468 14.925C12.468 12.827 15.198 10.95 18.884 10.95C20.208 10.95 21.507 10.634 22.623 10.012C22.163 9.046 21.197 8.808 20.184 8.808C15.079 8.808 11.543 5.276 11.543 1.337C11.543 0.943 11.628 0.549 11.707 0.156C7.782 1.434 5.079 5.019 5.079 9.337C5.079 13.702 11.707 16.59 14.329 16.59C14.967 16.59 15.573 16.444 16.093 16.262C18.089 15.586 20.028 14.107 20.028 11.226C20.028 8.107 17.929 5.995 14.466 5.226C15.682 5.01 16.809 4.049 16.809 4.049" fill="currentColor" />
        </svg>
      ),
    },
    {
      name: "Twitter",
      href: "https://twitter.com",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M18.244 2.25h3.308l-7.529 8.278L24 21.75h-6.652l-5.682-7.607L5.75 21.75H1.667l8.33-10.75L1.25 2.25H5.71l7.04 9.31L17.5 2.25Z" fill="currentColor" />
        </svg>
      ),
    },
    {
      name: "Website",
      href: "https://bot-bay.com",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2Zm0 18c-4.411 0-8-3.589-8-8 0-1.262.295-2.431.804-3.434l-.034.055A8.005 8.005 0 0 0 12 20c1.263 0 2.43.295 3.434.805-.055-.035-.055-.035-.034-.055A8.003 8.003 0 0 0 12 20Z" fill="currentColor" />
        </svg>
      ),
    },
  ],
};

export function Footer() {
  const year = useMemo(() => new Date().getFullYear(), []);

  return (
    <footer className="border-t border-line bg-bg-raised mt-20">
      <div className="container mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-amber-signal to-violet-deep rounded-lg flex items-center justify-center">
                <span className="font-display font-bold text-bg-void text-sm">BB</span>
              </div>
              <span className="font-display text-xl font-bold gradient-text">Bot Bay</span>
            </div>
            <p className="text-sm text-text-dim max-w-xs">
              A complete Discord bot ecosystem — verification, giveaways, moderation, tickets,
              and more. All in one professional platform.
            </p>
            <div className="flex gap-3 mt-4">
              {navigation.social.map((item) => (
                <a
                  key={item.name}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-lg bg-card-bg border border-glass-border flex items-center justify-center text-text-dim hover:text-amber-signal hover:border-amber-signal transition-all duration-200"
                  aria-label={item.name}
                >
                  {item.icon}
                </a>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-display font-semibold text-text mb-4 text-sm tracking-wider uppercase">
              Product
            </h3>
            <ul className="space-y-2">
              {navigation.product.map((item) => (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className="text-sm text-text-dim hover:text-text transition-colors"
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-display font-semibold text-text mb-4 text-sm tracking-wider uppercase">
              Company
            </h3>
            <ul className="space-y-2">
              {navigation.company.map((item) => (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className="text-sm text-text-dim hover:text-text transition-colors"
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-display font-semibold text-text mb-4 text-sm tracking-wider uppercase">
              Legal
            </h3>
            <ul className="space-y-2">
              {navigation.legal.map((item) => (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className="text-sm text-text-dim hover:text-text transition-colors"
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-line mt-10 pt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sm text-text-dim">
            &copy; {year} Bot Bay. All rights reserved.
          </p>
          <p className="text-xs text-text-dim">
            Made with ♥ for the Discord community by m7md osama
          </p>
        </div>
      </div>
    </footer>
  );
}
