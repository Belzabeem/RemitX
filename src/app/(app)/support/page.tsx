import { Github, Mail } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Notice from "@/components/ui/Notice";
import { NETWORK_LABEL } from "@/lib/network-label";

export default function SupportPage() {
  return (
    <div className="rx-page">
      <PageHeader title="Support" description="Where to go when something looks wrong." />

      <div className="max-w-[640px]">
        <Notice tone="caution">
          RemitX runs on Stellar {NETWORK_LABEL.toLowerCase()}. Never send real assets here, and never reuse a mainnet secret key.
        </Notice>

        <ul className="mt-8">
          <li className="border-t border-line py-5">
            <a
              href="https://github.com/Northgate-Systems/RemitX/issues"
              target="_blank"
              rel="noreferrer"
              className="flex items-start gap-4"
            >
              <Github size={18} className="mt-0.5 flex-none text-muted" aria-hidden="true" />
              <span>
                <span className="rx-link block text-[15px] font-medium">Report an issue</span>
                <span className="rx-small mt-1 block">File a bug or suggestion on the RemitX GitHub repository.</span>
              </span>
            </a>
          </li>
          <li className="border-t border-line py-5">
            <a href="mailto:bidifortune@gmail.com" className="flex items-start gap-4">
              <Mail size={18} className="mt-0.5 flex-none text-muted" aria-hidden="true" />
              <span>
                <span className="rx-link block text-[15px] font-medium">Email the team</span>
                <span className="rx-small mt-1 block">Questions about a transfer, an anchor listing, or the project.</span>
              </span>
            </a>
          </li>
        </ul>

        <section className="rx-section">
          <h2 className="rx-h2">How sending works</h2>
          <p className="mt-2 max-w-[56ch] text-[14.5px] leading-[22px] text-muted">
            Connect a Stellar wallet. Send builds a Stellar path payment, Review asks your wallet to sign it before it&apos;s submitted, and Activity follows it until it&apos;s confirmed.
          </p>
        </section>

        <section className="rx-section">
          <h2 className="rx-h2">Registered office</h2>
          <address className="mt-2 text-[14.5px] not-italic leading-[22px] text-muted">
            RemitX Technologies Ltd.
            <br />
            14B Admiralty Way, Lekki Phase 1
            <br />
            Lagos 105102, Nigeria
          </address>
        </section>
      </div>
    </div>
  );
}
