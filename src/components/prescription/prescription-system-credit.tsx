/** Subtle system credit on printed / previewed prescriptions. */
import { FAYA_DEV_URL } from "@/components/faya-dev-link";

export function PrescriptionSystemCredit({
  color,
}: {
  color?: string;
}) {
  return (
    <footer
      className="pointer-events-none absolute inset-x-0 bottom-[1.5%] z-30 flex justify-center px-3"
      aria-label="RX Clinic"
    >
      <p
        className="select-none text-center text-[7px] leading-none tracking-[0.04em] sm:text-[7.5px]"
        style={{
          color: color ? `${color}55` : "rgba(15, 23, 42, 0.28)",
        }}
      >
        <a
          href={FAYA_DEV_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="pointer-events-auto font-medium underline-offset-2 hover:underline"
        >
          <span>rx.faya.dev</span>
          <span className="mx-1 opacity-60">by</span>
          <span>Faya Dev</span>
        </a>
      </p>
    </footer>
  );
}

export function prescriptionSystemCreditHtml(color: string): string {
  return `<footer class="rx-credit" style="color:${color}55" aria-label="RX Clinic"><a href="${FAYA_DEV_URL}" target="_blank" rel="noopener noreferrer"><span class="rx-credit-site">rx.faya.dev</span><span class="rx-credit-by"> by </span><span>Faya Dev</span></a></footer>`;
}

export const PRESCRIPTION_SYSTEM_CREDIT_STYLES = `
  .rx-credit {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 1.5%;
    z-index: 30;
    margin: 0;
    padding: 0 12px;
    text-align: center;
    font-size: 7.5px;
    line-height: 1;
    letter-spacing: 0.04em;
    pointer-events: none;
    user-select: none;
  }
  .rx-credit-site { font-weight: 600; }
  .rx-credit-by { opacity: 0.65; }
  .rx-credit a { color: inherit; text-decoration: none; pointer-events: auto; }
  .rx-credit a:hover { text-decoration: underline; }
`;
