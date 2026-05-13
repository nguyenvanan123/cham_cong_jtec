import { useState, useRef, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Link } from "wouter";
import {
  ArrowLeft, Upload, CheckCircle, RefreshCw, Send,
  User, CreditCard, Banknote, Users, ImagePlus, X
} from "lucide-react";

function ImageUploadBox({
  label, file, onChange, preview, onClear
}: {
  label: string;
  file: File | null;
  onChange: (f: File) => void;
  preview: string | null;
  onClear: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div>
      <label className="text-sm font-medium text-muted-foreground mb-1.5 block">{label}</label>
      {preview ? (
        <div className="relative rounded-xl overflow-hidden border border-border aspect-video bg-muted">
          <img src={preview} alt={label} className="w-full h-full object-contain" />
          <button
            type="button"
            onClick={onClear}
            className="absolute top-2 right-2 w-7 h-7 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center transition"
          >
            <X size={14} className="text-white" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => ref.current?.click()}
          className="w-full aspect-video rounded-xl border-2 border-dashed border-primary/30 hover:border-primary/60 bg-accent/30 hover:bg-accent/50 flex flex-col items-center justify-center gap-2 transition group"
        >
          <div className="w-10 h-10 rounded-xl bg-primary/10 group-hover:bg-primary/20 flex items-center justify-center transition">
            <ImagePlus size={20} className="text-primary" />
          </div>
          <span className="text-sm text-muted-foreground">Bấm để chọn ảnh</span>
          <span className="text-xs text-muted-foreground/60">JPG, PNG, HEIC</span>
        </button>
      )}
      <input
        ref={ref}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => {
          const f = e.target.files?.[0];
          if (f) onChange(f);
        }}
      />
    </div>
  );
}

