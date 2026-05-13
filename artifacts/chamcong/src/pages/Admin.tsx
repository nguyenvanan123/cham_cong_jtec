import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type { AttendanceRecord } from "@/lib/supabase";
import { Link } from "wouter";
import { Camera, Search, X, ChevronLeft, ChevronRight, ArrowLeft } from "lucide-react";

type FilterStatus = "all" | "complete" | "incomplete";

function groupByEmployee(records: AttendanceRecord[]) {
  const map = new Map<string, { employee_id: string; full_name: string; work_date: string; shift: string; records: AttendanceRecord[] }>();
  for (const r of records) {
    const key = `${r.employee_id}__${r.work_date}`;
    if (!map.has(key)) {
      map.set(key, { employee_id: r.employee_id, full_name: r.full_name, work_date: r.work_date, shift: r.shift, records: [] });
    }
    map.get(key)!.records.push(r);
  }
  return Array.from(map.values());
}

export default function Admin() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterEmployeeId, setFilterEmployeeId] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [modalImage, setModalImage] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const PER_PAGE = 10;

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    let query = supabase.from("attendance").select("*").order("created_at", { ascending: false });
    if (filterEmployeeId.trim()) query = query.ilike("employee_id", `%${filterEmployeeId.trim()}%`);
    if (filterDateFrom) query = query.gte("work_date", filterDateFrom);
    if (filterDateTo) query = query.lte("work_date", filterDateTo);
    const { data } = await query;
    setRecords((data || []) as AttendanceRecord[]);
    setPage(1);
    setLoading(false);
  }, [filterEmployeeId, filterDateFrom, filterDateTo]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  const grouped = groupByEmployee(records);

  const filtered = grouped.filter(g => {
    const hasIn = g.records.some(r => r.action_type === "check-in");
    const hasOut = g.records.some(r => r.action_type === "check-out");
    const isComplete = hasIn && hasOut;
    if (filterStatus === "complete") return isComplete;
    if (filterStatus === "incomplete") return !isComplete;
    return true;
  });

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <header className="bg-white/90 backdrop-blur-md border-b border-border sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ArrowLeft size={18} className="text-muted-foreground" />
            <span className="font-bold text-foreground text-lg">Admin Dashboard</span>
          </div>
          <div className="flex gap-1">
            <Link
              href="/"
              className="flex items-center gap-1 text-sm px-3 py-1.5 rounded-lg text-muted-foreground hover:bg-accent transition"
            >
              <Camera size={14} />
              Chấm công
            </Link>
            <Link
              href="/tra-cuu"
              className="flex items-center gap-1 text-sm px-3 py-1.5 rounded-lg text-muted-foreground hover:bg-accent transition"
            >
              <Search size={14} />
              Tra cứu
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-5">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl p-4 border border-border shadow-sm text-center">
            <p className="text-2xl font-bold text-primary">{grouped.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Tổng lượt</p>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-border shadow-sm text-center">
            <p className="text-2xl font-bold text-green-600">
              {grouped.filter(g => g.records.some(r => r.action_type === "check-in") && g.records.some(r => r.action_type === "check-out")).length}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Hoàn thành</p>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-border shadow-sm text-center">
            <p className="text-2xl font-bold text-red-500">
              {grouped.filter(g => !(g.records.some(r => r.action_type === "check-in") && g.records.some(r => r.action_type === "check-out"))).length}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Thiếu</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-border shadow-sm p-4 space-y-3">
          <h3 className="font-semibold text-sm text-foreground">Bộ lọc</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <input
              data-testid="filter-employee-id"
              type="text"
              placeholder="Mã NV..."
              value={filterEmployeeId}
              onChange={e => setFilterEmployeeId(e.target.value)}
              className="px-3 py-2 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
            />
            <input
              data-testid="filter-date-from"
              type="date"
              value={filterDateFrom}
              onChange={e => setFilterDateFrom(e.target.value)}
              className="px-3 py-2 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
            />
            <input
              data-testid="filter-date-to"
              type="date"
              value={filterDateTo}
              onChange={e => setFilterDateTo(e.target.value)}
              className="px-3 py-2 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
            />
            <select
              data-testid="filter-status"
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value as FilterStatus)}
              className="px-3 py-2 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
            >
              <option value="all">Tất cả</option>
              <option value="complete">Hoàn thành</option>
              <option value="incomplete">Thiếu</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-muted-foreground text-sm">Đang tải...</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground text-sm">Không có dữ liệu</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 border-b border-border">
                    <tr>
                      <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Trạng thái</th>
                      <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Mã NV</th>
                      <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Tên</th>
                      <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Ngày</th>
                      <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Ca</th>
                      <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Ảnh</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {paginated.map((g, idx) => {
                      const hasIn = g.records.some(r => r.action_type === "check-in");
                      const hasOut = g.records.some(r => r.action_type === "check-out");
                      const isComplete = hasIn && hasOut;
                      const images = g.records.filter(r => r.image_url).map(r => r.image_url!);
                      return (
                        <tr
                          key={idx}
                          data-testid={`row-employee-${g.employee_id}-${g.work_date}`}
                          className="hover:bg-muted/30 transition-colors"
                        >
                          <td className="px-4 py-3">
                            <span
                              data-testid={`status-dot-${g.employee_id}-${g.work_date}`}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                                isComplete ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                              }`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${isComplete ? "bg-green-500" : "bg-red-500"}`} />
                              {isComplete ? "Đủ" : "Thiếu"}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-mono font-semibold text-foreground">{g.employee_id}</td>
                          <td className="px-4 py-3 text-foreground">{g.full_name}</td>
                          <td className="px-4 py-3 text-muted-foreground">{g.work_date}</td>
                          <td className="px-4 py-3 text-muted-foreground text-xs">{g.shift}</td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1.5">
                              {images.map((img, i) => (
                                <button
                                  key={i}
                                  data-testid={`img-btn-${g.employee_id}-${i}`}
                                  onClick={() => setModalImage(img)}
                                  className="w-8 h-8 rounded-lg overflow-hidden border border-border hover:ring-2 hover:ring-primary/40 transition"
                                >
                                  <img src={img} alt="ảnh" className="w-full h-full object-cover" />
                                </button>
                              ))}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                  <p className="text-xs text-muted-foreground">
                    {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, filtered.length)} / {filtered.length}
                  </p>
                  <div className="flex gap-2 items-center">
                    <button
                      data-testid="btn-prev-page"
                      disabled={page === 1}
                      onClick={() => setPage(p => p - 1)}
                      className="p-1.5 rounded-lg border border-border hover:bg-muted disabled:opacity-40 transition"
                    >
                      <ChevronLeft size={14} />
                    </button>
                    <span className="text-sm font-medium px-2">{page} / {totalPages}</span>
                    <button
                      data-testid="btn-next-page"
                      disabled={page === totalPages}
                      onClick={() => setPage(p => p + 1)}
                      className="p-1.5 rounded-lg border border-border hover:bg-muted disabled:opacity-40 transition"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Image Modal */}
      {modalImage && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
          onClick={() => setModalImage(null)}
        >
          <div className="relative max-w-lg w-full" onClick={e => e.stopPropagation()}>
            <button
              data-testid="btn-close-modal"
              onClick={() => setModalImage(null)}
              className="absolute -top-3 -right-3 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg hover:bg-red-50 transition z-10"
            >
              <X size={16} />
            </button>
            <img src={modalImage} alt="Ảnh chấm công" className="w-full rounded-2xl shadow-2xl" />
          </div>
        </div>
      )}
    </div>
  );
}
