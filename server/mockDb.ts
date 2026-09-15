export interface MockIssue {
  id: number;
  referenceCode: string;
  reporterId: number | null;
  isAnonymous: boolean;
  categorySlug: string;
  departmentId: number | null;
  title: string;
  description: string;
  status: "submitted" | "acknowledged" | "in_progress" | "resolved" | "rejected" | "reopened" | "closed";
  priority: "low" | "medium" | "high" | "urgent";
  latitude: number;
  longitude: number;
  address: string | null;
  upvoteCount: number;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt: Date | null;
  slaDeadline: Date | null;
  closedAt: Date | null;
  citizenVerification: "pending" | "accepted" | "rejected";
  verificationNote: string | null;
}

export interface MockDepartment {
  id: number;
  name: string;
  slug: string;
  createdAt: Date;
}

export interface MockPhoto {
  id: number;
  issueId: number;
  url: string;
  kind: "before" | "after";
  createdAt: Date;
}

export interface MockStatusHistory {
  id: number;
  issueId: number;
  fromStatus: string | null;
  toStatus: string;
  changedById: number | null;
  note: string | null;
  createdAt: Date;
}

export interface MockComment {
  id: number;
  issueId: number;
  authorId: number;
  body: string;
  isInternal: boolean;
  createdAt: Date;
}

const initialDepartments: MockDepartment[] = [
  { id: 1, name: "Roads & Transport", slug: "roads-transport", createdAt: new Date(Date.now() - 30 * 86400000) },
  { id: 2, name: "Sanitation", slug: "sanitation", createdAt: new Date(Date.now() - 30 * 86400000) },
  { id: 3, name: "Water & Sewage", slug: "water-sewage", createdAt: new Date(Date.now() - 30 * 86400000) },
  { id: 4, name: "Electricity & Streetlights", slug: "electricity-streetlights", createdAt: new Date(Date.now() - 30 * 86400000) },
  { id: 5, name: "Parks & Public Spaces", slug: "parks-public-spaces", createdAt: new Date(Date.now() - 30 * 86400000) },
  { id: 6, name: "Other", slug: "other", createdAt: new Date(Date.now() - 30 * 86400000) },
];

