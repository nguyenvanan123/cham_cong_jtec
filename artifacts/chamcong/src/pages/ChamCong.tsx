import { useState, useRef, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type { AttendanceRecord, Config } from "@/lib/supabase";
import { Link } from "wouter";
import { Camera, RefreshCw, Send, CheckCircle, XCircle, AlertCircle, Search, BarChart3, Megaphone, X as XIcon } from "lucide-react";

const SHIFTS = ["Ca sáng (6:00 - 14:00)", "Ca chiều (14:00 - 22:00)", "Ca tối (22:00 - 6:00)", "Hành chính (8:00 - 17:00)"];

function today() {
  return new Date().toISOString().split("T")[0];
}

export default function ChamCong() {
  const [employeeId, setEmployeeId] = useState("");
  const [fullName, setFullName] = useState("");
  const [workDate, setWorkDate] = useState(today());
  const [shift, setShift] = useState(SHIFTS[0]);
  const [actionType, setActionType] = useState<"check-in" | "check-out">("check-in");
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [showPopup, setShowPopup] = useState(false);
  const [popupTitle, setPopupTitle] = useState("Cơ hội việc làm");
  const [popupContent, setPopupContent] = useState("Chúng tôi đang tuyển dụng! Bấm xem chi tiết.");
  const [recruitmentLink, setRecruitmentLink] = useState("/ung-tuyen");
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    supabase.from("configs").select("key,value")
      .in("key", ["banner_url", "popup_status", "popup_title", "popup_content", "recruitment_link"])
      .then(({ data }) => {
        if (!data) return;
        const get = (key: string) => (data as Config[]).find(d => d.key === key)?.value;
        const bUrl = get("banner_url");
        if (bUrl) setBanner(bUrl);
        const pTitle = get("popup_title");
        if (pTitle) setPopupTitle(pTitle);
        const pContent = get("popup_content");
        if (pContent) setPopupContent(pContent);
        const rLink = get("recruitment_link");
        if (rLink) setRecruitmentLink(rLink);
        if (get("popup_status") === "on") {
          setTimeout(() => setShowPopup(true), 800);
        }
      });
  }, []);

  const showToast = useCallback((type: "success" | "error" | "info", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraActive(true);
    } catch {
      showToast("error", "Không thể mở camera. Vui lòng cho phép truy cập camera.");
    }
  }, [showToast]);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setCameraActive(false);
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d")!;
    canvasRef.current.width = videoRef.current.videoWidth;
    canvasRef.current.height = videoRef.current.videoHeight;
    ctx.drawImage(videoRef.current, 0, 0);
    setCapturedImage(canvasRef.current.toDataURL("image/jpeg", 0.85));
    stopCamera();
  }, [stopCamera]);

  const retakePhoto = useCallback(() => {
    setCapturedImage(null);
    startCamera();
  }, [startCamera]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId.trim() || !fullName.trim()) {
      showToast("error", "Vui lòng nhập đầy đủ Mã NV và Tên.");
      return;
    }
    if (!capturedImage) {
      showToast("error", "Vui lòng chụp ảnh trước khi gửi.");
      return;
    }

    setSubmitting(true);

    const { data: todayRecords } = await supabase
      .from("attendance")
      .select("*")
      .eq("employee_id", employeeId.trim())
      .eq("work_date", workDate);

    const records = (todayRecords || []) as AttendanceRecord[];
    const hasCheckIn = records.some(r => r.action_type === "check-in");
    const hasCheckOut = records.some(r => r.action_type === "check-out");

    if (actionType === "check-out" && !hasCheckIn) {
      showToast("error", "Bạn chưa Check-in hôm nay. Vui lòng Check-in trước.");
      setSubmitting(false);
      return;
    }
    if (actionType === "check-in" && hasCheckIn) {
      showToast("info", "Bạn đã Check-in hôm nay rồi.");
      setSubmitting(false);
      return;
    }
    if (actionType === "check-out" && hasCheckOut) {
      showToast("info", "Bạn đã Check-out hôm nay rồi. Dữ liệu đã đầy đủ.");
      setSubmitting(false);
      return;
    }

    const blob = await (await fetch(capturedImage)).blob();
    const fileName = `${employeeId.trim()}_${workDate}_${actionType}_${Date.now()}.jpg`;
    const { error: uploadError } = await supabase.storage
      .from("checkin_photos")
      .upload(fileName, blob, { contentType: "image/jpeg" });

    if (uploadError) {
      showToast("error", "Lỗi upload ảnh: " + uploadError.message);
      setSubmitting(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("checkin_photos").getPublicUrl(fileName);

    const { error: insertError } = await supabase.from("attendance").insert({
      employee_id: employeeId.trim(),
      full_name: fullName.trim(),
      work_date: workDate,
      shift,
      action_type: actionType,
      image_url: urlData.publicUrl,
    });

    if (insertError) {
      showToast("error", "Lỗi lưu dữ liệu: " + insertError.message);
      setSubmitting(false);
      return;
    }

    showToast("success", `${actionType === "check-in" ? "Check-in" : "Check-out"} thành công!`);
    setCapturedImage(null);
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-blue-100 sticky top-0 z-30">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Camera size={16} className="text-white" />
            </div>
            <span className="font-bold text-foreground text-lg">Chấm Công</span>
          </div>
          <nav className="flex gap-1">
            <Link
              href="/tra-cuu"
              className="flex items-center gap-1 text-sm px-3 py-1.5 rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <Search size={14} />
              Tra cứu
            </Link>
            <Link
              href="/admin"
              className="flex items-center gap-1 text-sm px-3 py-1.5 rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <BarChart3 size={14} />
              Admin
            </Link>
          </nav>
        </div>
      </header>

      {banner && (
        <div className="max-w-lg mx-auto px-4 pt-4">
          <img src={banner} alt="Banner" className="w-full rounded-2xl object-cover max-h-36 shadow-md" />
        </div>
      )}

      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-white text-sm font-medium transition-all duration-300 ${
          toast.type === "success" ? "bg-green-500" : toast.type === "error" ? "bg-destructive" : "bg-amber-500"
        }`}>
          {toast.type === "success" ? <CheckCircle size={16} /> : toast.type === "error" ? <XCircle size={16} /> : <AlertCircle size={16} />}
          {toast.message}
        </div>
      )}

      <main className="max-w-lg mx-auto px-4 py-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="bg-white rounded-2xl shadow-sm border border-border p-5 space-y-4">
            <h2 className="font-semibold text-foreground text-base">Thông tin nhân viên</h2>
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1 block">Mã nhân viên *</label>
              <input
                data-testid="input-employee-id"
                type="text"
                value={employeeId}
                onChange={e => setEmployeeId(e.target.value)}
                placeholder="VD: NV001"
                className="w-full px-3 py-2.5 rounded-xl border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1 block">Họ và tên *</label>
              <input
                data-testid="input-full-name"
                type="text"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="VD: Nguyễn Văn A"
                className="w-full px-3 py-2.5 rounded-xl border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1 block">Ngày làm việc</label>
              <input
                data-testid="input-work-date"
                type="date"
                value={workDate}
                onChange={e => setWorkDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1 block">Ca làm việc</label>
              <select
                data-testid="select-shift"
                value={shift}
                onChange={e => setShift(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
              >
                {SHIFTS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-border p-5">
            <h2 className="font-semibold text-foreground text-base mb-3">Loại chấm công</h2>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                data-testid="btn-check-in"
                onClick={() => setActionType("check-in")}
                className={`py-3 rounded-xl font-semibold text-sm transition-all border-2 ${
                  actionType === "check-in"
                    ? "bg-primary text-primary-foreground border-primary shadow-md"
                    : "bg-background text-muted-foreground border-border hover:border-primary/50"
                }`}
              >
                Check-in
              </button>
              <button
                type="button"
                data-testid="btn-check-out"
                onClick={() => setActionType("check-out")}
                className={`py-3 rounded-xl font-semibold text-sm transition-all border-2 ${
                  actionType === "check-out"
                    ? "bg-green-500 text-white border-green-500 shadow-md"
                    : "bg-background text-muted-foreground border-border hover:border-green-400/50"
                }`}
              >
                Check-out
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-border p-5">
            <h2 className="font-semibold text-foreground text-base mb-3">Chụp ảnh xác nhận</h2>
            <canvas ref={canvasRef} className="hidden" />

            {!cameraActive && !capturedImage && (
              <button
                type="button"
                data-testid="btn-open-camera"
                onClick={startCamera}
                className="w-full py-10 rounded-xl border-2 border-dashed border-primary/40 text-primary flex flex-col items-center gap-2 hover:bg-accent/50 transition"
              >
                <Camera size={28} />
                <span className="text-sm font-medium">Bấm để mở camera</span>
              </button>
            )}

            {cameraActive && (
              <div className="space-y-3">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full rounded-xl bg-black aspect-video object-cover"
                />
                <button
                  type="button"
                  data-testid="btn-capture"
                  onClick={capturePhoto}
                  className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:opacity-90 transition"
                >
                  Chụp ảnh
                </button>
              </div>
            )}

            {capturedImage && (
              <div className="space-y-3">
                <img src={capturedImage} alt="Ảnh chụp" className="w-full rounded-xl object-cover aspect-video" />
                <button
                  type="button"
                  data-testid="btn-retake"
                  onClick={retakePhoto}
                  className="w-full py-2.5 border border-border rounded-xl text-sm text-muted-foreground flex items-center justify-center gap-2 hover:bg-muted transition"
                >
                  <RefreshCw size={14} />
                  Chụp lại
                </button>
              </div>
            )}
          </div>

          <button
            type="submit"
            data-testid="btn-submit"
            disabled={submitting}
            className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-bold text-base shadow-md hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {submitting ? (
              <><RefreshCw size={18} className="animate-spin" />Đang gửi...</>
            ) : (
              <><Send size={18} />Gửi chấm công</>
            )}
          </button>
        </form>
      </main>

      {/* Popup tuyển dụng */}
      {showPopup && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-6 duration-400">
            {/* Header popup */}
            <div className="bg-gradient-to-r from-violet-600 to-purple-600 px-5 pt-5 pb-4 relative">
              <button
                onClick={() => setShowPopup(false)}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition"
              >
                <XIcon size={16} className="text-white" />
              </button>
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center mb-3">
                <Megaphone size={20} className="text-white" />
              </div>
              <h3 className="text-white font-bold text-lg leading-tight">{popupTitle}</h3>
            </div>
            {/* Body */}
            <div className="px-5 py-4">
              <p className="text-muted-foreground text-sm leading-relaxed">{popupContent}</p>
            </div>
            {/* Actions */}
            <div className="px-5 pb-5 flex gap-3">
              <button
                onClick={() => setShowPopup(false)}
                className="flex-1 py-2.5 border border-border rounded-xl text-sm text-muted-foreground hover:bg-muted transition font-medium"
              >
                Để sau
              </button>
              <Link
                href={recruitmentLink.startsWith("http") ? "#" : recruitmentLink}
                onClick={() => {
                  setShowPopup(false);
                  if (recruitmentLink.startsWith("http")) window.open(recruitmentLink, "_blank");
                }}
                className="flex-1 py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl text-sm font-semibold text-center hover:opacity-90 transition"
              >
                Xem chi tiết
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
