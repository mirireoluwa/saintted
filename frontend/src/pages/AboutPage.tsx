import { About } from "../components/About";
import { SeoHead } from "../components/SeoHead";
import { MailingListSection } from "../components/MailingListSection";

export function AboutPage() {
  return (
    <>
      <SeoHead
        title="about · SAINTTED"
        description="About SAINTTED, a Nigerian artist and producer communicating the human experience through his perspective."
        canonicalPath="/about"
      />
      <About />
      <MailingListSection />
    </>
  );
}
