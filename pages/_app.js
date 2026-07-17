import "../styles/globals.css";
import { TemplatesProvider } from "../lib/TemplatesContext";

export default function App({ Component, pageProps }) {
  return (
    <TemplatesProvider>
      <Component {...pageProps} />
    </TemplatesProvider>
  );
}
