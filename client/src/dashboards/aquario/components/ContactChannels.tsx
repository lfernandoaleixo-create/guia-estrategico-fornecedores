// =============================================================================
// CONTACT CHANNELS - Bloco rico com todos os canais de contato
// DESIGN: Mercado Oriental Premium
// Cada canal vira um chip clicável com cores próprias da plataforma
// =============================================================================

import { useState } from "react";
import {
  Phone,
  Mail,
  MessageCircle,
  Send,
  Globe,
  MapPin,
  Building2,
  Calendar,
  User,
  Star,
  Info,
  Copy,
  Check,
  ExternalLink,
} from "lucide-react";

interface Contacts {
  whatsapp?: string;
  wechat?: string;
  qq?: string;
  skype?: string;
  telegram?: string;
  phoneLandline?: string;
  phoneMobile?: string;
  fax?: string;
  emails?: string;
  linkedinCompany?: string;
  linkedinPersonal?: string;
  facebook?: string;
  instagram?: string;
  youtube?: string;
  twitter?: string;
  tiktok?: string;
  alibabaTradeManager?: string;
  madeInChinaUrl?: string;
  globalSourcesUrl?: string;
  factoryAddress?: string;
  showroomAddress?: string;
  fairBooths?: string;
  secondaryWebsites?: string;
  keySalesContacts?: string;
  bestFirstContact?: string;
  contactNotes?: string;
}

interface Props {
  contacts: Contacts;
}

// Extrai o primeiro número limpo (só dígitos) de uma string
function extractNumber(s: string): string {
  const m = s.match(/[\d+]+/g);
  if (!m) return "";
  // Pegar a primeira sequência longa (>= 8 dígitos)
  for (const x of m) {
    const digits = x.replace(/\D/g, "");
    if (digits.length >= 8) return digits;
  }
  return m[0].replace(/\D/g, "");
}

// Divide string por ; ignorando vazios e "Não encontrado"
function splitItems(s: string | undefined): string[] {
  if (!s) return [];
  return s
    .split(/[;\n]+/)
    .map((x) => x.trim())
    .filter((x) => x && !/n[ãa]o\s*encontrad/i.test(x));
}

