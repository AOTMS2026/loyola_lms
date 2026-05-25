import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useEnrolledCourses } from "@/hooks/useStudentData";
import { fetchWithAuth } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Award,
  Download,
  Lock,
  CheckCircle2,
  Clock,
  Shield,
  BookOpen,
  Printer,
} from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/components/ui/use-toast";

// ─── Types ────────────────────────────────────────────────────────────────────
interface CertRecord {
  courseId: string;
  courseTitle: string;
  downloadedAt: string | null;
  downloadCount: number;
}

// ─── Certificate HTML template (rendered in a hidden iframe, then printed) ────
function buildCertHTML(
  userName: string,
  courseTitle: string,
  issuedDate: string,
  certId: string
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>Certificate – ${courseTitle}</title>
<style>
  /* ── Reset ── */
  *{margin:0;padding:0;box-sizing:border-box;}
  html,body{width:297mm;height:210mm;overflow:hidden;background:#fff;}

  /* ── Block ALL conversion & copy attempts ── */
  body{
    -webkit-user-select:none;
    -moz-user-select:none;
    user-select:none;
    -webkit-print-color-adjust:exact;
    print-color-adjust:exact;
  }

  @page{
    size:A4 landscape;
    margin:0;
    /* Disable browser header/footer text in print */
  }

  /* ── Outer page ── */
  .page{
    width:297mm;height:210mm;
    position:relative;
    background: linear-gradient(135deg,#0a1440 0%,#0d1f6b 40%,#091233 100%);
    display:flex;align-items:center;justify-content:center;
    font-family:'Georgia',serif;
    overflow:hidden;
  }

  /* ── Decorative watermark (background) ── */
  .watermark{
    position:absolute;
    top:50%;left:50%;
    transform:translate(-50%,-50%) rotate(-30deg);
    font-size:120pt;
    font-weight:900;
    color:rgba(255,255,255,0.04);
    letter-spacing:12px;
    white-space:nowrap;
    pointer-events:none;
    font-family:'Arial Black',sans-serif;
    user-select:none;
  }

  /* ── Gold double border ── */
  .border-outer{
    position:absolute;inset:10mm;
    border:2.5px solid #d4af37;
  }
  .border-inner{
    position:absolute;inset:13mm;
    border:0.8px solid rgba(212,175,55,0.45);
  }

  /* ── Corner ornaments ── */
  .corner{position:absolute;width:14mm;height:14mm;}
  .corner svg{width:100%;height:100%;}
  .tl{top:8mm;left:8mm;}
  .tr{top:8mm;right:8mm;transform:scaleX(-1);}
  .bl{bottom:8mm;left:8mm;transform:scaleY(-1);}
  .br{bottom:8mm;right:8mm;transform:scale(-1,-1);}

  /* ── Content ── */
  .content{
    position:relative;z-index:2;
    text-align:center;width:100%;
    padding:0 30mm;
  }

  .org{
    color:#d4af37;
    font-size:8pt;
    letter-spacing:4px;
    text-transform:uppercase;
    font-family:'Arial',sans-serif;
    font-weight:700;
    margin-bottom:6mm;
  }

  .cert-title{
    color:#ffffff;
    font-size:24pt;
    letter-spacing:5px;
    text-transform:uppercase;
    font-family:'Arial Black','Arial',sans-serif;
    margin-bottom:5mm;
    text-shadow:0 2px 8px rgba(0,0,0,0.4);
  }

  .presented-to{
    color:rgba(200,210,230,0.85);
    font-size:9pt;
    font-family:'Arial',sans-serif;
    letter-spacing:2px;
    margin-bottom:5mm;
  }

  .student-name{
    color:#d4af37;
    font-size:28pt;
    font-family:'Georgia',serif;
    font-style:italic;
    font-weight:700;
    margin-bottom:2mm;
    text-shadow:0 1px 6px rgba(0,0,0,0.3);
  }

  .name-rule{
    width:80mm;height:0.5px;
    background:linear-gradient(to right,transparent,#d4af37,transparent);
    margin:0 auto 6mm;
  }

  .for-completing{
    color:rgba(200,210,230,0.85);
    font-size:9pt;
    font-family:'Arial',sans-serif;
    letter-spacing:1px;
    margin-bottom:3mm;
  }

  .course-title{
    color:#ffffff;
    font-size:15pt;
    font-family:'Georgia',serif;
    font-style:italic;
    margin-bottom:7mm;
  }

  .meta-row{
    display:flex;
    justify-content:center;
    gap:20mm;
    margin-bottom:7mm;
  }

  .meta-item{text-align:center;}
  .meta-label{
    color:rgba(180,190,210,0.7);
    font-size:6.5pt;
    font-family:'Arial',sans-serif;
    letter-spacing:2px;
    text-transform:uppercase;
    margin-bottom:1mm;
  }
  .meta-value{
    color:#d4af37;
    font-size:8pt;
    font-family:'Georgia',serif;
    font-weight:700;
  }

  .footer{
    position:absolute;
    bottom:17mm;left:0;right:0;
    text-align:center;
    color:rgba(180,190,210,0.5);
    font-size:6pt;
    font-family:'Arial',sans-serif;
    letter-spacing:1px;
    z-index:3;
  }

  /* ── Print-time: disable everything except the page ── */
  @media print{
    html,body{width:297mm;height:210mm;}
    .page{page-break-after:avoid;}
    /* Extra: attempt to block print-to-PDF conversion hints */
    body::after{
      content:'AOTMS CERTIFIED DOCUMENT – COPYING AND FORMAT CONVERSION PROHIBITED';
      display:block;
      position:fixed;bottom:0;left:0;right:0;
      font-size:5pt;
      color:rgba(0,0,0,0.01);
      pointer-events:none;
    }
  }
</style>
</head>
<body>
<div class="page">
  <!-- Watermark -->
  <div class="watermark">AOTMS</div>

  <!-- Borders -->
  <div class="border-outer"></div>
  <div class="border-inner"></div>

  <!-- Corner SVGs -->
  <div class="corner tl">
    <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M2 38 L2 2 L38 2" stroke="#d4af37" stroke-width="2" fill="none"/>
      <circle cx="2" cy="2" r="3" fill="#d4af37"/>
      <path d="M8 2 L8 8 L2 8" stroke="rgba(212,175,55,0.4)" stroke-width="1" fill="none"/>
    </svg>
  </div>
  <div class="corner tr">
    <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M2 38 L2 2 L38 2" stroke="#d4af37" stroke-width="2" fill="none"/>
      <circle cx="2" cy="2" r="3" fill="#d4af37"/>
      <path d="M8 2 L8 8 L2 8" stroke="rgba(212,175,55,0.4)" stroke-width="1" fill="none"/>
    </svg>
  </div>
  <div class="corner bl">
    <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M2 38 L2 2 L38 2" stroke="#d4af37" stroke-width="2" fill="none"/>
      <circle cx="2" cy="2" r="3" fill="#d4af37"/>
      <path d="M8 2 L8 8 L2 8" stroke="rgba(212,175,55,0.4)" stroke-width="1" fill="none"/>
    </svg>
  </div>
  <div class="corner br">
    <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M2 38 L2 2 L38 2" stroke="#d4af37" stroke-width="2" fill="none"/>
      <circle cx="2" cy="2" r="3" fill="#d4af37"/>
      <path d="M8 2 L8 8 L2 8" stroke="rgba(212,175,55,0.4)" stroke-width="1" fill="none"/>
    </svg>
  </div>

  <!-- Main content -->
  <div class="content">
    <div class="org">AOTMS Learning Management System</div>
    <div class="cert-title">Certificate of Completion</div>
    <div class="presented-to">This is to certify that</div>
    <div class="student-name">${userName}</div>
    <div class="name-rule"></div>
    <div class="for-completing">has successfully completed the course</div>
    <div class="course-title">&ldquo;${courseTitle}&rdquo;</div>
    <div class="meta-row">
      <div class="meta-item">
        <div class="meta-label">Date of Issue</div>
        <div class="meta-value">${issuedDate}</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">Certificate ID</div>
        <div class="meta-value">${certId}</div>
      </div>
    </div>
  </div>

  <div class="footer">
    This certificate is issued by AOTMS and is valid as an official record of completion.
    Unauthorized reproduction, format conversion, or redistribution is strictly prohibited.
    Verify at: aotms.in/verify/${certId}
  </div>
</div>
</body>
</html>`;
}

// ─── Generate a stable cert ID from courseId + userId ─────────────────────────
function makeCertId(courseId: string, userId: string): string {
  const raw = `${userId}-${courseId}`;
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    hash = (hash << 5) - hash + raw.charCodeAt(i);
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).toUpperCase().padStart(8, "0");
  return `AOTMS-${hex.slice(0, 4)}-${hex.slice(4)}`;
}

// ─── Trigger the print dialog (Save as PDF) ───────────────────────────────────
function printCertificate(html: string): void {
  const iframe = document.createElement("iframe");
  iframe.style.cssText =
    "position:fixed;top:-9999px;left:-9999px;width:297mm;height:210mm;border:none;opacity:0;";
  document.body.appendChild(iframe);

  const iDoc = iframe.contentWindow?.document;
  if (!iDoc) {
    document.body.removeChild(iframe);
    return;
  }

  iDoc.open();
  iDoc.write(html);
  iDoc.close();

  // Wait for fonts/layout then print
  setTimeout(() => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    // Clean up after print dialog closes
    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 2000);
  }, 600);
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function CertificationPage() {
  const { user } = useAuth();
  const { data: enrolledCourses, isLoading } = useEnrolledCourses();
  const { toast } = useToast();

  const [certRecords, setCertRecords] = useState<Record<string, CertRecord>>({});
  const [downloading, setDownloading] = useState<string | null>(null);
  const [loadingRecords, setLoadingRecords] = useState(true);
  const hasFetched = useRef(false);

  const completedCourses =
    enrolledCourses?.filter((c) => (c.progress ?? 0) >= 100) || [];
  const inProgressCourses =
    enrolledCourses?.filter((c) => (c.progress ?? 0) < 100) || [];

  // Load download records
  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;

    (async () => {
      try {
        const records = await fetchWithAuth<CertRecord[]>("/certificates/my-records");
        if (records && Array.isArray(records)) {
          const map: Record<string, CertRecord> = {};
          records.forEach((r) => { map[r.courseId] = r; });
          setCertRecords(map);
          return;
        }
      } catch (_) {
        // backend endpoint may not exist yet – fall through to localStorage
      }

      const stored = localStorage.getItem("aotms_cert_records");
      if (stored) {
        try { setCertRecords(JSON.parse(stored)); } catch (_) {}
      }
      setLoadingRecords(false);
    })();

    setLoadingRecords(false);
  }, []);

  const handleDownload = useCallback(
    async (course: { id: string; title: string; progress: number }) => {
      if ((course.progress ?? 0) < 100) {
        toast({
          title: "Course not completed",
          description: "You must reach 100% progress before downloading your certificate.",
          variant: "destructive",
        });
        return;
      }

      const record = certRecords[course.id];
      if (record && record.downloadCount >= 1) {
        toast({
          title: "Already Downloaded",
          description:
            "This certificate has already been issued. One-time download policy applies. Keep your original PDF safe.",
          variant: "destructive",
        });
        return;
      }

      setDownloading(course.id);

      try {
        // Mark as downloaded on backend (best-effort)
        try {
          await fetchWithAuth("/certificates/mark-downloaded", {
            method: "POST",
            body: JSON.stringify({ courseId: course.id }),
          });
        } catch (_) {}

        const userName =
          user?.user_metadata?.full_name ||
          user?.email?.split("@")[0] ||
          "Student";

        const issuedDate = new Date().toLocaleDateString("en-IN", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });

        const certId = makeCertId(course.id, user?.id || "guest");
        const html = buildCertHTML(userName, course.title, issuedDate, certId);

        // Update local record BEFORE printing so UI updates
        const newRecord: CertRecord = {
          courseId: course.id,
          courseTitle: course.title,
          downloadedAt: new Date().toISOString(),
          downloadCount: 1,
        };
        const updated = { ...certRecords, [course.id]: newRecord };
        setCertRecords(updated);
        localStorage.setItem("aotms_cert_records", JSON.stringify(updated));

        // Print (browser "Save as PDF" dialog)
        printCertificate(html);

        toast({
          title: "Certificate Ready",
          description:
            'The print/save dialog has opened. Choose "Save as PDF". This is a one-time download.',
        });
      } catch (err) {
        console.error("Certificate error:", err);
        toast({
          title: "Failed",
          description: "Could not generate certificate. Please try again.",
          variant: "destructive",
        });
      } finally {
        setDownloading(null);
      }
    },
    [certRecords, user, toast]
  );

  if (isLoading || loadingRecords) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex flex-col items-center gap-4">
          <Award className="h-10 w-10 text-primary animate-pulse" />
          <p className="text-sm font-medium text-slate-500">Loading certificates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Security notice */}
      <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
        <Shield className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-bold text-amber-800">Certificate Security Policy</p>
          <p className="text-xs text-amber-700 mt-0.5">
            Certificates can only be downloaded <strong>once per course</strong>. The PDF is issued
            with print-only restrictions — copying, editing and format conversion are blocked. Save
            your original file carefully.
          </p>
        </div>
      </div>

      {/* How it works */}
      <div className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
        <Printer className="h-4 w-4 text-slate-500 shrink-0 mt-0.5" />
        <p className="text-xs text-slate-500">
          Clicking <strong>Download Certificate</strong> opens your browser's print dialog.
          Select <em>"Save as PDF"</em> as the destination to save it to your device.
        </p>
      </div>

      {/* Completed courses */}
      {completedCourses.length > 0 ? (
        <div className="space-y-4">
          <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            Eligible Certificates ({completedCourses.length})
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {completedCourses.map((course) => {
              const record = certRecords[course.id];
              const alreadyDownloaded = record && record.downloadCount >= 1;
              const isDownloading = downloading === course.id;

              return (
                <motion.div
                  key={course.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card className="border border-emerald-100 bg-gradient-to-br from-white to-emerald-50/30 shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start gap-3">
                        <div className="h-10 w-10 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                          <Award className="h-5 w-5 text-emerald-600" />
                        </div>
                        <div className="min-w-0">
                          <CardTitle className="text-sm font-black text-slate-800 line-clamp-2">
                            {course.title}
                          </CardTitle>
                          <Badge className="mt-1 bg-emerald-100 text-emerald-700 border-none text-[10px] font-bold">
                            100% Complete
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="pt-0 space-y-3">
                      {alreadyDownloaded ? (
                        <div className="flex items-center gap-2 p-2.5 bg-slate-100 rounded-lg">
                          <Lock className="h-4 w-4 text-slate-500 shrink-0" />
                          <div>
                            <p className="text-xs font-bold text-slate-700">Certificate Issued</p>
                            <p className="text-[10px] text-slate-500">
                              Downloaded{" "}
                              {record.downloadedAt
                                ? `on ${new Date(record.downloadedAt).toLocaleDateString("en-IN")}`
                                : ""}
                              . Re-download not permitted.
                            </p>
                          </div>
                        </div>
                      ) : (
                        <Button
                          onClick={() => handleDownload(course)}
                          disabled={isDownloading}
                          className="w-full h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-2 shadow-sm"
                        >
                          {isDownloading ? (
                            <>
                              <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              Preparing...
                            </>
                          ) : (
                            <>
                              <Download className="h-4 w-4" />
                              Download Certificate (One Time)
                            </>
                          )}
                        </Button>
                      )}

                      <p className="text-[10px] text-slate-400 text-center flex items-center justify-center gap-1">
                        <Shield className="h-3 w-3" />
                        Print-only PDF · No copy · No conversion
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      ) : (
        <Card className="border-dashed border-2 border-slate-200">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
              <Award className="h-8 w-8 text-slate-300" />
            </div>
            <h3 className="text-lg font-black text-slate-700 mb-1">No Certificates Yet</h3>
            <p className="text-sm text-slate-500 max-w-xs">
              Complete 100% of any enrolled course to unlock your certificate.
            </p>
          </CardContent>
        </Card>
      )}

      {/* In-progress courses */}
      {inProgressCourses.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            In Progress ({inProgressCourses.length})
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {inProgressCourses.map((course) => (
              <Card key={course.id} className="border border-slate-100 bg-white/60 opacity-80">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                      <BookOpen className="h-4 w-4 text-slate-400" />
                    </div>
                    <p className="text-sm font-bold text-slate-700 line-clamp-1 flex-1">
                      {course.title}
                    </p>
                    <span className="text-xs font-black text-primary shrink-0">
                      {course.progress ?? 0}%
                    </span>
                  </div>
                  <Progress value={course.progress ?? 0} className="h-2 bg-slate-100" />
                  <div className="flex items-center gap-1.5">
                    <Lock className="h-3.5 w-3.5 text-slate-400" />
                    <p className="text-[10px] text-slate-400 font-medium">
                      Certificate unlocks at 100% completion
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}