const initialIssues: MockIssue[] = [
  {
    id: 1,
    referenceCode: "CC-2026-000101",
    reporterId: 1,
    isAnonymous: false,
    categorySlug: "pothole",
    departmentId: 1,
    title: "Large pothole near Miyapur junction",
    description: "A deep pothole is affecting the left lane and is difficult to see after dark. Multiple vehicles have suffered tire damage.",
    status: "in_progress",
    priority: "high",
    latitude: 17.4968,
    longitude: 78.3565,
    address: "Miyapur Main Road, Hyderabad",
    upvoteCount: 82,
    createdAt: new Date(Date.now() - 4 * 86400000),
    updatedAt: new Date(Date.now() - 1 * 86400000),
    resolvedAt: null,
    slaDeadline: new Date(Date.now() + 2 * 86400000),
    closedAt: null,
    citizenVerification: "pending",
    verificationNote: null,
  },
  {
    id: 2,
    referenceCode: "CC-2026-000102",
    reporterId: 2,
    isAnonymous: false,
    categorySlug: "drainage",
    departmentId: 3,
    title: "Drainage blockage and water logging on Hafeezpet road",
    description: "Water is collecting near the main bus stop after light rain. Stagnant sewage water causing foul odor and health concerns.",
    status: "submitted",
    priority: "urgent",
    latitude: 17.4941,
    longitude: 78.3621,
    address: "Hafeezpet Main Road, Hyderabad",
    upvoteCount: 61,
    createdAt: new Date(Date.now() - 2 * 86400000),
    updatedAt: new Date(Date.now() - 2 * 86400000),
    resolvedAt: null,
    slaDeadline: new Date(Date.now() + 1 * 86400000),
    closedAt: null,
    citizenVerification: "pending",
    verificationNote: null,
  },
  {
    id: 3,
    referenceCode: "CC-2026-000103",
    reporterId: 1,
    isAnonymous: false,
    categorySlug: "streetlight",
    departmentId: 4,
    title: "Streetlights out along 3rd Avenue",
    description: "A series of 4 consecutive streetlights have not been working for past 3 days, making the pedestrian walkway completely dark.",
    status: "acknowledged",
    priority: "medium",
    latitude: 17.5002,
    longitude: 78.3511,
    address: "3rd Avenue, Miyapur, Hyderabad",
    upvoteCount: 28,
    createdAt: new Date(Date.now() - 3 * 86400000),
    updatedAt: new Date(Date.now() - 1 * 86400000),
    resolvedAt: null,
    slaDeadline: new Date(Date.now() + 3 * 86400000),
    closedAt: null,
    citizenVerification: "pending",
    verificationNote: null,
  },
  {
    id: 4,
    referenceCode: "CC-2026-000104",
    reporterId: 3,
    isAnonymous: false,
    categorySlug: "garbage",
    departmentId: 2,
    title: "Overflowing community waste bin near market",
    description: "Waste collection point was cleared and sanitation team sanitized the surrounding pavement area.",
    status: "resolved",
    priority: "low",
    latitude: 17.4892,
    longitude: 78.3584,
    address: "Madinaguda Circle, Hyderabad",
    upvoteCount: 42,
    createdAt: new Date(Date.now() - 6 * 86400000),
    updatedAt: new Date(Date.now() - 1 * 86400000),
    resolvedAt: new Date(Date.now() - 1 * 86400000),
    slaDeadline: new Date(Date.now() + 4 * 86400000),
    closedAt: null,
    citizenVerification: "pending",
    verificationNote: null,
  },
  {
    id: 5,
    referenceCode: "CC-2026-000105",
    reporterId: 1,
    isAnonymous: false,
    categorySlug: "water_leak",
    departmentId: 3,
    title: "Pipeline leakage beside Central Park gate",
    description: "Potable water pipeline burst causing clean water wastage and slippery surface on walkway.",
    status: "in_progress",
    priority: "high",
    latitude: 17.5032,
    longitude: 78.3691,
    address: "Miyapur Park Road, Hyderabad",
    upvoteCount: 34,
    createdAt: new Date(Date.now() - 5 * 86400000),
    updatedAt: new Date(Date.now() - 2 * 86400000),
    resolvedAt: null,
    slaDeadline: new Date(Date.now() + 1 * 86400000),
    closedAt: null,
    citizenVerification: "pending",
    verificationNote: null,
  },
  {
    id: 6,
    referenceCode: "CC-2026-000106",
    reporterId: 4,
    isAnonymous: true,
    categorySlug: "tree_hazard",
    departmentId: 5,
    title: "Fallen tree branch obstructing pedestrian path",
    description: "Heavy storm branch fell across sidewalk. Walkers are forced onto the main traffic lane.",
    status: "submitted",
    priority: "medium",
    latitude: 17.4924,
    longitude: 78.3477,
    address: "Miyapur Lake Road, Hyderabad",
    upvoteCount: 19,
    createdAt: new Date(Date.now() - 1 * 86400000),
    updatedAt: new Date(Date.now() - 1 * 86400000),
    resolvedAt: null,
    slaDeadline: new Date(Date.now() + 3 * 86400000),
    closedAt: null,
    citizenVerification: "pending",
    verificationNote: null,
  },
  {
    id: 7,
    referenceCode: "CC-2026-000107",
    reporterId: 1,
    isAnonymous: false,
    categorySlug: "graffiti",
    departmentId: 1,
    title: "Vandalism and unauthorized posters on overpass pillars",
    description: "Fresh spray graffiti and defaced civic directional signage on flyover pillar #12.",
    status: "resolved",
    priority: "low",
    latitude: 17.4988,
    longitude: 78.3533,
    address: "Metro Pillar 12, Miyapur, Hyderabad",
    upvoteCount: 15,
    createdAt: new Date(Date.now() - 8 * 86400000),
    updatedAt: new Date(Date.now() - 3 * 86400000),
    resolvedAt: new Date(Date.now() - 3 * 86400000),
    slaDeadline: new Date(Date.now() + 2 * 86400000),
    closedAt: new Date(Date.now() - 2 * 86400000),
    citizenVerification: "accepted",
    verificationNote: "Cleaned and repainted nicely.",
  },
];