export default function ContactChannels({ contacts }: Props) {
  const [copied, setCopied] = useState<string | null>(null);

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1800);
  };

  const hasMessaging =
    contacts.whatsapp ||
    contacts.wechat ||
    contacts.qq ||
    contacts.skype ||
    contacts.telegram;
  const hasPhones = contacts.phoneLandline || contacts.phoneMobile || contacts.fax;
  const hasEmails = contacts.emails;
  const hasB2B =
    contacts.alibabaTradeManager ||
    contacts.madeInChinaUrl ||
    contacts.globalSourcesUrl;
  const hasSocial =
    contacts.linkedinCompany ||
    contacts.linkedinPersonal ||
    contacts.facebook ||
    contacts.instagram ||
    contacts.youtube ||
    contacts.twitter ||
    contacts.tiktok;
  const hasAddresses =
    contacts.factoryAddress || contacts.showroomAddress;
  const hasExtra =
    contacts.fairBooths ||
    contacts.secondaryWebsites ||
    contacts.keySalesContacts ||
    contacts.bestFirstContact ||
    contacts.contactNotes;

  if (
    !hasMessaging &&
    !hasPhones &&
    !hasEmails &&
    !hasB2B &&
    !hasSocial &&
    !hasAddresses &&
    !hasExtra
  )
    return null;

  return (
    <div
      className="px-6 py-4 border-b"
      style={{ borderColor: "oklch(0.93 0.003 80)" }}
    >
      <div className="flex items-center gap-2 mb-3">
        <span style={{ color: "oklch(0.45 0.18 25)" }}>
          <Phone size={14} />
        </span>
        <h3
          className="text-xs font-semibold uppercase tracking-wider"
          style={{ color: "oklch(0.35 0.18 25)" }}
        >
          Canais de Contato Detalhados
        </h3>
      </div>

      {contacts.bestFirstContact && (
        <div
          className="mb-4 p-3 rounded-lg flex gap-2 items-start"
          style={{
            backgroundColor: "oklch(0.97 0.04 90)",
            border: "1px solid oklch(0.85 0.10 90)",
          }}
        >
          <Star
            size={14}
            className="mt-0.5 flex-shrink-0"
            style={{ color: "oklch(0.55 0.18 60)" }}
          />
          <div>
            <div
              className="text-xs font-semibold mb-0.5"
              style={{ color: "oklch(0.35 0.15 60)" }}
            >
              MELHOR PRIMEIRO CONTATO
            </div>
            <div
              className="text-sm"
              style={{ color: "oklch(0.25 0.05 60)" }}
            >
              {contacts.bestFirstContact}
            </div>
          </div>
        </div>
      )}

      {/* Mensageria (WhatsApp, WeChat, QQ, Skype, Telegram) */}
      {hasMessaging && (
        <div className="mb-3">
          <div
            className="text-[10px] font-bold uppercase tracking-wider mb-2"
            style={{ color: "oklch(0.5 0.01 60)" }}
          >
            Mensageria
          </div>
          <div className="flex flex-col gap-1.5">
            {splitItems(contacts.whatsapp).map((w, i) => {
              const num = extractNumber(w);
              return (
                <ChannelChip
                  key={`wa-${i}`}
                  bg="#25D366"
                  text="#fff"
                  icon={<MessageCircle size={12} />}
                  label="WhatsApp"
                  value={w}
                  href={num ? `https://wa.me/${num}` : undefined}
                  copyValue={num || w}
                  copyKey={`wa-${i}`}
                  copied={copied === `wa-${i}`}
                  onCopy={copy}
                />
              );
            })}
            {splitItems(contacts.wechat).map((w, i) => (
              <ChannelChip
                key={`wc-${i}`}
                bg="#07C160"
                text="#fff"
                icon={<MessageCircle size={12} />}
                label="WeChat"
                value={w}
                copyValue={w.split("(")[0].trim()}
                copyKey={`wc-${i}`}
                copied={copied === `wc-${i}`}
                onCopy={copy}
              />
            ))}
            {splitItems(contacts.qq).map((q, i) => (
              <ChannelChip
                key={`qq-${i}`}
                bg="#FAAD14"
                text="#fff"
                icon={<MessageCircle size={12} />}
                label="QQ"
                value={q}
                copyValue={q.split("(")[0].trim()}
                copyKey={`qq-${i}`}
                copied={copied === `qq-${i}`}
                onCopy={copy}
              />
            ))}
            {splitItems(contacts.skype).map((s, i) => (
              <ChannelChip
                key={`sk-${i}`}
                bg="#00AFF0"
                text="#fff"
                icon={<MessageCircle size={12} />}
                label="Skype"
                value={s}
                href={`skype:${s.split("(")[0].trim()}?chat`}
                copyValue={s.split("(")[0].trim()}
                copyKey={`sk-${i}`}
                copied={copied === `sk-${i}`}
                onCopy={copy}
              />
            ))}
            {splitItems(contacts.telegram).map((t, i) => {
              const handle = t.replace(/^@/, "").split("(")[0].trim();
              return (
                <ChannelChip
                  key={`tg-${i}`}
                  bg="#229ED9"
                  text="#fff"
                  icon={<Send size={12} />}
                  label="Telegram"
                  value={t}
                  href={`https://t.me/${handle.replace(/^\+?/, "")}`}
                  copyValue={t}
                  copyKey={`tg-${i}`}
                  copied={copied === `tg-${i}`}
                  onCopy={copy}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Telefones */}
      {hasPhones && (
        <div className="mb-3">
          <div
            className="text-[10px] font-bold uppercase tracking-wider mb-2"
            style={{ color: "oklch(0.5 0.01 60)" }}
          >
            Telefones
          </div>
          <div className="flex flex-col gap-1.5">
            {splitItems(contacts.phoneLandline).map((p, i) => {
              const num = extractNumber(p);
              return (
                <ChannelChip
                  key={`pl-${i}`}
                  bg="oklch(0.92 0.01 60)"
                  text="oklch(0.25 0.05 60)"
                  icon={<Phone size={12} />}
                  label="Fixo"
                  value={p}
                  href={num ? `tel:+${num}` : undefined}
                  copyValue={p}
                  copyKey={`pl-${i}`}
                  copied={copied === `pl-${i}`}
                  onCopy={copy}
                />
              );
            })}
            {splitItems(contacts.phoneMobile).map((p, i) => {
              const num = extractNumber(p);
              return (
                <ChannelChip
                  key={`pm-${i}`}
                  bg="oklch(0.92 0.01 60)"
                  text="oklch(0.25 0.05 60)"
                  icon={<Phone size={12} />}
                  label="Celular"
                  value={p}
                  href={num ? `tel:+${num}` : undefined}
                  copyValue={p}
                  copyKey={`pm-${i}`}
                  copied={copied === `pm-${i}`}
                  onCopy={copy}
                />
              );
            })}
            {contacts.fax && (
              <ChannelChip
                bg="oklch(0.92 0.01 60)"
                text="oklch(0.45 0.05 60)"
                icon={<Phone size={12} />}
                label="Fax"
                value={contacts.fax}
                copyValue={contacts.fax}
                copyKey="fax"
                copied={copied === "fax"}
                onCopy={copy}
              />
            )}
          </div>
        </div>
      )}

      {/* E-mails */}
      {hasEmails && (
        <div className="mb-3">
          <div
            className="text-[10px] font-bold uppercase tracking-wider mb-2"
            style={{ color: "oklch(0.5 0.01 60)" }}
          >
            E-mails
          </div>
          <div className="flex flex-col gap-1.5">
            {splitItems(contacts.emails).map((e, i) => {
              const emailMatch = e.match(/[\w.+-]+@[\w-]+\.[\w.-]+/);
              const email = emailMatch ? emailMatch[0] : e;
              return (
                <ChannelChip
                  key={`em-${i}`}
                  bg="oklch(0.94 0.03 240)"
                  text="oklch(0.30 0.15 240)"
                  icon={<Mail size={12} />}
                  label={`E-mail ${i + 1}`}
                  value={e}
                  href={`mailto:${email}`}
                  copyValue={email}
                  copyKey={`em-${i}`}
                  copied={copied === `em-${i}`}
                  onCopy={copy}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Plataformas B2B */}
      {hasB2B && (
        <div className="mb-3">
          <div
            className="text-[10px] font-bold uppercase tracking-wider mb-2"
            style={{ color: "oklch(0.5 0.01 60)" }}
          >
            Plataformas B2B
          </div>
          <div className="flex flex-wrap gap-1.5">
            {contacts.alibabaTradeManager && (
              <ChannelLink
                bg="#FF6A00"
                text="#fff"
                label="Alibaba"
                href={contacts.alibabaTradeManager}
              />
            )}
            {contacts.madeInChinaUrl && (
              <ChannelLink
                bg="#D71F1F"
                text="#fff"
                label="Made-in-China"
                href={contacts.madeInChinaUrl}
              />
            )}
            {contacts.globalSourcesUrl && (
              <ChannelLink
                bg="#003874"
                text="#fff"
                label="Global Sources"
                href={contacts.globalSourcesUrl}
              />
            )}
          </div>
        </div>
      )}

      {/* Redes sociais (extras) */}
      {hasSocial && (
        <div className="mb-3">
          <div
            className="text-[10px] font-bold uppercase tracking-wider mb-2"
            style={{ color: "oklch(0.5 0.01 60)" }}
          >
            Redes & Profissional
          </div>
          <div className="flex flex-wrap gap-1.5">
            {contacts.linkedinCompany && (
              <ChannelLink
                bg="#0A66C2"
                text="#fff"
                label="LinkedIn (Empresa)"
                href={contacts.linkedinCompany}
              />
            )}
            {splitItems(contacts.linkedinPersonal).map((l, i) => (
              <ChannelLink
                key={`li-${i}`}
                bg="#0A66C2"
                text="#fff"
                label={`LinkedIn: ${l.replace(/https?:\/\/[^\s]+/, "").trim().slice(0, 40) || `Vendedor ${i + 1}`}`}
                href={(l.match(/https?:\/\/[^\s)]+/) || [""])[0]}
              />
            ))}
            {contacts.facebook && (
              <ChannelLink
                bg="#1877F2"
                text="#fff"
                label="Facebook"
                href={contacts.facebook}
              />
            )}
            {contacts.instagram && (
              <ChannelLink
                bg="#E4405F"
                text="#fff"
                label="Instagram"
                href={
                  contacts.instagram.startsWith("@")
                    ? `https://instagram.com/${contacts.instagram.slice(1)}`
                    : contacts.instagram
                }
              />
            )}
            {contacts.youtube && (
              <ChannelLink
                bg="#FF0000"
                text="#fff"
                label="YouTube"
                href={contacts.youtube}
              />
            )}
            {contacts.twitter && (
              <ChannelLink
                bg="#000"
                text="#fff"
                label="Twitter/X"
                href={
                  contacts.twitter.startsWith("@")
                    ? `https://x.com/${contacts.twitter.slice(1)}`
                    : contacts.twitter
                }
              />
            )}
            {contacts.tiktok && (
              <ChannelLink
                bg="#000"
                text="#fff"
                label="TikTok / Douyin"
                href={
                  contacts.tiktok.startsWith("@")
                    ? `https://tiktok.com/${contacts.tiktok}`
                    : contacts.tiktok
                }
              />
            )}
          </div>
        </div>
      )}

      {/* Endereços */}
      {hasAddresses && (
        <div className="mb-3">
          <div
            className="text-[10px] font-bold uppercase tracking-wider mb-2"
            style={{ color: "oklch(0.5 0.01 60)" }}
          >
            Endereços
          </div>
          <div className="space-y-2">
            {contacts.factoryAddress && (
              <AddressBlock
                icon={<Building2 size={12} />}
                label="Fábrica"
                value={contacts.factoryAddress}
                onCopy={() => copy(contacts.factoryAddress!, "fa")}
                copied={copied === "fa"}
              />
            )}
            {contacts.showroomAddress &&
              contacts.showroomAddress.toLowerCase() !==
                "mesmo da fábrica" &&
              contacts.showroomAddress !== contacts.factoryAddress && (
                <AddressBlock
                  icon={<MapPin size={12} />}
                  label="Showroom"
                  value={contacts.showroomAddress}
                  onCopy={() => copy(contacts.showroomAddress!, "sa")}
                  copied={copied === "sa"}
                />
              )}
          </div>
        </div>
      )}

      {/* Extras: feiras, sites secundários, vendedores-chave, notas */}
      {(contacts.fairBooths ||
        contacts.secondaryWebsites ||
        contacts.keySalesContacts) && (
        <div className="space-y-2 mb-3">
          {contacts.fairBooths && (
            <ExtraRow
              icon={<Calendar size={12} />}
              label="Stands em Feiras 2025/2026"
              value={contacts.fairBooths}
            />
          )}
          {contacts.secondaryWebsites && (
            <ExtraRow
              icon={<Globe size={12} />}
              label="Sites Secundários"
              value={contacts.secondaryWebsites}
              isUrl
            />
          )}
          {contacts.keySalesContacts && (
            <ExtraRow
              icon={<User size={12} />}
              label="Pessoas-Chave de Vendas"
              value={contacts.keySalesContacts}
            />
          )}
        </div>
      )}

      {/* Notas adicionais */}
      {contacts.contactNotes && (
        <div
          className="mt-3 p-3 rounded-lg flex gap-2 items-start"
          style={{
            backgroundColor: "oklch(0.97 0.005 60)",
            border: "1px solid oklch(0.93 0.003 80)",
          }}
        >
          <Info
            size={12}
            className="mt-0.5 flex-shrink-0"
            style={{ color: "oklch(0.5 0.01 60)" }}
          />
          <div
            className="text-xs leading-relaxed"
            style={{ color: "oklch(0.35 0.01 60)" }}
          >
            {contacts.contactNotes}
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

function ChannelChip({
  bg,
  text,
  icon,
  label,
  value,
  href,
  copyValue,
  copyKey,
  copied,
  onCopy,
}: {
  bg: string;
  text: string;
  icon: React.ReactNode;
  label: string;
  value: string;
  href?: string;
  copyValue: string;
  copyKey: string;
  copied: boolean;
  onCopy: (val: string, key: string) => void;
}) {
  return (
    <div className="flex items-center gap-1.5 group">
      <span
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider flex-shrink-0"
        style={{ backgroundColor: bg, color: text }}
      >
        {icon}
        {label}
      </span>
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 text-xs hover:underline truncate"
          style={{ color: "oklch(0.25 0.05 60)" }}
          title={value}
        >
          {value}
        </a>
      ) : (
        <span
          className="flex-1 text-xs truncate"
          style={{ color: "oklch(0.25 0.05 60)" }}
          title={value}
        >
          {value}
        </span>
      )}
      <button
        onClick={() => onCopy(copyValue, copyKey)}
        className="p-1 rounded hover:bg-black/5 transition-colors flex-shrink-0 opacity-60 group-hover:opacity-100"
        title="Copiar"
      >
        {copied ? (
          <Check size={11} style={{ color: "oklch(0.55 0.15 145)" }} />
        ) : (
          <Copy size={11} style={{ color: "oklch(0.5 0.01 60)" }} />
        )}
      </button>
    </div>
  );
}

function ChannelLink({
  bg,
  text,
  label,
  href,
}: {
  bg: string;
  text: string;
  label: string;
  href: string;
}) {
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium hover:opacity-90 transition-opacity"
      style={{ backgroundColor: bg, color: text }}
    >
      {label}
      <ExternalLink size={10} />
    </a>
  );
}

function AddressBlock({
  icon,
  label,
  value,
  onCopy,
  copied,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  onCopy: () => void;
  copied: boolean;
}) {
  return (
    <div
      className="p-2 rounded-md flex gap-2 items-start group"
      style={{ backgroundColor: "oklch(0.97 0.005 60)" }}
    >
      <span className="mt-0.5" style={{ color: "oklch(0.5 0.01 60)" }}>
        {icon}
      </span>
      <div className="flex-1 min-w-0">
        <div
          className="text-[10px] font-bold uppercase tracking-wider mb-0.5"
          style={{ color: "oklch(0.5 0.01 60)" }}
        >
          {label}
        </div>
        <div
          className="text-xs leading-snug"
          style={{ color: "oklch(0.25 0.05 60)" }}
        >
          {value}
        </div>
      </div>
      <button
        onClick={onCopy}
        className="p-1 rounded hover:bg-black/5 transition-colors flex-shrink-0 opacity-60 group-hover:opacity-100"
        title="Copiar endereço"
      >
        {copied ? (
          <Check size={11} style={{ color: "oklch(0.55 0.15 145)" }} />
        ) : (
          <Copy size={11} style={{ color: "oklch(0.5 0.01 60)" }} />
        )}
      </button>
    </div>
  );
}

function ExtraRow({
  icon,
  label,
  value,
  isUrl,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  isUrl?: boolean;
}) {
  return (
    <div className="flex gap-2 text-xs">
      <span className="flex-shrink-0 mt-0.5" style={{ color: "oklch(0.5 0.01 60)" }}>
        {icon}
      </span>
      <div className="flex-1 min-w-0">
        <span
          className="font-semibold mr-1"
          style={{ color: "oklch(0.4 0.02 60)" }}
        >
          {label}:
        </span>
        {isUrl ? (
          <span style={{ color: "oklch(0.3 0.05 60)" }}>
            {value.split(/[;\n]+/).map((url, i) => {
              const u = url.trim();
              if (!u) return null;
              return (
                <a
                  key={i}
                  href={u}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline mr-2 break-all"
                  style={{ color: "oklch(0.45 0.18 240)" }}
                >
                  {u}
                </a>
              );
            })}
          </span>
        ) : (
          <span style={{ color: "oklch(0.3 0.05 60)" }}>{value}</span>
        )}
      </div>
    </div>
  );
}
