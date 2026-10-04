import { Injectable } from '@nestjs/common';
import { desc, eq } from 'drizzle-orm';
import { db } from '../db/client';
import { categories, orders } from '../db/schema';
import { ProductsService } from '../products/products.service';
import { JwtUser } from '../common/decorators/current-user.decorator';

// A lightweight, rule-based shopping assistant — no external AI service,
// no API keys, no per-message cost. It understands a handful of intents and
// otherwise treats the message as a parts search.

export type AssistantAction = 'open_orders' | 'open_sell' | 'sign_in' | 'open_deals' | 'set_vehicle';
export interface AssistantReply {
  reply: string;
  products?: any[];
  quickReplies?: string[];
  action?: { type: AssistantAction; label: string };
}

interface Vehicle {
  make: string;
  model?: string;
  year?: number;
}

const MAKES = ['toyota', 'honda', 'nissan', 'suzuki', 'mitsubishi', 'mazda', 'daihatsu', 'hyundai', 'kia', 'perodua', 'micro', 'subaru', 'isuzu', 'tata', 'mahindra', 'bajaj', 'lexus', 'bmw', 'mercedes', 'audi'];

const STOPWORDS = new Set(
  'i im need want wanted looking look find search show me do you have any some price prices cheap best good new car cars vehicle please pls can get is are there what which part parts for my the a an to of in on and or with this that it its sell buying buy want kindly available one ones fit fits fitting model year also how much'.split(' '),
);

// Everyday words → words that appear in listings/categories.
const SYNONYMS: Record<string, string[]> = {
  pads: ['pad', 'brake'],
  pad: ['brake'],
  brakes: ['brake'],
  plugs: ['plug', 'spark'],
  plug: ['spark'],
  bulbs: ['bulb'],
  light: ['bulb', 'lights', 'led'],
  lights: ['bulb', 'led'],
  headlight: ['bulb', 'headlight'],
  shocks: ['damper', 'shock'],
  shock: ['damper', 'absorber'],
  absorbers: ['damper', 'shock'],
  wiper: ['wiper'],
  wipers: ['wiper'],
  freshener: ['freshener'],
  perfume: ['freshener'],
  oil: ['oil'],
  gearbox: ['gear', 'box'],
  atf: ['gear', 'box', 'oil', 'atf'],
  coolant: ['coolant'],
  radiator: ['coolant'],
  bearing: ['bearing'],
  bearings: ['bearing'],
  belt: ['belt'],
  belts: ['belt'],
  clutch: ['clutch'],
  filter: ['filter'],
  filters: ['filter'],
  battery: ['battery'],
  mount: ['mount'],
  mounts: ['mount'],
  horn: ['horn'],
  pump: ['pump'],
  caliper: ['caliper'],
  bush: ['bush'],
  bushes: ['bush'],
  link: ['link', 'stabilizer'],
  coil: ['coil', 'ignition'],
};

const has = (text: string, ...words: string[]) => words.some((w) => new RegExp(`\\b${w}`, 'i').test(text));

@Injectable()
export class AssistantService {
  constructor(private readonly productsService: ProductsService) {}

