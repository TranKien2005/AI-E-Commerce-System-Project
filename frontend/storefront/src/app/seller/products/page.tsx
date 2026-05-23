"use client";

import Image from "next/image";
import Link from "next/link";
import { Edit, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { RoleShell, sellerLinks } from "@/components/RoleShell";
import { clearTokensIfUnauthorized, getAccessToken } from "@/lib/auth-client";
import { sellerCopy } from "@/lib/copy";
import { formatVnd } from "@/lib/format";
import { deleteSellerProduct, getSellerProducts } from "@/lib/seller-api";
import type { SellerProduct } from "@/lib/seller-types";

export default function SellerProductsPage() {
  const [token, setToken] = useState(() => getAccessToken());
  const [products, setProducts] = useState<SellerProduct[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(() => Boolean(token));

  const loadProducts = async () => {
    if (!token) return;
    const data = await getSellerProducts(token, { page_size: 50 });
    setProducts(data.items);
  };

  useEffect(() => {
    if (!token) return;
    getSellerProducts(token, { page_size: 50 })
      .then((data) => setProducts(data.items))
      .catch((err) => {
        if (clearTokensIfUnauthorized(err)) setToken(null);
        setError(err instanceof Error ? err.message : sellerCopy.common.error);
      })
      .finally(() => setLoading(false));
  }, [token]);

  const handleDelete = async (id: number) => {
    if (!token) return;
    setError("");
    try {
      await deleteSellerProduct(token, id);
      await loadProducts();
    } catch (err) {
      setError(err instanceof Error ? err.message : sellerCopy.common.error);
    }
  };

  return (
    <RoleShell title={sellerCopy.products.title} eyebrow={sellerCopy.products.eyebrow} links={sellerLinks}>
      {!token ? <Panel>{sellerCopy.shell.signInText}</Panel> : loading ? <Panel>{sellerCopy.common.loading}</Panel> : (
        <>
          {error && <div className="mb-5 rounded-2xl bg-rose-50 p-4 text-sm font-semibold text-rose-700">{error}</div>}
          <div className="mb-5 flex justify-end"><Link href="/seller/products/new" className="premium-button"><Plus size={18} /> {sellerCopy.common.addProduct}</Link></div>
          <div className="premium-panel overflow-hidden">
            {products.length === 0 ? <div className="p-8 text-sm text-slate-500">{sellerCopy.products.empty}</div> : (
              <table className="w-full text-left text-sm">
                <thead className="bg-white/70 text-xs uppercase tracking-[0.18em] text-slate-400"><tr><th className="p-5">{sellerCopy.products.name}</th><th>{sellerCopy.products.price}</th><th>{sellerCopy.products.stock}</th><th>{sellerCopy.products.category}</th><th></th></tr></thead>
                <tbody>{products.map((product) => {
                  const image = product.images.find((item) => item.is_primary) ?? product.images[0];
                  return <tr key={product.id} className="border-t border-slate-200/70"><td className="flex items-center gap-4 p-5"><span className="relative h-14 w-14 overflow-hidden rounded-2xl bg-slate-100">{image && <Image src={image.url} alt={product.name} fill className="object-cover" />}</span><span className="font-semibold text-slate-950">{product.name}</span></td><td>{formatVnd(product.price)}</td><td>{product.stock}</td><td>{product.category_id ?? "—"}</td><td><div className="flex gap-2"><Link href={`/seller/products/${product.id}/edit`} className="premium-button-light px-3 py-2" aria-label={`${sellerCopy.common.edit} ${product.name}`}><Edit size={15} /></Link><button type="button" onClick={() => void handleDelete(product.id)} className="premium-button-light px-3 py-2" aria-label={`${sellerCopy.common.delete} ${product.name}`}><Trash2 size={15} /></button></div></td></tr>;
                })}</tbody>
              </table>
            )}
          </div>
        </>
      )}
    </RoleShell>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return <div className="premium-panel p-8 text-slate-500">{children}</div>;
}
