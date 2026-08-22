"use client";

import { useState, useEffect, useRef } from "react";

interface Testimonial {
  id: number;
  name: string;
  role: string;
  content: string;
  rating: number;
  bot: string;
  botColor: string;
}

const testimonials: Testimonial[] = [
  {
    id: 1,
    name: "Alex Chen",
    role: "Server Owner • 50k members",
    content:
      "Sentinel Verify has cut our alt-account problem by 90%. The IP reputation and account age checks are incredibly effective.",
    rating: 5,
    bot: "Sentinel Verify",
    botColor: "#2AC4B9",
  },
  {
    id: 2,
    name: "Samira Khalid",
    role: "Community Manager • Gaming Hub",
    content:
      "Bounty Drop runs giveaways flawlessly. The reaction-based entry and automatic winner selection save us hours every week.",
    rating: 5,
    bot: "Bounty Drop",
    botColor: "#E8A54D",
  },
  {
    id: 3,
    name: "Marcus Rivera",
    role: "Guild Leader • 500+ servers",
    content:
      "Deskline's ticket system with transcript archiving is a game-changer. Our support team can handle 5x more tickets now.",
    rating: 5,
    bot: "Deskline",
    botColor: "#6B5BD6",
  },
  {
    id: 4,
    name: "Yuki Tanaka",
    role: "Server Admin • Anime Community",
    content:
      "Fortune Wheel brought our community together with its interactive roulette. The daily bonus system keeps users coming back.",
    rating: 5,
    bot: "Fortune Wheel",
    botColor: "#E88A9D",
  },
];

export function Testimonials() {
  const [current, setCurrent] = useState<number>(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const next = () => setCurrent((prev: number) => (prev + 1) % testimonials.length);
  const prev = () => setCurrent((prev: number) => (prev - 1 + testimonials.length) % testimonials.length);

  useEffect(() => {
    timeoutRef.current = setTimeout(next, 6000);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [current]);

  const t = testimonials[current];

  return (
    <section className="py-20 bg-bg-raised">
      <div className="container mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-white mb-4">
            Trusted by <span className="gradient-text">thousands</span> of communities
          </h2>
          <p className="text-text-dim text-lg max-w-2xl mx-auto">
            See what server owners are saying about Bot Bay bots.
          </p>
        </div>

        <div className="max-w-3xl mx-auto">
          <div className="relative">
            <div
              className="card-bg rounded-2xl p-8 md:p-10 border transition-all duration-500 opacity-100 translate-y-0"
              style={{
                borderColor: t.botColor + "40",
              }}
            >
              <div className="flex items-start gap-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-xl font-display font-bold text-bg-void flex-shrink-0"
                  style={{
                    backgroundColor: t.botColor,
                  }}
                >
                  {t.bot.charAt(0)}
                </div>
                <div>
                  <p className="text-xl md:text-2xl text-text italic mb-4 leading-relaxed">
                    "{t.content}"
                  </p>
                  <div className="flex items-center gap-2 mb-2">
                    {Array.from({ length: t.rating }).map((_, i) => (
                      <span key={i} className="text-amber-signal text-sm">
                        ★
                      </span>
                    ))}
                  </div>
                  <div>
                    <p className="font-display font-semibold text-white">{t.name}</p>
                    <p className="text-sm text-text-dim">{t.role}</p>
                    <p className="text-xs text-text-dim mt-1">
                      Using: <span className="text-amber-signal">{t.bot}</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-center gap-2 mt-8">
              {testimonials.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrent(i)}
                  className={`
                    w-2.5 h-2.5 rounded-full transition-all duration-300
                    ${i === current
                      ? "bg-amber-signal w-8"
                      : "bg-line hover:bg-text-dim"}
                  `}
                  aria-label={`Go to testimonial ${i + 1}`}
                />
              ))}
            </div>

            <button
              onClick={prev}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-bg-void border border-line flex items-center justify-center text-text-dim hover:text-text hover:border-amber-signal transition-all duration-200"
              aria-label="Previous testimonial"
            >
              ‹
            </button>
            <button
              onClick={next}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-bg-void border border-line flex items-center justify-center text-text-dim hover:text-text hover:border-amber-signal transition-all duration-200"
              aria-label="Next testimonial"
            >
              ›
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
