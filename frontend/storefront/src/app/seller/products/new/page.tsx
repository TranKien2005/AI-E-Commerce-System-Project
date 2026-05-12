"use client";

import { useRouter } from "next/navigation";
import { Sparkles, UploadCloud } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { RoleShell, sellerLinks } from "@/components/RoleShell";
import { getAccessToken } from "@/lib/auth-client";
import { sellerCopy } from "@/lib/copy";
import type { Category } from "@/lib/api-types";
import { getCategories } from "@/lib/storefront-api";
import { addSellerProductImage, createSellerProduct } from "@/lib/seller-api";

export default function NewSellerProductPage() {
  const router = useRouter();
  const [token] = useState(() => getAccessToken());
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [imageUrls, setImageUrls] = useState("");
  const [primaryImageIndex, setPrimaryImageIndex] = useState("0");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    getCategories().then((data) => setCategories(data.items)).catch(() => setCategories([]));
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) return;
    setLoading(true);
    setError("");
    setSuccess("Đang tạo sản phẩm...");
    try {
      const product = await createSellerProduct(token, { name, description, price: Number(price), stock: Number(stock), category_id: categoryId ? Number(categoryId) : null });
      const urls = imageUrls.split("\n").map((value) => value.trim()).filter(Boolean);
      await Promise.all(urls.map((url, index) => addSellerProductImage(token, product.id, url, index === Number(primaryImageIndex))));
      setSuccess("Tạo sản phẩm thành công. Đang mở danh sách sản phẩm...");
      router.push("/seller/products");
    } catch (err) {
      setSuccess("");
      setError(err instanceof Error ? err.message : sellerCopy.common.error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <RoleShell title={sellerCopy.products.createTitle} eyebrow={sellerCopy.products.eyebrow} links={sellerLinks}>
      {!token ? <div className="premium-panel p-8 text-slate-500">{sellerCopy.shell.signInText}</div> : (
        <form onSubmit={handleSubmit} className="premium-panel grid gap-5 p-8">
          {error && <div className="rounded-2xl bg-rose-50 p-4 text-sm font-semibold text-rose-700">{error}</div>}
          {success && <div className="rounded-2xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">{success}</div>}
          <input value={name} onChange={(event) => setName(event.target.value)} className="soft-input" placeholder={sellerCopy.products.name} required />
          <textarea value={description} onChange={(event) => setDescription(event.target.value)} className="min-h-32 rounded-2xl border border-slate-200 bg-white/80 p-4 text-sm outline-none" placeholder={sellerCopy.products.description} required />
          <div className="grid gap-4 md:grid-cols-3">
            <input value={price} onChange={(event) => setPrice(event.target.value)} className="soft-input" placeholder={sellerCopy.products.price} type="number" min="0" step="0.01" required />
            <input value={stock} onChange={(event) => setStock(event.target.value)} className="soft-input" placeholder={sellerCopy.products.stock} type="number" min="0" required />
            <select value={categoryId} onChange={(event) => setCategoryId(event.target.value)} className="soft-input">
              <option value="">Không chọn danh mục</option>
              {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
          </div>
          <div className="grid gap-3 rounded-[1.5rem] border border-dashed border-slate-300 p-5 text-sm text-slate-500">
            <Sparkles />
            <p className="font-semibold text-slate-950">Product images</p>
            <textarea value={imageUrls} onChange={(event) => setImageUrls(event.target.value)} className="min-h-28 rounded-2xl border border-slate-200 bg-white/80 p-4 text-sm outline-none" placeholder="Paste one image URL per line" />
            <input value={primaryImageIndex} onChange={(event) => setPrimaryImageIndex(event.target.value)} className="soft-input" type="number" min="0" placeholder="Primary image line number, starting from 0" />
          </div>
          <button disabled={loading} className="premium-button w-max disabled:opacity-60"><UploadCloud size={18} /> {loading ? sellerCopy.products.creating : sellerCopy.products.createSubmit}</button>
        </form>
      )}
    </RoleShell>
  );
}
