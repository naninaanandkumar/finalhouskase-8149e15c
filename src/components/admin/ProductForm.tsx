import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ArrowLeft,
  Package,
  Plus,
  Trash2,
  ImagePlus,
  ChevronDown,
  ChevronUp,
  Loader2,
  X,
  RefreshCw,
  Eye,
  Save,
  Store,
  ShoppingBag,
  Boxes,
  Tag,
  User,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Tables } from "@/integrations/supabase/types";
import { ImageUpload, GalleryUpload } from "@/components/admin/ImageUpload";

type Product = Tables<"products">;
type Category = Tables<"categories">;
type Brand = Tables<"brands">;
type ProductVariation = Tables<"product_variations">;

interface Attribute {
  name: string;
  values: string[];
  usedForVariations: boolean;
  visibleOnProduct: boolean;
  existingAttributeId?: string;
}

interface DbAttribute {
  id: string;
  name: string;
  slug: string;
}

interface DbAttributeValue {
  id: string;
  attribute_id: string;
  value: string;
}

interface VariationData {
  id?: string;
  sku: string;
  size: string | null;
  color: string | null;
  color_image: string;
  gallery_images: string[];
  stock_quantity: number;
  shop_price: number;
  shop_regular_price: number;
  shop_moq: number;
  retail_price: number;
  retail_regular_price: number;
  retail_moq: number;
  guest_price: number;
  regular_price: number;
  weight: number;
  is_active: boolean;
  sale_start_date: string;
  sale_end_date: string;
}

interface ProductFormProps {
  product?: Product | null;
  onClose: () => void;
  onSave: () => void;
}

const SHIPPING_CLASSES = [
  { value: "standard", label: "Standard" },
  { value: "express", label: "Express" },
  { value: "heavy", label: "Heavy Items" },
  { value: "fragile", label: "Fragile" },
  { value: "free", label: "Free Shipping" },
];

const TAX_CLASSES = [
  { value: "standard", label: "Standard Rate" },
  { value: "reduced", label: "Reduced Rate" },
  { value: "zero", label: "Zero Rate" },
  { value: "exempt", label: "Tax Exempt" },
];

