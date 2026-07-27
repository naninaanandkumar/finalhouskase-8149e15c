import { auth, defineMcp } from "@lovable.dev/mcp-js";
import searchProducts from "./tools/search_products";
import getProduct from "./tools/get_product";
import listCategories from "./tools/list_categories";
import listMyOrders from "./tools/list_my_orders";
import getOrder from "./tools/get_order";
import getOrderTimeline from "./tools/get_order_timeline";
import listMyRfqs from "./tools/list_my_rfqs";
import createRfq from "./tools/create_rfq";
import initiateCheckout from "./tools/initiate_checkout";
import getMyProfile from "./tools/get_my_profile";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "houskase-mcp",
  title: "Houskase",
  version: "0.2.0",
  instructions:
    "Tools for Houskase — India's premium household essentials store. Browse the catalog with search_products / get_product / list_categories. Read the signed-in user's own data with list_my_orders / get_order / get_order_timeline / list_my_rfqs / get_my_profile (all RLS-protected). Mutating tools: initiate_checkout (creates a pending order and returns a browser URL to finish paying) and create_rfq (submits a bulk quote request).",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    searchProducts,
    getProduct,
    listCategories,
    listMyOrders,
    getOrder,
    getOrderTimeline,
    listMyRfqs,
    createRfq,
    initiateCheckout,
    getMyProfile,
  ],
});
