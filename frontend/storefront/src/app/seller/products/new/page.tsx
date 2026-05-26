"use client";

import { useRouter } from "next/navigation";
import { Sparkles, UploadCloud, ChevronDown } from "lucide-react";
import { FormEvent, useEffect, useState, useRef } from "react";
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

  // --- States for Custom Searchable Combobox ---
  const [categorySearch, setCategorySearch] = useState("");
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getCategories()
      .then((data) => setCategories(data.items))
      .catch(() => setCategories([]));
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsCategoryOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Super fast client-side filtering (Limits render to 50 items to prevent lag)
  const filteredCategories = categories
    .filter((c) => c.name.toLowerCase().includes(categorySearch.toLowerCase()))
    .slice(0, 50);

  const handleSelectCategory = (category: Category) => {
    setCategoryId(String(category.id));
    setCategorySearch(category.name);
    setIsCategoryOpen(false);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) return;
    setLoading(true);
    setError("");
    setSuccess("Đang tạo sản phẩm...");
    try {
      const product = await createSellerProduct(token, {
        name,
        description,
        price: Number(price),
        stock: Number(stock),
        category_id: categoryId ? Number(categoryId) : null,
      });
      const urls = imageUrls
        .split("\n")
        .map((value) => value.trim())
        .filter(Boolean);
      await Promise.all(
        urls.map((url, index) =>
          addSellerProductImage(token, product.id, url, index === Number(primaryImageIndex))
        )
      );
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
    <RoleShell
      title={sellerCopy.products.createTitle}
      eyebrow={sellerCopy.products.eyebrow}
      links={sellerLinks}
    >
      {!token ? (
        <div className="premium-panel p-8 text-slate-500">
          {sellerCopy.shell.signInText}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="premium-panel grid gap-5 p-8">
          {error && (
            <div className="rounded-2xl bg-rose-50 p-4 text-sm font-semibold text-rose-700">
              {error}
            </div>
          )}
          {success && (
            <div className="rounded-2xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
              {success}
            </div>
          )}
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="soft-input"
            placeholder={sellerCopy.products.name}
            required
          />
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="min-h-32 rounded-2xl border border-slate-200 bg-white/80 p-4 text-sm outline-none"
            placeholder={sellerCopy.products.description}
            required
          />
          
          <div className="grid gap-4 md:grid-cols-3">
            <input
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              className="soft-input"
              placeholder={sellerCopy.products.price}
              type="number"
              min="0"
              step="0.01"
              required
            />
            <input
              value={stock}
              onChange={(event) => setStock(event.target.value)}
              className="soft-input"
              placeholder={sellerCopy.products.stock}
              type="number"
              min="0"
              required
            />

            {/* --- Start: Searchable Combobox --- */}
            <div className="relative" ref={dropdownRef}>
              <div className="relative">
                <input
                  type="text"
                  value={categorySearch}
                  onChange={(e) => {
                    setCategorySearch(e.target.value);
                    setIsCategoryOpen(true);
                    if (e.target.value === "") setCategoryId(""); // Clear ID if text is cleared
                  }}
                  onFocus={() => setIsCategoryOpen(true)}
                  className="soft-input w-full pr-10"
                  placeholder="Tìm / Chọn danh mục..."
                  required
                />
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              </div>

              {isCategoryOpen && (
                <ul className="absolute z-10 mt-1 max-h-52 w-full overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
                  {filteredCategories.length > 0 ? (
                    filteredCategories.map((category) => (
                      <li
                        key={category.id}
                        onClick={() => handleSelectCategory(category)}
                        className={`cursor-pointer rounded-xl px-4 py-2.5 text-sm transition-colors ${
                          categoryId === String(category.id)
                            ? "bg-slate-950 text-white font-medium"
                            : "text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        {category.name}
                      </li>
                    ))
                  ) : (
                    <li className="px-4 py-3 text-sm text-slate-500 text-center">
                      Không tìm thấy danh mục
                    </li>
                  )}
                </ul>
              )}
            </div>
            {/* --- End: Searchable Combobox --- */}
          </div>

          <div className="grid gap-3 rounded-[1.5rem] border border-dashed border-slate-300 p-5 text-sm text-slate-500">
            <Sparkles />
            <p className="font-semibold text-slate-950">Product images</p>
            <textarea
              value={imageUrls}
              onChange={(event) => setImageUrls(event.target.value)}
              className="min-h-28 rounded-2xl border border-slate-200 bg-white/80 p-4 text-sm outline-none"
              placeholder="Paste one image URL per line"
            />
            <input
              value={primaryImageIndex}
              onChange={(event) => setPrimaryImageIndex(event.target.value)}
              className="soft-input"
              type="number"
              min="0"
              placeholder="Primary image line number, starting from 0"
            />
          </div>
          <button
            disabled={loading}
            className="premium-button w-max disabled:opacity-60"
          >
            <UploadCloud size={18} />{" "}
            {loading ? sellerCopy.products.creating : sellerCopy.products.createSubmit}
          </button>
        </form>
      )}
    </RoleShell>
  );
}