const initialPhotos: MockPhoto[] = [
  { id: 1, issueId: 4, url: "https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=600&auto=format&fit=crop&q=60", kind: "before", createdAt: new Date(Date.now() - 6 * 86400000) },
  { id: 2, issueId: 4, url: "https://images.unsplash.com/photo-1618477461853-cf6ed80faba5?w=600&auto=format&fit=crop&q=60", kind: "after", createdAt: new Date(Date.now() - 1 * 86400000) },
  { id: 3, issueId: 1, url: "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600&auto=format&fit=crop&q=60", kind: "before", createdAt: new Date(Date.now() - 4 * 86400000) },
  { id: 4, issueId: 7, url: "https://images.unsplash.com/photo-1577495508048-b635879837f1?w=600&auto=format&fit=crop&q=60", kind: "before", createdAt: new Date(Date.now() - 8 * 86400000) },
];

const initialHistory: MockStatusHistory[] = [
  { id: 1, issueId: 1, fromStatus: null, toStatus: "submitted", changedById: 1, note: "Report submitted by citizen", createdAt: new Date(Date.now() - 4 * 86400000) },
  { id: 2, issueId: 1, fromStatus: "submitted", toStatus: "acknowledged", changedById: 1, note: "Verified by Roads Department dispatch team", createdAt: new Date(Date.now() - 3 * 86400000) },
  { id: 3, issueId: 1, fromStatus: "acknowledged", toStatus: "in_progress", changedById: 1, note: "Road maintenance crew dispatched with asphalt patcher", createdAt: new Date(Date.now() - 1 * 86400000) },
  { id: 4, issueId: 4, fromStatus: null, toStatus: "submitted", changedById: 3, note: "Report submitted", createdAt: new Date(Date.now() - 6 * 86400000) },
  { id: 5, issueId: 4, fromStatus: "submitted", toStatus: "in_progress", changedById: 1, note: "Sanitation truck assigned", createdAt: new Date(Date.now() - 4 * 86400000) },
  { id: 6, issueId: 4, fromStatus: "in_progress", toStatus: "resolved", changedById: 1, note: "Waste collected and bin disinfected", createdAt: new Date(Date.now() - 1 * 86400000) },
];

class MockDbStore {
  issues: MockIssue[] = [...initialIssues];
  departments: MockDepartment[] = [...initialDepartments];
  photos: MockPhoto[] = [...initialPhotos];
  history: MockStatusHistory[] = [...initialHistory];
  comments: MockComment[] = [];
  upvotes: Array<{ issueId: number; userId: number }> = [
    { issueId: 1, userId: 1 },
    { issueId: 3, userId: 1 },
    { issueId: 5, userId: 1 },
  ];
  private nextIssueId = 8;
  private nextPhotoId = 5;
  private nextHistoryId = 7;

  getIssues() {
    return this.issues;
  }

  getIssueById(id: number) {
    return this.issues.find((i) => i.id === id) || null;
  }

  getDepartment(id: number | null) {
    if (!id) return null;
    return this.departments.find((d) => d.id === id) || null;
  }

  getPhotos(issueId: number) {
    return this.photos.filter((p) => p.issueId === issueId);
  }

  getHistory(issueId: number) {
    return this.history.filter((h) => h.issueId === issueId);
  }

  getComments(issueId: number) {
    return this.comments.filter((c) => c.issueId === issueId);
  }

  hasUserUpvoted(issueId: number, userId: number) {
    return this.upvotes.some((u) => u.issueId === issueId && u.userId === userId);
  }

  toggleUpvote(issueId: number, userId: number) {
    const idx = this.upvotes.findIndex((u) => u.issueId === issueId && u.userId === userId);
    const issue = this.getIssueById(issueId);
    if (idx !== -1) {
      this.upvotes.splice(idx, 1);
      if (issue) issue.upvoteCount = Math.max(0, issue.upvoteCount - 1);
      return false;
    } else {
      this.upvotes.push({ issueId, userId });
      if (issue) issue.upvoteCount += 1;
      return true;
    }
  }

