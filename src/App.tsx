import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import { BottomNavigation } from "@/components/layout/BottomNavigation";
import { SecurityHeaders } from "@/components/SecurityHeaders";
import { ScrollToTop } from "@/components/ScrollToTop";
import { PWAInstallPrompt } from "@/pwa/PWAInstallPrompt";

import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";

// Eager: user-facing pages — instant navigation, no white flash
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Products from "./pages/Products";
import ProductDetail from "./pages/ProductDetail";
import RFQ from "./pages/RFQ";
import Checkout from "./pages/Checkout";
import Chat from "./pages/Chat";
import Help from "./pages/Help";
import CourierTracking from "./pages/CourierTracking";
import NotFound from "./pages/NotFound";
import PageContent from "./pages/PageContent";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import AboutUs from "./pages/AboutUs";
import Blog from "./pages/Blog";
import BlogPost from "./pages/BlogPost";
import PWADiagnosticsPage from "./pages/PWADiagnostics";
import SEOChecklist from "./pages/SEOChecklist";
import { RouteCanonical } from "./components/RouteCanonical";

import BambooVsCottonGuide from "./pages/guides/BambooVsCottonTowels";
import OAuthConsent from "./pages/OAuthConsent";
import Connect from "./pages/Connect";
import EmailPreview from "./pages/admin/EmailPreview";


// Admin — eager imports to eliminate white-flash on route changes
import { AdminLayout } from "./components/admin/AdminLayout";
import AdminLogin from "./pages/admin/Login";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminUsers from "./pages/admin/Users";
import AdminUserCreate from "./pages/admin/UserCreate";
import AdminProducts from "./pages/admin/Products";
import AdminOrders from "./pages/admin/Orders";
import AdminRFQ from "./pages/admin/RFQ";
import AdminCategories from "./pages/admin/Categories";
import AdminBrands from "./pages/admin/Brands";
import AdminChat from "./pages/admin/Chat";
import AdminNotifications from "./pages/admin/Notifications";
import AdminSettings from "./pages/admin/Settings";
import AdminInvoices from "./pages/admin/Invoices";
import AdminOffers from "./pages/admin/Offers";
import AdminReviews from "./pages/admin/Reviews";
import AdminCustomTabs from "./pages/admin/CustomTabs";
import AdminHeroSlides from "./pages/admin/HeroSlides";
import AdminPromoBanners from "./pages/admin/PromoBanners";
import AdminCoupons from "./pages/admin/Coupons";
import AdminPincodes from "./pages/admin/Pincodes";
import AdminHomepageSections from "./pages/admin/HomepageSections";
import AdminReels from "./pages/admin/Reels";
import AdminRoles from "./pages/admin/Roles";
import AdminDiagnostics from "./pages/admin/Diagnostics";
import AdminContactInquiries from "./pages/admin/ContactInquiries";
import AdminEkartLogs from "./pages/admin/EkartLogs";
import AdminEkartSettings from "./pages/admin/EkartSettings";
import AdminBlog from "./pages/admin/Blog";
import AdminFamilyTestimonials from "./pages/admin/FamilyTestimonials";
import AdminWebhookLogs from "./pages/admin/WebhookLogs";
import InvoicePreview from "./pages/dev/InvoicePreview";


