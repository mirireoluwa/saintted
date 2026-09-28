import { About } from "../components/About";
import { SeoHead } from "../components/SeoHead";
import { MailingListSection } from "../components/MailingListSection";

export function AboutPage() {
  return (
    <>
      <SeoHead
        title="about · saintted"
        description="About Saintted, a Nigerian artist and producer communicating the human experience through his perspective."
        canonicalPath="/about"
      />
      <About />
      <MailingListSection />
    </>
  );
}