  createIssue(params: {
    reporterId: number;
    isAnonymous: boolean;
    categorySlug: string;
    departmentId: number | null;
    title: string;
    description: string;
    priority: "low" | "medium" | "high" | "urgent";
    latitude: number;
    longitude: number;
    address: string | null;
    photoUrls: string[];
  }) {
    const id = this.nextIssueId++;
    const code = `CC-2026-${String(id).padStart(6, "0")}`;
    const slaHours = params.priority === "urgent" ? 24 : params.priority === "high" ? 72 : params.priority === "medium" ? 120 : 168;

    const newIssue: MockIssue = {
      id,
      referenceCode: code,
      reporterId: params.reporterId,
      isAnonymous: params.isAnonymous,
      categorySlug: params.categorySlug,
      departmentId: params.departmentId,
      title: params.title,
      description: params.description,
      status: "submitted",
      priority: params.priority,
      latitude: params.latitude,
      longitude: params.longitude,
      address: params.address,
      upvoteCount: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      resolvedAt: null,
      slaDeadline: new Date(Date.now() + slaHours * 3600000),
      closedAt: null,
      citizenVerification: "pending",
      verificationNote: null,
    };

    this.issues.unshift(newIssue);
    this.upvotes.push({ issueId: id, userId: params.reporterId });

    this.history.push({
      id: this.nextHistoryId++,
      issueId: id,
      fromStatus: null,
      toStatus: "submitted",
      changedById: params.reporterId,
      note: "Report received from citizen",
      createdAt: new Date(),
    });

    for (const url of params.photoUrls) {
      this.photos.push({
        id: this.nextPhotoId++,
        issueId: id,
        url,
        kind: "before",
        createdAt: new Date(),
      });
    }

    return { id, referenceCode: code };
  }

  updateIssueStatus(params: {
    issueId: number;
    status: MockIssue["status"];
    changedById: number;
    note?: string;
    departmentId?: number;
    afterPhotoUrl?: string;
  }) {
    const issue = this.getIssueById(params.issueId);
    if (!issue) return false;

    const prevStatus = issue.status;
    issue.status = params.status;
    issue.updatedAt = new Date();
    if (params.departmentId) issue.departmentId = params.departmentId;
    if (params.status === "resolved") issue.resolvedAt = new Date();
    if (params.status === "closed") issue.closedAt = new Date();

    if (params.afterPhotoUrl) {
      this.photos.push({
        id: this.nextPhotoId++,
        issueId: params.issueId,
        url: params.afterPhotoUrl,
        kind: "after",
        createdAt: new Date(),
      });
    }

    this.history.push({
      id: this.nextHistoryId++,
      issueId: params.issueId,
      fromStatus: prevStatus,
      toStatus: params.status,
      changedById: params.changedById,
      note: params.note || null,
      createdAt: new Date(),
    });

    return true;
  }

  verifyResolution(params: {
    issueId: number;
    result: "accepted" | "rejected";
    changedById: number;
    note?: string;
  }) {
    const issue = this.getIssueById(params.issueId);
    if (!issue) return null;

    const nextStatus = params.result === "accepted" ? "closed" : "reopened";
    issue.citizenVerification = params.result;
    issue.verificationNote = params.note || null;
    issue.status = nextStatus;
    issue.updatedAt = new Date();
    if (params.result === "accepted") issue.closedAt = new Date();

    this.history.push({
      id: this.nextHistoryId++,
      issueId: params.issueId,
      fromStatus: "resolved",
      toStatus: nextStatus,
      changedById: params.changedById,
      note: params.note || (params.result === "accepted" ? "Citizen verified resolution" : "Citizen reported issue still persists"),
      createdAt: new Date(),
    });

    return nextStatus;
  }

  getStats() {
    const total = this.issues.length;
    const statusCounts = new Map<string, number>();
    const categoryCounts = new Map<string, number>();

    for (const issue of this.issues) {
      statusCounts.set(issue.status, (statusCounts.get(issue.status) || 0) + 1);
      categoryCounts.set(issue.categorySlug, (categoryCounts.get(issue.categorySlug) || 0) + 1);
    }

    const byStatus = Array.from(statusCounts.entries()).map(([status, count]) => ({ status, count }));
    const byCategory = Array.from(categoryCounts.entries()).map(([category, count]) => ({ category, count }));

    return { byStatus, byCategory, total };
  }
}

export const mockDb = new MockDbStore();
