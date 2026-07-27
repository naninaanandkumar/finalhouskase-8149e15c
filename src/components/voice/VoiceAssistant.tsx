import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Mic, MicOff, X, Volume2, VolumeX, Send, MessageCircle, Sparkles, Sofa, Search, Layers, Building2, Calendar, ShoppingCart, Package, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";

interface CategoryRow { id: string; name: string; slug: string; }
interface ProductRow { id: string; name: string; slug: string; images?: string[] | null; }
interface ChatMsg { role: "user" | "assistant"; text: string; ts: number; products?: ProductRow[]; }

const SR: any =
  typeof window !== "undefined"
    ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    : null;

// Detect Devanagari (Hindi) characters
const isHindi = (text: string) => /[\u0900-\u097F]/.test(text);

// Common Hindi keyword map → English equivalent intents
const hindiKeywords: Array<{ re: RegExp; intent: string }> = [
  { re: /(श्रेणी|कैटेगरी|categor)/i, intent: "categories" },
  { re: /(कार्ट|टोकरी|cart|बास्केट)/i, intent: "cart" },
  { re: /(ऑर्डर|आर्डर|order).*(ट्रैक|track|कहाँ|कहां)/i, intent: "track" },
  { re: /(लॉगिन|साइन|login|signin)/i, intent: "login" },
  { re: /(डैशबोर्ड|प्रोफ़ाइल|profile|dashboard)/i, intent: "dashboard" },
  { re: /(सहायता|मदद|help|support)/i, intent: "help" },
  { re: /(कोटेशन|आरएफक्यू|rfq|बल्क|थोक|quote)/i, intent: "rfq" },
  { re: /(होम|घर|home|मुख)/i, intent: "home" },
  { re: /(खोज|खोजो|ढूं|search|find|दिखा)/i, intent: "search" },
];

const QUICK_REPLIES = [
  { icon: Sofa, label: "Categories", message: "Show me categories" },
  { icon: Search, label: "Find Product", message: "Find bamboo towel" },
  { icon: ShoppingCart, label: "My Cart", message: "Open my cart" },
  { icon: Package, label: "Track Order", message: "Track my order" },
  { icon: Calendar, label: "RFQ / Quote", message: "I want to request a quote" },
];

// Persistent one-tap action chips (shown above composer)
const ACTION_CHIPS: Array<{ label: string; message: string }> = [
  { label: "Categories", message: "Show me categories" },
  { label: "Request Quote", message: "Take me to request quote page" },
  { label: "Track Order", message: "Take me to track order page" },
  { label: "Contact Sales", message: "How do I contact sales?" },
];

// Detect explicit navigation requests ("take me to", "le jao", "open page", etc.)
const wantsNavigation = (text: string) =>
  /(take me|go to|open|redirect|navigate|show me the|visit)/i.test(text) ||
  /(ले जा|ले चल|पर ले|पेज खोल|खोल दो|दिखा दो पेज|पर जा)/i.test(text);

// Category → keyword hints for suggesting products from the local catalog
const CATEGORY_HINTS: Record<string, string[]> = {
  "office": ["office", "desk", "workspace"],
  "face & bath towels": ["face", "bath", "towel"],
  "sports towel & costumes": ["sports", "gym", "costume"],
  "cleaning accessories": ["cleaning", "cloth", "wipe", "microfiber", "kitchen"],
};