const PRODUCT_LABELS = [
  "TRENDING",
  "BEST SELLER",
  "NEW ARRIVAL",
  "STOCK RUNNING LOW",
  "MOST LOVED",
];
// Extracted outside to prevent re-mount on re-render (fixes cursor jump in textareas)
function CollapsibleSection({ 
  id, 
  title, 
  children,
  openSections,
  toggleSection,
}: { 
  id: string; 
  title: string; 
  children: React.ReactNode;
  openSections: Record<string, boolean>;
  toggleSection: (section: string) => void;
}) {
  return (
    <Card className="shadow-sm border">
      <Collapsible open={openSections[id]} onOpenChange={() => toggleSection(id)}>
        <CollapsibleTrigger className="w-full py-3 px-4 flex flex-row items-center justify-between hover:bg-muted/30 transition-colors">
            <span className="font-medium text-sm">{title}</span>
            <div className="flex items-center gap-1 text-muted-foreground">
              {openSections[id] ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0 pb-4 px-4">
            {children}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
export function ProductForm({ product, onClose, onSave }: ProductFormProps) {

  const { toast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("general");
  const [productType, setProductType] = useState<"simple" | "variable">(
    product?.has_variations ? "variable" : "simple"
  );

  // Basic Info
  const [name, setName] = useState(product?.name || "");
  const [slug, setSlug] = useState(product?.slug || "");
  const [description, setDescription] = useState(product?.description || "");
  const [shortDescription, setShortDescription] = useState(product?.short_description || "");
  const [sku, setSku] = useState(product?.sku || "");
  const [hsnCode, setHsnCode] = useState(product?.hsn_code || "");
  const [categoryId, setCategoryId] = useState(product?.category_id || "");
  const [brandId, setBrandId] = useState(product?.brand_id || "");
  const [isActive, setIsActive] = useState(product?.is_active ?? true);

  // Images
  const [featureImage, setFeatureImage] = useState(product?.images?.[0] || "");
  const [bannerImage, setBannerImage] = useState<string>((product as any)?.banner_image || "");
  const [galleryImages, setGalleryImages] = useState<string[]>(product?.images?.slice(1) || []);

  // Description Blocks (image + text grid)
  const initialBlocks = Array.isArray((product as any)?.description_blocks)
    ? ((product as any).description_blocks as Array<{ image?: string; text?: string }>)
    : [];
  const [descriptionBlocks, setDescriptionBlocks] = useState<Array<{ image: string; text: string }>>(
    initialBlocks.map((b) => ({ image: b.image || "", text: b.text || "" }))
  );

  // Simple Product Pricing (3-Tier)
  const [shopPrice, setShopPrice] = useState(product?.shop_price?.toString() || "");
  const [shopMoq, setShopMoq] = useState(product?.shop_moq && product.shop_moq > 1 ? product.shop_moq.toString() : "");
  const [retailPrice, setRetailPrice] = useState(product?.retail_price?.toString() || "");
  const [retailMoq, setRetailMoq] = useState(product?.retail_moq && product.retail_moq > 1 ? product.retail_moq.toString() : "");
  const [guestPrice, setGuestPrice] = useState(product?.guest_price?.toString() || "");
  const [regularPrice, setRegularPrice] = useState(product?.regular_price?.toString() || "");
  const [stockQuantity, setStockQuantity] = useState(product?.stock_quantity?.toString() || "0");

  // Attributes
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [newAttributeValue, setNewAttributeValue] = useState<{ [key: string]: string }>({});
  const [newAttributeName, setNewAttributeName] = useState("");
  const [dbAttributes, setDbAttributes] = useState<DbAttribute[]>([]);
  const [openAttribute, setOpenAttribute] = useState<string | null>(null);
  const [dbAttributeValues, setDbAttributeValues] = useState<DbAttributeValue[]>([]);
  const [selectedDbAttribute, setSelectedDbAttribute] = useState("");

  // Variations
  const [variations, setVariations] = useState<VariationData[]>([]);
  const [existingVariations, setExistingVariations] = useState<ProductVariation[]>([]);
  const [expandedVariation, setExpandedVariation] = useState<number | null>(null);
  const [expandedColorGroup, setExpandedColorGroup] = useState<string | null>(null);

  // Shipping
  const [weight, setWeight] = useState(product?.weight?.toString() || "0");
  const [length, setLength] = useState(product?.length?.toString() || "0");
  const [width, setWidth] = useState(product?.width?.toString() || "0");
  const [height, setHeight] = useState(product?.height?.toString() || "0");
  const [shippingClass, setShippingClass] = useState(product?.shipping_class || "standard");

  // Tax
  const [gstEnabled, setGstEnabled] = useState((product as any)?.gst_enabled ?? false);
  const [gstPercentage, setGstPercentage] = useState(product?.gst_percentage?.toString() || "0");
  const [gstPricingMode, setGstPricingMode] = useState((product as any)?.gst_pricing_mode || "exclusive");
  const [taxClass, setTaxClass] = useState(product?.tax_class || "standard");

  // Tags & Labels
  const [tags, setTags] = useState<string[]>(product?.tags || []);
  const [newTag, setNewTag] = useState("");
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  const [customLabel, setCustomLabel] = useState("");

  // Collapsible sections state
  const [openSections, setOpenSections] = useState({
    shortDesc: true,
    productData: true,
    longDesc: true,
    publish: true,
    productImage: true,
    gallery: false,
    categories: true,
    brands: false,
    tags: true,
    labels: true,
  });

  useEffect(() => {
    fetchData();
    // Always clear per-product state so one product never inherits another's
    // variations / attributes when the form is reused.
    setAttributes([]);
    setVariations([]);
    setExistingVariations([]);
    if (product) {
      fetchProductData();
    }
  }, [product?.id]);

  const fetchData = async () => {
    const [categoriesRes, brandsRes, attrsRes, attrValsRes] = await Promise.all([
      supabase.from("categories").select("*").eq("is_active", true).order("name"),
      supabase.from("brands").select("*").eq("is_active", true).order("name"),
      supabase.from("product_attributes").select("*").order("name"),
      supabase.from("product_attribute_values").select("*"),
    ]);
    if (categoriesRes.data) setCategories(categoriesRes.data);
    if (brandsRes.data) setBrands(brandsRes.data);
    if (attrsRes.data) setDbAttributes(attrsRes.data);
    if (attrValsRes.data) setDbAttributeValues(attrValsRes.data);
  };

  const fetchProductData = async () => {
    if (!product) return;
    
    // Fetch attribute assignments
    const { data: assignments } = await supabase
      .from("product_attribute_assignments")
      .select("*, attribute:product_attributes(id, name), attribute_value:product_attribute_values(value)")
      .eq("product_id", product.id);
    
    if (assignments && assignments.length > 0) {
      const grouped: Record<string, Attribute> = {};
      assignments.forEach((a: any) => {
        const name = a.attribute?.name || "";
        if (!grouped[name]) {
          grouped[name] = {
            name,
            values: [],
            usedForVariations: a.used_for_variations ?? false,
            visibleOnProduct: a.visible_on_product ?? true,
            existingAttributeId: a.attribute?.id,
          };
        }
        const val = a.attribute_value?.value;
        if (val && !grouped[name].values.includes(val)) {
          grouped[name].values.push(val);
        }
      });
      setAttributes(Object.values(grouped));
    }

    const loadedForId = product.id;
    const { data: variationsData } = await supabase
      .from("product_variations")
      .select("*")
      .eq("product_id", loadedForId);

    if (variationsData && variationsData.length > 0 && variationsData.every(v => v.product_id === loadedForId)) {
      setExistingVariations(variationsData);
      setProductType("variable");
      
      setVariations(variationsData.map(v => ({
        id: v.id,
        sku: v.sku || "",
        size: v.size,
        color: v.color,
        color_image: v.color_image || "",
        gallery_images: (v as any).gallery_images || [],
        stock_quantity: v.stock_quantity || 0,
        shop_price: Number(v.shop_price),
        shop_regular_price: Number((v as any).shop_regular_price) || 0,
        shop_moq: v.shop_moq && v.shop_moq > 1 ? v.shop_moq : 0,
        retail_price: Number(v.retail_price),
        retail_regular_price: Number((v as any).retail_regular_price) || 0,
        retail_moq: v.retail_moq && v.retail_moq > 1 ? v.retail_moq : 0,
        guest_price: Number(v.guest_price),
        regular_price: Number((v as any).regular_price) || 0,
        weight: v.weight || 0,
        is_active: v.is_active ?? true,
        sale_start_date: (v as any).sale_start_date || "",
        sale_end_date: (v as any).sale_end_date || "",
      })));
    }
  };

  const generateSlug = (text: string) => {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  };

  const toggleSection = (section: string) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section as keyof typeof prev] }));
  };

  const addAttribute = () => {
    if (newAttributeName.trim() && !attributes.find(a => a.name.toLowerCase() === newAttributeName.toLowerCase())) {
      setAttributes(prev => [...prev, { 
        name: newAttributeName.trim(), 
        values: [], 
        usedForVariations: false,
        visibleOnProduct: true 
      }]);
      setNewAttributeName("");
    }
  };

  const addDbAttribute = (attrId: string) => {
    const dbAttr = dbAttributes.find(a => a.id === attrId);
    if (!dbAttr || attributes.find(a => a.name.toLowerCase() === dbAttr.name.toLowerCase())) return;
    const existingValues = dbAttributeValues.filter(v => v.attribute_id === attrId).map(v => v.value);
    setAttributes(prev => [...prev, {
      name: dbAttr.name,
      values: existingValues,
      usedForVariations: false,
      visibleOnProduct: true,
      existingAttributeId: attrId,
    }]);
    setSelectedDbAttribute("");
  };

  const removeAttribute = (index: number) => {
    setAttributes(prev => prev.filter((_, i) => i !== index));
  };

  const addAttributeValue = (attrIndex: number) => {
    const attrName = attributes[attrIndex].name;
    const value = newAttributeValue[attrName]?.trim();
    if (value && !attributes[attrIndex].values.includes(value)) {
      setAttributes(prev => prev.map((attr, i) => 
        i === attrIndex ? { ...attr, values: [...attr.values, value] } : attr
      ));
      setNewAttributeValue(prev => ({ ...prev, [attrName]: "" }));
    }
  };

  const removeAttributeValue = (attrIndex: number, valueIndex: number) => {
    setAttributes(prev => prev.map((attr, i) => 
      i === attrIndex ? { ...attr, values: attr.values.filter((_, vi) => vi !== valueIndex) } : attr
    ));
  };

  const generateVariations = () => {
    const variationAttrs = attributes.filter(a => a.usedForVariations && a.values.length > 0);
    
    if (variationAttrs.length === 0) {
      toast({ title: "No attributes", description: "Add attribute values marked for variations first", variant: "destructive" });
      return;
    }

    // Normalize: treat "colour" same as "color"
    const isColorAttr = (name: string) => {
      const n = name.toLowerCase().trim();
      return n === "color" || n === "colour";
    };

    const colorAttr = variationAttrs.find(a => isColorAttr(a.name));
    const sizeAttrs = variationAttrs.filter(a => !isColorAttr(a.name));
    
    let sizeValues: (string | null)[] = [null];
    if (sizeAttrs.length > 0) {
      let combos: string[][] = [[]];
      for (const attr of sizeAttrs) {
        const newCombos: string[][] = [];
        for (const combo of combos) {
          for (const val of attr.values) {
            newCombos.push([...combo, val]);
          }
        }
        combos = newCombos;
      }
      sizeValues = combos.map(c => c.join(" / "));
    }
    
    const colors = colorAttr?.values.length ? colorAttr.values : [null];
    
    const newVariations: VariationData[] = [];
    
    sizeValues.forEach(size => {
      colors.forEach(color => {
        const existing = variations.find(v => v.size === size && v.color === color);
        if (existing) {
          newVariations.push(existing);
        } else {
          newVariations.push({
            sku: `${sku || "SKU"}-${size || ""}${color ? `-${color}` : ""}`.toUpperCase().replace(/[^A-Z0-9-]/g, "-").replace(/--+/g, "-"),
            size,
            color,
            color_image: "",
            gallery_images: [],
            stock_quantity: 0,
            shop_price: parseFloat(shopPrice) || 0,
            shop_regular_price: 0,
            shop_moq: parseInt(shopMoq) || 0,
            retail_price: parseFloat(retailPrice) || 0,
            retail_regular_price: 0,
            retail_moq: parseInt(retailMoq) || 0,
            guest_price: parseFloat(guestPrice) || 0,
            regular_price: parseFloat(regularPrice) || 0,
            weight: 0,
            is_active: true,
            sale_start_date: "",
            sale_end_date: "",
          });
        }
      });
    });
    
    setVariations(newVariations);
    toast({ title: "Variations Generated", description: `${newVariations.length} variations created` });
  };

  const updateVariation = (index: number, field: keyof VariationData, value: any) => {
    setVariations(prev => prev.map((v, i) => 
      i === index ? { ...v, [field]: value } : v
    ));
  };

  const removeVariation = (index: number) => {
    setVariations(prev => prev.filter((_, i) => i !== index));
  };

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags(prev => [...prev, newTag.trim()]);
      setNewTag("");
    }
  };

  const removeTag = (index: number) => {
    setTags(prev => prev.filter((_, i) => i !== index));
  };

  const toggleLabel = (label: string) => {
    setSelectedLabels(prev => 
      prev.includes(label) ? prev.filter(l => l !== label) : [...prev, label]
    );
  };

  const addCustomLabel = () => {
    if (customLabel.trim() && !selectedLabels.includes(customLabel.trim().toUpperCase())) {
      setSelectedLabels(prev => [...prev, customLabel.trim().toUpperCase()]);
      setCustomLabel("");
    }
  };

  const hasDraftableContent = () => {
    return Boolean(
      name.trim() ||
      shortDescription.trim() ||
      description.trim() ||
      sku.trim() ||
      categoryId ||
      featureImage ||
      galleryImages.length ||
      guestPrice ||
      regularPrice ||
      variations.length
    );
  };

  const handleCloseWithAutoDraft = async () => {
    if (isSaving) return;

    if (product) {
      onClose();
      return;
    }

    if (!hasDraftableContent() || !name.trim()) {
      onClose();
      return;
    }

    await handleSave(true);
  };

  const handleSave = async (asDraft = false) => {
    if (!name.trim()) {
      toast({ title: "Error", description: "Product name is required", variant: "destructive" });
      return;
    }

    if (productType === "simple" && !asDraft && !guestPrice) {
      toast({ title: "Error", description: "Sale Price is required", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      const allImages = featureImage ? [featureImage, ...galleryImages] : galleryImages;
      const isVariable = productType === "variable";

      const getMinPositive = (values: number[]) => {
        const valid = values.filter((v) => Number.isFinite(v) && v > 0);
        return valid.length > 0 ? Math.min(...valid) : 0;
      };

      const variableShopPrice = isVariable
        ? getMinPositive(variations.map((v) => Number(v.shop_price)))
        : 0;
      const variableRetailPrice = isVariable
        ? getMinPositive(variations.map((v) => Number(v.retail_price)))
        : 0;
      const variableGuestPrice = isVariable
        ? getMinPositive(variations.map((v) => Number(v.guest_price)))
        : 0;
      const variableRegularPrice = isVariable
        ? getMinPositive(variations.map((v) => Number(v.regular_price)))
        : 0;
      const variableShopMoq = isVariable
        ? getMinPositive(variations.map((v) => Number(v.shop_moq)))
        : 0;
      const variableRetailMoq = isVariable
        ? getMinPositive(variations.map((v) => Number(v.retail_moq)))
        : 0;

      const productData = {
        name,
        slug: slug || generateSlug(name),
        description: description || null,
        short_description: shortDescription || null,
        description_blocks: descriptionBlocks.filter((b) => b.image || b.text.trim()) as any,
        sku: sku || null,
        hsn_code: hsnCode.trim() || null,
        category_id: categoryId || null,
        brand_id: brandId || null,
        is_active: asDraft ? false : isActive,
        has_variations: isVariable,
        images: allImages,
        banner_image: bannerImage || null,
        features: selectedLabels,
        tags,
        shop_price: isVariable ? variableShopPrice : parseFloat(guestPrice) || 0,
        retail_price: isVariable ? variableRetailPrice : parseFloat(guestPrice) || 0,
        guest_price: isVariable
          ? (variableGuestPrice > 0 ? variableGuestPrice : variableRetailPrice)
          : parseFloat(guestPrice) || 0,
        regular_price: isVariable
          ? (variableRegularPrice > 0 ? variableRegularPrice : (variableGuestPrice > 0 ? variableGuestPrice : variableRetailPrice))
          : parseFloat(regularPrice) || 0,
        shop_moq: isVariable ? variableShopMoq : parseInt(retailMoq) || 0,
        retail_moq: isVariable ? variableRetailMoq : parseInt(retailMoq) || 0,
        stock_quantity: isVariable ? 0 : parseInt(stockQuantity) || 0,
        weight: parseFloat(weight) || 0,
        length: parseFloat(length) || 0,
        width: parseFloat(width) || 0,
        height: parseFloat(height) || 0,
        shipping_class: shippingClass,
        gst_enabled: gstEnabled && (parseFloat(gstPercentage) || 0) > 0,
        gst_percentage: gstEnabled ? (parseFloat(gstPercentage) || 0) : 0,
        gst_pricing_mode: gstPricingMode,
        tax_class: taxClass,
      };

      let productId = product?.id;

      if (product) {
        const { error } = await supabase
          .from("products")
          .update(productData)
          .eq("id", product.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("products")
          .insert(productData)
          .select()
          .single();
        if (error) throw error;
        productId = data.id;
      }

      // Handle variations
      if (isVariable && productId) {
        const existingIds = existingVariations.map(v => v.id);
        const currentIds = variations.filter(v => v.id).map(v => v.id);
        const toDelete = existingIds.filter(id => !currentIds.includes(id));
        
        if (toDelete.length > 0) {
          await supabase.from("product_variations").delete().in("id", toDelete);
        }

        for (const variation of variations) {
          const variationData: any = {
            product_id: productId,
            sku: variation.sku || null,
            size: variation.size,
            color: variation.color,
            color_image: variation.color_image || null,
            gallery_images: variation.gallery_images || [],
            stock_quantity: variation.stock_quantity,
            shop_price: variation.shop_price,
            shop_regular_price: variation.shop_regular_price,
            shop_moq: variation.shop_moq,
            retail_price: variation.retail_price,
            retail_regular_price: variation.retail_regular_price,
            retail_moq: variation.retail_moq,
            guest_price: variation.guest_price,
            regular_price: variation.regular_price,
            weight: variation.weight,
            is_active: variation.is_active,
            sale_start_date: variation.sale_start_date || null,
            sale_end_date: variation.sale_end_date || null,
          };

          if (variation.id) {
            await supabase
              .from("product_variations")
              .update(variationData)
              .eq("id", variation.id);
          } else {
            await supabase
              .from("product_variations")
              .insert(variationData);
          }
        }
      } else if (!isVariable && productId && existingVariations.length > 0) {
        await supabase
          .from("product_variations")
          .delete()
          .eq("product_id", productId);
      }

      // Save attributes to DB
      if (productId && attributes.length > 0) {
        // Delete old assignments
        await supabase.from("product_attribute_assignments").delete().eq("product_id", productId);
        
        for (const attr of attributes) {
          // Find or create attribute
          let attrId = attr.existingAttributeId;
          if (!attrId) {
            const slug = attr.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
            const { data: existing } = await supabase.from("product_attributes").select("id").eq("slug", slug).maybeSingle();
            if (existing) {
              attrId = existing.id;
            } else {
              const { data: created } = await supabase.from("product_attributes").insert({ name: attr.name, slug }).select("id").single();
              if (created) attrId = created.id;
            }
          }
          if (!attrId) continue;

          for (const val of attr.values) {
            // Find or create value
            const { data: existingVal } = await supabase.from("product_attribute_values").select("id").eq("attribute_id", attrId).eq("value", val).maybeSingle();
            let valId = existingVal?.id;
            if (!valId) {
              const { data: createdVal } = await supabase.from("product_attribute_values").insert({ attribute_id: attrId, value: val }).select("id").single();
              valId = createdVal?.id;
            }
            if (!valId) continue;

            await supabase.from("product_attribute_assignments").insert({
              product_id: productId,
              attribute_id: attrId,
              attribute_value_id: valId,
              used_for_variations: attr.usedForVariations,
              visible_on_product: attr.visibleOnProduct,
            });
          }
        }
      }

      toast({ 
        title: asDraft ? "Draft Saved" : (product ? "Product Updated" : "Product Created"),
        description: asDraft ? "Product saved as draft" : "Product has been saved successfully." 
      });
      onSave();
    } catch (error: any) {
      console.error("Error saving product:", error);
      toast({ 
        title: "Error", 
        description: error.message || "Failed to save product", 
        variant: "destructive" 
      });
    }
    setIsSaving(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-4"
    >
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={handleCloseWithAutoDraft}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-semibold">
          {product ? "Edit Product" : "Add New Product"}
        </h1>
      </div>

      <div className="grid lg:grid-cols-4 gap-4">
        {/* ==================== LEFT COLUMN - Main Content ==================== */}
        <div className="lg:col-span-3 space-y-4">
          
          {/* Product Name */}
          <Input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (!slug) setSlug(generateSlug(e.target.value));
            }}
            placeholder="Product name"
            className="text-lg h-12"
          />

          {/* Product Short Description */}
          <CollapsibleSection id="shortDesc" title="Product short description" openSections={openSections} toggleSection={toggleSection}>
            <Textarea
              value={shortDescription}
              onChange={(e) => setShortDescription(e.target.value)}
              placeholder="Enter brief product summary... (Line breaks and basic HTML are preserved as pasted)"
              rows={4}
              className="resize-y font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Text is shown exactly as pasted — line breaks, spacing and basic HTML tags (h1, h2, p, ul, ol, strong, em, br) are preserved.
            </p>
          </CollapsibleSection>

          {/* ==================== PRODUCT DATA TABS ==================== */}
          <Card className="shadow-sm border">
            <Collapsible open={openSections.productData} onOpenChange={() => toggleSection("productData")}>
              <CardHeader className="py-3 px-4 flex flex-row items-center justify-between hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <CollapsibleTrigger className="font-medium text-sm text-left">Product data —</CollapsibleTrigger>
                    <Select value={productType} onValueChange={(v: "simple" | "variable") => setProductType(v)}>
                      <SelectTrigger className="w-[140px] h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="simple">Simple product</SelectItem>
                        <SelectItem value="variable">Variable product</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <CollapsibleTrigger className="flex items-center gap-1 text-muted-foreground">
                    {openSections.productData ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </CollapsibleTrigger>
                </CardHeader>
              <CollapsibleContent>
                <div className="border-t">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <div className="flex">
                      {/* Vertical Tab List */}
                      <TabsList className="flex flex-col h-auto w-44 rounded-none border-r bg-muted/30 p-0">
                        <TabsTrigger 
                          value="general" 
                          className="justify-start w-full rounded-none border-l-2 border-transparent data-[state=active]:border-l-primary data-[state=active]:bg-background px-4 py-3"
                        >
                          <span className="w-2 h-2 rounded-full bg-primary mr-2" />
                          General
                        </TabsTrigger>
                        <TabsTrigger 
                          value="shipping" 
                          className="justify-start w-full rounded-none border-l-2 border-transparent data-[state=active]:border-l-primary data-[state=active]:bg-background px-4 py-3"
                        >
                          <span className="w-2 h-2 rounded-full bg-primary mr-2" />
                          Shipping
                        </TabsTrigger>
                        <TabsTrigger 
                          value="tax" 
                          className="justify-start w-full rounded-none border-l-2 border-transparent data-[state=active]:border-l-primary data-[state=active]:bg-background px-4 py-3"
                        >
                          <span className="w-2 h-2 rounded-full bg-primary mr-2" />
                          Tax / GST
                        </TabsTrigger>
                        <TabsTrigger 
                          value="attributes" 
                          className="justify-start w-full rounded-none border-l-2 border-transparent data-[state=active]:border-l-warning data-[state=active]:bg-background px-4 py-3"
                        >
                          <span className="w-2 h-2 rounded-full bg-warning mr-2" />
                          Attributes
                        </TabsTrigger>
                        {productType === "variable" && (
                          <TabsTrigger 
                            value="variations" 
                            className="justify-start w-full rounded-none border-l-2 border-transparent data-[state=active]:border-l-warning data-[state=active]:bg-background px-4 py-3"
                          >
                            <span className="w-2 h-2 rounded-full bg-warning mr-2" />
                            Variations ({variations.length})
                          </TabsTrigger>
                        )}
                      </TabsList>

                      {/* Tab Content */}
                      <div className="flex-1 p-4 min-h-[300px]">
                        {/* ========== GENERAL TAB ========== */}
                        <TabsContent value="general" className="m-0 space-y-6">
                          {productType === "variable" ? (
                            <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                              💡 For variable products, pricing and stock are set per variation in the <strong>Variations</strong> tab. Go to the <strong>Attributes</strong> tab first to define attributes, then generate variations.
                            </p>
                          ) : (
                          <>
                          <h3 className="font-semibold text-base border-b pb-2">Pricing & Stock</h3>
                          
                          <div className="grid md:grid-cols-2 gap-6">
                            {/* Pricing Block */}
                            <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-5 space-y-4">
                              <div className="flex items-center gap-2 text-primary font-semibold">
                                <Tag className="h-5 w-5" />
                                <span>Pricing</span>
                              </div>
                              <div className="space-y-4">
                                <div className="space-y-1.5">
                                  <Label className="text-sm">Regular Price / MRP (₹) *</Label>
                                  <Input
                                    type="number"
                                    value={regularPrice}
                                    onChange={(e) => setRegularPrice(e.target.value)}
                                    placeholder="0.00"
                                    className="border-primary/30 focus:border-primary"
                                  />
                                  <p className="text-xs text-muted-foreground">Shown as strikethrough MRP</p>
                                </div>
                                <div className="space-y-1.5">
                                  <Label className="text-sm">Sale Price (₹) *</Label>
                                  <Input
                                    type="number"
                                    value={guestPrice}
                                    onChange={(e) => setGuestPrice(e.target.value)}
                                    placeholder="0.00"
                                    className="border-primary/30 focus:border-primary"
                                  />
                                  <p className="text-xs text-muted-foreground">This is the actual selling price</p>
                                </div>
                                <div className="space-y-1.5">
                                  <Label className="text-sm">Minimum Order Qty (Optional)</Label>
                                  <Input
                                    type="number"
                                    value={retailMoq}
                                    onChange={(e) => setRetailMoq(e.target.value)}
                                    placeholder="1"
                                    className="border-primary/30 focus:border-primary"
                                  />
                                  <p className="text-xs text-muted-foreground">Leave empty for no minimum</p>
                                </div>
                              </div>
                            </div>

                            {/* Inventory Block */}
                            <div className="rounded-xl border-2 border-muted-foreground/20 bg-muted/30 p-5 space-y-4">
                              <div className="flex items-center gap-2 text-muted-foreground font-semibold">
                                <Boxes className="h-5 w-5" />
                                <span>Inventory</span>
                              </div>
                              <div className="space-y-4">
                                <div className="space-y-1.5">
                                  <Label className="text-sm">SKU (Stock Keeping Unit)</Label>
                                  <Input
                                    value={sku}
                                    onChange={(e) => setSku(e.target.value)}
                                    placeholder="SKU-001"
                                  />
                                </div>
                                <div className="space-y-1.5">
                                  <Label className="text-sm">HSN Code</Label>
                                  <Input
                                    value={hsnCode}
                                    onChange={(e) => setHsnCode(e.target.value)}
                                    placeholder="e.g. 850440"
                                  />
                                  <p className="text-xs text-muted-foreground">For GST-compliant billing</p>
                                </div>
                                <div className="space-y-1.5">
                                  <Label className="text-sm">Stock Quantity</Label>
                                  <Input
                                    type="number"
                                    value={stockQuantity}
                                    onChange={(e) => setStockQuantity(e.target.value)}
                                    placeholder="0"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                          </>
                          )}
                        </TabsContent>


                        {/* ========== SHIPPING TAB ========== */}
                        <TabsContent value="shipping" className="m-0 space-y-4">
                          <div className="space-y-2">
                            <Label>Weight (kg)</Label>
                            <Input
                              type="number"
                              value={weight}
                              onChange={(e) => setWeight(e.target.value)}
                              placeholder="0"
                              className="w-40"
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label>Dimensions (cm)</Label>
                            <div className="flex gap-2">
                              <Input
                                type="number"
                                value={length}
                                onChange={(e) => setLength(e.target.value)}
                                placeholder="Length"
                                className="w-28"
                              />
                              <Input
                                type="number"
                                value={width}
                                onChange={(e) => setWidth(e.target.value)}
                                placeholder="Width"
                                className="w-28"
                              />
                              <Input
                                type="number"
                                value={height}
                                onChange={(e) => setHeight(e.target.value)}
                                placeholder="Height"
                                className="w-28"
                              />
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <Label>Shipping class</Label>
                            <Select value={shippingClass} onValueChange={setShippingClass}>
                              <SelectTrigger className="w-64">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {SHIPPING_CLASSES.map(sc => (
                                  <SelectItem key={sc.value} value={sc.value}>{sc.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </TabsContent>

                        {/* ========== TAX TAB ========== */}
                        <TabsContent value="tax" className="m-0 space-y-4">
                          <div className="flex items-center justify-between rounded-lg border p-3">
                            <div>
                              <Label>Enable GST for this product</Label>
                              <p className="text-xs text-muted-foreground">Turn this off to hide GST text and calculate no GST.</p>
                            </div>
                            <Switch checked={gstEnabled} onCheckedChange={setGstEnabled} />
                          </div>

                          <div className="space-y-2">
                            <Label>GST Percentage (%)</Label>
                            <Input
                              type="number"
                              value={gstPercentage}
                              onChange={(e) => setGstPercentage(e.target.value)}
                              placeholder="0"
                              className="w-40"
                              disabled={!gstEnabled}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>GST Pricing Mode</Label>
                            <Select value={gstPricingMode} onValueChange={setGstPricingMode} disabled={!gstEnabled}>
                              <SelectTrigger className="w-64">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="inclusive">GST Inclusive</SelectItem>
                                <SelectItem value="exclusive">GST Exclusive</SelectItem>
                              </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">Inclusive means sale price already contains GST; exclusive adds GST at checkout.</p>
                          </div>
                          
                          <div className="space-y-2">
                            <Label>Tax class</Label>
                            <Select value={taxClass} onValueChange={setTaxClass}>
                              <SelectTrigger className="w-64">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {TAX_CLASSES.map(tc => (
                                  <SelectItem key={tc.value} value={tc.value}>{tc.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </TabsContent>

                        {/* ========== ATTRIBUTES TAB ========== */}
                          <TabsContent value="attributes" className="m-0 space-y-4">
                            <p className="text-sm text-muted-foreground mb-4">
                              Define attributes like Size, Color etc. Check "Used for variations" to make this a variable product with variants.
                            </p>

                            {attributes.map((attr, attrIndex) => (
                              <Collapsible
                                key={attr.name}
                                open={openAttribute === attr.name}
                                onOpenChange={(o) => setOpenAttribute(o ? attr.name : null)}
                              >
                                <div className="border rounded-lg overflow-hidden">
                                  <CollapsibleTrigger className="w-full flex items-center justify-between p-3 hover:bg-muted/30">
                                    <h4 className="font-semibold text-sm">{attr.name}</h4>
                                    <div className="flex items-center gap-2">
                                      <Badge variant="secondary" className="text-xs">{attr.values.length} values</Badge>
                                      <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        onClick={(e) => { e.stopPropagation(); removeAttribute(attrIndex); }}
                                        className="text-destructive hover:text-destructive h-7 w-7 p-0"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </Button>
                                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                  </CollapsibleTrigger>
                                  <CollapsibleContent>
                                    <div className="p-4 pt-0 space-y-3 border-t">
                                      <div className="flex gap-2">
                                        <Input
                                          value={newAttributeValue[attr.name] || ""}
                                          onChange={(e) => setNewAttributeValue(prev => ({ 
                                            ...prev, 
                                            [attr.name]: e.target.value 
                                          }))}
                                          placeholder={`Add value (e.g., ${attr.name === "Size" ? "S, M, L" : attr.name.toLowerCase() === "color" || attr.name.toLowerCase() === "colour" ? "Red, Blue" : "Value"})`}
                                          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addAttributeValue(attrIndex))}
                                        />
                                        <Button type="button" variant="outline" size="sm" onClick={() => addAttributeValue(attrIndex)}>
                                          <Plus className="h-4 w-4" />
                                        </Button>
                                      </div>

                                      {attr.values.length > 0 && (
                                        <div className="flex flex-wrap gap-2">
                                          {attr.values.map((value, valueIndex) => (
                                            <Badge key={value} variant="secondary" className="gap-1 py-1">
                                              {value}
                                              <button
                                                type="button"
                                                onClick={() => removeAttributeValue(attrIndex, valueIndex)}
                                                className="ml-1 hover:text-destructive"
                                              >
                                                ×
                                              </button>
                                            </Badge>
                                          ))}
                                        </div>
                                      )}

                                      <div className="flex items-center gap-6 pt-2 border-t">
                                        <div className="flex items-center gap-2">
                                          <Checkbox
                                            id={`variations-${attr.name}`}
                                            checked={attr.usedForVariations}
                                            onCheckedChange={(checked) => {
                                              setAttributes(prev => prev.map((a, i) => 
                                                i === attrIndex ? { ...a, usedForVariations: !!checked } : a
                                              ));
                                              if (checked) setProductType("variable");
                                            }}
                                          />
                                          <Label htmlFor={`variations-${attr.name}`} className="text-sm cursor-pointer">
                                            Used for variations
                                          </Label>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <Checkbox
                                            id={`visible-${attr.name}`}
                                            checked={attr.visibleOnProduct}
                                            onCheckedChange={(checked) => {
                                              setAttributes(prev => prev.map((a, i) => 
                                                i === attrIndex ? { ...a, visibleOnProduct: !!checked } : a
                                              ));
                                            }}
                                          />
                                          <Label htmlFor={`visible-${attr.name}`} className="text-sm cursor-pointer">
                                            Visible on product page
                                          </Label>
                                        </div>
                                      </div>
                                    </div>
                                  </CollapsibleContent>
                                </div>
                              </Collapsible>
                            ))}

                            {/* Reuse existing attribute from DB */}
                            {dbAttributes.filter(da => !attributes.find(a => a.name.toLowerCase() === da.name.toLowerCase())).length > 0 && (
                              <div className="flex gap-2 items-end bg-muted/30 p-3 rounded-lg">
                                <div className="flex-1 space-y-1">
                                  <Label className="text-xs font-medium">Select existing attribute</Label>
                                  <Select value={selectedDbAttribute} onValueChange={(v) => addDbAttribute(v)}>
                                    <SelectTrigger className="h-9">
                                      <SelectValue placeholder="Choose from existing attributes..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {dbAttributes
                                        .filter(da => !attributes.find(a => a.name.toLowerCase() === da.name.toLowerCase()))
                                        .map(da => (
                                          <SelectItem key={da.id} value={da.id}>
                                            {da.name} ({dbAttributeValues.filter(v => v.attribute_id === da.id).length} values)
                                          </SelectItem>
                                        ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                            )}

                            {/* Add New Attribute */}
                            <div className="flex gap-2 pt-2">
                              <Input
                                value={newAttributeName}
                                onChange={(e) => setNewAttributeName(e.target.value)}
                                placeholder="Or create new attribute..."
                                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addAttribute())}
                              />
                              <Button type="button" variant="outline" onClick={addAttribute}>
                                <Plus className="h-4 w-4 mr-1" /> Add
                              </Button>
                            </div>

                            {attributes.some(a => a.usedForVariations) && (
                              <p className="text-xs text-muted-foreground mt-4 bg-muted/50 p-3 rounded-lg">
                                💡 Attributes marked for variations detected. Go to the <strong>Variations</strong> tab and click "Generate Variations" to create product variants.
                              </p>
                            )}
                          </TabsContent>

                        {/* ========== VARIATIONS TAB ========== */}
                        {productType === "variable" && (
                          <TabsContent value="variations" className="m-0 space-y-4">
                            {variations.length === 0 ? (
                              <div className="text-center py-8 text-muted-foreground">
                                <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
                                <p>No variations yet.</p>
                                <p className="text-sm mb-4">Add attributes in the Attributes tab first, then generate variations.</p>
                                <Button type="button" onClick={generateVariations} variant="default">
                                  <RefreshCw className="h-4 w-4 mr-2" />
                                  Generate Variations from Attributes
                                </Button>
                              </div>
                            ) : (() => {
                              const isColorAttrCheck = (n: string) => {
                                const lower = n.toLowerCase().trim();
                                return lower === "color" || lower === "colour";
                              };
                              const hasColorAttr = attributes.some(a => isColorAttrCheck(a.name) && a.usedForVariations);
                              const hasSizeAttr = attributes.some(a => !isColorAttrCheck(a.name) && a.usedForVariations);
                              const hasBoth = hasColorAttr && hasSizeAttr;

                              // Group variations by color when both color+size exist
                              if (hasBoth) {
                                const colorGroups: Record<string, { indices: number[]; variations: VariationData[] }> = {};
                                variations.forEach((v, i) => {
                                  const color = v.color || "Default";
                                  if (!colorGroups[color]) colorGroups[color] = { indices: [], variations: [] };
                                  colorGroups[color].indices.push(i);
                                  colorGroups[color].variations.push(v);
                                });

                                return (
                                  <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                      <p className="text-sm text-muted-foreground">
                                        {Object.keys(colorGroups).length} color(s), {variations.length} total variation(s)
                                      </p>
                                      <Button type="button" onClick={generateVariations} variant="outline" size="sm">
                                        <RefreshCw className="h-3 w-3 mr-1" /> Regenerate
                                      </Button>
                                    </div>

                                    {Object.entries(colorGroups).map(([color, group]) => {
                                      const firstIdx = group.indices[0];
                                      const firstVar = group.variations[0];
                                      return (
                                        <Collapsible 
                                          key={color} 
                                          open={expandedColorGroup === color}
                                          onOpenChange={() => setExpandedColorGroup(expandedColorGroup === color ? null : color)}
                                        >
                                          <div className="border rounded-lg overflow-hidden">
                                            <CollapsibleTrigger className="w-full flex items-center justify-between p-3 bg-muted/20 hover:bg-muted/40">
                                              <div className="flex items-center gap-3">
                                                <Badge variant="default">{color}</Badge>
                                                <span className="text-xs text-muted-foreground">
                                                  {group.variations.length} size(s)
                                                </span>
                                              </div>
                                              {expandedColorGroup === color ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                                            </CollapsibleTrigger>
                                            <CollapsibleContent>
                                              <div className="p-4 border-t space-y-4">
                                                {/* Image upload ONCE per color */}
                                                <div className="grid grid-cols-2 gap-4">
                                                  <div className="space-y-1.5">
                                                    <Label className="text-xs font-semibold">Feature Image ({color})</Label>
                                                    <div className="max-w-[100px]">
                                                      <ImageUpload
                                                        value={firstVar.color_image}
                                                        onChange={(url) => {
                                                          // Apply same image to all size variations of this color
                                                          group.indices.forEach(idx => updateVariation(idx, "color_image", url));
                                                        }}
                                                        bucket="product-images"
                                                        compact
                                                      />
                                                    </div>
                                                  </div>
                                                  <div className="space-y-1.5">
                                                    <Label className="text-xs font-semibold">Gallery ({firstVar.gallery_images.length})</Label>
                                                    <div className="max-w-[200px]">
                                                      <GalleryUpload
                                                        value={firstVar.gallery_images}
                                                        onChange={(urls) => {
                                                          // Apply same gallery to all size variations of this color
                                                          group.indices.forEach(idx => updateVariation(idx, "gallery_images", urls));
                                                        }}
                                                        bucket="product-images"
                                                        maxImages={6}
                                                      />
                                                    </div>
                                                  </div>
                                                </div>

                                                {/* Size rows - compact table */}
                                                <div className="border rounded-lg overflow-x-auto">
                                                  <Table className="min-w-[600px]">
                                                    <TableHeader>
                                                      <TableRow className="bg-muted/30">
                                                        <TableHead className="text-xs py-2 w-20">Size</TableHead>
                                                        <TableHead className="text-xs py-2">MRP (₹)</TableHead>
                                                        <TableHead className="text-xs py-2">Sale (₹)</TableHead>
                                                        <TableHead className="text-xs py-2">MOQ</TableHead>
                                                        <TableHead className="text-xs py-2">Stock</TableHead>
                                                        <TableHead className="text-xs py-2">SKU</TableHead>
                                                        <TableHead className="text-xs py-2 w-16">Active</TableHead>
                                                        <TableHead className="text-xs py-2 w-10"></TableHead>
                                                      </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                      {group.indices.map((varIdx, si) => {
                                                        const v = variations[varIdx];
                                                        return (
                                                          <TableRow key={varIdx}>
                                                            <TableCell className="py-1.5">
                                                              <Badge variant="outline" className="text-xs">{v.size || "-"}</Badge>
                                                            </TableCell>
                                                            <TableCell className="py-1.5">
                                                              <Input
                                                                type="number"
                                                                value={v.regular_price}
                                                                onChange={(e) => {
                                                                  const val = parseFloat(e.target.value) || 0;
                                                                  updateVariation(varIdx, "regular_price", val);
                                                                  updateVariation(varIdx, "shop_regular_price", val);
                                                                  updateVariation(varIdx, "retail_regular_price", val);
                                                                }}
                                                                className="h-7 text-xs w-20"
                                                                placeholder="0"
                                                              />
                                                            </TableCell>
                                                            <TableCell className="py-1.5">
                                                              <Input
                                                                type="number"
                                                                value={v.guest_price}
                                                                onChange={(e) => {
                                                                  const val = parseFloat(e.target.value) || 0;
                                                                  updateVariation(varIdx, "guest_price", val);
                                                                  updateVariation(varIdx, "shop_price", val);
                                                                  updateVariation(varIdx, "retail_price", val);
                                                                }}
                                                                className="h-7 text-xs w-20"
                                                                placeholder="0"
                                                              />
                                                            </TableCell>
                                                            <TableCell className="py-1.5">
                                                              <Input
                                                                type="number"
                                                                value={v.retail_moq || ""}
                                                                onChange={(e) => {
                                                                  const val = parseInt(e.target.value) || 0;
                                                                  updateVariation(varIdx, "retail_moq", val);
                                                                  updateVariation(varIdx, "shop_moq", val);
                                                                }}
                                                                className="h-7 text-xs w-16"
                                                                placeholder="Optional"
                                                              />
                                                            </TableCell>
                                                            <TableCell className="py-1.5">
                                                              <Input
                                                                type="number"
                                                                value={v.stock_quantity}
                                                                onChange={(e) => updateVariation(varIdx, "stock_quantity", parseInt(e.target.value) || 0)}
                                                                className="h-7 text-xs w-16"
                                                                placeholder="0"
                                                              />
                                                            </TableCell>
                                                            <TableCell className="py-1.5">
                                                              <Input
                                                                value={v.sku}
                                                                onChange={(e) => updateVariation(varIdx, "sku", e.target.value)}
                                                                className="h-7 text-xs w-24"
                                                                placeholder="SKU"
                                                              />
                                                            </TableCell>
                                                            <TableCell className="py-1.5">
                                                              <Switch
                                                                checked={v.is_active}
                                                                onCheckedChange={(checked) => updateVariation(varIdx, "is_active", checked)}
                                                              />
                                                            </TableCell>
                                                            <TableCell className="py-1.5">
                                                              <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => removeVariation(varIdx)}
                                                                className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                                                              >
                                                                <Trash2 className="h-3 w-3" />
                                                              </Button>
                                                            </TableCell>
                                                          </TableRow>
                                                        );
                                                      })}
                                                    </TableBody>
                                                  </Table>
                                                </div>
                                              </div>
                                            </CollapsibleContent>
                                          </div>
                                        </Collapsible>
                                      );
                                    })}
                                  </div>
                                );
                              }

                              // Non-grouped: size-only or color-only variations
                              return (
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <p className="text-sm text-muted-foreground">
                                      {variations.length} variation(s) — Click to expand and edit
                                    </p>
                                    <Button type="button" onClick={generateVariations} variant="outline" size="sm">
                                      <RefreshCw className="h-3 w-3 mr-1" /> Regenerate
                                    </Button>
                                  </div>
                                  
                                  {variations.map((variation, index) => (
                                    <Collapsible 
                                      key={index} 
                                      open={expandedVariation === index}
                                      onOpenChange={() => setExpandedVariation(expandedVariation === index ? null : index)}
                                    >
                                      <div className="border rounded-lg overflow-hidden">
                                        <CollapsibleTrigger className="w-full flex items-center justify-between p-3 hover:bg-muted/30">
                                          <div className="flex items-center gap-3">
                                            <span className="font-medium">
                                              #{index + 1} — 
                                              {variation.size && <Badge variant="outline" className="ml-2">{variation.size}</Badge>}
                                              {variation.color && <Badge variant="outline" className="ml-1">{variation.color}</Badge>}
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <span className="text-xs text-muted-foreground">
                                              ₹{variation.guest_price} | Stock: {variation.stock_quantity}
                                            </span>
                                            {expandedVariation === index ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                          </div>
                                        </CollapsibleTrigger>
                                        
                                        <CollapsibleContent>
                                          <div className="p-4 border-t bg-muted/10 space-y-4">
                                            {/* Image upload for every variation (size-only or color-only) */}
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                              <div className="space-y-1.5">
                                                <Label className="text-xs">SKU</Label>
                                                <Input
                                                  value={variation.sku}
                                                  onChange={(e) => updateVariation(index, "sku", e.target.value)}
                                                  className="h-8 text-xs"
                                                />
                                              </div>
                                              <div className="space-y-1.5">
                                                <Label className="text-xs">Feature Image</Label>
                                                <div className="max-w-[80px]">
                                                  <ImageUpload
                                                    value={variation.color_image}
                                                    onChange={(url) => updateVariation(index, "color_image", url)}
                                                    bucket="product-images"
                                                    compact
                                                  />
                                                </div>
                                              </div>
                                              <div className="col-span-2 space-y-1.5">
                                                <Label className="text-xs">Gallery ({variation.gallery_images.length})</Label>
                                                <div className="max-w-[200px]">
                                                  <GalleryUpload
                                                    value={variation.gallery_images}
                                                    onChange={(urls) => updateVariation(index, "gallery_images", urls)}
                                                    bucket="product-images"
                                                    maxImages={6}
                                                  />
                                                </div>
                                              </div>
                                            </div>

                                            {/* Pricing & Inventory */}
                                            <div className="grid md:grid-cols-2 gap-4">
                                              <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-4 space-y-3">
                                                <div className="flex items-center gap-2 text-primary font-semibold text-sm">
                                                  <Tag className="h-4 w-4" />
                                                  <span>Pricing</span>
                                                </div>
                                                <div className="space-y-3">
                                                  <div className="space-y-1">
                                                    <Label className="text-xs">Regular Price / MRP (₹)</Label>
                                                    <Input
                                                      type="number"
                                                      value={variation.regular_price}
                                                      onChange={(e) => {
                                                        const val = parseFloat(e.target.value) || 0;
                                                        updateVariation(index, "regular_price", val);
                                                        updateVariation(index, "shop_regular_price", val);
                                                        updateVariation(index, "retail_regular_price", val);
                                                      }}
                                                      className="h-9 text-sm border-primary/30"
                                                      placeholder="0.00"
                                                    />
                                                  </div>
                                                  <div className="space-y-1">
                                                    <Label className="text-xs">Sale Price (₹) *</Label>
                                                    <Input
                                                      type="number"
                                                      value={variation.guest_price}
                                                      onChange={(e) => {
                                                        const val = parseFloat(e.target.value) || 0;
                                                        updateVariation(index, "guest_price", val);
                                                        updateVariation(index, "shop_price", val);
                                                        updateVariation(index, "retail_price", val);
                                                      }}
                                                      className="h-9 text-sm border-primary/30"
                                                      placeholder="0.00"
                                                    />
                                                  </div>
                                                  <div className="space-y-1">
                                                    <Label className="text-xs">Minimum Order Qty (Optional)</Label>
                                                    <Input
                                                      type="number"
                                                      value={variation.retail_moq || ""}
                                                      onChange={(e) => {
                                                        const val = parseInt(e.target.value) || 0;
                                                        updateVariation(index, "retail_moq", val);
                                                        updateVariation(index, "shop_moq", val);
                                                      }}
                                                      className="h-9 text-sm border-primary/30"
                                                      placeholder="Leave empty"
                                                    />
                                                  </div>
                                                </div>
                                              </div>

                                              <div className="rounded-xl border-2 border-muted-foreground/20 bg-muted/30 p-4 space-y-3">
                                                <div className="flex items-center gap-2 text-muted-foreground font-semibold text-sm">
                                                  <Boxes className="h-4 w-4" />
                                                  <span>Inventory</span>
                                                </div>
                                                <div className="space-y-3">
                                                  <div className="space-y-1">
                                                    <Label className="text-xs">Stock Quantity</Label>
                                                    <Input
                                                      type="number"
                                                      value={variation.stock_quantity}
                                                      onChange={(e) => updateVariation(index, "stock_quantity", parseInt(e.target.value) || 0)}
                                                      className="h-9 text-sm"
                                                      placeholder="0"
                                                    />
                                                  </div>
                                                  <div className="space-y-1">
                                                    <Label className="text-xs">Weight (kg)</Label>
                                                    <Input
                                                      type="number"
                                                      value={variation.weight}
                                                      onChange={(e) => updateVariation(index, "weight", parseFloat(e.target.value) || 0)}
                                                      className="h-9 text-sm"
                                                      placeholder="0"
                                                    />
                                                  </div>
                                                </div>
                                              </div>
                                            </div>

                                            {/* Offer Scheduling */}
                                            <div className="space-y-2 pt-2 border-t">
                                              <div className="flex items-center gap-2 mb-1">
                                                <Clock className="h-4 w-4 text-warning" />
                                                <span className="text-xs font-semibold text-foreground">Sale Price Scheduling</span>
                                              </div>
                                              <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-1">
                                                  <Label className="text-xs">Start Date</Label>
                                                  <Input
                                                    type="datetime-local"
                                                    value={variation.sale_start_date ? variation.sale_start_date.slice(0, 16) : ""}
                                                    onChange={(e) => updateVariation(index, "sale_start_date", e.target.value ? new Date(e.target.value).toISOString() : "")}
                                                    className="h-8 text-xs"
                                                  />
                                                </div>
                                                <div className="space-y-1">
                                                  <Label className="text-xs">End Date</Label>
                                                  <Input
                                                    type="datetime-local"
                                                    value={variation.sale_end_date ? variation.sale_end_date.slice(0, 16) : ""}
                                                    onChange={(e) => updateVariation(index, "sale_end_date", e.target.value ? new Date(e.target.value).toISOString() : "")}
                                                    className="h-8 text-xs"
                                                  />
                                                </div>
                                              </div>
                                            </div>

                                            <div className="flex items-center justify-between pt-2 border-t">
                                              <div className="flex items-center gap-2">
                                                <Switch
                                                  checked={variation.is_active}
                                                  onCheckedChange={(checked) => updateVariation(index, "is_active", checked)}
                                                />
                                                <Label className="text-sm">Active</Label>
                                              </div>
                                              <Button 
                                                variant="ghost" 
                                                size="sm" 
                                                onClick={() => removeVariation(index)}
                                                className="text-destructive hover:text-destructive"
                                              >
                                                <Trash2 className="h-4 w-4 mr-1" /> Remove
                                              </Button>
                                            </div>
                                          </div>
                                        </CollapsibleContent>
                                      </div>
                                    </Collapsible>
                                  ))}
                                </div>
                              );
                            })()}
                          </TabsContent>
                        )}
                      </div>
                    </div>
                  </Tabs>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </Card>

          {/* Product Description (Long) */}
          <CollapsibleSection id="longDesc" title="Product description" openSections={openSections} toggleSection={toggleSection}>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter detailed product description..."
              rows={8}
              className="resize-y font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground mt-2">
              Text is shown like pasted — headings, bullets, bold text and line breaks are preserved.
            </p>
          </CollapsibleSection>

          {/* Description Blocks - Image + Text grid */}
          <CollapsibleSection id="descBlocks" title="Description blocks (image + text)" openSections={{ ...openSections, descBlocks: true }} toggleSection={toggleSection}>
            <div className="space-y-3">
              {descriptionBlocks.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Add rows below the description. Each row has an image on the left and text on the right.
                  Leave either side blank to show only image or only text.
                </p>
              )}
              {descriptionBlocks.map((block, idx) => (
                <div key={idx} className="grid grid-cols-1 sm:grid-cols-2 gap-3 border border-border rounded-lg p-3 bg-muted/20">
                  <div className="space-y-1">
                    <Label className="text-xs">Image (optional)</Label>
                    <ImageUpload
                      value={block.image}
                      onChange={(url) =>
                        setDescriptionBlocks((prev) =>
                          prev.map((b, i) => (i === idx ? { ...b, image: url } : b))
                        )
                      }
                      bucket="product-images"
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Text (optional)</Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setDescriptionBlocks((prev) => prev.filter((_, i) => i !== idx))
                        }
                        className="h-6 px-2 text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <Textarea
                      value={block.text}
                      onChange={(e) =>
                        setDescriptionBlocks((prev) =>
                          prev.map((b, i) => (i === idx ? { ...b, text: e.target.value } : b))
                        )
                      }
                      placeholder="Write the text shown next to this image..."
                      rows={6}
                      className="resize-y text-sm"
                    />
                  </div>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setDescriptionBlocks((prev) => [...prev, { image: "", text: "" }])
                }
              >
                <Plus className="h-4 w-4 mr-1" /> Add block
              </Button>
            </div>
          </CollapsibleSection>
        </div>

        {/* ==================== RIGHT COLUMN - Sidebar ==================== */}
        <div className="space-y-4">
          
          {/* Publish Box */}
          <CollapsibleSection id="publish" title="Publish" openSections={openSections} toggleSection={toggleSection}>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleSave(true)}
                  disabled={isSaving}
                >
                  <Save className="h-4 w-4 mr-1" />
                  Draft
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleCloseWithAutoDraft}
                >
                  <Eye className="h-4 w-4 mr-1" />
                  Preview
                </Button>
              </div>
              
              <div className="text-sm space-y-1.5 py-2 border-y">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <span className="font-medium">{isActive ? "Active" : "Draft"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Visibility:</span>
                  <span className="font-medium">Public</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="active-toggle" className="text-sm">Active</Label>
                <Switch
                  id="active-toggle"
                  checked={isActive}
                  onCheckedChange={setIsActive}
                />
              </div>

              <Button 
                onClick={() => handleSave(false)}
                disabled={isSaving}
                className="w-full bg-primary"
              >
                {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {product ? "Update" : "Publish"}
              </Button>
            </div>
          </CollapsibleSection>

          {/* Product Image */}
          <CollapsibleSection id="productImage" title="Product image" openSections={openSections} toggleSection={toggleSection}>
            <ImageUpload
              value={featureImage}
              onChange={setFeatureImage}
              bucket="product-images"
            />
          </CollapsibleSection>

          {/* Product Gallery */}
          <CollapsibleSection id="gallery" title="Product gallery" openSections={openSections} toggleSection={toggleSection}>
            <GalleryUpload
              value={galleryImages}
              onChange={setGalleryImages}
              bucket="product-images"
              maxImages={10}
            />
          </CollapsibleSection>

          {/* Promotional Banner (shown on product page) */}
          <CollapsibleSection id="banner" title="Promotional banner" openSections={openSections} toggleSection={toggleSection}>
            <p className="text-xs text-muted-foreground mb-2">Wide banner shown on the product page. Recommended 1600×400.</p>
            <ImageUpload
              value={bannerImage}
              onChange={setBannerImage}
              bucket="product-images"
            />
          </CollapsibleSection>

          {/* Product Categories */}
          <CollapsibleSection id="categories" title="Product categories" openSections={openSections} toggleSection={toggleSection}>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {categories.length === 0 ? (
                <p className="text-sm text-muted-foreground">No categories available</p>
              ) : (
                categories.filter(cat => !cat.parent_id).map(cat => (
                  <div key={cat.id}>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={`cat-${cat.id}`}
                        checked={categoryId === cat.id}
                        onCheckedChange={(checked) => setCategoryId(checked ? cat.id : "")}
                      />
                      <Label htmlFor={`cat-${cat.id}`} className="text-sm cursor-pointer font-medium">{cat.name}</Label>
                    </div>
                    {/* Subcategories */}
                    {categories.filter(sub => sub.parent_id === cat.id).map(sub => (
                      <div key={sub.id} className="flex items-center gap-2 ml-5 mt-1">
                        <Checkbox
                          id={`cat-${sub.id}`}
                          checked={categoryId === sub.id}
                          onCheckedChange={(checked) => setCategoryId(checked ? sub.id : "")}
                        />
                        <Label htmlFor={`cat-${sub.id}`} className="text-sm cursor-pointer text-muted-foreground">— {sub.name}</Label>
                      </div>
                    ))}
                  </div>
                ))
              )}
            </div>
          </CollapsibleSection>

          {/* Brands */}
          <CollapsibleSection id="brands" title="Brands" openSections={openSections} toggleSection={toggleSection}>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {brands.length === 0 ? (
                <p className="text-sm text-muted-foreground">No brands available</p>
              ) : (
                brands.map(brand => (
                  <div key={brand.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`brand-${brand.id}`}
                      checked={brandId === brand.id}
                      onCheckedChange={(checked) => setBrandId(checked ? brand.id : "")}
                    />
                    <Label htmlFor={`brand-${brand.id}`} className="text-sm cursor-pointer flex items-center gap-2">
                      {brand.logo_url && (
                        <img src={brand.logo_url} alt={brand.name} className="w-5 h-5 object-contain" />
                      )}
                      {brand.name}
                    </Label>
                  </div>
                ))
              )}
            </div>
          </CollapsibleSection>

          {/* Product Tags */}
          <CollapsibleSection id="tags" title="Product tags" openSections={openSections} toggleSection={toggleSection}>
            <div className="space-y-3">
              <div className="rounded-md border bg-muted/40 p-3 space-y-2">
                <p className="text-xs font-medium">Homepage sections</p>
                <p className="text-xs text-muted-foreground">
                  Ye tag lagate hi product homepage ke us section me turant show ho jayega.
                </p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { tag: "bestseller", label: "Bestseller section" },
                    { tag: "mega saver packs", label: "Mega Saver Packs section" },
                    { tag: "trending", label: "Trending section" },
                  ].map(({ tag, label }) => {
                    const active = tags.some((t) => t.toLowerCase() === tag);
                    return (
                      <Button
                        key={tag}
                        type="button"
                        size="sm"
                        variant={active ? "default" : "outline"}
                        onClick={() =>
                          setTags((prev) =>
                            active ? prev.filter((t) => t.toLowerCase() !== tag) : [...prev, tag]
                          )
                        }
                      >
                        {active ? "✓ " : "+ "}
                        {label}
                      </Button>
                    );
                  })}
                </div>
              </div>
              <div className="flex gap-2">

                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="Add new tag"
                  className="text-sm"
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                />
                <Button type="button" variant="outline" size="icon" onClick={addTag}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {tags.map((tag, i) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                      <button onClick={() => removeTag(i)} className="ml-1 hover:text-destructive">×</button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </CollapsibleSection>

          {/* Product Labels */}
          <CollapsibleSection id="labels" title="Product Label" openSections={openSections} toggleSection={toggleSection}>
            <div className="space-y-3">
              <Input
                value={customLabel}
                onChange={(e) => setCustomLabel(e.target.value)}
                placeholder="e.g., TRENDING, BEST SELLER"
                className="text-sm"
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustomLabel())}
              />
              <div className="flex flex-wrap gap-1">
                {PRODUCT_LABELS.map(label => (
                  <Badge
                    key={label}
                    variant={selectedLabels.includes(label) ? "default" : "outline"}
                    className="cursor-pointer text-xs"
                    onClick={() => toggleLabel(label)}
                  >
                    {label}
                  </Badge>
                ))}
              </div>
              {selectedLabels.filter(l => !PRODUCT_LABELS.includes(l)).length > 0 && (
                <div className="flex flex-wrap gap-1 pt-2 border-t">
                  {selectedLabels.filter(l => !PRODUCT_LABELS.includes(l)).map(label => (
                    <Badge key={label} variant="default" className="text-xs">
                      {label}
                      <button onClick={() => toggleLabel(label)} className="ml-1">×</button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </CollapsibleSection>
        </div>
      </div>
    </motion.div>
  );
}
