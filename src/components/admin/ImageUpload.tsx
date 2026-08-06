import { useState, useRef, forwardRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ImagePlus, X, Upload, Loader2, Plus, Link, Images } from "lucide-react";
import { ImageLibraryDialog } from "@/components/admin/ImageLibraryDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { SignedImage } from "@/components/common/SignedImage";

// SVG intentionally excluded — can carry inline scripts / XSS.
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"];
const ALLOWED_EXT = ["png", "jpg", "jpeg", "webp", "gif"];
const MAX_SIZE_BYTES = 15 * 1024 * 1024;

function recordUploadEvent(payload: { ok: boolean; message: string; bucket: string; fileName?: string }) {
  try {
    const entry = { ...payload, at: new Date().toISOString() };
    const existing = JSON.parse(localStorage.getItem("admin_upload_log") || "[]");
    existing.unshift(entry);
    localStorage.setItem("admin_upload_log", JSON.stringify(existing.slice(0, 25)));
    if (!payload.ok) localStorage.setItem("admin_last_upload_error", JSON.stringify(entry));
    window.dispatchEvent(new CustomEvent("admin-upload-event", { detail: entry }));
  } catch {}
}

function validateFile(file: File): string | null {
  if (!file) return "No file selected";
  const ext = (file.name.split(".").pop() || "").toLowerCase();
  if (!ALLOWED_TYPES.includes(file.type) || !ALLOWED_EXT.includes(ext)) {
    return "Unsupported format. Use PNG, JPG, WEBP or GIF.";
  }
  if (file.size > MAX_SIZE_BYTES) return "File is larger than 15 MB.";
  if (file.size === 0) return "File is empty.";
  return null;
}

// Verifies a pasted URL is a well-formed http(s) link that actually loads as an image.
function checkImageUrl(url: string): Promise<string | null> {
  return new Promise((resolve) => {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return resolve("Enter a full URL starting with https://");
    }
    if (!/^https?:$/.test(parsed.protocol)) return resolve("Only http(s) image links are allowed.");
    const img = new Image();
    const timer = window.setTimeout(() => {
      img.src = "";
      resolve("Image link could not be loaded (timed out).");
    }, 8000);
    img.onload = () => { window.clearTimeout(timer); resolve(img.naturalWidth > 0 ? null : "That link is not a valid image."); };
    img.onerror = () => { window.clearTimeout(timer); resolve("That link is broken or is not an image."); };
    img.referrerPolicy = "no-referrer";
    img.src = url;
  });
}

