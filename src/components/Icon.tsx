/**
 * The app's line icons: one 24-unit grid, one stroke, currentColor — so an
 * icon takes the colour of the text it sits with. Plain module, usable from
 * server and client components alike.
 */
export function Icon({ name, size = 26 }: { name: string; size?: number }) {
  const paths: Record<string, React.ReactNode> = {
    clients: (
      <>
        <circle cx="9" cy="8" r="3.5" />
        <path d="M2.5 20c.6-3.6 3.2-5.5 6.5-5.5s5.9 1.9 6.5 5.5" />
        <circle cx="17" cy="9" r="2.8" />
        <path d="M16.5 14.6c2.6.2 4.4 1.9 5 4.9" />
      </>
    ),
    programmes: <path d="M6.5 7v10M17.5 7v10M3.5 9.5v5M20.5 9.5v5M6.5 12h11" />,
    foods: (
      <>
        <path d="M12 7.5c-1.6-1.1-3.4-1.5-5-.9C4.4 7.5 3.4 10.6 4.4 14c1 3.5 3.5 6.5 5.6 6.5.8 0 1.3-.4 2-.4s1.2.4 2 .4c2.1 0 4.6-3 5.6-6.5 1-3.4 0-6.5-2.6-7.4-1.6-.6-3.4-.2-5 .9z" />
        <path d="M12 7.5c0-2 1-3.6 3-4.5" />
      </>
    ),
    inbox: <path d="M4 5.5h16v10.5H9l-5 4z" />,
    billing: (
      <>
        <path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" />
        <path d="M9 8h6M9 12h6M9 16h3" />
      </>
    ),
    checkIns: (
      <>
        <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
        <path d="M3.5 9.5h17M8 3v4M16 3v4M9 14.5l2 2 4-4" />
      </>
    ),
    company: (
      <>
        <rect x="3.5" y="7" width="17" height="12.5" rx="2.5" />
        <path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7M3.5 12.5h17" />
      </>
    ),
    allowlist: (
      <>
        <path d="M12 3 5 6v5.5c0 4.2 2.9 7.7 7 9.5 4.1-1.8 7-5.3 7-9.5V6z" />
        <path d="m9 12 2 2 4-4" />
      </>
    ),
    log: <path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" />,
    admin: (
      <>
        <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
        <circle cx="16" cy="7" r="2" />
        <circle cx="10" cy="17" r="2" />
      </>
    ),
  };

  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  );
}