const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 min — reduces repeated network calls (site_settings, categories, etc.)
      gcTime: 30 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const RouteFallback = () => (
  <div className="min-h-[60vh] flex items-center justify-center">
    <Loader2 className="h-6 w-6 animate-spin text-accent" aria-label="Loading" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <CartProvider>
      <TooltipProvider>
        <SecurityHeaders />
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ScrollToTop />
          <RouteCanonical />
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/products" element={<Products />} />
              <Route path="/product/:id" element={<ProductDetail />} />
              <Route path="/rfq" element={<RFQ />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/chat" element={<Chat />} />
              <Route path="/courier-tracking" element={<CourierTracking />} />
              <Route path="/help" element={<Help />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/about-us" element={<AboutUs />} />
              <Route path="/blog" element={<Blog />} />
              <Route path="/blog/:slug" element={<BlogPost />} />
              <Route path="/pwa-diagnostics" element={<PWADiagnosticsPage />} />
              <Route path="/seo-checklist" element={<SEOChecklist />} />
              <Route path="/guides/bamboo-towels-benefits" element={<Navigate to="/guides/bamboo-vs-cotton-towels" replace />} />
              <Route path="/guides/bamboo-vs-cotton-towels" element={<BambooVsCottonGuide />} />
              <Route path="/.lovable/oauth/consent" element={<OAuthConsent />} />
              <Route path="/connect" element={<Connect />} />
              <Route path="/track-order" element={<Navigate to="/courier-tracking" replace />} />
              <Route path="/track-order/:orderNumber" element={<Navigate to="/courier-tracking" replace />} />
              <Route path="/dev/invoice-preview" element={<InvoicePreview />} />
              <Route path="/privacy-policy" element={<PageContent pageKey="privacy_policy" title="Privacy Policy" description="How Houskase collects, uses, stores, and protects your personal data — including cookies, order history, and marketing preferences." />} />
              <Route path="/terms-of-service" element={<PageContent pageKey="terms_of_service" title="Terms of Service" description="The terms governing your use of Houskase — accounts, orders, payments, cancellations, and acceptable use of the marketplace." />} />
              <Route path="/payment-terms" element={<PageContent pageKey="payment_terms" title="Payment Terms" description="Accepted payment methods, invoicing rules, taxes, and refund timing for retail and wholesale orders on Houskase." />} />
              <Route path="/shipping-delivery" element={<PageContent pageKey="shipping_delivery" title="Shipping & Delivery" description="Shipping timelines, courier partners, delivery charges, and how Houskase handles delayed or damaged shipments across India." />} />
              <Route path="/shipping-policy" element={<PageContent pageKey="shipping_policy" title="Shipping Policy" description="Houskase's shipping policy — order dispatch, transit windows, tracking, delivery attempts, and out-of-serviceable-area handling." />} />
              <Route path="/return-policy" element={<PageContent pageKey="return_policy" title="Return Policy" description="How to return or exchange Houskase products — eligibility windows, condition requirements, pickup logistics, and refund timelines." />} />


              {/* Admin Routes */}
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<AdminDashboard />} />
                <Route path="users" element={<AdminUsers />} />
                <Route path="users/new" element={<AdminUserCreate />} />
                <Route path="products" element={<AdminProducts />} />
                <Route path="orders" element={<AdminOrders />} />
                <Route path="rfq" element={<AdminRFQ />} />
                <Route path="categories" element={<AdminCategories />} />
                <Route path="brands" element={<AdminBrands />} />
                <Route path="hero-slides" element={<AdminHeroSlides />} />
                <Route path="promo-banners" element={<AdminPromoBanners />} />
                <Route path="coupons" element={<AdminCoupons />} />
                <Route path="pincodes" element={<AdminPincodes />} />
                <Route path="chat" element={<AdminChat />} />
                <Route path="notifications" element={<AdminNotifications />} />
                <Route path="settings" element={<AdminSettings />} />
                <Route path="invoices" element={<AdminInvoices />} />
                <Route path="offers" element={<AdminOffers />} />
                <Route path="reviews" element={<AdminReviews />} />
                <Route path="custom-tabs" element={<AdminCustomTabs />} />
                <Route path="homepage-sections" element={<AdminHomepageSections />} />
                <Route path="reels" element={<AdminReels />} />
                <Route path="roles" element={<AdminRoles />} />
                <Route path="diagnostics" element={<AdminDiagnostics />} />
                <Route path="contact-inquiries" element={<AdminContactInquiries />} />
                <Route path="ekart-logs" element={<AdminEkartLogs />} />
                <Route path="ekart-settings" element={<AdminEkartSettings />} />
                <Route path="blog" element={<AdminBlog />} />
                <Route path="family-testimonials" element={<AdminFamilyTestimonials />} />
                <Route path="webhook-logs" element={<AdminWebhookLogs />} />
                <Route path="email-preview" element={<EmailPreview />} />
              </Route>

              {/* Catch-all */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
          <BottomNavigation />
          <PWAInstallPrompt />
        </BrowserRouter>

      </TooltipProvider>
      </CartProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
