import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="pt-BR">
      <Head>
        <link rel="icon" type="image/png" href="/favicon.png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
        <meta name="theme-color" content="#0d9488" />
        {/* aplica o tema salvo antes do React renderizar (evita flash) */}
        <script dangerouslySetInnerHTML={{ __html: `
          try {
            var t = localStorage.getItem("tema-crm");
            if (t === "escuro") document.documentElement.setAttribute("data-theme", "dark");
          } catch (e) {}
        `}} />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