// Build a safe storage path: no traversal, no user-supplied filename, normalized ext.
function buildSafePath(file: File): string {
  const ext = (file.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5) || "bin";
  const rand = (globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`).replace(/[^a-zA-Z0-9-]/g, "");
  return `products/${new Date().getUTCFullYear()}/${rand}.${ext}`;
}

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  bucket?: string;
  compact?: boolean;
}

export const ImageUpload = forwardRef<HTMLDivElement, ImageUploadProps>(function ImageUpload({ value, onChange, bucket = "product-images", compact = false }, ref) {
  const [isUploading, setIsUploading] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const invalid = validateFile(file);
    if (invalid) {
      toast({ title: "Invalid file", description: invalid, variant: "destructive" });
      recordUploadEvent({ ok: false, message: invalid, bucket, fileName: file.name });
      return;
    }

    setIsUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("Please sign in from Admin Login before uploading images.");
      }

      {
        const { data: roleRow } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "admin")
          .maybeSingle();
        if (!roleRow) throw new Error("Permission denied. Your account is not an admin.");
      }

      const filePath = buildSafePath(file);
      const fileName = filePath.split("/").pop() || "file";

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, { contentType: file.type, upsert: false, cacheControl: "3600" });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      onChange(publicUrl);
      toast({ title: "Image uploaded successfully" });
      recordUploadEvent({ ok: true, message: "Uploaded " + fileName, bucket, fileName });
    } catch (error: any) {
      console.error("Upload error:", error);
      const msg = error?.message || "Unknown upload error";
      const friendly = msg.includes("row-level security")
        ? "Permission denied. Please sign in again from Admin Login; if it still fails, ask an existing admin to grant your admin role."
        : msg.includes("Please sign in")
        ? "Please sign in from Admin Login before uploading images."
        : msg.includes("not an admin")
        ? "Permission denied. Your account is not an admin — ask an existing admin to grant access in Role Management."
        : msg.includes("Bucket not found")
        ? "Storage bucket not found. Open Admin → Image Diagnostics."
        : msg;
      toast({ title: "Upload failed", description: friendly, variant: "destructive" });
      recordUploadEvent({ ok: false, message: friendly, bucket, fileName: file.name });
    }
    setIsUploading(false);
  };

  const handleUrlSubmit = async () => {
    const url = urlInput.trim();
    if (!url) return;
    setIsUploading(true);
    const problem = await checkImageUrl(url);
    setIsUploading(false);
    if (problem) {
      toast({ title: "Invalid image URL", description: problem, variant: "destructive" });
      return;
    }
    onChange(url);
    setUrlInput("");
    setShowUrlInput(false);
  };

  const handleRemove = () => {
    onChange("");
  };

  if (compact) {
    return (
      <div className="space-y-2">
        {value ? (
          <div className="relative">
            <SignedImage 
              src={value} 
              alt="Upload" 
              className="w-full aspect-square object-cover rounded border"
            />
            <button
              type="button"
              onClick={handleRemove}
              className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-white rounded-full text-xs flex items-center justify-center"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <div className="flex gap-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="flex-1 h-8"
              title="Upload image"
            >
              {isUploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowUrlInput(true)}
              className="h-8"
              title="Add image by URL"
            >
              <Link className="h-3 w-3" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setLibraryOpen(true)}
              className="h-8"
              title="Choose from image library"
            >
              <Images className="h-3 w-3" />
            </Button>
          </div>
        )}
        <Dialog open={showUrlInput} onOpenChange={setShowUrlInput}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Add image by URL</DialogTitle>
            </DialogHeader>
            <div className="flex gap-2">
              <Input
                autoFocus
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://example.com/image.jpg"
                className="flex-1 h-10"
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleUrlSubmit())}
              />
              <Button type="button" onClick={handleUrlSubmit}>Add</Button>
            </div>
          </DialogContent>
        </Dialog>
        <ImageLibraryDialog
          open={libraryOpen}
          onOpenChange={setLibraryOpen}
          onSelect={(urls) => urls[0] && onChange(urls[0])}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {value ? (
        <div className="relative">
          <SignedImage 
            src={value} 
            alt="Product" 
            className="w-full max-h-48 object-contain rounded-lg border bg-secondary/20"
          />
          <button
            type="button"
            onClick={handleRemove}
            className="absolute top-2 right-2 w-6 h-6 bg-destructive text-white rounded-full flex items-center justify-center"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div 
          className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          {isUploading ? (
            <Loader2 className="h-8 w-8 mx-auto text-muted-foreground mb-2 animate-spin" />
          ) : (
            <ImagePlus className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          )}
          <p className="text-sm text-muted-foreground">
            {isUploading ? "Uploading..." : "Click to upload image"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">PNG, JPG, WEBP up to 15MB</p>
        </div>
      )}
      
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="flex-1"
        >
          <Upload className="h-4 w-4 mr-2" />
          Upload
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowUrlInput(!showUrlInput)}
          className="flex-1"
        >
          <Link className="h-4 w-4 mr-2" />
          URL
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setLibraryOpen(true)}
          className="flex-1"
        >
          <Images className="h-4 w-4 mr-2" />
          Library
        </Button>
      </div>

      {showUrlInput && (
        <div className="flex gap-2">
          <Input
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="Enter image URL"
            className="flex-1 h-10 text-sm"
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleUrlSubmit())}
          />
          <Button type="button" variant="outline" size="icon" onClick={handleUrlSubmit}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      )}

      <ImageLibraryDialog
        open={libraryOpen}
        onOpenChange={setLibraryOpen}
        onSelect={(urls) => urls[0] && onChange(urls[0])}
      />

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
});

interface GalleryUploadProps {
  value: string[];
  onChange: (urls: string[]) => void;
  bucket?: string;
  maxImages?: number;
}

export function GalleryUpload({ value, onChange, bucket = "product-images", maxImages = 10 }: GalleryUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const remainingSlots = maxImages - value.length;
    if (files.length > remainingSlots) {
      toast({ title: "Too many files", description: `You can only add ${remainingSlots} more images`, variant: "destructive" });
      return;
    }

    setIsUploading(true);
    const uploadedUrls: string[] = [];
    const failedMessages: string[] = [];

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({ title: "Upload failed", description: "Please sign in from Admin Login before uploading images.", variant: "destructive" });
      setIsUploading(false);
      return;
    }

    {
      const { data: roleRow } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (!roleRow) {
        toast({ title: "Upload failed", description: "Permission denied. Your account is not an admin — ask an existing admin to grant access in Role Management.", variant: "destructive" });
        setIsUploading(false);
        return;
      }
    }

    for (const file of files) {
      const invalid = validateFile(file);
      if (invalid) {
        failedMessages.push(`${file.name}: ${invalid}`);
        recordUploadEvent({ ok: false, message: invalid, bucket, fileName: file.name });
        continue;
      }

      try {
        const filePath = buildSafePath(file);
        const fileName = filePath.split("/").pop() || "file";

        const { error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(filePath, file, { contentType: file.type, upsert: false, cacheControl: "3600" });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from(bucket)
          .getPublicUrl(filePath);

        uploadedUrls.push(publicUrl);
        recordUploadEvent({ ok: true, message: "Uploaded " + fileName, bucket, fileName });
      } catch (error: any) {
        console.error("Upload error:", error);
        const msg = error?.message || "Unknown upload error";
        const friendly = msg.includes("row-level security")
          ? "Permission denied. Please sign in again from Admin Login; if it still fails, ask an existing admin to grant your admin role."
          : msg.includes("Bucket not found")
          ? "Storage bucket not found. Open Admin → Image Diagnostics."
          : msg;
        failedMessages.push(`${file.name}: ${friendly}`);
        recordUploadEvent({ ok: false, message: friendly, bucket, fileName: file.name });
      }
    }

    if (uploadedUrls.length > 0) {
      onChange([...value, ...uploadedUrls]);
      toast({ title: `${uploadedUrls.length} image(s) uploaded` });
    } else if (failedMessages.length > 0) {
      toast({ title: "Upload failed", description: failedMessages[0], variant: "destructive" });
    }
    setIsUploading(false);
  };

  const handleUrlAdd = async () => {
    const url = urlInput.trim();
    if (!url || value.length >= maxImages) return;
    setIsUploading(true);
    const problem = await checkImageUrl(url);
    setIsUploading(false);
    if (problem) {
      toast({ title: "Invalid image URL", description: problem, variant: "destructive" });
      return;
    }
    onChange([...value, url]);
    setUrlInput("");
  };

  const handleRemove = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading || value.length >= maxImages}
          className="flex-1"
        >
          {isUploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
          Upload
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowUrlInput(!showUrlInput)}
          disabled={value.length >= maxImages}
          className="flex-1"
        >
          <Link className="h-4 w-4 mr-2" />
          URL
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setLibraryOpen(true)}
          disabled={value.length >= maxImages}
          className="flex-1"
        >
          <Images className="h-4 w-4 mr-2" />
          Library
        </Button>
      </div>

      <ImageLibraryDialog
        open={libraryOpen}
        onOpenChange={setLibraryOpen}
        multiple
        maxSelect={maxImages - value.length}
        onSelect={(urls) => onChange([...value, ...urls].slice(0, maxImages))}
      />

      {showUrlInput && (
        <div className="flex gap-2">
          <Input
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="Gallery image URL"
            className="flex-1 h-10 text-sm"
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleUrlAdd())}
          />
          <Button type="button" variant="outline" size="icon" onClick={handleUrlAdd}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      )}

      {value.length > 0 && (
      <div className="grid grid-cols-4 gap-1.5">
          {value.map((img, i) => (
            <div key={i} className="relative group">
              <SignedImage src={img} alt="" className="w-full aspect-square rounded object-cover border max-w-[48px]" />
              <button
                type="button"
                onClick={() => handleRemove(i)}
                className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground">{value.length}/{maxImages} images</p>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}
