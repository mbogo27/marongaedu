"use client";

import { useActionState, useEffect, type ReactNode } from "react";
import Modal from "./Modal";
import ImageUrlField from "./ImageUrlField";
import { saveCategoryAction, type CategoryState } from "@/lib/actions/admin/categories";

type Category = { id: string; name: string; slug: string; description: string | null; iconUrl: string | null; sortOrder: number };

const input = "mt-1 w-full rounded-lg border border-teal-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30";

function Body({ category, close }: { category?: Category; close: () => void }) {
  const [state, action, pending] = useActionState<CategoryState, FormData>(saveCategoryAction.bind(null, category?.id ?? null), undefined);
  useEffect(() => {
    if (state?.ok) close();
  }, [state, close]);
  return (
    <form action={action} className="mt-4 space-y-3">
      <label className="block text-xs font-medium text-ink/80">
        Name
        <input name="name" defaultValue={category?.name} required className={input} />
      </label>
      <label className="block text-xs font-medium text-ink/80">
        Slug (optional, generated from the name)
        <input name="slug" defaultValue={category?.slug} className={input} />
      </label>
      <label className="block text-xs font-medium text-ink/80">
        Description
        <textarea name="description" defaultValue={category?.description ?? ""} rows={2} className={input} />
      </label>
      <ImageUrlField label="Icon (upload) — or type an icon name below" name="iconUrl" target="siteAsset" defaultValue={category?.iconUrl ?? ""} />
      <label className="block text-xs font-medium text-ink/80">
        Sort order
        <input name="sortOrder" type="number" defaultValue={category?.sortOrder ?? 0} className={input} />
      </label>
      {state?.error && <p role="alert" className="text-sm text-red-700">{state.error}</p>}
      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={pending} className="flex-1 rounded-full bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60">
          {pending ? "Saving…" : "Save"}
        </button>
        <button type="button" onClick={close} className="flex-1 rounded-full border border-teal-300 px-4 py-2 text-sm font-medium text-ink/80 hover:bg-teal-50">
          Cancel
        </button>
      </div>
    </form>
  );
}

export default function CategoryModal({ category, trigger, triggerClassName }: { category?: Category; trigger: ReactNode; triggerClassName?: string }) {
  return (
    <Modal title={category ? "Edit category" : "New category"} trigger={trigger} triggerClassName={triggerClassName}>
      {(close) => <Body category={category} close={close} />}
    </Modal>
  );
}