  async handle(user: JwtUser, message: string, selected?: Vehicle): Promise<AssistantReply> {
    const text = (message ?? '').trim().slice(0, 500);
    const lower = text.toLowerCase();
    const guest = user.role === 'GUEST';

    if (!text || has(lower, 'hi', 'hello', 'hey', 'ayubowan', 'good morning', 'good evening') && lower.split(/\s+/).length <= 4) {
      return {
        reply:
          "Hi! I'm the Genuine Parts.lk assistant. Tell me the part you need — like “brake pads for Axio 2016” — or ask about orders, delivery or selling.",
        quickReplies: ['Brake pads for Axio 2016', 'Show today’s deals', 'Track my order', 'How do I sell?'],
      };
    }

    if (has(lower, 'track', 'my order', 'order status', 'where is my', 'orders')) {
      return this.orderStatus(user);
    }

    if (has(lower, 'sell', 'seller', 'open a store', 'open store', 'my shop', 'list my', 'become a')) {
      return {
        reply:
          'Anyone can sell on Genuine Parts.lk. Open a free store from Account → Start selling, then list parts with photos, price, stock and the vehicles they fit. Buyers pay cash on delivery and you manage everything from the Seller Center.',
        action: guest ? { type: 'sign_in', label: 'Create an account' } : { type: 'open_sell', label: 'Start selling' },
        quickReplies: ['How does delivery work?', 'How do payments work?'],
      };
    }

    if (has(lower, 'pay', 'payment', 'cash', 'cod', 'card', 'bank')) {
      return {
        reply:
          'Payment is cash on delivery — you pay the courier when your parts arrive. Card and online payments are coming soon.',
        quickReplies: ['How does delivery work?', 'Returns & warranty'],
      };
    }

    if (has(lower, 'deliver', 'delivery', 'shipping', 'ship', 'courier', 'how long')) {
      return {
        reply:
          'We deliver island-wide. Delivery is Rs. 450 per seller in your order, and most sellers ship within 1–2 days; delivery usually takes 2–5 working days depending on your area. You can follow each seller’s shipment in My orders.',
        quickReplies: ['Track my order', 'How do payments work?'],
      };
    }

    if (has(lower, 'return', 'refund', 'warranty', 'guarantee', 'exchange')) {
      return {
        reply:
          'Each store sets its own returns policy and each part shows its warranty — you’ll find both on the product page under Specifications. Not sure a part fits? Tap “Ask about this part” to chat with the seller before you buy.',
        quickReplies: ['How do I check fitment?', 'Track my order'],
      };
    }

    if (has(lower, 'fitment', 'will it fit', 'does it fit', 'compatible', 'chassis')) {
      return {
        reply:
          'Add your vehicle on the Home screen (tap “Add your vehicle”). Parts that fit get a green “Fits” badge, and parts that don’t are hidden. For exact confirmation, chat with the seller and share your chassis code.',
        quickReplies: ['Brake pads for Axio 2016', 'Show today’s deals'],
      };
    }

    if (has(lower, 'whatsapp', 'phone number', 'seller.s number', 'seller.s phone', 'contact the seller', 'contact seller', 'call the seller', 'call seller')) {
      return {
        reply:
          'To keep every order protected, all conversations with sellers happen in the app chat — phone numbers and links can’t be shared there. Open any part and tap “Chat” to message its seller.',
      };
    }

    if (has(lower, 'deal', 'deals', 'sale', 'discount', 'offer', 'offers', 'promo')) {
      const h = await this.productsService.highlights({} as any);
      return {
        reply:
          h.mode === 'flash'
            ? `There’s a Flash Sale on right now — ${h.subtitle.toLowerCase()}. Here are the parts on sale:`
            : h.mode === 'deals'
              ? `No flash sale right now, but these parts are discounted — ${h.subtitle.toLowerCase()}:`
              : `No sales running right now. Here are our ${h.title.toLowerCase()}:`,
        // Only the genuinely discounted items — the flash rail may be
        // topped up with best sellers, which aren't "on sale".
        products: (h.mode === 'flash' ? h.products.filter((p) => p.onSale) : h.products).slice(0, 6),
        action: { type: 'open_deals', label: 'See all deals' },
      };
    }

    if (has(lower, 'human', 'agent', 'customer support', 'support team', 'complain', 'complaint', 'talk to someone')) {
      return {
        reply:
          'I can help with finding parts, orders, delivery and payments. For anything else, email support@genuineparts.lk and our team will reply within a day.',
        quickReplies: ['Track my order', 'How does delivery work?'],
      };
    }

    return this.search(text, selected);
  }

  private async orderStatus(user: JwtUser): Promise<AssistantReply> {
    if (user.role === 'GUEST') {
      return { reply: 'Sign in to see your orders and track deliveries.', action: { type: 'sign_in', label: 'Sign in' } };
    }
    const recent = await db.query.orders.findMany({
      where: eq(orders.buyerId, user.sub),
      orderBy: desc(orders.createdAt),
      limit: 3,
      with: { items: { with: { product: { columns: { title: true } } } } },
    });
    if (!recent.length) {
      return { reply: 'You haven’t placed any orders yet. Want help finding a part?', quickReplies: ['Show today’s deals', 'Brake pads for Axio 2016'] };
    }
    const label: Record<string, string> = {
      PENDING: 'being prepared by the seller',
      PAID: 'being prepared by the seller',
      SHIPPED: 'on the way',
      DELIVERED: 'delivered',
      CANCELLED: 'cancelled',
    };
    const lines = recent.map((o) => {
      const first = o.items[0]?.product.title ?? 'Order';
      const more = o.items.length > 1 ? ` + ${o.items.length - 1} more` : '';
      return `• GP-${o.id.slice(-6).toUpperCase()} — ${first}${more}: ${label[o.status] ?? o.status.toLowerCase()}`;
    });
    return {
      reply: `Here are your latest orders:\n${lines.join('\n')}`,
      action: { type: 'open_orders', label: 'Open My orders' },
    };
  }

