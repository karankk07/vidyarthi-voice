import { createClient } from "@supabase/supabase-js";
import { Api, Comment, Frequency, Issue, IssueUpdate, Status, User } from "./types";
import { isAllowedEmail } from "./util";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

export function makeSupabaseApi(url: string, key: string): Api {
  const sb = createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true } });

  const toIssue = (r: Row): Issue => ({
    id: r.id,
    title: r.title,
    details: r.details,
    suggestedFix: r.suggested_fix,
    category: r.category,
    location: r.location,
    frequency: r.frequency as Frequency,
    bodyId: r.body_id,
    status: r.status as Status,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    firstResponseAt: r.first_response_at,
    supportCount: r.support_count,
    supports7d: r.supports_7d,
    commentCount: r.comment_count,
    confirmYes: r.confirm_yes,
    confirmNo: r.confirm_no,
    isMine: !!r.is_mine,
    supportedByMe: !!r.supported_by_me,
    myConfirmation: r.my_confirmation ?? null,
  });

  const check = <T>(res: { data: T; error: any }) => {
    if (res.error) throw new Error(friendly(res.error.message));
    return res.data;
  };

  async function uid() {
    const { data } = await sb.auth.getUser();
    if (!data.user) throw new Error("Please sign in first.");
    return data.user.id;
  }

  return {
    mode: "live",
    async getUser(): Promise<User | null> {
      const { data } = await sb.auth.getSession();
      const email = data.session?.user.email?.toLowerCase();
      if (!email) return null;
      const [members, mods] = await Promise.all([
        sb.from("body_members").select("body_id").eq("email", email),
        sb.from("moderators").select("email").eq("email", email),
      ]);
      const isModerator = (mods.data || []).length > 0;
      const bodies = (members.data || []).map((m: Row) => m.body_id);
      // Moderators can respond for any body (the database allows it too).
      return { email, responderFor: isModerator ? ["*", ...bodies] : bodies, isModerator };
    },
    onAuthChange(cb) {
      const { data } = sb.auth.onAuthStateChange(() => cb());
      return () => data.subscription.unsubscribe();
    },
    async sendCode(email) {
      if (!isAllowedEmail(email)) throw new Error("Use your IIM Calcutta email address.");
      check(await sb.auth.signInWithOtp({ email: email.trim().toLowerCase(), options: { shouldCreateUser: true } }));
    },
    async verifyCode(email, code) {
      check(await sb.auth.verifyOtp({ email: email.trim().toLowerCase(), token: code.trim(), type: "email" }));
    },
    async signOut() {
      await sb.auth.signOut();
    },
    async listIssues() {
      const rows = check(await sb.from("issue_feed").select("*").eq("hidden", false).limit(2000));
      return (rows as Row[]).map(toIssue);
    },
    async getIssue(id) {
      const [i, u, c] = await Promise.all([
        sb.from("issue_feed").select("*").eq("id", id).maybeSingle(),
        sb.from("update_feed").select("*").eq("issue_id", id).order("created_at"),
        sb.from("comment_feed").select("*").eq("issue_id", id).order("created_at"),
      ]);
      const row = check(i);
      if (!row) return null;
      return {
        issue: toIssue(row),
        updates: (check(u) as Row[]).map(
          (r): IssueUpdate => ({ id: r.id, issueId: r.issue_id, bodyId: r.body_id, status: r.status, message: r.message, createdAt: r.created_at }),
        ),
        comments: (check(c) as Row[]).map(
          (r): Comment => ({ id: r.id, issueId: r.issue_id, bodyId: r.body_id, message: r.message, createdAt: r.created_at, isMine: !!r.is_mine }),
        ),
      };
    },
    async createIssue(n) {
      return check(
        await sb.rpc("create_issue", {
          p_title: n.title, p_details: n.details, p_suggested_fix: n.suggestedFix, p_category: n.category,
          p_location: n.location, p_frequency: n.frequency, p_body_id: n.bodyId,
        }),
      ) as string;
    },
    async toggleSupport(issueId) {
      const me = await uid();
      const existing = check(await sb.from("supports").select("issue_id").eq("issue_id", issueId).eq("user_id", me));
      if ((existing as Row[]).length) check(await sb.from("supports").delete().eq("issue_id", issueId).eq("user_id", me));
      else check(await sb.from("supports").insert({ issue_id: issueId, user_id: me }));
    },
    async addComment(issueId, message, asBody) {
      check(await sb.rpc("add_comment", { p_issue: issueId, p_message: message, p_as_body: asBody }));
    },
    async addUpdate(issueId, asBody, status, message, redirectTo) {
      check(await sb.rpc("post_update", { p_issue: issueId, p_as_body: asBody, p_status: status, p_message: message, p_redirect_to: redirectTo ?? null }));
    },
    async confirmFix(issueId, fixed) {
      check(await sb.rpc("confirm_fix", { p_issue: issueId, p_fixed: fixed }));
    },
    async report(issueId, reason) {
      check(await sb.rpc("report_issue", { p_issue: issueId, p_reason: reason }));
    },
  };
}

function friendly(msg: string) {
  if (/Database error saving new user/i.test(msg)) return "Only IIM Calcutta email addresses can sign in.";
  if (/check constraint.*title/i.test(msg)) return "Title should be 8 to 120 characters.";
  if (/check constraint.*details/i.test(msg)) return "Details should be 20 to 2000 characters.";
  if (/rate limit/i.test(msg)) return "Too many attempts. Please wait a minute and try again.";
  return msg;
}
