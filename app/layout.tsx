import "./globals.css";
import { Navbar, TopBarTitle } from "@/components/Navbar";
import { Toaster } from "@/components/ui/sonner";
import { NuqsAdapter } from "nuqs/adapters/next/app";

const Logo = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 1120 300"
    className="h-10 w-auto flex-shrink-0 overflow-visible md:h-11"
    aria-label="慶燁科技"
    role="img"
  >
    <rect
      x="6"
      y="6"
      width="210"
      height="210"
      rx="34"
      fill="#30A9D8"
      stroke="#000"
      strokeWidth="10"
    />
    <rect
      x="64"
      y="52"
      width="290"
      height="78"
      rx="38"
      transform="rotate(45 64 52)"
      fill="#B8D7EE"
      stroke="#000"
      strokeWidth="10"
    />
    <rect
      x="214"
      y="109"
      width="128"
      height="78"
      rx="38"
      transform="rotate(45 214 109)"
      fill="#7CC8EF"
      stroke="#000"
      strokeWidth="10"
    />
    <rect
      x="284"
      y="80"
      width="112"
      height="70"
      rx="35"
      transform="rotate(45 284 80)"
      fill="#30A9D8"
      stroke="#000"
      strokeWidth="10"
    />
    <text
      x="410"
      y="165"
      fill="#000"
      fontSize="120"
      fontWeight="900"
      fontFamily="'Noto Sans TC', 'PingFang TC', 'Microsoft JhengHei', sans-serif"
      letterSpacing="4"
    >
      慶燁科技
    </text>
  </svg>
);

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <title>AITC Credit Investigation Chatbot</title>
        <link rel="shortcut icon" href="/images/favicon.ico" />
        <meta
          name="description"
          content="AITC Credit Investigation Chatbot with multi-turn conversation, stop, copy, and history support."
        />
        <meta property="og:title" content="AITC Credit Investigation Chatbot" />
        <meta
          property="og:description"
          content="AITC Credit Investigation Chatbot with multi-turn conversation, stop, copy, and history support."
        />
        <meta property="og:image" content="/images/og-image.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="AITC Credit Investigation Chatbot" />
        <meta
          name="twitter:description"
          content="AITC Credit Investigation Chatbot with multi-turn conversation, stop, copy, and history support."
        />
        <meta name="twitter:image" content="/images/og-image.png" />
      </head>
      <body>
        <NuqsAdapter>
          <div className="bg-secondary grid h-[100dvh] grid-rows-[80px_minmax(0,1fr)]">
            <header className="h-20 px-4">
              <div className="flex h-full min-w-0 items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  <a href="/" className="flex shrink-0 items-center gap-2">
                    <Logo />
                  </a>
                  <TopBarTitle />
                </div>
                <Navbar />
              </div>
            </header>
            <div className="bg-background relative mx-4 grid rounded-t-2xl border border-input border-b-0">
              <div className="absolute inset-0">{children}</div>
            </div>
          </div>
          <Toaster />
        </NuqsAdapter>
      </body>
    </html>
  );
}
