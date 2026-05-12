"use client";

import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { Save, Trash2 } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { RoleShell, sellerLinks } from "@/components/RoleShell";
import { clearTokensIfUnauthorized, getAccessToken } from "@/lib/auth-client";
import { sellerCopy } from "@/lib/copy";
import { addSellerProductImage, deleteSellerProductImage, getSellerProducts, setSellerProductImagePrimary, updateSellerProduct } from "@/lib/seller-api";
import type { SellerProduct } from "@/lib/seller-types";
import { safeImageUrl } from "@/lib/image";

export default function EditSellerProductPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [token, setToken] = useState(() => getAccessToken());
  const [product, setProduct] = useState<SellerProduct | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [newImageUrl, setNewImageUrl] = useState("");
  const [newImagePrimary, setNewImagePrimary] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(() => Boolean(token));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!token) return;
    getSellerProducts(token, { page_size: 100 })
      .then((data) => {
        const item = data.items.find((product) => product.id === Number(params.id)) ?? null;
        setProduct(item);
        if (item) {
          setName(item.name);
          setDescription(item.description);
          setPrice(String(item.price));
          setStock(String(item.stock));
          setCategoryId(item.category_id ? String(item.category_id) : "");
        }
      })
      .catch((err) => {
        if (clearTokensIfUnauthorized(err)) setToken(null);
        setError(err instanceof Error ? err.message : sellerCopy.common.error);
      })
      .finally(() => setLoading(false));
  }, [params.id, token]);

  const reloadProduct = async () => {
    if (!token) return;
    const data = await getSellerProducts(token, { page_size: 100 });
    const item = data.items.find((product) => product.id === Number(params.id)) ?? null;
    setProduct(item);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) return;
    setSaving(true);
    setError("");
    try {
      await updateSellerProduct(token, params.id, { name, description, price: Number(price), stock: Number(stock), category_id: categoryId ? Number(categoryId) : null });
      router.push("/seller/products");
    } catch (err) {
      setError(err instanceof Error ? err.message : sellerCopy.common.error);
    } finally {
      setSaving(false);
    }
  };

  const addImage = async () => {
    if (!token || !newImageUrl.trim()) return;
    setError("");
    try {
      await addSellerProductImage(token, params.id, newImageUrl.trim(), newImagePrimary);
      setNewImageUrl("");
      setNewImagePrimary(false);
      await reloadProduct();
    } catch (err) {
      setError(err instanceof Error ? err.message : sellerCopy.common.error);
    }
  };

  const setPrimary = async (imageId: number) => {
    if (!token) return;
    await setSellerProductImagePrimary(token, imageId, true);
    await reloadProduct();
  };

  const deleteImage = async (imageId: number) => {
    if (!token) return;
    await deleteSellerProductImage(token, imageId);
    await reloadProduct();
  };

  return (
    <RoleShell title={sellerCopy.products.editTitle} eyebrow={sellerCopy.products.eyebrow} links={sellerLinks}>
      {!token ? <Panel>{sellerCopy.shell.signInText}</Panel> : loading ? <Panel>{sellerCopy.common.loading}</Panel> : !product ? <Panel>{sellerCopy.products.notFound}</Panel> : (
        <form onSubmit={handleSubmit} className="premium-panel grid gap-5 p-8">
          {error && <div className="rounded-2xl bg-rose-50 p-4 text-sm font-semibold text-rose-700">{error}</div>}
          <input value={name} onChange={(event) => setName(event.target.value)} className="soft-input" placeholder={sellerCopy.products.name} required />
          <textarea value={description} onChange={(event) => setDescription(event.target.value)} className="min-h-32 rounded-2xl border border-slate-200 bg-white/80 p-4 text-sm outline-none" placeholder={sellerCopy.products.description} required />
          <div className="grid gap-4 md:grid-cols-3"><input value={price} onChange={(event) => setPrice(event.target.value)} className="soft-input" placeholder={sellerCopy.products.price} type="number" min="0" step="0.01" required /><input value={stock} onChange={(event) => setStock(event.target.value)} className="soft-input" placeholder={sellerCopy.products.stock} type="number" min="0" required /><input value={categoryId} onChange={(event) => setCategoryId(event.target.value)} className="soft-input" placeholder={sellerCopy.products.categoryId} type="number" min="1" /></div>
          <section className="rounded-[1.5rem] bg-slate-50 p-5">
            <p className="mb-3 text-sm font-semibold text-slate-950">Product images</p>
            <div className="grid gap-3 md:grid-cols-3">
              {product.images.map((image) => (
                <div key={image.id} className="rounded-2xl bg-white p-3 shadow-sm">
                  <div className="relative aspect-square overflow-hidden rounded-xl bg-slate-100"><Image src={safeImageUrl(image.url)} alt="Product image" fill sizes="180px" className="object-cover" /></div>
                  <p className="mt-2 line-clamp-1 text-xs text-slate-500">{image.url}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" onClick={() => void setPrimary(image.id)} disabled={image.is_primary} className="rounded-full bg-slate-950 px-3 py-1 text-xs font-bold text-white disabled:bg-emerald-600">{image.is_primary ? "Primary" : "Set primary"}</button>
                    <button type="button" onClick={() => void deleteImage(image.id)} className="rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-rose-700"><Trash2 size={12} /> Delete</button>
                  </div>
                </div>
              ))}
              {product.images.length === 0 && <div className="rounded-2xl bg-white p-4 text-sm text-slate-500">No images yet.</div>}
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto_auto] md:items-center">
              <input value={newImageUrl} onChange={(event) => setNewImageUrl(event.target.value)} className="soft-input" placeholder="Image URL" />
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-600"><input type="checkbox" checked={newImagePrimary} onChange={(event) => setNewImagePrimary(event.target.checked)} /> Primary</label>
              <button type="button" onClick={() => void addImage()} className="premium-button-light px-4 py-3">Add image</button>
            </div>
          </section>
          <button disabled={saving} className="premium-button w-max disabled:opacity-60"><Save size={18} /> {saving ? sellerCopy.products.updating : sellerCopy.products.updateSubmit}</button>
        </form>
      )}
    </RoleShell>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return <div className="premium-panel p-8 text-slate-500">{children}</div>;
}
