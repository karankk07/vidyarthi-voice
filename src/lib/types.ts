export type Status =
  | "new"
  | "acknowledged"
  | "taken_up"
  | "in_progress"
  | "resolved"
  | "cant_fix"
  | "redirected";

export const STATUS_ORDER: Status[] = [
  "new",
  "acknowledged",
  "taken_up",
  "in_progress",
  "resolved",
];

export const STATUS_LABEL: Record<Status, string> = {
  new: "New",
  acknowledged: "Acknowledged",
  taken_up: "Taken up",
  in_progress: "In progress",
  resolved: "Resolved",
  cant_fix: "Can't fix",
  redirected: "Redirected",
};

/** Statuses that mean the issue is closed. */
export const CLOSED: Status[] = ["resolved", "cant_fix"];

export type Frequency = "Daily" | "Weekly" | "Monthly" | "Occasional";

export interface Issue {
  id: string;
  title: string;
  details: string;
  suggestedFix: string;
  category: string;
  location: string;
  frequency: Frequency;
  bodyId: string;
  status: Status;
  createdAt: string;
  updatedAt: string;
  firstResponseAt: string | null;
  supportCount: number;
  supports7d: number;
  commentCount: number;
  confirmYes: number;
  confirmNo: number;
  isMine: boolean;
  supportedByMe: boolean;
  myConfirmation: boolean | null;
}

export interface IssueUpdate {
  id: string;
  issueId: string;
  bodyId: string;
  status: Status;
  message: string;
  createdAt: string;
}

export interface Comment {
  id: string;
  issueId: string;
  message: string;
  createdAt: string;
  /** Set when a verified responder commented on behalf of a body. */
  bodyId: string | null;
  isMine: boolean;
}

export interface IssueDetail {
  issue: Issue;
  updates: IssueUpdate[];
  comments: Comment[];
}

export interface User {
  email: string;
  /** Bodies this user can respond for. */
  responderFor: string[];
  isModerator: boolean;
}

export interface NewIssue {
  title: string;
  details: string;
  suggestedFix: string;
  category: string;
  location: string;
  frequency: Frequency;
  bodyId: string;
}

export interface Api {
  mode: "demo" | "live";
  getUser(): Promise<User | null>;
  onAuthChange(cb: () => void): () => void;
  sendCode(email: string): Promise<void>;
  verifyCode(email: string, code: string): Promise<void>;
  signOut(): Promise<void>;
  listIssues(): Promise<Issue[]>;
  getIssue(id: string): Promise<IssueDetail | null>;
  createIssue(input: NewIssue): Promise<string>;
  toggleSupport(issueId: string): Promise<void>;
  addComment(issueId: string, message: string, asBody: string | null): Promise<void>;
  /** Post a status update as a body. For "redirected", pass the body that should own it next. */
  addUpdate(issueId: string, asBody: string, status: Status, message: string, redirectTo?: string): Promise<void>;
  confirmFix(issueId: string, fixed: boolean): Promise<void>;
  report(issueId: string, reason: string): Promise<void>;
}