export default function UngTuyen() {
  const [fullName, setFullName] = useState("");
  const [referrerName, setReferrerName] = useState("");
  const [referrerId, setReferrerId] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [backFile, setBackFile] = useState<File | null>(null);
  const [frontPreview, setFrontPreview] = useState<string | null>(null);
  const [backPreview, setBackPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(3);
  const [shopeeLink, setShopeeLink] = useState<string | null>(null);

  useEffect(() => {
    supabase.from("configs").select("value").eq("key", "shopee_link").single().then(({ data }) => {
      if (data) setShopeeLink(data.value);
    });
  }, []);

  const handleFront = (f: File) => {
    setFrontFile(f);
    setFrontPreview(URL.createObjectURL(f));
  };
  const handleBack = (f: File) => {
    setBackFile(f);
    setBackPreview(URL.createObjectURL(f));
  };
  const clearFront = () => { setFrontFile(null); setFrontPreview(null); };
  const clearBack = () => { setBackFile(null); setBackPreview(null); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!fullName.trim()) { setError("Vui lòng nhập họ tên."); return; }
    if (!frontFile || !backFile) { setError("Vui lòng chọn cả 2 mặt CCCD."); return; }
    if (!bankAccount.trim()) { setError("Vui lòng nhập số tài khoản ngân hàng."); return; }

    setSubmitting(true);

    // Upload ảnh mặt trước
    const frontName = `${Date.now()}_front_${frontFile.name}`;
    const { error: frontErr } = await supabase.storage
      .from("application_docs")
      .upload(frontName, frontFile, { contentType: frontFile.type });
    if (frontErr) { setError("Lỗi upload ảnh CCCD mặt trước: " + frontErr.message); setSubmitting(false); return; }

    // Upload ảnh mặt sau
    const backName = `${Date.now()}_back_${backFile.name}`;
    const { error: backErr } = await supabase.storage
      .from("application_docs")
      .upload(backName, backFile, { contentType: backFile.type });
    if (backErr) { setError("Lỗi upload ảnh CCCD mặt sau: " + backErr.message); setSubmitting(false); return; }

    // Lưu vào DB
    const { error: insertErr } = await supabase.from("job_applications").insert({
      full_name: fullName.trim(),
      referrer_name: referrerName.trim(),
      referrer_id: referrerId.trim(),
      bank_account: bankAccount.trim(),
      cccd_front_url: frontName,
      cccd_back_url: backName,
      status: "pending",
    });

    if (insertErr) { setError("Lỗi lưu dữ liệu: " + insertErr.message); setSubmitting(false); return; }

    setSubmitting(false);
    setSuccess(true);

    // Đếm ngược 3 giây rồi mở Shopee link
    if (shopeeLink) {
      let count = 3;
      setCountdown(3);
      const timer = setInterval(() => {
        count -= 1;
        setCountdown(count);
        if (count <= 0) {
          clearInterval(timer);
          window.open(shopeeLink, "_blank");
        }
      }, 1000);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex items-center justify-center p-4">
        <div className="text-center max-w-sm space-y-5">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto animate-in zoom-in duration-500">
            <CheckCircle size={40} className="text-green-500" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-foreground">Gửi thành công!</h2>
            <p className="text-muted-foreground text-sm">
              Hồ sơ ứng tuyển của bạn đã được ghi nhận. Chúng tôi sẽ liên hệ sớm nhất.
            </p>
          </div>
          {shopeeLink && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-2">
              <p className="text-sm font-semibold text-amber-800">Trong khi chờ đợi...</p>
              <p className="text-xs text-amber-700">
                Chuyển đến trang mua sắm trong <strong>{countdown}</strong> giây
              </p>
              <div className="h-1.5 bg-amber-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-400 rounded-full transition-all duration-1000"
                  style={{ width: `${((3 - countdown) / 3) * 100}%` }}
                />
              </div>
            </div>
          )}
          <Link href="/" className="inline-block px-6 py-2.5 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:opacity-90 transition">
            Về trang chủ
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-violet-100 sticky top-0 z-30">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/" className="p-2 rounded-xl hover:bg-muted transition text-muted-foreground">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="font-bold text-foreground text-base leading-tight">Đơn ứng tuyển</h1>
            <p className="text-xs text-muted-foreground">Điền đầy đủ thông tin bên dưới</p>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Thông tin cá nhân */}
          <div className="bg-white rounded-2xl shadow-sm border border-border p-5 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <User size={16} className="text-primary" />
              <h2 className="font-semibold text-foreground text-sm">Thông tin cá nhân</h2>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Họ và tên *</label>
              <input
                data-testid="input-full-name"
                type="text"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="Nguyễn Văn A"
                className="w-full px-3 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Số tài khoản ngân hàng *</label>
              <div className="relative">
                <Banknote size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  data-testid="input-bank-account"
                  type="text"
                  value={bankAccount}
                  onChange={e => setBankAccount(e.target.value)}
                  placeholder="VD: 0123456789"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
                />
              </div>
            </div>
          </div>

          {/* Người giới thiệu */}
          <div className="bg-white rounded-2xl shadow-sm border border-border p-5 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <Users size={16} className="text-primary" />
              <h2 className="font-semibold text-foreground text-sm">Người giới thiệu <span className="text-muted-foreground font-normal">(nếu có)</span></h2>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Tên người giới thiệu</label>
              <input
                data-testid="input-referrer-name"
                type="text"
                value={referrerName}
                onChange={e => setReferrerName(e.target.value)}
                placeholder="Tên NV giới thiệu"
                className="w-full px-3 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Mã NV người giới thiệu</label>
              <input
                data-testid="input-referrer-id"
                type="text"
                value={referrerId}
                onChange={e => setReferrerId(e.target.value)}
                placeholder="VD: NV001"
                className="w-full px-3 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
              />
            </div>
          </div>

          {/* Upload CCCD */}
          <div className="bg-white rounded-2xl shadow-sm border border-border p-5 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <CreditCard size={16} className="text-primary" />
              <h2 className="font-semibold text-foreground text-sm">Ảnh CCCD / CMND *</h2>
            </div>
            <ImageUploadBox
              label="Mặt trước"
              file={frontFile}
              onChange={handleFront}
              preview={frontPreview}
              onClear={clearFront}
            />
            <ImageUploadBox
              label="Mặt sau"
              file={backFile}
              onChange={handleBack}
              preview={backPreview}
              onClear={clearBack}
            />
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-600 text-sm">
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            data-testid="btn-submit"
            disabled={submitting}
            className="w-full py-4 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-2xl font-bold text-base shadow-md hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {submitting ? (
              <><RefreshCw size={18} className="animate-spin" />Đang gửi hồ sơ...</>
            ) : (
              <><Send size={18} />Nộp đơn ứng tuyển</>
            )}
          </button>

          <p className="text-center text-xs text-muted-foreground px-4">
            Thông tin của bạn được bảo mật và chỉ dùng cho mục đích tuyển dụng.
          </p>
        </form>
      </main>
    </div>
  );
}
