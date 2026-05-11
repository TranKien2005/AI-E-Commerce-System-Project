import { Save, Sparkles } from "lucide-react";
import { RoleShell, sellerLinks } from "@/components/RoleShell";
import { products } from "@/lib/demo-data";

export default async function EditSellerProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = products.find((item) => item.id === Number(id)) ?? products[0];
  return <RoleShell title="Sửa sản phẩm" eyebrow="Cập nhật sản phẩm" links={sellerLinks}><form className="premium-panel grid gap-5 p-8"><input className="soft-input" defaultValue={product.name} /><textarea className="min-h-32 rounded-2xl border border-slate-200 bg-white/80 p-4 text-sm outline-none" defaultValue={product.description} /><div className="grid gap-4 md:grid-cols-3"><input className="soft-input" defaultValue={product.price} /><input className="soft-input" defaultValue={product.stock} /><input className="soft-input" defaultValue={product.category} /></div><button type="button" className="premium-button-light w-max"><Sparkles size={18} /> Gợi ý mô tả bằng AI</button><button className="premium-button w-max"><Save size={18} /> Lưu thay đổi</button></form></RoleShell>;
}
