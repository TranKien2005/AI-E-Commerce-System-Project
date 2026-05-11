import Image from "next/image";
import Link from "next/link";
import { Edit, Plus, Trash2 } from "lucide-react";
import { RoleShell, sellerLinks } from "@/components/RoleShell";
import { formatVnd, products } from "@/lib/demo-data";

export default function SellerProductsPage() {
  return <RoleShell title="Sản phẩm của shop" eyebrow="Danh mục kinh doanh" links={sellerLinks}><div className="mb-5 flex justify-end"><Link href="/seller/products/new" className="premium-button"><Plus size={18} /> Thêm sản phẩm</Link></div><div className="premium-panel overflow-hidden"><table className="w-full text-left text-sm"><thead className="bg-white/70 text-xs uppercase tracking-[0.18em] text-slate-400"><tr><th className="p-5">Sản phẩm</th><th>Giá</th><th>Tồn kho</th><th>Danh mục</th><th></th></tr></thead><tbody>{products.map((product)=><tr key={product.id} className="border-t border-slate-200/70"><td className="flex items-center gap-4 p-5"><span className="relative h-14 w-14 overflow-hidden rounded-2xl bg-slate-100"><Image src={product.image} alt={product.name} fill className="object-cover" /></span><span className="font-semibold text-slate-950">{product.name}</span></td><td>{formatVnd(product.price)}</td><td>{product.stock}</td><td>{product.category}</td><td><div className="flex gap-2"><Link href={`/seller/products/${product.id}/edit`} className="premium-button-light px-3 py-2"><Edit size={15} /></Link><button className="premium-button-light px-3 py-2"><Trash2 size={15} /></button></div></td></tr>)}</tbody></table></div></RoleShell>;
}