export function VoiceAssistant() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const [muted, setMuted] = useState(false);
  const [interim, setInterim] = useState("");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [permError, setPermError] = useState<string>("");
  const [thinking, setThinking] = useState(false);
  const [supported] = useState<boolean>(!!SR && typeof window !== "undefined" && "speechSynthesis" in window);

  const recognitionRef = useRef<any>(null);
  const categoriesRef = useRef<CategoryRow[]>([]);
  const productsRef = useRef<ProductRow[]>([]);
  const femaleEnRef = useRef<SpeechSynthesisVoice | null>(null);
  const femaleHiRef = useRef<SpeechSynthesisVoice | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const mutedRef = useRef(false);
  useEffect(() => { mutedRef.current = muted; }, [muted]);

  const hidden = pathname.startsWith("/admin");

  // Fetch categories + products
  useEffect(() => {
    if (hidden) return;
    const fetchData = async () => {
      const [catRes, prodRes] = await Promise.all([
        supabase.from("categories").select("id, name, slug").eq("is_active", true),
        supabase.from("products").select("id, name, slug, images").eq("is_active", true).limit(500),
      ]);
      categoriesRef.current = (catRes.data as CategoryRow[]) || [];
      productsRef.current = (prodRes.data as ProductRow[]) || [];
    };
    fetchData();
    const ch = supabase
      .channel("voice-assistant-data")
      .on("postgres_changes", { event: "*", schema: "public", table: "categories" }, fetchData)
      .on("postgres_changes", { event: "*", schema: "public", table: "products" }, fetchData)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [hidden]);

  // Pick the most natural-sounding female voices for English + Hindi
  useEffect(() => {
    if (!supported) return;
    const pickVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (!voices.length) return;
      // Prefer Google natural voices, then named female voices, then en-IN
      femaleEnRef.current =
        voices.find((v) => /Google.*(Indian|India|en-IN)/i.test(v.name)) ||
        voices.find((v) => /Microsoft.*(Aria|Jenny|Neerja)/i.test(v.name)) ||
        voices.find((v) => /(Samantha|Karen|Tessa|Moira|Veena|Priya|Raveena)/i.test(v.name)) ||
        voices.find((v) => /Google.*English/i.test(v.name)) ||
        voices.find((v) => /female/i.test(v.name) && /^en/i.test(v.lang)) ||
        voices.find((v) => /en-IN/i.test(v.lang)) ||
        voices.find((v) => /^en/i.test(v.lang)) ||
        voices[0];
      femaleHiRef.current =
        voices.find((v) => /Google.*हिन्दी|Google.*Hindi/i.test(v.name)) ||
        voices.find((v) => /Microsoft.*(Swara|Madhur|Kalpana)/i.test(v.name)) ||
        voices.find((v) => /hi-IN/i.test(v.lang)) ||
        femaleEnRef.current;
    };
    pickVoices();
    window.speechSynthesis.onvoiceschanged = pickVoices;
  }, [supported]);

  const speak = useCallback((text: string) => {
    if (!supported || mutedRef.current || !text) return;
    try {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      const useHindi = isHindi(text);
      utter.voice = useHindi ? (femaleHiRef.current || femaleEnRef.current) : femaleEnRef.current;
      utter.lang = useHindi ? "hi-IN" : (femaleEnRef.current?.lang || "en-IN");
      // Slightly slower + warmer pitch sounds more natural than browser defaults
      utter.rate = 0.95;
      utter.pitch = 1.0;
      utter.volume = 1;
      window.speechSynthesis.speak(utter);
    } catch {}
  }, [supported]);

  // Auto-scroll on new message
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, interim]);

  const respond = useCallback((text: string, products?: ProductRow[]) => {
    setMessages((m) => [...m, { role: "assistant", text, ts: Date.now(), products }]);
    speak(text);
  }, [speak]);

  // Substring + simple word-overlap product search across name
  const searchProducts = useCallback((q: string): ProductRow[] => {
    const norm = q.toLowerCase().trim();
    if (!norm) return [];
    const tokens = norm.split(/\s+/).filter((t) => t.length > 1);
    const all = productsRef.current;
    const direct = all.filter((p) => p.name.toLowerCase().includes(norm));
    if (direct.length) return direct.slice(0, 6);
    if (!tokens.length) return [];
    const scored = all
      .map((p) => {
        const lname = p.name.toLowerCase();
        const score = tokens.reduce((s, t) => s + (lname.includes(t) ? 1 : 0), 0);
        return { p, score };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score);
    return scored.slice(0, 6).map((x) => x.p);
  }, []);

  const handleCommand = useCallback((raw: string) => {
    const original = raw.trim();
    if (!original) return;
    setMessages((m) => [...m, { role: "user", text: original, ts: Date.now() }]);

    const text = original.toLowerCase();
    const hindi = isHindi(original);

    let intent = "";
    if (hindi) {
      for (const k of hindiKeywords) {
        if (k.re.test(original)) { intent = k.intent; break; }
      }
    }

    const t = (en: string, hi: string) => (hindi ? hi : en);

    // Greetings
    if (!intent && /(hello|hi|hey|namaste|namaskar|नमस्ते|नमस्कार|हाय|हेलो)/i.test(original)) {
      return respond(t(
        "Hello! I am your shopping assistant. Ask me to find a product, open a category, or check your cart.",
        "नमस्ते! मैं आपकी शॉपिंग सहायक हूँ। कोई प्रोडक्ट ढूँढने, कैटेगरी खोलने या कार्ट देखने को कहिए।"
      ));
    }

    const navIntent = wantsNavigation(original);
    const closeAndGo = (path: string) => { setOpen(false); navigate(path); };

    // Greetings
    if (!intent && /(hello|hi|hey|namaste|namaskar|नमस्ते|नमस्कार|हाय|हेलो)/i.test(original)) {
      return respond(t(
        "Hello! I am your Houskase shopping assistant. Ask about products, categories, RFQ, tracking, policies or contact.",
        "नमस्ते! मैं हौसकेस की शॉपिंग सहायक हूँ। प्रोडक्ट, कैटेगरी, RFQ, ट्रैकिंग, पॉलिसी या संपर्क के बारे में पूछें।"
      ));
    }

    // ————— Policy intents —————
    if (/(privacy\s*policy|privacy|प्राइवेसी|गोपनीयता)/i.test(original)) {
      if (navIntent) return closeAndGo("/privacy-policy");
      return respond(t(
        "Privacy Policy: we collect only what's needed for orders (name, contact, address), never sell your data, use secure payments, and you can request deletion anytime. Full page: Privacy Policy.",
        "प्राइवेसी पॉलिसी: हम केवल ऑर्डर के लिए ज़रूरी जानकारी (नाम, संपर्क, पता) लेते हैं, डेटा बेचते नहीं, भुगतान सुरक्षित है और आप कभी भी डिलीशन माँग सकते हैं। पूरा पेज: Privacy Policy."
      ));
    }
    if (/(terms|shartein|शर्तें|टर्म)/i.test(original)) {
      if (navIntent) return closeAndGo("/terms-of-service");
      return respond(t(
        "Terms & Conditions: use the site lawfully, provide accurate order info, prices/stock may change, and disputes fall under Indian jurisdiction. Full page: Terms and Conditions.",
        "टर्म्स & कंडीशन्स: साइट का सही उपयोग करें, सटीक जानकारी दें, कीमत/स्टॉक बदल सकता है, विवाद भारतीय क्षेत्राधिकार में। पूरा पेज: Terms and Conditions."
      ));
    }
    if (/(refund|cancel|रिफंड|कैंसल|वापसी)/i.test(original)) {
      if (navIntent) return closeAndGo("/return-policy");
      return respond(t(
        "Refund & Cancellation: 7-day easy return on unused/unwashed items; cancel before dispatch for full refund; refunds credited in 5–7 business days to original method.",
        "रिफंड और कैंसलेशन: इस्तेमाल न किए गए/बिना धुले सामान पर 7 दिन में रिटर्न; डिस्पैच से पहले कैंसल पर पूरा रिफंड; 5–7 कार्य दिवसों में मूल तरीके से रिफंड।"
      ));
    }
    if (/(shipping|delivery|शिपिंग|डिलीवरी|कूरियर)/i.test(original)) {
      if (navIntent) return closeAndGo("/shipping-policy");
      return respond(t(
        "Shipping Policy: 3–7 business days across India via Ekart/Delhivery, tracking sent via SMS/email, COD available in serviceable pincodes, free shipping on eligible orders.",
        "शिपिंग पॉलिसी: पूरे भारत में 3–7 कार्य दिवस, Ekart/Delhivery से, SMS/ईमेल पर ट्रैकिंग, सेवायोग्य पिन में COD, योग्य ऑर्डर पर मुफ़्त शिपिंग।"
      ));
    }

    // ————— Track Order —————
    if (intent === "track" || /(track\s*order|order\s*status|awb|where.+order|कहाँ.+ऑर्डर|ट्रैक)/i.test(original)) {
      // Try to extract an order id / AWB from the message (e.g. ORD-20260716-1234, or 8+ digits)
      const idMatch = original.match(/\b(ORD[-_]?[A-Z0-9-]{4,}|[A-Z0-9]{6,}-?\d{2,}|\d{8,})\b/i);
      if (idMatch) {
        const orderId = idMatch[1];
        if (navIntent) return closeAndGo(`/courier-tracking?order=${encodeURIComponent(orderId)}`);
        return respond(t(
          `Got it — Order "${orderId}". Say "take me to track order page" and I'll open /courier-tracking with this ID pre-filled.`,
          `ठीक है — ऑर्डर "${orderId}"। "take me to track order page" बोलें, मैं /courier-tracking पेज इस ID के साथ खोल दूँगी।`
        ));
      }
      if (navIntent) return closeAndGo("/courier-tracking");
      return respond(t(
        "Track Order (page: /courier-tracking) — 3 steps: 1) Share your Order ID (e.g. ORD-20260716-1234) or AWB number here in chat. 2) I'll confirm it and open the tracking page. 3) You'll see live courier status. Or say 'take me to track order page' to open it now.",
        "ट्रैक ऑर्डर (पेज: /courier-tracking) — 3 स्टेप: 1) यहाँ चैट में अपना Order ID (जैसे ORD-20260716-1234) या AWB नंबर भेजें। 2) मैं कन्फर्म करके ट्रैकिंग पेज खोलूँगी। 3) लाइव कूरियर स्टेटस दिखेगा। अभी खोलने के लिए बोलें: 'take me to track order page'।"
      ));
    }

    // ————— RFQ / Bulk / Quote —————
    if (intent === "rfq" || /(rfq|quote|quotation|bulk|wholesale|थोक|बल्क|कोटेशन)/i.test(original)) {
      if (navIntent) return closeAndGo("/rfq");
      return respond(t(
        "Request Quote (RFQ) — 4 steps: 1) Open the RFQ page. 2) Add products with quantity. 3) Share your name, company & contact. 4) Our team replies in 2–8 hours. Say 'take me to request quote page' to open it.",
        "रिक्वेस्ट कोट (RFQ) — 4 स्टेप: 1) RFQ पेज खोलें। 2) प्रोडक्ट व क्वांटिटी डालें। 3) नाम, कंपनी और संपर्क दें। 4) टीम 2–8 घंटे में जवाब देगी। खोलने के लिए बोलें: 'take me to request quote page'।"
      ));
    }

    // ————— Contact Sales —————
    if (/(contact\s*sales|contact|sales team|call|phone|email|संपर्क|कॉल|फ़ोन|ईमेल)/i.test(original)) {
      if (navIntent) return closeAndGo("/help");
      return respond(t(
        "Contact Sales: 📧 sales@houskase.com  📞 +91 92661 29195  🕘 Mon–Sat, 9 AM–6 PM. For bulk pricing use RFQ; for general help use Help & FAQ.",
        "सेल्स से संपर्क: 📧 sales@houskase.com  📞 +91 92661 29195  🕘 सोम–शनि, 9–6। बल्क कीमत के लिए RFQ, सामान्य मदद के लिए Help & FAQ।"
      ));
    }

    // ————— Help / FAQ —————
    if (intent === "help" || /\b(help|faq|support|मदद|सहायता)\b/i.test(original)) {
      if (navIntent) return closeAndGo("/help");
      return respond(t(
        "Help & FAQ — 3 steps: 1) Open the Help & FAQ page. 2) Browse common topics (orders, shipping, returns, payments). 3) Still stuck? Email sales@houskase.com or call +91 92661 29195. Say 'open help page' to go there.",
        "Help & FAQ — 3 स्टेप: 1) Help & FAQ पेज खोलें। 2) आम विषय देखें (ऑर्डर, शिपिंग, रिटर्न, पेमेंट)। 3) फिर भी दिक्कत हो तो ईमेल/कॉल करें। खोलने के लिए: 'open help page'।"
      ));
    }

    // ————— About Us —————
    if (/(about\s*us|about houskase|हमारे बारे|कंपनी)/i.test(original)) {
      if (navIntent) return closeAndGo("/about-us");
      return respond(t(
        "Houskase is an Indian D2C brand for premium, eco-friendly home & lifestyle essentials — bamboo towels, kitchen towels, cleaning cloths and more. Full story on the About Us page.",
        "हौसकेस एक भारतीय D2C ब्रांड है — प्रीमियम, इको-फ्रेंडली होम & लाइफस्टाइल प्रोडक्ट: बैम्बू टॉवल, किचन टॉवल, क्लीनिंग क्लॉथ आदि। पूरी कहानी 'About Us' पेज पर।"
      ));
    }

    // ————— Cart / Login / Dashboard / Home —————
    if (intent === "cart" || /\b(cart|checkout|basket|कार्ट)\b/i.test(original)) {
      if (navIntent) return closeAndGo("/checkout");
      return respond(t(
        "Your cart is in the top-right cart icon. Add products, then proceed to checkout for secure Razorpay payment or COD.",
        "आपका कार्ट ऊपर-दाएँ कार्ट आइकन में है। प्रोडक्ट डालें और चेकआउट पर जाएँ — Razorpay या COD से भुगतान।"
      ));
    }
    if (intent === "login" || /\b(login|sign in|sign up|register|account|लॉगिन)\b/i.test(original)) {
      if (navIntent) return closeAndGo("/login");
      return respond(t("Click Login (top-right) to sign in or create an account.", "साइन-इन या अकाउंट बनाने के लिए ऊपर-दाएँ 'Login' पर क्लिक करें।"));
    }
    if (intent === "dashboard" || /(dashboard|my orders|profile|डैशबोर्ड|प्रोफ़ाइल)/i.test(original)) {
      if (navIntent) return closeAndGo("/dashboard");
      return respond(t("After login, open Dashboard for orders, RFQs and profile.", "लॉगिन के बाद Dashboard खोलें — ऑर्डर, RFQ, प्रोफ़ाइल।"));
    }
    if (intent === "home" || /(go to|open|show)\s+(home|homepage)|होम पेज/i.test(original)) {
      if (navIntent) return closeAndGo("/");
      return respond(t("You're on Houskase — click the logo anytime to return home.", "आप हौसकेस पर हैं — कभी भी लोगो पर क्लिक करके होम जा सकते हैं।"));
    }

    // ————— List all categories —————
    if (intent === "categories" || /(list|show|what).*(categor)|कैटेगरी.*(दिखा|कौन)/i.test(original)) {
      if (navIntent) return closeAndGo("/products");
      const names = categoriesRef.current.map((c) => c.name).slice(0, 8).join(", ");
      return respond(names
        ? t(`Our categories: ${names}. Say the category name to see products, or 'take me to <category>' to open it.`,
            `हमारी कैटेगरी: ${names}। कैटेगरी का नाम बोलें प्रोडक्ट देखने के लिए, या 'take me to <category>' बोलें।`)
        : t("Categories loading, please retry in a moment.", "कैटेगरी लोड हो रही हैं, थोड़ी देर बाद पूछें।"));
    }

    // ————— Match a specific category by name —————
    const cats = [...categoriesRef.current].sort((a, b) => b.name.length - a.name.length);
    for (const c of cats) {
      const n = c.name.toLowerCase();
      if (n && (text.includes(n) || original.toLowerCase().includes(n))) {
        if (navIntent) return closeAndGo(`/products?category=${c.slug}`);
        // suggest products using category keyword hints
        const hints = CATEGORY_HINTS[n] || [c.name];
        let matches: ProductRow[] = [];
        for (const h of hints) { matches = matches.concat(searchProducts(h)); }
        // dedupe
        const seen = new Set<string>();
        matches = matches.filter((p) => !seen.has(p.id) && seen.add(p.id)).slice(0, 4);
        return respond(
          t(`Here are some ${c.name} products. Say 'take me to ${c.name}' to open the full category.`,
            `${c.name} के कुछ प्रोडक्ट। पूरी कैटेगरी खोलने के लिए बोलें: 'take me to ${c.name}'।`),
          matches.length ? matches : undefined
        );
      }
    }

    // ————— Strip command words to extract a product query —————
    const cleaned = original
      .replace(/^(please\s+)?(take me to|go to|open|redirect|show me|find|search|look for|i want|i need|do you have)\s+/i, "")
      .replace(/^(कृपया\s+)?(खोज|खोजो|ढूं[ढो]?|दिखा[ओ]?|ले जा[ओ]?|पर ले)\s+/i, "")
      .replace(/\s+(page|पेज|product|प्रोडक्ट)$/i, "")
      .replace(/^(some|a|an|the)\s+/i, "")
      .trim();

    // ————— Product search — if user explicitly asks to be taken to a product —————
    const productMatches = searchProducts(cleaned || original);
    if (navIntent && productMatches.length === 1) {
      return closeAndGo(`/product/${productMatches[0].slug}`);
    }
    const looksLikeProductQuery = /(search|find|show|खोज|ढूं|दिखा|product|प्रोडक्ट|take me to|ले जा)/i.test(original);
    if (looksLikeProductQuery && productMatches.length) {
      return respond(
        t(`Found ${productMatches.length} product${productMatches.length > 1 ? "s" : ""} for "${cleaned || original}". Tap one to open it.`,
          `"${cleaned || original}" के लिए ${productMatches.length} प्रोडक्ट मिले। खोलने के लिए किसी पर टैप करें।`),
        productMatches
      );
    }

    // Fallback → ask Lovable AI for a proper contextual answer
    (async () => {
      setThinking(true);
      try {
        const history = messages.slice(-6).map((m) => ({ role: m.role, text: m.text }));
        const { data, error } = await supabase.functions.invoke("assistant-chat", {
          body: {
            message: original,
            history,
            categories: categoriesRef.current.map((c) => ({ name: c.name, slug: c.slug })),
            products: productsRef.current.map((p) => ({ name: p.name, slug: p.slug })).slice(0, 80),
          },
        });
        if (error) throw error;
        const reply: string = data?.reply || t(
          "Sorry, I couldn't answer that right now. Please try again.",
          "माफ़ कीजिए, अभी उत्तर नहीं दे पा रही। कृपया दोबारा कोशिश करें।"
        );
        const slugs: string[] = Array.isArray(data?.productSlugs) ? data.productSlugs : [];
        const suggested = slugs
          .map((s) => productsRef.current.find((p) => p.slug === s))
          .filter((p): p is ProductRow => !!p);
        // If AI didn't return slugs but query looks product-y, use local matches
        const fallbackMatches = suggested.length ? suggested : searchProducts(cleaned || original);
        respond(reply, fallbackMatches.length ? fallbackMatches.slice(0, 4) : undefined);
      } catch (err) {
        console.error("assistant-chat failed", err);
        respond(t(
          "I'm having trouble connecting right now. Please try again in a moment.",
          "अभी कनेक्ट करने में दिक्कत हो रही है। थोड़ी देर बाद फिर कोशिश करें।"
        ));
      } finally {
        setThinking(false);
      }
    })();
  }, [navigate, respond, searchProducts, messages]);

  const startListening = useCallback(() => {
    if (!supported) {
      setPermError("Voice input is not supported in this browser. Please use Chrome.");
      return;
    }
    setPermError("");
    try {
      window.speechSynthesis.cancel();
      const rec = new SR();
      // hi-IN handles both Hindi and Indian-English far better than en-IN
      rec.lang = "hi-IN";
      rec.continuous = true;
      rec.interimResults = true;
      rec.maxAlternatives = 3;

      let finalText = "";
      let silenceTimer: ReturnType<typeof setTimeout> | null = null;
      // Longer silence window — gives time to switch between Hindi & English words
      const SILENCE_MS = 3000;
      const resetSilence = () => {
        if (silenceTimer) clearTimeout(silenceTimer);
        silenceTimer = setTimeout(() => {
          try { rec.stop(); } catch {}
        }, SILENCE_MS);
      };

      rec.onresult = (e: any) => {
        let live = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const res = e.results[i];
          if (res.isFinal) finalText += res[0].transcript + " ";
          else live += res[0].transcript;
        }
        setInterim(finalText + live);
        resetSilence();
      };
      rec.onspeechstart = () => resetSilence();
      rec.onend = () => {
        if (silenceTimer) clearTimeout(silenceTimer);
        setListening(false);
        setInterim("");
        if (finalText.trim()) handleCommand(finalText.trim());
      };
      rec.onerror = (e: any) => {
        if (silenceTimer) clearTimeout(silenceTimer);
        setListening(false);
        setInterim("");
        if (e?.error === "not-allowed" || e?.error === "service-not-allowed") {
          setPermError("Microphone permission was denied. Please allow microphone access in your browser settings.");
        } else if (e?.error === "no-speech") {
          setPermError("I didn't hear anything. Tap the mic and try again.");
        }
      };
      rec.start();
      resetSilence();
      recognitionRef.current = rec;
      setListening(true);
    } catch (err) {
      console.error("voice start failed", err);
      setListening(false);
    }
  }, [supported, handleCommand]);

  const stopListening = useCallback(() => {
    try { recognitionRef.current?.stop(); } catch {}
    setListening(false);
    setInterim("");
  }, []);

  const submitText = (e?: React.FormEvent) => {
    e?.preventDefault();
    const v = input.trim();
    if (!v) return;
    setInput("");
    handleCommand(v);
  };

  if (hidden) return null;

  return (
    <>
      {/* Floating launcher */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Open shopping assistant"
        className={cn(
          "fixed z-40 right-4 sm:right-6 bottom-20 sm:bottom-6",
          "h-12 w-12 sm:h-14 sm:w-14 rounded-full shadow-xl",
          "bg-gradient-accent text-white flex items-center justify-center",
          "hover:scale-105 active:scale-95 transition-transform"
        )}
      >
        <MessageCircle className="h-5 w-5 sm:h-6 sm:w-6" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.97 }}
            transition={{ duration: 0.2 }}
            className={cn(
              "fixed z-50 right-3 sm:right-6 bottom-3 sm:bottom-6",
              "w-[94vw] max-w-[400px]",
              // Responsive fixed height — never overflows viewport, never auto-grows
              "h-[min(420px,calc(100dvh-9rem))] sm:h-[min(440px,calc(100dvh-10rem))]",
              "max-h-[calc(100dvh-9rem)]",
              "rounded-2xl bg-card border border-border shadow-2xl overflow-hidden flex flex-col"
            )}
          >
            {/* Header (dark, Studio Interplay style) */}
            <div className="flex items-center justify-between px-4 py-3 bg-[#1a1a1a] text-white flex-shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-9 w-9 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                  <MessageCircle className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm truncate">Shopping Assistant</p>
                  <p className="text-[11px] text-white/70 flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
                    {listening ? "Listening…" : "Online"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => {
                    setMuted((m) => {
                      const next = !m;
                      if (next) window.speechSynthesis.cancel();
                      return next;
                    });
                  }}
                  className="p-1.5 hover:bg-white/10 rounded"
                  aria-label={muted ? "Unmute voice" : "Mute voice"}
                >
                  {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </button>
                <button
                  onClick={() => { stopListening(); setOpen(false); window.speechSynthesis.cancel(); }}
                  className="p-1.5 hover:bg-white/10 rounded"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Body — scrollable, fixed area */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto bg-background">
              {messages.length === 0 ? (
                <div className="px-5 py-6 text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Sparkles className="h-5 w-5 text-amber-500" />
                    <h3 className="font-semibold text-base">Welcome to Houskase</h3>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Ask about products, categories, your cart, or place an RFQ. Hindi & English दोनों support हैं।
                  </p>

                  <div className="mt-5 flex flex-wrap gap-2 justify-center">
                    {QUICK_REPLIES.map((q) => (
                      <button
                        key={q.label}
                        onClick={() => handleCommand(q.message)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border bg-card text-xs font-medium hover:bg-secondary transition-colors"
                      >
                        <q.icon className="h-3.5 w-3.5" />
                        {q.label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="px-3 py-3 space-y-2">
                  {messages.map((m, i) => (
                    <div key={i} className="space-y-2">
                      <div
                        className={cn(
                          "max-w-[85%] rounded-2xl px-3 py-2 text-sm break-words",
                          m.role === "user"
                            ? "ml-auto bg-shop text-shop-foreground rounded-br-md"
                            : "mr-auto bg-secondary text-foreground rounded-bl-md"
                        )}
                      >
                        {m.text}
                      </div>
                      {m.role === "assistant" && m.products && m.products.length > 0 && (
                        <div className="mr-auto max-w-[92%] grid grid-cols-1 gap-1.5">
                          {m.products.map((p) => (
                            <button
                              key={p.id}
                              onClick={() => { setOpen(false); navigate(`/product/${p.slug}`); }}
                              className="flex items-center gap-2.5 p-2 bg-card border border-border rounded-lg hover:border-primary/40 hover:bg-secondary/40 transition-colors text-left"
                            >
                              <div className="w-10 h-10 rounded-md bg-secondary overflow-hidden flex-shrink-0 flex items-center justify-center">
                                {p.images?.[0] ? (
                                  <img src={p.images[0]} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <Package className="h-4 w-4 text-muted-foreground" />
                                )}
                              </div>
                              <span className="flex-1 text-xs font-medium text-foreground line-clamp-2">{p.name}</span>
                              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                  {thinking && (
                    <div className="mr-auto max-w-[70%] rounded-2xl px-3 py-2.5 bg-secondary text-foreground rounded-bl-md">
                      <div className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                    </div>
                  )}
                  {interim && (
                    <div className="ml-auto max-w-[85%] rounded-2xl px-3 py-2 text-sm bg-shop/60 text-shop-foreground rounded-br-md italic">
                      {interim}…
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Permission / error hint */}
            {permError && (
              <div className="px-4 py-2 bg-destructive/10 text-destructive text-[11px] border-t border-destructive/20 flex-shrink-0">
                {permError}
              </div>
            )}

            {/* Persistent one-tap action chips */}
            <div className="px-3 pt-2 pb-1 flex gap-1.5 overflow-x-auto border-t border-border bg-card flex-shrink-0 scrollbar-none">
              {ACTION_CHIPS.map((c) => (
                <button
                  key={c.label}
                  type="button"
                  onClick={() => handleCommand(c.message)}
                  className="whitespace-nowrap px-2.5 py-1 rounded-full border border-border bg-secondary/60 text-[11px] font-medium hover:bg-secondary transition-colors flex-shrink-0"
                >
                  {c.label}
                </button>
              ))}
            </div>

            {/* Composer — mic + text + send */}
            <form
              onSubmit={submitText}
              className="px-3 py-2.5 border-t border-border bg-card flex items-center gap-2 flex-shrink-0"
            >
              <button
                type="button"
                onClick={listening ? stopListening : startListening}
                className={cn(
                  "h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 transition-colors",
                  listening
                    ? "bg-destructive text-destructive-foreground animate-pulse"
                    : "bg-secondary text-foreground hover:bg-secondary/80"
                )}
                aria-label={listening ? "Stop listening" : "Start voice input"}
              >
                {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </button>

              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type a message…"
                className="flex-1 h-10 px-4 rounded-full bg-secondary text-sm outline-none placeholder:text-muted-foreground border border-transparent focus:border-primary/40"
              />

              <button
                type="submit"
                disabled={!input.trim()}
                className={cn(
                  "h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 transition-colors",
                  input.trim()
                    ? "bg-shop text-shop-foreground hover:bg-shop/90"
                    : "bg-secondary text-muted-foreground cursor-not-allowed"
                )}
                aria-label="Send"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
