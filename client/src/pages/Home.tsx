import React, { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  ExternalLink,
  Eye,
  Filter,
  Flame,
  HelpCircle,
  Home as HomeIcon,
  Image as ImageIcon,
  Layers,
  LocateFixed,
  MapPin,
  MessageSquare,
  Navigation,
  PhoneCall,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  ThumbsUp,
  TrendingUp,
  Upload,
  User,
  Users,
  Wrench,
  X,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { InteractiveCivicMap, type MapPinItem } from "@/components/Map";

type Mode = "citizen" | "admin";
type CitizenTab = "home" | "map" | "my_reports" | "resolved" | "info";
type Category =
  | "pothole"
  | "garbage"
  | "streetlight"
  | "water_leak"
  | "graffiti"
  | "drainage"
  | "tree_hazard"
  | "other";

const categories: Array<{ value: Category; label: string; iconBadge: string; description: string }> = [
  { value: "pothole", label: "Pothole / Road damage", iconBadge: "coral", description: "Craters, asphalt cracks & road surface hazards" },
  { value: "streetlight", label: "Streetlight outage", iconBadge: "amber", description: "Dark roads, damaged poles or flickering lights" },
  { value: "drainage", label: "Drainage / Sewage", iconBadge: "blue", description: "Blocked drains, overflowing sewage & waterlogging" },
  { value: "water_leak", label: "Water pipeline leak", iconBadge: "blue", description: "Clean water wastage or burst main pipelines" },
  { value: "garbage", label: "Garbage & Sanitation", iconBadge: "butter", description: "Overflowing community bins & uncollected trash" },
  { value: "tree_hazard", label: "Tree / Branch hazard", iconBadge: "mint", description: "Fallen branches or dangerously leaning trees" },
  { value: "graffiti", label: "Graffiti / Vandalism", iconBadge: "violet", description: "Defaced public structures or illegal posters" },
  { value: "other", label: "Other civic issue", iconBadge: "sage", description: "Encroachments, stray hazards or general civic works" },
];

const statusLabel: Record<string, string> = {
  submitted: "Reported",
  acknowledged: "Verified",
  in_progress: "In progress",
  resolved: "Resolved",
  reopened: "Reopened",
  closed: "Closed",
  rejected: "Rejected",
};

const categoryBadgeClass: Record<string, string> = {
  pothole: "coral",
  streetlight: "amber",
  drainage: "blue",
  water_leak: "blue",
  garbage: "butter",
  tree_hazard: "mint",
  graffiti: "violet",
  other: "sage",
};

const categoryLabel = (value: string) =>
  categories.find((c) => c.value === value)?.label ?? value.replaceAll("_", " ");

function Brand() {
  return (
    <div className="brand">
      <div className="brand-mark">
        <ShieldCheck size={22} />
      </div>
      <div>
        <div className="brand-name">CityCare</div>
        <div className="brand-caption">CIVIC ACTION, TOGETHER</div>
      </div>
    </div>
  );
}

function Pill({ children, variant = "green" }: { children: React.ReactNode; variant?: "green" | "blue" | "orange" | "red" }) {
  return <span className={`status-pill ${variant}`}>{children}</span>;
}

function Header({
  mode,
  setMode,
  onReport,
  unreadCount = 2,
}: {
  mode: Mode;
  setMode: (m: Mode) => void;
  onReport: () => void;
  unreadCount?: number;
}) {
  return (
    <header className="topbar">
      <Brand />

      <div className="mode-switch">
        <button
          type="button"
          className={mode === "citizen" ? "active" : ""}
          onClick={() => setMode("citizen")}
        >
          <Users size={15} /> Citizen Portal
        </button>
        <button
          type="button"
          className={mode === "admin" ? "active" : ""}
          onClick={() => setMode("admin")}
        >
          <Wrench size={15} /> Operations Console
        </button>
      </div>

      <div className="topbar-actions">
        <button
          type="button"
          className="icon-button notification"
          title="Notifications"
          onClick={() => alert("You have 2 new updates: Maintenance crew dispatched to Miyapur Road.")}
        >
          <Bell size={18} />
          {unreadCount > 0 && <span />}
        </button>

        <button type="button" className="desktop-report" onClick={onReport}>
          <Plus size={16} /> Report issue
        </button>

        <div className="avatar" title="Signed in as Community Member">
          CM
        </div>
      </div>
    </header>
  );
}

/* =========================================================================
   REPORT ISSUE MODAL (5 STEPS)
   ========================================================================= */
function ReportFlow({
  onDone,
  onCancel,
}: {
  onDone: (code: string) => void;
  onCancel: () => void;
}) {
  const [step, setStep] = useState(1);
  const [category, setCategory] = useState<Category>("pothole");
  const [severity, setSeverity] = useState<"low" | "medium" | "high" | "urgent">("high");
  const [title, setTitle] = useState("Large pothole affecting traffic flow");
  const [description, setDescription] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [coords, setCoords] = useState({ lat: 17.4968, lng: 78.3565 });
  const [location, setLocation] = useState("Miyapur Main Road, near Metro Pillar 14");
  const [duplicateOpen, setDuplicateOpen] = useState(false);
  const [error, setError] = useState("");

  const upload = trpc.issues.uploadPhoto.useMutation();
  const create = trpc.issues.create.useMutation();
  const upvote = trpc.issues.upvote.useMutation();
  const duplicate = trpc.issues.nearbyDuplicates.useQuery(
    { categorySlug: category, lat: coords.lat, lng: coords.lng, radiusMeters: 75 },
    { enabled: false }
  );

  useEffect(() => {
    if (step === 4 && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (p) => setCoords({ lat: p.coords.latitude, lng: p.coords.longitude }),
        () => setError("GPS was unavailable. You can click anywhere on the map or type address."),
        { enableHighAccuracy: true, timeout: 6000 }
      );
    }
  }, [step]);

  const choosePhoto = async (file: File | undefined) => {
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/i.test(file.type) || file.size > 6 * 1024 * 1024) {
      setError("Please select a JPG, PNG, or WebP image under 6 MB.");
      return;
    }
    const data = await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result).split(",")[1]);
      r.onerror = reject;
      r.readAsDataURL(file);
    });
    try {
      const res = await upload.mutateAsync({
        filename: file.name,
        contentType: file.type as "image/jpeg" | "image/png" | "image/webp",
        dataBase64: data,
      });
      setPhotoUrl(res.url);
      setError("");
    } catch {
      setError("Photo upload failed. Please try again.");
    }
  };

  const next = async () => {
    setError("");
    if (step === 1 && !category) {
      setError("Please select a category.");
      return;
    }
    if (step === 2 && (!title.trim() || !description.trim())) {
      setError("Please provide a title and detailed description.");
      return;
    }
    if (step === 4) {
      const result = await duplicate.refetch();
      if ((result.data ?? []).length > 0) {
        setDuplicateOpen(true);
        return;
      }
    }
    setStep((s) => Math.min(5, s + 1));
  };

  const submit = async () => {
    try {
      const result = await create.mutateAsync({
        title: title.trim(),
        description: description.trim(),
        categorySlug: category,
        lat: coords.lat,
        lng: coords.lng,
        address: location || null,
        photoUrls: photoUrl ? [photoUrl] : [],
        isAnonymous: false,
        priority: severity,
      });
      if (result.possibleDuplicate) {
        setDuplicateOpen(true);
        return;
      }
      onDone(result.referenceCode);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not submit report");
    }
  };

  return (
    <div className="report-page">
      <div className="report-top">
        <button
          type="button"
          className="back-button"
          onClick={step === 1 ? onCancel : () => setStep((s) => s - 1)}
        >
          <ChevronRight className="back-chevron" size={17} />{" "}
          {step === 1 ? "Cancel" : "Back"}
        </button>

        <div className="report-progress">
          <span>NEW CIVIC COMPLAINT</span>
          <strong>
            0{step} <i>/ 05</i>
          </strong>
        </div>

        <button type="button" className="close-button" onClick={onCancel}>
          <X size={18} />
        </button>
      </div>

      <div className="report-layout">
        <div className="report-intro">
          <span className="eyebrow">LET’S GET THIS RESOLVED</span>
          <h1>
            {step === 1 && "What needs fixing?"}
            {step === 2 && "Describe the problem"}
            {step === 3 && "Attach photo evidence"}
            {step === 4 && "Pin the exact location"}
            {step === 5 && "Review & submit report"}
          </h1>
          <p>
            Accurate details and location coordinates help the municipal team dispatch the right crew immediately.
          </p>
        </div>

        <div className="stepper">
          {["Category", "Details", "Photo", "Location", "Review"].map((s, i) => (
            <React.Fragment key={s}>
              <span className={step >= i + 1 ? "done" : ""}>
                0{i + 1} <i>{s}</i>
              </span>
              {i < 4 && <b />}
            </React.Fragment>
          ))}
        </div>

        <div className="report-card">
          {/* STEP 1: CATEGORY */}
          {step === 1 && (
            <div className="category-grid">
              {categories.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  className={category === item.value ? "selected" : ""}
                  onClick={() => {
                    setCategory(item.value);
                    if (item.value === "pothole") setTitle("Large pothole affecting the road");
                    if (item.value === "streetlight") setTitle("Streetlight out and dark area");
                    if (item.value === "drainage") setTitle("Drainage overflowing onto sidewalk");
                    if (item.value === "water_leak") setTitle("Main pipeline leaking water");
                    if (item.value === "garbage") setTitle("Overflowing trash bin requires pickup");
                    if (item.value === "tree_hazard") setTitle("Fallen branch blocking pedestrian pathway");
                    if (item.value === "graffiti") setTitle("Vandalism on public infrastructure");
                  }}
                >
                  <div className={`icon-badge ${item.iconBadge}`}>
                    <AlertTriangle size={18} />
                  </div>
                  <div>
                    <span>{item.label}</span>
                    <small className="block text-xs text-muted-foreground mt-1 opacity-75">
                      {item.description}
                    </small>
                  </div>
                  {category === item.value && (
                    <Check className="selected-check" size={18} />
                  )}
                </button>
              ))}
            </div>
          )}

          {/* STEP 2: DETAILS */}
          {step === 2 && (
            <div className="severity-area">
              <label className="block mb-4">
                <span className="font-bold text-xs uppercase tracking-wider text-muted-foreground block mb-1">
                  Issue Title
                </span>
                <input
                  className="w-full px-3 py-2 border border-line rounded-lg text-sm bg-white"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="E.g. Broken streetlight on 4th Main"
                />
              </label>

              <label className="block mb-4">
                <span className="font-bold text-xs uppercase tracking-wider text-muted-foreground block mb-1">
                  Detailed Description
                </span>
                <textarea
                  className="w-full px-3 py-2 border border-line rounded-lg text-sm bg-white"
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Explain what is damaged, safety risks, and landmarks nearby..."
                />
              </label>

              <div className="mt-4">
                <span className="font-bold text-xs uppercase tracking-wider text-muted-foreground block mb-2">
                  Severity Level
                </span>
                <div className="severity-choices">
                  {(["low", "medium", "high", "urgent"] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      className={`severity-${s} ${severity === s ? "selected" : ""}`}
                      onClick={() => setSeverity(s)}
                    >
                      <span className="severity-dot" />
                      {s.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: PHOTO */}
          {step === 3 && (
            <div className="photo-area">
              {!photoUrl ? (
                <label className="upload-box cursor-pointer">
                  <div className="upload-icon">
                    <Upload size={24} />
                  </div>
                  <strong>Upload a clear photo of the issue</strong>
                  <span>JPG, PNG, or WebP up to 6MB</span>
                  <span className="upload-button">
                    <ImageIcon size={14} /> Choose photo from device
                  </span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    hidden
                    onChange={(e) => choosePhoto(e.target.files?.[0])}
                  />
                </label>
              ) : (
                <div className="photo-preview">
                  <img
                    src={photoUrl}
                    alt="Evidence preview"
                    className="w-full h-52 object-cover rounded-xl border border-line"
                  />
                  <div className="photo-actions">
                    <strong>Photo attached successfully</strong>
                    <span>Your photo will be attached to the complaint ticket for inspection.</span>
                    <div>
                      <label className="edit-button cursor-pointer">
                        Change photo
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          hidden
                          onChange={(e) => choosePhoto(e.target.files?.[0])}
                        />
                      </label>
                      <button
                        type="button"
                        className="text-button text-red-600"
                        onClick={() => setPhotoUrl("")}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 4: LOCATION */}
          {step === 4 && (
            <div className="location-area">
              <div className="detected-location">
                <div className="location-pin">
                  <LocateFixed size={18} />
                </div>
                <div>
                  <span>DETECTED GPS COORDINATES</span>
                  <strong>
                    {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
                  </strong>
                  <small>Click anywhere on the interactive map below to adjust pin position.</small>
                </div>
                <Pill variant="green">GPS ACTIVE</Pill>
              </div>

              <div className="h-64 rounded-xl overflow-hidden border border-line relative">
                <InteractiveCivicMap
                  isPicker
                  center={coords}
                  onLocationPick={(c) => setCoords(c)}
                />
              </div>

              <label className="block mt-2">
                <span className="font-bold text-xs uppercase tracking-wider text-muted-foreground block mb-1">
                  Street Address or Landmark
                </span>
                <input
                  className="w-full px-3 py-2 border border-line rounded-lg text-sm bg-white"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="E.g. Near Miyapur Metro Station, Pillar #14"
                />
              </label>
            </div>
          )}

          {/* STEP 5: REVIEW */}
          {step === 5 && (
            <div className="review-area">
              <div className="review-summary">
                {photoUrl ? (
                  <img
                    src={photoUrl}
                    alt="Review Evidence"
                    className="w-32 h-24 object-cover rounded-lg border border-line"
                  />
                ) : (
                  <div className="w-32 h-24 bg-muted/20 rounded-lg flex items-center justify-center text-xs text-muted-foreground">
                    No photo
                  </div>
                )}
                <div className="review-main">
                  <div className="flex items-center gap-2">
                    <Pill variant="orange">{severity.toUpperCase()} PRIORITY</Pill>
                    <span className="text-xs font-semibold text-muted-foreground">
                      {categoryLabel(category)}
                    </span>
                  </div>
                  <h3>{title}</h3>
                  <p>{description || "No additional notes provided."}</p>
                  <div className="review-location">
                    <MapPin size={13} />
                    <span>{location || `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`}</span>
                  </div>
                </div>
              </div>

              <div className="routing-card">
                <div className="route-icon">
                  <Building2 size={18} />
                </div>
                <div>
                  <span>AUTOMATIC ROUTING</span>
                  <strong>
                    Assigned to Municipal {category === "pothole" ? "Roads & Transport" : category === "drainage" || category === "water_leak" ? "Water & Sewage" : category === "streetlight" ? "Electricity Board" : "Sanitation"} Department
                  </strong>
                  <small>Standard SLA: {severity === "urgent" ? "24 Hours" : severity === "high" ? "3 Days" : "5 Days"}</small>
                </div>
                <CheckCircle2 className="route-check" size={20} />
              </div>
            </div>
          )}
        </div>

        <div className="report-footer">
          <span>
            <ShieldCheck size={15} /> Validated by CityCare municipal intake engine
          </span>

          <button
            type="button"
            className="primary-button"
            disabled={create.isPending || upload.isPending}
            onClick={step === 5 ? submit : next}
          >
            {step === 5 ? (
              create.isPending ? "Submitting issue…" : "Submit civic report"
            ) : (
              <>
                Continue <ArrowRight size={16} />
              </>
            )}
          </button>
        </div>

        {error && <div className="error-banner mt-4 text-red-600 font-medium text-xs text-center">{error}</div>}
      </div>

      {duplicateOpen && (
        <DuplicateSheet
          items={duplicate.data ?? []}
          onConfirm={async (item) => {
            await upvote.mutateAsync({ issueId: item.id });
            onDone(item.referenceCode);
          }}
          onDifferent={() => {
            setDuplicateOpen(false);
            setStep(5);
          }}
        />
      )}
    </div>
  );
}

function DuplicateSheet({
  items,
  onConfirm,
  onDifferent,
}: {
  items: Array<{
    id: number;
    referenceCode: string;
    title: string;
    status: string;
    upvoteCount: number;
    address: string | null;
  }>;
  onConfirm: (item: (typeof items)[number]) => void;
  onDifferent: () => void;
}) {
  const item = items[0];
  return (
    <div className="sheet-backdrop">
      <div className="duplicate-sheet">
        <button type="button" className="sheet-close" onClick={onDifferent}>
          <X size={17} />
        </button>
        <div className="duplicate-symbol">
          <AlertTriangle size={22} />
        </div>
        <span className="eyebrow">A QUICK CHECK</span>
        <h2>Looks like someone already reported this.</h2>
        <p>
          A report matching this category was registered nearby within 75 meters. Confirming it helps escalate priority without creating duplicate tickets.
        </p>

        {item && (
          <div className="duplicate-issue">
            <div className="duplicate-thumb">
              <AlertTriangle size={18} />
            </div>
            <div>
              <strong>{item.title}</strong>
              <span>
                {item.address ?? "Nearby location"} · {item.status.replaceAll("_", " ")}
              </span>
              <small>
                <ThumbsUp size={12} /> {item.upvoteCount} community confirmations
              </small>
            </div>
          </div>
        )}

        <button
          type="button"
          className="primary-button full"
          onClick={() => item && onConfirm(item)}
        >
          Confirm & Boost Existing Issue
        </button>
        <button type="button" className="sheet-secondary" onClick={onDifferent}>
          This is a different problem, continue reporting
        </button>
      </div>
    </div>
  );
}

/* =========================================================================
   ISSUE CARD COMPONENT
   ========================================================================= */
function IssueCard({
  issue,
  onClick,
  onUpvote,
}: {
  issue: any;
  onClick: () => void;
  onUpvote?: (e: React.MouseEvent) => void;
}) {
  const badgeClass = categoryBadgeClass[issue.categorySlug] || "mint";
  const pillVariant =
    issue.status === "resolved" || issue.status === "closed"
      ? "green"
      : issue.status === "in_progress"
      ? "orange"
      : "blue";

  return (
    <div className="full-issue-card cursor-pointer group" onClick={onClick}>
      <div className={`icon-badge ${badgeClass}`}>
        <AlertTriangle size={18} />
      </div>

      <div className="full-issue-main">
        <div className="issue-card-top">
          <Pill variant={pillVariant}>{statusLabel[issue.status] ?? issue.status}</Pill>
          <span>{issue.referenceCode}</span>
          {issue.priority === "urgent" && (
            <span className="text-red-600 font-bold text-xs ml-auto">⚡ URGENT</span>
          )}
        </div>

        <h3>{issue.title}</h3>

        <p>
          <MapPin size={13} />{" "}
          {issue.address ?? `${issue.latitude.toFixed(4)}, ${issue.longitude.toFixed(4)}`}
        </p>

        <div className="issue-meta">
          <span
            className="hover:text-emerald-700 cursor-pointer font-semibold inline-flex items-center gap-1"
            onClick={(e) => {
              if (onUpvote) {
                e.stopPropagation();
                onUpvote(e);
              }
            }}
          >
            <ThumbsUp size={13} className="text-emerald-600" /> {issue.upvoteCount} Confirmations
          </span>
          <span>{categoryLabel(issue.categorySlug)}</span>
          <span className="ml-auto text-muted text-xs">
            {new Date(issue.createdAt).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            })}
          </span>
        </div>
      </div>

      <ChevronRight
        size={18}
        className="text-muted group-hover:text-emerald-700 group-hover:translate-x-1 transition-all"
      />
    </div>
  );
}

/* =========================================================================
   ISSUE DETAIL MODAL / VERIFICATION
   ========================================================================= */
function DetailModal({
  issueId,
  onClose,
  onRefresh,
}: {
  issueId: number;
  onClose: () => void;
  onRefresh: () => void;
}) {
  const detail = trpc.issues.getById.useQuery({ id: issueId });
  const upvote = trpc.issues.upvote.useMutation({
    onSuccess: () => {
      detail.refetch();
      onRefresh();
    },
  });
  const verify = trpc.issues.verifyResolution.useMutation({
    onSuccess: () => {
      detail.refetch();
      onRefresh();
    },
  });

  if (!detail.data) {
    return (
      <div className="sheet-backdrop">
        <div className="detail-sheet p-8 text-center">
          <RefreshCw className="animate-spin mx-auto text-emerald-600 mb-2" size={24} />
          <p className="text-sm text-muted">Loading issue details…</p>
        </div>
      </div>
    );
  }

  const { issue, photos, history, department, reporter, hasUpvoted } = detail.data;
  const beforePhoto = photos?.find((p: any) => p.kind === "before");
  const afterPhoto = photos?.find((p: any) => p.kind === "after");

  const pillVariant =
    issue.status === "resolved" || issue.status === "closed"
      ? "green"
      : issue.status === "in_progress"
      ? "orange"
      : "blue";

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="detail-sheet" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="sheet-close" onClick={onClose}>
          <X size={18} />
        </button>

        <div className="detail-header">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Pill variant={pillVariant}>{statusLabel[issue.status] ?? issue.status}</Pill>
              <span className="text-xs text-muted-foreground font-mono">{issue.referenceCode}</span>
            </div>
            <h2>{issue.title}</h2>
            <span>
              Reported by {issue.isAnonymous ? "Anonymous Citizen" : reporter?.name ?? "Community Member"}
            </span>
          </div>
        </div>

        <p className="text-sm text-ink-soft leading-relaxed mb-4">{issue.description}</p>

        {/* Photos showcase */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {beforePhoto && (
            <div>
              <span className="text-xs font-bold text-muted-foreground block mb-1">
                BEFORE (REPORT EVIDENCE)
              </span>
              <img
                src={beforePhoto.url}
                alt="Before"
                className="w-full h-36 object-cover rounded-xl border border-line"
              />
            </div>
          )}
          {afterPhoto && (
            <div>
              <span className="text-xs font-bold text-emerald-700 block mb-1">
                AFTER (RESOLUTION PROOF)
              </span>
              <img
                src={afterPhoto.url}
                alt="After Resolution"
                className="w-full h-36 object-cover rounded-xl border-2 border-emerald-500"
              />
            </div>
          )}
        </div>

        <div className="detail-grid">
          <div>
            <span>DEPARTMENT</span>
            <strong>{department?.name ?? "Municipal Operations"}</strong>
          </div>
          <div>
            <span>SEVERITY</span>
            <strong className="uppercase">{issue.priority}</strong>
          </div>
          <div>
            <span>LOCATION</span>
            <strong>
              <MapPin size={13} className="text-emerald-700" />
              {issue.address ?? `${issue.latitude.toFixed(4)}, ${issue.longitude.toFixed(4)}`}
            </strong>
          </div>
          <div>
            <span>COMMUNITY BACKING</span>
            <strong>
              <ThumbsUp size={13} className="text-emerald-700" /> {issue.upvoteCount} Confirmations
            </strong>
          </div>
        </div>

        {/* Citizen Verification Prompt */}
        {issue.status === "resolved" && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl my-4 text-center">
            <strong className="block text-emerald-900 text-sm mb-1">
              Was this civic issue resolved satisfactorily?
            </strong>
            <p className="text-xs text-emerald-700 mb-3">
              Your feedback verifies the municipal crew's completed work.
            </p>
            <div className="flex gap-2 justify-center">
              <button
                type="button"
                className="primary-button text-xs py-2 px-4"
                disabled={verify.isPending}
                onClick={() => verify.mutate({ issueId: issue.id, result: "accepted" })}
              >
                <Check size={14} /> Yes, it’s completely fixed
              </button>
              <button
                type="button"
                className="sheet-secondary text-xs py-2 px-3 text-red-700 hover:bg-red-50 rounded-lg"
                disabled={verify.isPending}
                onClick={() => verify.mutate({ issueId: issue.id, result: "rejected" })}
              >
                No, problem persists
              </button>
            </div>
          </div>
        )}

        {/* Upvote toggle button */}
        <div className="mt-4 flex gap-3">
          <button
            type="button"
            className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border transition-all ${
              hasUpvoted
                ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                : "bg-white hover:bg-emerald-50 text-ink border-line"
            }`}
            onClick={() => upvote.mutate({ issueId: issue.id })}
          >
            <ThumbsUp size={15} className={hasUpvoted ? "fill-emerald-700 text-emerald-700" : ""} />
            {hasUpvoted ? "Confirmed & Backed" : "I can confirm this issue"} ({issue.upvoteCount})
          </button>
        </div>

        {/* Timeline */}
        <div className="timeline mt-6">
          <div className="timeline-title">
            <strong className="text-xs uppercase tracking-wider text-muted-foreground">
              Official Progress Timeline
            </strong>
          </div>
          {history?.map((h: any, idx: number) => (
            <div className="timeline-item complete" key={h.id || idx}>
              <i>
                <Check size={12} />
              </i>
              <div>
                <strong>{statusLabel[h.toStatus] ?? h.toStatus}</strong>
                <span>{h.note || "Status updated"} · {new Date(h.createdAt).toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
   CITIZEN VIEW
   ========================================================================= */
function CitizenView({
  onReport,
  notice,
  setNotice,
}: {
  onReport: () => void;
  notice: string;
  setNotice: (v: string) => void;
}) {
  const [tab, setTab] = useState<CitizenTab>("home");
  const [selectedCategory, setSelectedCategory] = useState<Category | "all">("all");
  const [search, setSearch] = useState("");
  const [selectedIssueId, setSelectedIssueId] = useState<number | null>(null);

  const list = trpc.issues.list.useQuery({
    sort: "newest",
    limit: 50,
    offset: 0,
    categories: selectedCategory !== "all" ? [selectedCategory] : undefined,
  });

  const myReports = trpc.issues.myReports.useQuery({ limit: 50 });
  const upvote = trpc.issues.upvote.useMutation({
    onSuccess: () => {
      list.refetch();
      myReports.refetch();
    },
  });

  const allItems = list.data?.items ?? [];
  const filteredItems = allItems.filter(
    (i) =>
      i.title.toLowerCase().includes(search.toLowerCase()) ||
      i.referenceCode.toLowerCase().includes(search.toLowerCase()) ||
      (i.address ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const resolvedItems = allItems.filter(
    (i) => i.status === "resolved" || i.status === "closed"
  );

  const mapPins: MapPinItem[] = allItems.map((i) => ({
    id: i.id,
    title: i.title,
    categorySlug: i.categorySlug,
    status: i.status,
    priority: i.priority,
    latitude: i.latitude,
    longitude: i.longitude,
    address: i.address,
    upvoteCount: i.upvoteCount,
  }));

  const totalActive = allItems.filter((i) => !["resolved", "closed", "rejected"].includes(i.status)).length;
  const totalInProgress = allItems.filter((i) => i.status === "in_progress").length;
  const totalResolved = allItems.filter((i) => ["resolved", "closed"].includes(i.status)).length;
  const totalConfirmations = allItems.reduce((acc, curr) => acc + (curr.upvoteCount || 0), 0);

  return (
    <div className="citizen-layout">
      {/* SIDEBAR NAVIGATION */}
      <aside className="citizen-sidebar">
        <div className="side-label">CITIZEN ACTIONS</div>
        <button
          type="button"
          className={tab === "home" ? "active" : ""}
          onClick={() => setTab("home")}
        >
          <HomeIcon size={16} /> Home & Feed
        </button>
        <button
          type="button"
          className={tab === "map" ? "active" : ""}
          onClick={() => setTab("map")}
        >
          <Navigation size={16} /> Explore City Map
          <b>{allItems.length}</b>
        </button>
        <button
          type="button"
          className={tab === "my_reports" ? "active" : ""}
          onClick={() => setTab("my_reports")}
        >
          <User size={16} /> My Reports
          <b>{(myReports.data ?? []).length}</b>
        </button>
        <button
          type="button"
          className={tab === "resolved" ? "active" : ""}
          onClick={() => setTab("resolved")}
        >
          <CheckCircle2 size={16} /> Resolved Updates
          <b>{resolvedItems.length}</b>
        </button>

        <div className="side-divider" />
        <div className="side-label">CITY SERVICES</div>
        <button
          type="button"
          className={tab === "info" ? "active" : ""}
          onClick={() => setTab("info")}
        >
          <PhoneCall size={16} /> Municipal SLA & Contacts
        </button>

        <div className="side-spacer" />

        <div className="help-card">
          <div className="help-orb">
            <HelpCircle size={16} />
          </div>
          <strong>Quick Citizen Tip</strong>
          <span>High confirmations prioritize municipal crew dispatch automatically.</span>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="citizen-main">
        {notice && (
          <div className="success-banner">
            <div className="success-icon">
              <Check size={16} />
            </div>
            <div>
              <strong>Report Confirmed</strong>
              <span>{notice}</span>
            </div>
            <button type="button" onClick={() => setNotice("")}>
              <X size={16} />
            </button>
          </div>
        )}

        {/* TAB: HOME FEED */}
        {tab === "home" && (
          <>
            {/* HERO BANNER */}
            <section className="hero-card">
              <div className="hero-copy">
                <span className="mini-kicker">HYDERABAD WARD 104 · LIVE</span>
                <h2>
                  Make your city <em>better.</em>
                </h2>
                <p>
                  Report potholes, dark streetlights, drainage blocks, and waste in under 60 seconds with GPS accuracy.
                </p>
                <button type="button" className="primary-button" onClick={onReport}>
                  <Plus size={16} /> Report a civic issue
                </button>
              </div>

              {/* Decorative City Illustration */}
              <div className="hero-scene">
                <div className="sun" />
                <div className="scene-cloud cloud-one" />
                <div className="scene-cloud cloud-two" />
                <div className="building building-one">
                  <i /><i /><i /><i /><i />
                </div>
                <div className="building building-two">
                  <i /><i /><i /><i /><i /><i />
                </div>
                <div className="building building-three">
                  <i /><i /><i />
                </div>
                <div className="scene-tree tree-one"><b /><span /></div>
                <div className="scene-tree tree-two"><b /><span /></div>
                <div className="scene-person"><span /><b /></div>
                <div className="scene-sign">CITIZEN CARE</div>
                <div className="scene-road" />
              </div>
            </section>

            {/* LIVE KPI STATS */}
            <section className="stat-row">
              <div className="stat-card">
                <div className="stat-icon amber">
                  <AlertTriangle size={18} />
                </div>
                <div>
                  <strong>{totalActive}</strong>
                  <span>Active Issues</span>
                </div>
                <small className="text-amber-700 font-semibold">Live</small>
              </div>

              <div className="stat-card">
                <div className="stat-icon blue">
                  <Wrench size={18} />
                </div>
                <div>
                  <strong>{totalInProgress}</strong>
                  <span>Crew Dispatched</span>
                </div>
                <small className="text-blue-700 font-semibold">In Progress</small>
              </div>

              <div className="stat-card">
                <div className="stat-icon">
                  <CheckCircle2 size={18} />
                </div>
                <div>
                  <strong>{totalResolved}</strong>
                  <span>Fixed & Verified</span>
                </div>
                <small className="text-emerald-700 font-semibold">This Month</small>
              </div>
            </section>

            {/* CATEGORY FILTER CHIPS */}
            <div className="section-heading">
              <div>
                <span className="eyebrow">BROWSE BY CATEGORY</span>
                <h2>Neighborhood issues</h2>
              </div>
              <div className="search-box">
                <Search size={14} />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search complaint code, street, or issue…"
                />
              </div>
            </div>

            <div className="filter-pills">
              <button
                type="button"
                className={selectedCategory === "all" ? "active" : ""}
                onClick={() => setSelectedCategory("all")}
              >
                All Issues ({allItems.length})
              </button>
              {categories.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  className={selectedCategory === c.value ? "active" : ""}
                  onClick={() => setSelectedCategory(c.value)}
                >
                  {c.label}
                </button>
              ))}
            </div>

            {/* SPLIT VIEW: MAP PREVIEW + RECENT ISSUES */}
            <div className="nearby-grid">
              {/* Interactive map preview */}
              <div className="nearby-map-card">
                <InteractiveCivicMap
                  pins={mapPins}
                  onSelectPin={(pin) => setSelectedIssueId(pin.id)}
                />
                <div className="map-card-overlay">
                  <span>
                    <span className="live-dot" /> Live Civic Radar
                  </span>
                  <button
                    type="button"
                    onClick={() => setTab("map")}
                    title="Open Full Map"
                  >
                    <ExternalLink size={14} />
                  </button>
                </div>
                <div className="map-count">
                  <strong>{allItems.length}</strong>
                  <span>Reports logged nearby</span>
                </div>
              </div>

              {/* Feed stack */}
              <div className="issue-stack">
                {filteredItems.slice(0, 4).map((issue) => (
                  <div
                    key={issue.id}
                    className="nearby-issue cursor-pointer"
                    onClick={() => setSelectedIssueId(issue.id)}
                  >
                    <div className={`icon-badge ${categoryBadgeClass[issue.categorySlug] || "mint"}`}>
                      <AlertTriangle size={18} />
                    </div>
                    <div className="nearby-issue-copy">
                      <strong>{issue.title}</strong>
                      <span>{issue.address ?? "Hyderabad Ward 104"}</span>
                      <small>
                        <ThumbsUp size={11} /> {issue.upvoteCount} confirmations · {statusLabel[issue.status]}
                      </small>
                    </div>
                    <ChevronRight size={16} className="muted-icon" />
                  </div>
                ))}

                <button
                  type="button"
                  className="view-all"
                  onClick={() => setTab("map")}
                >
                  View all {allItems.length} neighborhood issues on map <ArrowRight size={14} />
                </button>
              </div>
            </div>

            {/* RESOLVED BEFORE/AFTER SHOWCASE */}
            <div className="updates-heading section-heading">
              <div>
                <span className="eyebrow">COMMUNITY IMPACT</span>
                <h2>Recently fixed by municipal crews</h2>
              </div>
            </div>

            <div className="updates-grid">
              {resolvedItems.slice(0, 4).map((issue) => (
                <div
                  key={issue.id}
                  className="update-card cursor-pointer hover:shadow-md transition-all"
                  onClick={() => setSelectedIssueId(issue.id)}
                >
                  <div className="update-check">
                    <Check size={16} />
                  </div>
                  <div>
                    <strong>{issue.title}</strong>
                    <span>
                      {issue.address} · Verified by citizens
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* TAB: EXPLORE FULL MAP */}
        {tab === "map" && (
          <div>
            <div className="page-heading">
              <div>
                <span className="eyebrow">CIVIC GEOGRAPHIC RADAR</span>
                <h1>Explore all municipal issues</h1>
                <p>Click any marker pin on the map to view ticket details, confirm urgency, or check resolution status.</p>
              </div>
              <button type="button" className="primary-button" onClick={onReport}>
                <Plus size={16} /> Report issue here
              </button>
            </div>

            <div className="large-map-wrap">
              <InteractiveCivicMap
                pins={mapPins}
                onSelectPin={(pin) => setSelectedIssueId(pin.id)}
              />
            </div>

            <div className="mt-6">
              <h2 className="text-xl font-bold mb-3">All Active & Resolved Tickets ({allItems.length})</h2>
              <div className="issues-list">
                {allItems.map((issue) => (
                  <IssueCard
                    key={issue.id}
                    issue={issue}
                    onClick={() => setSelectedIssueId(issue.id)}
                    onUpvote={() => upvote.mutate({ issueId: issue.id })}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB: MY REPORTS */}
        {tab === "my_reports" && (
          <div>
            <div className="page-heading">
              <div>
                <span className="eyebrow">YOUR CIVIC CONTRIBUTIONS</span>
                <h1>My reported complaints</h1>
                <p>Track progress, municipal crew dispatch, and verify completed resolutions.</p>
              </div>
              <button type="button" className="primary-button" onClick={onReport}>
                <Plus size={16} /> Report new issue
              </button>
            </div>

            {(myReports.data ?? []).length === 0 ? (
              <div className="text-center py-16 bg-white border border-line rounded-2xl p-8">
                <AlertTriangle className="mx-auto text-muted mb-3" size={32} />
                <h3 className="font-bold text-lg">No reports submitted yet</h3>
                <p className="text-sm text-muted max-w-sm mx-auto mt-1 mb-4">
                  Notice a pothole, broken streetlight, or leaking pipe? Report it to get it fixed by the city!
                </p>
                <button type="button" className="primary-button" onClick={onReport}>
                  <Plus size={16} /> Report an issue now
                </button>
              </div>
            ) : (
              <div className="issues-list">
                {(myReports.data ?? []).map((issue) => (
                  <IssueCard
                    key={issue.id}
                    issue={issue}
                    onClick={() => setSelectedIssueId(issue.id)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB: RESOLVED SHOWCASE */}
        {tab === "resolved" && (
          <div>
            <div className="page-heading">
              <div>
                <span className="eyebrow">TRANSPARENT CIVIC PROGRESS</span>
                <h1>Verified community resolutions</h1>
                <p>Problems reported by citizens and verified as completed by the municipal departments.</p>
              </div>
            </div>

            <div className="issues-list">
              {resolvedItems.map((issue) => (
                <IssueCard
                  key={issue.id}
                  issue={issue}
                  onClick={() => setSelectedIssueId(issue.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* TAB: MUNICIPAL SLA & INFO */}
        {tab === "info" && (
          <div>
            <div className="page-heading">
              <div>
                <span className="eyebrow">MUNICIPAL SLA GUARANTEES</span>
                <h1>Departments & Resolution Timelines</h1>
                <p>Standard response commitments for city operations.</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-5 border border-line rounded-2xl">
                <div className="icon-badge coral mb-3">
                  <AlertTriangle size={20} />
                </div>
                <h3 className="font-bold text-base">Roads & Transport</h3>
                <p className="text-xs text-muted mt-1 mb-3">
                  Potholes, asphalt resurfacing, lane damage, and street signage repair.
                </p>
                <div className="text-xs font-semibold text-emerald-800 bg-emerald-50 p-2 rounded-lg inline-block">
                  SLA: Urgent (24h) · Standard (72h)
                </div>
              </div>

              <div className="bg-white p-5 border border-line rounded-2xl">
                <div className="icon-badge amber mb-3">
                  <Wrench size={20} />
                </div>
                <h3 className="font-bold text-base">Electricity & Streetlights</h3>
                <p className="text-xs text-muted mt-1 mb-3">
                  Dark streetlights, damaged lamp poles, exposed wires, and transformer issues.
                </p>
                <div className="text-xs font-semibold text-emerald-800 bg-emerald-50 p-2 rounded-lg inline-block">
                  SLA: Urgent (12h) · Standard (48h)
                </div>
              </div>

              <div className="bg-white p-5 border border-line rounded-2xl">
                <div className="icon-badge blue mb-3">
                  <Layers size={20} />
                </div>
                <h3 className="font-bold text-base">Water Supply & Sewage</h3>
                <p className="text-xs text-muted mt-1 mb-3">
                  Burst potable water lines, blocked storm drains, and open manhole covers.
                </p>
                <div className="text-xs font-semibold text-emerald-800 bg-emerald-50 p-2 rounded-lg inline-block">
                  SLA: Urgent (6h) · Standard (48h)
                </div>
              </div>

              <div className="bg-white p-5 border border-line rounded-2xl">
                <div className="icon-badge butter mb-3">
                  <ShieldCheck size={20} />
                </div>
                <h3 className="font-bold text-base">Sanitation & Waste</h3>
                <p className="text-xs text-muted mt-1 mb-3">
                  Overflowing garbage bins, illegal dumping, and pavement sanitization.
                </p>
                <div className="text-xs font-semibold text-emerald-800 bg-emerald-50 p-2 rounded-lg inline-block">
                  SLA: Standard (24h)
                </div>
              </div>
            </div>
          </div>
        )}

        {/* DETAIL MODAL */}
        {selectedIssueId && (
          <DetailModal
            issueId={selectedIssueId}
            onClose={() => setSelectedIssueId(null)}
            onRefresh={() => {
              list.refetch();
              myReports.refetch();
            }}
          />
        )}
      </main>
    </div>
  );
}

/* =========================================================================
   OPERATIONS ADMIN CONSOLE
   ========================================================================= */
function AdminView() {
  const [search, setSearch] = useState("");
  const [selectedIssue, setSelectedIssue] = useState<any>(null);
  const [afterPhotoUrl, setAfterPhotoUrl] = useState("");
  const [manageStatus, setManageStatus] = useState<string>("in_progress");
  const [manageNote, setManageNote] = useState("");
  const [manageDepartment, setManageDepartment] = useState<number>(1);
  const [actionError, setActionError] = useState("");

  const stats = trpc.issues.stats.useQuery();
  const issues = trpc.issues.list.useQuery({ sort: "priority", limit: 100, offset: 0 });
  const departments = trpc.departments.list.useQuery();
  const upload = trpc.issues.uploadPhoto.useMutation();
  const updateStatus = trpc.issues.updateStatus.useMutation({
    onSuccess: () => {
      issues.refetch();
      stats.refetch();
      setSelectedIssue(null);
      setAfterPhotoUrl("");
      setManageNote("");
      setActionError("");
    },
    onError: (err) => {
      setActionError(err.message);
    },
  });

  const allList = issues.data?.items ?? [];
  const filtered = allList.filter(
    (i) =>
      i.referenceCode.toLowerCase().includes(search.toLowerCase()) ||
      i.title.toLowerCase().includes(search.toLowerCase()) ||
      (i.address ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const chooseAfterPhoto = async (file: File | undefined) => {
    if (!file) return;
    const data = await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result).split(",")[1]);
      r.onerror = reject;
      r.readAsDataURL(file);
    });
    try {
      const res = await upload.mutateAsync({
        filename: file.name,
        contentType: file.type as "image/jpeg" | "image/png" | "image/webp",
        dataBase64: data,
      });
      setAfterPhotoUrl(res.url);
    } catch {
      setActionError("Failed to upload after photo.");
    }
  };

  const handleUpdate = () => {
    if (!selectedIssue) return;
    setActionError("");
    updateStatus.mutate({
      issueId: selectedIssue.id,
      status: manageStatus as any,
      note: manageNote || undefined,
      departmentId: manageDepartment || undefined,
      afterPhotoUrl: afterPhotoUrl || undefined,
    });
  };

  return (
    <div className="admin-shell">
      {/* ADMIN SIDEBAR */}
      <aside className="admin-sidebar">
        <Brand />

        <div className="admin-side-label">OPERATIONS WORKSPACE</div>
        <button type="button" className="active">
          <Layers size={16} /> Dispatch Queue
          <span className="priority-count">{allList.filter((i) => i.priority === "urgent" || i.priority === "high").length}</span>
        </button>
        <button type="button">
          <TrendingUp size={16} /> SLA & Analytics
        </button>
        <button type="button">
          <Building2 size={16} /> Department Crews
        </button>

        <div className="admin-side-bottom">
          <div className="admin-user">
            <div className="admin-avatar">ADM</div>
            <div>
              <strong>Ward 104 Command</strong>
              <span>Operations Dispatcher</span>
            </div>
          </div>
        </div>
      </aside>

      {/* ADMIN MAIN */}
      <main className="admin-main">
        <div className="admin-top">
          <div className="admin-breadcrumb">
            <span>CityCare Operations</span> / <strong>Ward 104 Dispatch Queue</strong>
          </div>
          <div className="admin-top-actions">
            <span className="workspace-switch">
              <ShieldCheck size={14} /> LIVE COMMAND ACTIVE
            </span>
          </div>
        </div>

        <div className="admin-content">
          <div className="admin-welcome">
            <div>
              <span className="eyebrow">MUNICIPAL COMMAND CENTER</span>
              <h1>Civic Operations & Dispatch</h1>
              <p>Triage citizen complaints, dispatch maintenance trucks, and verify resolution photo proofs.</p>
            </div>
            <div className="date-button">
              <Calendar size={14} /> Today, {new Date().toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
            </div>
          </div>

          {/* 4 ADMIN KPIS */}
          <section className="admin-kpis">
            <div>
              <div className="kpi-icon">
                <Layers size={16} />
              </div>
              <span>Total Reports</span>
              <strong>{stats.data?.total ?? allList.length}</strong>
              <small>Across all categories</small>
            </div>

            <div>
              <div className="kpi-icon red">
                <Flame size={16} />
              </div>
              <span>High / Urgent</span>
              <strong>
                {allList.filter((i) => i.priority === "urgent" || i.priority === "high").length}
              </strong>
              <small className="text-red-700 font-semibold">Priority SLA</small>
            </div>

            <div>
              <div className="kpi-icon amber">
                <Clock size={16} />
              </div>
              <span>Crew In Action</span>
              <strong>
                {allList.filter((i) => i.status === "in_progress").length}
              </strong>
              <small>Dispatched</small>
            </div>

            <div>
              <div className="kpi-icon blue">
                <CheckCircle2 size={16} />
              </div>
              <span>Resolved SLA</span>
              <strong>
                {allList.filter((i) => i.status === "resolved" || i.status === "closed").length}
              </strong>
              <small className="text-emerald-700 font-semibold">96.4% on-time</small>
            </div>
          </section>

          {/* TABLE OF ISSUES */}
          <section className="issues-table-card">
            <div className="table-head">
              <div>
                <span className="eyebrow">ACTIVE INTAKE</span>
                <h2>Complaint Triage Queue</h2>
              </div>
              <div className="table-tools">
                <div className="search-box">
                  <Search size={14} />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Filter by ticket code, road, or title…"
                  />
                </div>
              </div>
            </div>

            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Ticket Ref</th>
                    <th>Issue Description</th>
                    <th>Location & Coordinates</th>
                    <th>Priority</th>
                    <th>Confirmations</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((issue) => (
                    <tr key={issue.id}>
                      <td>
                        <strong>{issue.referenceCode}</strong>
                        <span>{categoryLabel(issue.categorySlug)}</span>
                      </td>
                      <td className="max-w-xs truncate">
                        <strong>{issue.title}</strong>
                        <span className="truncate">{issue.description}</span>
                      </td>
                      <td>
                        <span className="table-location">
                          <MapPin size={12} className="text-emerald-700" />
                          {issue.address ?? `${issue.latitude.toFixed(4)}, ${issue.longitude.toFixed(4)}`}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`font-bold text-xs uppercase px-2 py-0.5 rounded ${
                            issue.priority === "urgent"
                              ? "bg-red-100 text-red-800"
                              : issue.priority === "high"
                              ? "bg-orange-100 text-orange-800"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {issue.priority}
                        </span>
                      </td>
                      <td>
                        <strong className="text-emerald-800">
                          <ThumbsUp size={12} className="inline mr-1" />
                          {issue.upvoteCount}
                        </strong>
                      </td>
                      <td>
                        <Pill
                          variant={
                            issue.status === "resolved" || issue.status === "closed"
                              ? "green"
                              : issue.status === "in_progress"
                              ? "orange"
                              : "blue"
                          }
                        >
                          {statusLabel[issue.status] ?? issue.status}
                        </Pill>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="primary-button text-xs py-1.5 px-3"
                          onClick={() => {
                            setSelectedIssue(issue);
                            setManageStatus(issue.status);
                            setManageDepartment(issue.departmentId || 1);
                          }}
                        >
                          Manage
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        {/* MANAGE TICKET MODAL */}
        {selectedIssue && (
          <div className="sheet-backdrop" onClick={() => setSelectedIssue(null)}>
            <div className="detail-sheet" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                className="sheet-close"
                onClick={() => setSelectedIssue(null)}
              >
                <X size={17} />
              </button>

              <span className="eyebrow">OPERATIONS WORKFLOW</span>
              <h2>Manage {selectedIssue.referenceCode}</h2>
              <h3 className="font-bold text-sm text-ink mb-1">{selectedIssue.title}</h3>
              <p className="text-xs text-muted mb-4">{selectedIssue.description}</p>

              <div className="space-y-3 mb-4">
                <label className="block">
                  <span className="text-xs font-bold text-muted-foreground block mb-1">
                    UPDATE STATUS
                  </span>
                  <select
                    className="w-full px-3 py-2 border border-line rounded-lg text-sm bg-white"
                    value={manageStatus}
                    onChange={(e) => setManageStatus(e.target.value)}
                  >
                    <option value="submitted">Reported (Submitted)</option>
                    <option value="acknowledged">Verified by Dispatch</option>
                    <option value="in_progress">Crew Dispatched (In Progress)</option>
                    <option value="resolved">Resolved (Requires After Photo)</option>
                    <option value="rejected">Rejected (Invalid/Duplicate)</option>
                  </select>
                </label>

                <label className="block">
                  <span className="text-xs font-bold text-muted-foreground block mb-1">
                    ASSIGN DEPARTMENT
                  </span>
                  <select
                    className="w-full px-3 py-2 border border-line rounded-lg text-sm bg-white"
                    value={manageDepartment}
                    onChange={(e) => setManageDepartment(Number(e.target.value))}
                  >
                    {(departments.data ?? []).map((d: any) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="text-xs font-bold text-muted-foreground block mb-1">
                    INTERNAL WORK NOTES
                  </span>
                  <textarea
                    className="w-full px-3 py-2 border border-line rounded-lg text-sm bg-white"
                    rows={2}
                    value={manageNote}
                    onChange={(e) => setManageNote(e.target.value)}
                    placeholder="E.g. Assigned Truck #12 with hot asphalt mix."
                  />
                </label>

                {manageStatus === "resolved" && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                    <span className="text-xs font-bold text-emerald-900 block mb-1">
                      RESOLUTION PROOF PHOTO (MANDATORY)
                    </span>
                    <label className="upload-box min-h-24 cursor-pointer p-4">
                      <Upload size={18} className="text-emerald-700" />
                      <strong className="text-xs">
                        {afterPhotoUrl ? "Resolution photo uploaded" : "Upload after / completed photo"}
                      </strong>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        hidden
                        onChange={(e) => chooseAfterPhoto(e.target.files?.[0])}
                      />
                    </label>
                    {afterPhotoUrl && (
                      <img
                        src={afterPhotoUrl}
                        alt="Resolution preview"
                        className="w-full h-28 object-cover rounded-lg mt-2 border border-emerald-300"
                      />
                    )}
                  </div>
                )}
              </div>

              {actionError && (
                <div className="text-xs text-red-600 font-bold mb-3">{actionError}</div>
              )}

              <button
                type="button"
                className="primary-button full"
                disabled={updateStatus.isPending || (manageStatus === "resolved" && !afterPhotoUrl)}
                onClick={handleUpdate}
              >
                {updateStatus.isPending ? "Updating Ticket…" : "Apply Operational Updates"}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

/* =========================================================================
   APP ROOT HOME
   ========================================================================= */
export default function Home() {
  const [mode, setMode] = useState<Mode>("citizen");
  const [reporting, setReporting] = useState(false);
  const [notice, setNotice] = useState("");

  return (
    <div className="app-shell">
      <Header
        mode={mode}
        setMode={setMode}
        onReport={() => setReporting(true)}
      />

      {reporting ? (
        <ReportFlow
          onCancel={() => setReporting(false)}
          onDone={(code) => {
            setReporting(false);
            setNotice(`Report ${code} submitted successfully! Assigned to municipal department.`);
          }}
        />
      ) : mode === "admin" ? (
        <AdminView />
      ) : (
        <CitizenView
          onReport={() => setReporting(true)}
          notice={notice}
          setNotice={setNotice}
        />
      )}
    </div>
  );
}
