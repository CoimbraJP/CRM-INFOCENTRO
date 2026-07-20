import "../styles/globals.css";
import { TemplatesProvider } from "../lib/TemplatesContext";
import { TagsProvider } from "../lib/TagsContext";

export default function App({ Component, pageProps }) {
  return (
    <TemplatesProvider>
      <TagsProvider>
        <Component {...pageProps} />
      </TagsProvider>
    </TemplatesProvider>
  );
}
