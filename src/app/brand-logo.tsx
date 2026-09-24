type BrandLogoProps = {
  className?: string;
  title?: string;
};

export default function BrandLogo({ className, title }: BrandLogoProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 48 48"
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      focusable="false"
    >
      {title ? <title>{title}</title> : null}

      <rect x="2" y="2" width="44" height="44" rx="13" fill="#0F9FA8" />
      <path
        d="M33 2h0c7.18 0 13 5.82 13 13v18c0 7.18-5.82 13-13 13h-4.5c6.8-4.6 11.2-12.2 11.2-20.8C39.7 15.1 37.2 7.4 33 2Z"
        fill="#08747B"
        opacity=".6"
      />
      <path
        d="M35.4 5.4c4.7 2.3 8.2 6.6 9.6 11.8-4.2-2.7-8.7-4.2-13.6-4.3 1.8-2.4 3.1-4.9 4-7.5Z"
        fill="#A71972"
      />

      <path
        d="M14.5 8.8h13.2l7.8 7.8v16.9a4.2 4.2 0 0 1-4.2 4.2H14.5a4.2 4.2 0 0 1-4.2-4.2V13a4.2 4.2 0 0 1 4.2-4.2Z"
        fill="#FFFFFF"
      />
      <path
        d="M27.7 8.8v5.4a2.4 2.4 0 0 0 2.4 2.4h5.4"
        fill="#DDF6F4"
      />
      <path
        d="M27.7 8.8v5.4a2.4 2.4 0 0 0 2.4 2.4h5.4"
        fill="none"
        stroke="#BDE8E5"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />

      <path d="M15.5 16.3h7.5" stroke="#9BCFCC" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M15.5 20.4h10.8" stroke="#C6DEDC" strokeWidth="1.7" strokeLinecap="round" />

      <path
        d="m18.8 31.1-1.5 11.1 6.5-3.5 6.2 3.5-1.5-11.1"
        fill="#A71972"
      />
      <circle cx="23.7" cy="29.2" r="7.4" fill="#08747B" stroke="#FFFFFF" strokeWidth="2" />
      <path
        d="m19.9 29.2 2.5 2.5 5-5.2"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <path
        d="M8.5 31.4c1.2 5.8 5.5 10.5 11 12.3"
        fill="none"
        stroke="#FFFFFF"
        strokeOpacity=".22"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}