  private extractVehicle(lower: string): Vehicle | null {
    const tokens = lower.split(/[^a-z0-9]+/).filter(Boolean);
    const i = tokens.findIndex((t) => MAKES.includes(t));
    const yearMatch = lower.match(/\b(19[89]\d|20[0-3]\d)\b/);
    const year = yearMatch ? Number(yearMatch[1]) : undefined;
    if (i >= 0) {
      const model = tokens[i + 1] && !/^\d+$/.test(tokens[i + 1]) ? tokens[i + 1] : undefined;
      return { make: tokens[i], model, year };
    }
    // Common case: people type just the model ("axio 2016", "vezel").
    const KNOWN_MODELS: Record<string, string> = {
      axio: 'toyota', fielder: 'toyota', premio: 'toyota', aqua: 'toyota', vitz: 'toyota', allion: 'toyota', prius: 'toyota', corolla: 'toyota', chr: 'toyota', raize: 'toyota',
      vezel: 'honda', fit: 'honda', grace: 'honda', civic: 'honda', insight: 'honda',
      march: 'nissan', leaf: 'nissan', xtrail: 'nissan', sunny: 'nissan',
      wagon: 'suzuki', alto: 'suzuki', swift: 'suzuki', every: 'suzuki',
    };
    const m = tokens.find((t) => KNOWN_MODELS[t]);
    return m ? { make: KNOWN_MODELS[m], model: m, year } : null;
  }

  private async search(text: string, selected?: Vehicle): Promise<AssistantReply> {
    const lower = text.toLowerCase();
    const vehicle = this.extractVehicle(lower) ?? (selected?.make ? selected : null);
    const vehicleWords = new Set([vehicle?.make, vehicle?.model, String(vehicle?.year ?? '')].filter(Boolean) as string[]);

    const raw = lower.split(/[^a-z0-9-]+/).filter((t) => t.length >= 2 && !STOPWORDS.has(t) && !vehicleWords.has(t) && !/^(19|20)\d{2}$/.test(t));
    const terms = new Set<string>();
    for (const t of raw) {
      terms.add(t.replace(/s$/, ''));
      (SYNONYMS[t] ?? []).forEach((s) => terms.add(s));
    }
    const partNo = text.match(/\b[0-9A-Z]{3,}[- ]?[0-9A-Z]{3,}\b/i)?.[0]?.toLowerCase().replace(/[\s-]/g, '');

    const all = await this.productsService.list({} as any);
    const scored = all
      .map((p) => {
        const hay = `${p.title} ${p.brand} ${(p as any).category?.name ?? ''} ${p.partNumber ?? ''}`.toLowerCase();
        let score = 0;
        for (const t of terms) if (t.length >= 3 ? hay.includes(t) : new RegExp(`\\b${t}\\b`).test(hay)) score += 1;
        if (partNo && p.partNumber && p.partNumber.toLowerCase().replace(/[\s-]/g, '') === partNo) score += 10;
        let fits: boolean | null = null;
        if (vehicle?.model && p.fitments.length) {
          fits = p.fitments.some(
            (f) =>
              f.make.toLowerCase() === vehicle.make &&
              f.model.toLowerCase() === vehicle.model!.toLowerCase() &&
              (!vehicle.year || (vehicle.year >= f.yearFrom && vehicle.year <= f.yearTo)),
          );
        }
        return { p: { ...p, fitsVehicle: fits }, score, fits };
      })
      .filter((x) => x.score > 0 && x.fits !== false)
      .sort((a, b) => b.score - a.score || Number(b.fits === true) - Number(a.fits === true) || (b.p.soldCount ?? 0) - (a.p.soldCount ?? 0));

    const vLabel = vehicle?.model ? ` for ${cap(vehicle.make)} ${cap(vehicle.model)}${vehicle.year ? ` ${vehicle.year}` : ''}` : '';

    if (!terms.size && !partNo) {
      return {
        reply: vehicle?.model
          ? `Got it — ${cap(vehicle.make)} ${cap(vehicle.model)}${vehicle.year ? ` ${vehicle.year}` : ''}. Which part do you need? For example brake pads, oil filter or spark plugs.`
          : 'Which part are you looking for? You can also give me a part number.',
        quickReplies: ['Brake pads', 'Oil filter', 'Engine oil', 'Spark plugs'],
      };
    }

    if (!scored.length) {
      const cats = await db.select({ name: categories.name, parentId: categories.parentId }).from(categories);
      const suggestions = cats.filter((c) => c.parentId).map((c) => c.name).slice(0, 4);
      return {
        reply: `I couldn’t find a listing matching “${text}”${vLabel} yet. Try a different word, a part number, or browse Categories — new parts are added by sellers every day.`,
        quickReplies: suggestions,
      };
    }

    const top = scored.slice(0, 6).map((x) => x.p);
    return {
      reply: `I found ${scored.length} part${scored.length === 1 ? '' : 's'}${vLabel}${scored.length > 6 ? ' — here are the best matches' : ''}:`,
      products: top,
      action: vehicle?.model ? undefined : { type: 'set_vehicle', label: 'Add my vehicle for exact fitment' },
    };
  }
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
