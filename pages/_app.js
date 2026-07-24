import "../styles/globals.css";
import { TemplatesProvider } from "../lib/TemplatesContext";
import { TagsProvider } from "../lib/TagsContext";
import { EstrategiasProvider } from "../lib/EstrategiasContext";

export default function App({ Component, pageProps }) {
  return (
    <TemplatesProvider>
      <EstrategiasProvider>
        <TagsProvider>
          <Component {...pageProps} />
        </TagsProvider>
      </EstrategiasProvider>
    </TemplatesProvider>
  );
}
