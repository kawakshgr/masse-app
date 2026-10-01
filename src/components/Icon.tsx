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
    supplements: (
      <>
        <rect x="3.5" y="8.5" width="17" height="7" rx="3.5" transform="rotate(-45 12 12)" />
        <path d="m9.5 9.5 5 5" />
      </>
    ),
    account: (
      <>
        <circle cx="12" cy="8.5" r="4" />
        <path d="M4.5 20.5c.8-4 3.8-6 7.5-6s6.7 2 7.5 6" />
      </>
    ),
    address: (
      <>
        <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z" />
        <circle cx="12" cy="10" r="2.4" />
      </>
    ),
    sleep: <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z" />,
    chart: <path d="M4 20V10M10 20V4M16 20v-8M22 20H2" />,
    trophy: (
      <>
        <path d="M8 4h8v5a4 4 0 0 1-8 0z" />
        <path d="M8 6H5a2.5 2.5 0 0 0 3 4M16 6h3a2.5 2.5 0 0 1-3 4M12 13v4M8.5 20h7M10 17h4" />
      </>
    ),
    // Muscle families, for the movement picker on a phone.
    chest: (
      <>
        <path d="M12 6.5v10" />
        <path d="M12 7.5C10 6.2 6.6 6 4.6 7.4 3.4 8.3 3.5 11.6 5 13.4c1.6 1.9 4.6 2.2 7 1.6" />
        <path d="M12 7.5c2-1.3 5.4-1.5 7.4-.1 1.2.9 1.1 4.2-.4 6-1.6 1.9-4.6 2.2-7 1.6" />
      </>
    ),
    back: (
      <>
        <path d="M4.5 5.5c2.5 1 5 1.5 7.5 1.5s5-.5 7.5-1.5L16.5 19h-9z" />
        <path d="M12 7v12" />
        <path d="M8 10.5c1.3.6 2.6.9 4 .9s2.7-.3 4-.9" />
      </>
    ),
    shoulders: (
      <>
        <circle cx="12" cy="5.5" r="2.5" />
        <path d="M3.5 16c0-4.4 2.6-7.5 6-7.5h5c3.4 0 6 3.1 6 7.5" />
        <path d="M8.5 8.8c-1.6.8-2.6 2.6-2.6 4.7M15.5 8.8c1.6.8 2.6 2.6 2.6 4.7" />
      </>
    ),
    arms: (
      <>
        <path d="M4 19.5h8.5c3.6 0 6.5-2.2 6.5-5.2 0-2.6-2.2-4.6-5.2-4.6-.9 0-1.8.2-2.6.6L12.5 6l-1.2-2h-3L9.5 7 7 10.5C5.3 12.9 4.3 15.9 4 19.5z" />
        <path d="M11.2 10.3c1 .9 1.6 2.1 1.6 3.4" />
      </>
    ),
    legs: (
      <>
        <path d="M8.5 3.5 7.5 12l1.4 8.5h2.3L11 12l1-8.5" />
        <path d="M15.5 3.5 16.5 12l-1.4 8.5h-2.3L13 12" />
      </>
    ),
    glutes: (
      <>
        <path d="M12 7v7.5" />
        <path d="M12 7.5C8 6.5 4.5 8.6 4.5 13c0 3.6 3.4 5.4 7.5 3" />
        <path d="M12 7.5c4-1 7.5 1.1 7.5 5.5 0 3.6-3.4 5.4-7.5 3" />
      </>
    ),
    abs: (
      <>
        <rect x="6.5" y="4" width="4.5" height="4.5" rx="1.6" />
        <rect x="13" y="4" width="4.5" height="4.5" rx="1.6" />
        <rect x="6.5" y="10" width="4.5" height="4.5" rx="1.6" />
        <rect x="13" y="10" width="4.5" height="4.5" rx="1.6" />
        <rect x="6.5" y="16" width="4.5" height="4.5" rx="1.6" />
        <rect x="13" y="16" width="4.5" height="4.5" rx="1.6" />
      </>
    ),
    cardio: (
      <>
        <path d="M12 20s-7.2-4.4-8.6-9.2A4.6 4.6 0 0 1 12 7.4a4.6 4.6 0 0 1 8.6 3.4C19.2 15.6 12 20 12 20z" />
        <path d="M5 12.5h3.5L10 10l2 5 1.5-2.5H19" />
      </>
    ),
    // Food and supplement families, for the libraries on a phone.
    egg: <path d="M12 3.5c3.4 0 6.2 5.1 6.2 9.6a6.2 6.2 0 0 1-12.4 0c0-4.5 2.8-9.6 6.2-9.6z" />,
    bread: (
      <>
        <path d="M6 11.2A3.6 3.6 0 0 1 7.4 4.5h9.2A3.6 3.6 0 0 1 18 11.2V19a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 19z" />
        <path d="M9.5 11v6M14.5 11v6" />
      </>
    ),
    drop: <path d="M12 3.5s6.2 6.6 6.2 10.8a6.2 6.2 0 0 1-12.4 0C5.8 10.1 12 3.5 12 3.5z" />,
    leaf: (
      <>
        <path d="M5 19.5C5 11 10 5.5 19.5 4.5 19.5 14 14 19.5 5.5 19.5z" />
        <path d="M5 19.5 13.5 11" />
      </>
    ),
    bolt: <path d="M13.5 3 5.5 13.5h6l-1 7.5 8-10.5h-6z" />,
    health: (
      <>
        <path d="M12 20s-7.2-4.4-8.6-9.2A4.6 4.6 0 0 1 12 7.4a4.6 4.6 0 0 1 8.6 3.4C19.2 15.6 12 20 12 20z" />
        <path d="M12 10.5v5M9.5 13h5" />
      </>
    ),
    search: (
      <>
        <circle cx="10.5" cy="10.5" r="6" />
        <path d="m15 15 5 5" />
      </>
    ),
    steps: (
      <>
        <path d="M7 3.5c1.7 0 2.7 1.8 2.7 4.3S8.8 12 7.5 12 5 10.6 5 8s.3-4.5 2-4.5zM5.5 14.5l4 .5-.4 3a2 2 0 0 1-4-.5z" />
        <path d="M17 7.5c1.7 0 2 1.9 2 4.5s-1.2 4-2.5 4-2.2-1.8-2.2-4.3.9-4.2 2.7-4.2zM14.9 18.5l4-.5.1 1.5a2 2 0 0 1-4 .5z" />
      </>
    ),
    cycle: (
      <>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M12 12V3.5A8.5 8.5 0 0 1 20.5 12z" fill="currentColor" />
      </>
    ),
    photo: (
      <>
        <rect x="3.5" y="5.5" width="17" height="14" rx="2.5" />
        <circle cx="12" cy="12.5" r="3.2" />
        <path d="M9 5.5 10.2 3.5h3.6L15 5.5" />
      </>
    ),
    scale: (
      <>
        <rect x="3.5" y="3.5" width="17" height="17" rx="4" />
        <path d="M8.5 9a5 5 0 0 1 7 0M12 9.5l1.5-2" />
      </>
    ),
    note: (
      <>
        <path d="M6 3.5h9l3.5 3.5v13.5H6z" />
        <path d="M9 11h6M9 14.5h6M9 18h3" />
      </>
    ),
    bell: (
      <>
        <path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15z" />
        <path d="M10 21h4" />
      </>
    ),
    appearance: (
      <>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M12 3.5v17a8.5 8.5 0 0 0 0-17z" fill="currentColor" stroke="none" />
      </>
    ),
    language: (
      <>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M3.5 12h17M12 3.5c2.4 2.3 3.6 5.2 3.6 8.5s-1.2 6.2-3.6 8.5c-2.4-2.3-3.6-5.2-3.6-8.5S9.6 5.8 12 3.5z" />
      </>
    ),
    privacy: (
      <>
        <rect x="5" y="10.5" width="14" height="10" rx="2.5" />
        <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" />
      </>
    ),
    key: (
      <>
        <circle cx="8" cy="15.5" r="4.5" />
        <path d="M11.2 12.3 20 3.5M16.5 7l3 3M13.5 10l2.5 2.5" />
      </>
    ),
    info: (
      <>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M12 11v5.5M12 7.8h.01" />
      </>
    ),
    send: <path d="M21 3 3.5 10.5l7 3 3 7zM10.5 13.5 21 3" />,
    pain: (
      <>
        <path d="M12 3.5 2.8 19.5h18.4z" />
        <path d="M12 9.5v4.5M12 16.8v.2" />
      </>
    ),
    calendar: (
      <>
        <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
        <path d="M3.5 10h17M8 3v4M16 3v4M12 13.5v4M10 15.5h4" />
      </>
    ),
    video: (
      <>
        <rect x="3" y="6.5" width="12.5" height="11" rx="2.5" />
        <path d="m15.5 10.5 5.5-3v9l-5.5-3" />
      </>
    ),
    whatsapp: (
      <>
        <path d="M4 20l1.2-3.6A8 8 0 1 1 8 19z" />
        <path d="M9 9.5c.3 2 2 3.8 4.2 4.3l1.3-1.2 2 .8-.4 1.6c-3.6.4-7.9-3.3-7.9-7.2l1.6-.4.8 2z" />
      </>
    ),
    home: <path d="M4 11.5 12 5l8 6.5V20a1 1 0 0 1-1 1h-4.5v-5.5h-5V21H5a1 1 0 0 1-1-1z" />,
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
