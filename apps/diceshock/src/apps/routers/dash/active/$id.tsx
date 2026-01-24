import {
  ArrowBendUpRightIcon,
  ArrowLeftIcon,
  PencilLineIcon,
  PlusIcon,
  TrashIcon,
  UsersIcon,
  XIcon,
} from "@phosphor-icons/react/dist/ssr";
import { createFileRoute, Link } from "@tanstack/react-router";
import MDEditor from "@uiw/react-md-editor";
import clsx from "clsx";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "@uiw/react-md-editor/markdown-editor.css";
import { useMsg } from "@/client/components/diceshock/Msg";
import { trpcClientDash } from "@/shared/utils/trpc";

type TagList = Awaited<ReturnType<typeof trpcClientDash.activeTags.get.query>>;
type TagItem = TagList[number];

const tagTitle = (tag?: TagItem["title"] | null) => ({
  emoji: tag?.emoji ?? "🏷️",
  tx: tag?.tx ?? "未命名",
});

export const Route = createFileRoute("/dash/active/$id")({
  component: RouteComponent,
});

function RouteComponent() {
  const { id } = Route.useParams();
  const msg = useMsg();
  const [content, setContent] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [coverImage, setCoverImage] = useState<string>("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isPublished, setIsPublished] = useState<boolean>(false);
  const [isDeleted, setIsDeleted] = useState<boolean>(false);
  const [enableRegistration, setEnableRegistration] = useState<boolean>(false);
  const [allowWatching, setAllowWatching] = useState<boolean>(false);
  const [active, setActive] = useState<Awaited<
    ReturnType<typeof trpcClientDash.active.getById.query>
  > | null>(null);
  const [tags, setTags] = useState<TagItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tagDraft, setTagDraft] = useState({ emoji: "", tx: "" });
  const [activeTab, setActiveTab] = useState<"edit" | "registrations">("edit");

  // 报名管理相关状态
  const [teams, setTeams] = useState<
    Awaited<
      ReturnType<typeof trpcClientDash.activeRegistrations.teams.get.query>
    >
  >([]);
  const [registrations, setRegistrations] = useState<
    Awaited<
      ReturnType<
        typeof trpcClientDash.activeRegistrations.registrations.get.query
      >
    >
  >([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const fetchTags = useCallback(async () => {
    try {
      const data = await trpcClientDash.activeTags.get.query();
      setTags(data);
    } catch (error) {
      console.error("获取标签失败", error);
    }
  }, []);

  const fetchActive = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await trpcClientDash.active.getById.query({ id });
      setActive(data);
      if (data) {
        setContent(data.content || "");
        setName(data.name || "");
        setDescription(data.description || "");
        setCoverImage(data.cover_image || "");
        setSelectedTags(data.tags?.map((t) => t.tag_id) || []);
        setIsPublished(Boolean(data.is_published));
        setIsDeleted(Boolean(data.is_deleted));
        setEnableRegistration(Boolean(data.enable_registration));
        setAllowWatching(Boolean(data.allow_watching));
      }
    } catch (error) {
      msg.error("获取活动失败");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [id, msg]);

  const fetchTeams = useCallback(async () => {
    if (!id) return;
    try {
      const data = await trpcClientDash.activeRegistrations.teams.get.query({
        active_id: id,
      });
      setTeams(data);
    } catch (error) {
      console.error("获取队伍失败", error);
    }
  }, [id]);

  const fetchRegistrations = useCallback(async () => {
    if (!id) return;
    try {
      const data =
        await trpcClientDash.activeRegistrations.registrations.get.query({
          active_id: id,
        });
      setRegistrations(data);
    } catch (error) {
      console.error("获取报名失败", error);
    }
  }, [id]);

  useEffect(() => {
    fetchTags();
    fetchActive();
  }, [fetchTags, fetchActive]);

  useEffect(() => {
    if (activeTab === "registrations" && id && enableRegistration) {
      fetchTeams();
      fetchRegistrations();
    }
  }, [activeTab, id, enableRegistration, fetchTeams, fetchRegistrations]);

  // 如果关闭报名功能，自动切换回编辑 Tab
  useEffect(() => {
    if (!enableRegistration && activeTab === "registrations") {
      setActiveTab("edit");
    }
  }, [enableRegistration, activeTab]);

  const availableTags = useMemo(
    () =>
      tags.sort((a, b) => {
        const aSelected = selectedTags.includes(a.id);
        const bSelected = selectedTags.includes(b.id);
        if (aSelected && !bSelected) return -1;
        if (!aSelected && bSelected) return 1;
        return (a.title?.tx ?? "").localeCompare(b.title?.tx ?? "");
      }),
    [tags, selectedTags],
  );

  const handleCreateTag = useCallback(async () => {
    if (!active || !tagDraft.tx.trim()) {
      if (!tagDraft.tx.trim()) {
        msg.warning("请输入标签名称");
      }
      return;
    }
    try {
      const result = await trpcClientDash.activeTags.insert.mutate([
        {
          activeId: active.id,
          title: {
            emoji: tagDraft.emoji.trim() || "🏷️",
            tx: tagDraft.tx.trim(),
          },
        },
      ]);

      const created = result.find(
        (tag): tag is TagItem => tag && "id" in tag && "title" in tag,
      );
      if (!created) {
        msg.error("标签创建失败");
        return;
      }

      setTags((prev) => [...prev, created]);
      setSelectedTags((prev) => [...prev, created.id]);
      setTagDraft({ emoji: "", tx: "" });
      msg.success("标签创建成功");
    } catch (error) {
      msg.error("创建标签失败");
      console.error(error);
    }
  }, [active, tagDraft, msg]);

  // 立即保存状态字段（发布状态、垃圾桶、开启报名、允许观望）
  const handleSaveStatus = useCallback(
    async (updates: {
      is_published?: boolean;
      is_deleted?: boolean;
      enable_registration?: boolean;
      allow_watching?: boolean;
    }) => {
      if (!active) return;

      try {
        await trpcClientDash.active.mutation.mutate({
          id: active.id,
          ...updates,
        });
        await fetchActive();
      } catch (error) {
        msg.error(error instanceof Error ? error.message : "保存失败");
        console.error(error);
        // 恢复状态
        await fetchActive();
      }
    },
    [active, fetchActive, msg],
  );

  const handleSave = async () => {
    if (!active) return;

    try {
      setSaving(true);
      await trpcClientDash.active.mutation.mutate({
        id: active.id,
        name,
        description,
        content,
        cover_image: coverImage.trim() ? coverImage.trim() : null,
        tags: selectedTags,
        is_published: isPublished,
        is_deleted: isDeleted,
        enable_registration: enableRegistration,
        allow_watching: allowWatching,
      });
      msg.success("保存成功");
      await fetchActive();
    } catch (error) {
      msg.error("保存失败");
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="size-full p-4 flex items-center justify-center">
        <span className="loading loading-dots loading-md"></span>
      </main>
    );
  }

  if (!active) {
    return (
      <main className="size-full p-4 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">活动不存在</h2>
          <Link to="/dash/acitve" className="btn btn-primary">
            返回列表
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="size-full flex flex-col">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-base-100/95 backdrop-blur-sm border-b border-base-300 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            {/* 第一行：返回按钮和操作按钮 */}
            <div className="flex items-center justify-between w-full sm:w-auto gap-2">
              <Link to="/dash/acitve" className="btn btn-ghost btn-sm">
                <ArrowLeftIcon className="size-4" />
                <span className="hidden sm:inline">返回</span>
              </Link>
              <div className="flex items-center gap-2 sm:hidden">
                {active && (
                  <button
                    type="button"
                    onClick={() => {
                      window.open(
                        new URL(
                          `/dash/active/preview/${active.id}`,
                          window.location.origin,
                        ).href,
                        "_blank",
                        "noopener,noreferrer",
                      );
                    }}
                    className="btn btn-ghost btn-sm btn-square"
                  >
                    <ArrowBendUpRightIcon className="size-4" />
                  </button>
                )}
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="btn btn-primary btn-sm"
                >
                  {saving && (
                    <span className="loading loading-spinner loading-sm" />
                  )}
                  <span className="hidden sm:inline">保存</span>
                  <span className="sm:hidden">保存</span>
                </button>
              </div>
            </div>

            {/* 中间：状态控制 */}
            <div className="flex items-center justify-center gap-3 sm:gap-4 flex-wrap sm:flex-nowrap">
              <label
                className={`label gap-2 ${isDeleted ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
              >
                <span className="label-text text-xs sm:text-sm whitespace-nowrap">
                  发布状态
                </span>
                <input
                  type="checkbox"
                  className="toggle toggle-sm"
                  checked={isPublished}
                  disabled={isDeleted}
                  onChange={async (evt) => {
                    const newValue = evt.target.checked;
                    setIsPublished(newValue);
                    await handleSaveStatus({ is_published: newValue });
                  }}
                />
              </label>
              <label className="label cursor-pointer gap-2">
                <span className="label-text text-xs sm:text-sm whitespace-nowrap">
                  垃圾桶
                </span>
                <input
                  type="checkbox"
                  className="toggle toggle-sm toggle-error"
                  checked={isDeleted}
                  onChange={async (evt) => {
                    const newValue = evt.target.checked;
                    setIsDeleted(newValue);
                    await handleSaveStatus({ is_deleted: newValue });
                  }}
                />
              </label>
              <label className="label cursor-pointer gap-2">
                <span className="label-text text-xs sm:text-sm whitespace-nowrap">
                  开启报名
                </span>
                <input
                  type="checkbox"
                  className="toggle toggle-sm toggle-primary"
                  checked={enableRegistration}
                  disabled={isDeleted}
                  onChange={async (evt) => {
                    const newValue = evt.target.checked;
                    setEnableRegistration(newValue);
                    // 如果关闭报名，自动关闭观望
                    if (!newValue && allowWatching) {
                      setAllowWatching(false);
                      await handleSaveStatus({
                        enable_registration: newValue,
                        allow_watching: false,
                      });
                    } else {
                      await handleSaveStatus({
                        enable_registration: newValue,
                      });
                    }
                  }}
                />
              </label>
              <label
                className={`label gap-2 ${!enableRegistration || isDeleted ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
              >
                <span className="label-text text-xs sm:text-sm whitespace-nowrap">
                  允许观望
                </span>
                <input
                  type="checkbox"
                  className="toggle toggle-sm toggle-secondary"
                  checked={allowWatching}
                  disabled={!enableRegistration || isDeleted}
                  onChange={async (evt) => {
                    const newValue = evt.target.checked;
                    setAllowWatching(newValue);
                    await handleSaveStatus({
                      allow_watching: newValue,
                    });
                  }}
                />
              </label>
            </div>

            {/* 右侧：预览和保存按钮（桌面端） */}
            <div className="hidden sm:flex items-center gap-2">
              {active && (
                <Link
                  to="/dash/active/preview/$id"
                  params={{ id: active.id }}
                  className="btn btn-ghost btn-sm"
                >
                  预览
                  <ArrowBendUpRightIcon className="size-4" />
                </Link>
              )}
              <button
                onClick={handleSave}
                disabled={saving}
                className="btn btn-primary btn-sm"
              >
                {saving && (
                  <span className="loading loading-spinner loading-sm" />
                )}
                保存
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <div className="max-w-4xl mx-auto flex flex-col gap-4">
          {/* Tab 导航 */}
          <div role="tablist" className="tabs tabs-border">
            <button
              role="tab"
              className={clsx("tab", activeTab === "edit" && "tab-active")}
              onClick={() => setActiveTab("edit")}
            >
              <PencilLineIcon className="size-4 mr-1" />
              编辑活动
            </button>
            <button
              role="tab"
              className={clsx(
                "tab",
                activeTab === "registrations" && "tab-active",
                !enableRegistration && "opacity-50 cursor-not-allowed",
              )}
              onClick={() => {
                if (enableRegistration) {
                  setActiveTab("registrations");
                } else {
                  msg.warning("请先开启报名功能");
                }
              }}
              disabled={!enableRegistration}
            >
              <UsersIcon className="size-4 mr-1" />
              报名管理
            </button>
          </div>

          {/* 编辑 Tab */}
          {activeTab === "edit" && (
            <>
              {/* 基本信息 */}
              <div className="card bg-base-100 shadow-sm">
                <div className="card-body">
                  <h2 className="card-title">基本信息</h2>
                  <div className="flex flex-col gap-4">
                    <input
                      type="text"
                      className="input input-bordered"
                      placeholder="活动名称"
                      value={name}
                      onChange={(evt) => setName(evt.target.value)}
                    />
                    <textarea
                      className="textarea textarea-bordered h-24"
                      placeholder="活动简介"
                      value={description}
                      onChange={(evt) => setDescription(evt.target.value)}
                    />
                    <div className="flex flex-col gap-2">
                      <label className="label">
                        <span className="label-text">头图 URL</span>
                      </label>
                      <input
                        type="text"
                        className="input input-bordered"
                        placeholder="输入头图 URL"
                        value={coverImage}
                        onChange={(evt) => setCoverImage(evt.target.value)}
                      />
                      {coverImage && (
                        <div className="mt-2">
                          <img
                            src={coverImage}
                            alt="头图预览"
                            className="w-full max-h-64 object-cover rounded-lg"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display =
                                "none";
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* 标签 */}
              <div className="card bg-base-100 shadow-sm">
                <div className="card-body">
                  <h2 className="card-title">标签</h2>
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-wrap gap-2">
                      {availableTags.map((tag) => {
                        const title = tagTitle(tag.title);
                        const checked = selectedTags.includes(tag.id);
                        return (
                          <label
                            key={tag.id}
                            className="badge badge-lg gap-2 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              className="checkbox checkbox-sm"
                              checked={checked}
                              onChange={() =>
                                setSelectedTags((prev) =>
                                  checked
                                    ? prev.filter((id) => id !== tag.id)
                                    : [...prev, tag.id],
                                )
                              }
                            />
                            <span>{title.emoji}</span>
                            {title.tx}
                          </label>
                        );
                      })}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <EmojiPicker
                        value={tagDraft.emoji}
                        onChange={(emoji) =>
                          setTagDraft((prev) => ({ ...prev, emoji }))
                        }
                      />
                      <input
                        className="input input-bordered input-sm flex-1 min-w-40"
                        placeholder="标签名称"
                        value={tagDraft.tx}
                        onChange={(evt) =>
                          setTagDraft((prev) => ({
                            ...prev,
                            tx: evt.target.value,
                          }))
                        }
                      />
                      <button
                        type="button"
                        className="btn btn-sm btn-secondary"
                        onClick={handleCreateTag}
                      >
                        新建标签
                        <PlusIcon className="size-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* 内容编辑 */}
              <div className="card bg-base-100 shadow-sm">
                <div className="card-body">
                  <h2 className="card-title">内容</h2>
                  <div data-color-mode="light">
                    <MDEditor
                      value={content}
                      onChange={(value) => setContent(value || "")}
                      height={600}
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {/* 报名管理 Tab - 仅在开启报名时显示 */}
          {activeTab === "registrations" && enableRegistration && (
            <RegistrationsTab
              activeId={id}
              teams={teams}
              registrations={registrations}
              onRefresh={() => {
                fetchTeams();
                fetchRegistrations();
              }}
              onUserClick={setSelectedUserId}
            />
          )}
        </div>
      </div>

      {/* 用户详情弹窗 */}
      {selectedUserId && (
        <UserDetailsModal
          userId={selectedUserId}
          onClose={() => setSelectedUserId(null)}
        />
      )}
    </main>
  );
}

type EmojiPickerProps = {
  value: string;
  onChange: (value: string) => void;
};

function EmojiPicker({ value, onChange }: EmojiPickerProps) {
  const [inputValue, setInputValue] = useState(value);
  const selectRef = useRef<HTMLSelectElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const commonEmojis = [
    "🏷️",
    "📝",
    "📌",
    "⭐",
    "🔥",
    "💡",
    "🎯",
    "✅",
    "❌",
    "⚠️",
    "📅",
    "📊",
    "📈",
    "📉",
    "🎉",
    "🎊",
    "🎁",
    "🎈",
    "🎀",
    "🎪",
    "🏠",
    "🏢",
    "🏫",
    "🏥",
    "🏪",
    "🏨",
    "🏰",
    "⛪",
    "🕌",
    "🕍",
    "🚗",
    "🚕",
    "🚙",
    "🚌",
    "🚎",
    "🏎️",
    "🚓",
    "🚑",
    "🚒",
    "🚐",
    "😀",
    "😃",
    "😄",
    "😁",
    "😆",
    "😅",
    "🤣",
    "😂",
    "🙂",
    "🙃",
    "😉",
    "😊",
    "😇",
    "🥰",
    "😍",
    "🤩",
    "😘",
    "😗",
    "😚",
    "😙",
    "🥳",
    "🤗",
    "🤔",
    "🤨",
    "😐",
    "😑",
    "😶",
    "🙄",
    "😏",
    "😣",
  ];

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const handleInputChange = (evt: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = evt.target.value;
    setInputValue(newValue);
    onChange(newValue);
  };

  const handleSelectChange = (evt: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedValue = evt.target.value;
    if (selectedValue && selectedValue !== "") {
      onChange(selectedValue);
      setInputValue(selectedValue);
      if (selectRef.current) {
        selectRef.current.value = "";
      }
    }
  };

  return (
    <div className="relative flex gap-1">
      <input
        ref={inputRef}
        type="text"
        className="input input-bordered input-sm w-20"
        placeholder="Emoji"
        value={inputValue}
        onChange={handleInputChange}
      />
      <select
        ref={selectRef}
        defaultValue=""
        className="select select-bordered select-sm w-20"
        onChange={handleSelectChange}
      >
        <option value="" disabled>
          😀
        </option>
        {commonEmojis.map((emoji, idx) => (
          <option key={idx} value={emoji}>
            {emoji}
          </option>
        ))}
      </select>
    </div>
  );
}

// 报名管理 Tab 组件
type RegistrationsTabProps = {
  activeId: string;
  teams: Awaited<
    ReturnType<typeof trpcClientDash.activeRegistrations.teams.get.query>
  >;
  registrations: Awaited<
    ReturnType<
      typeof trpcClientDash.activeRegistrations.registrations.get.query
    >
  >;
  onRefresh: () => void;
  onUserClick: (userId: string) => void;
};

function RegistrationsTab({
  activeId,
  teams,
  registrations,
  onRefresh,
  onUserClick,
}: RegistrationsTabProps) {
  const msg = useMsg();
  const [teamForm, setTeamForm] = useState({
    name: "",
    description: "",
    max_participants: "",
  });
  const [editingTeam, setEditingTeam] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const handleCreateTeam = async () => {
    if (!teamForm.name.trim()) {
      msg.warning("请输入队伍名称");
      return;
    }

    try {
      setCreating(true);
      await trpcClientDash.activeRegistrations.teams.create.mutate({
        active_id: activeId,
        name: teamForm.name.trim(),
        description: teamForm.description.trim() || undefined,
        max_participants: teamForm.max_participants
          ? parseInt(teamForm.max_participants, 10)
          : null,
      });
      msg.success("队伍创建成功");
      setTeamForm({ name: "", description: "", max_participants: "" });
      onRefresh();
    } catch (error) {
      msg.error(error instanceof Error ? error.message : "创建队伍失败");
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateTeam = async (
    teamId: string,
    updates: {
      name?: string;
      description?: string;
      max_participants?: number | null;
    },
  ) => {
    try {
      await trpcClientDash.activeRegistrations.teams.update.mutate({
        id: teamId,
        ...updates,
      });
      msg.success("队伍更新成功");
      setEditingTeam(null);
      onRefresh();
    } catch (error) {
      msg.error(error instanceof Error ? error.message : "更新队伍失败");
    }
  };

  const handleDeleteTeam = async (teamId: string) => {
    // 按创建时间排序，第一个队伍不能删除
    const sortedTeams = [...teams].sort((a, b) => {
      const aTime = a.create_at ? new Date(a.create_at).getTime() : 0;
      const bTime = b.create_at ? new Date(b.create_at).getTime() : 0;
      return aTime - bTime;
    });

    if (sortedTeams.length > 0 && sortedTeams[0].id === teamId) {
      msg.warning("不能删除第一个队伍");
      return;
    }

    if (teams.length <= 1) {
      msg.warning("至少需要保留一个队伍");
      return;
    }

    if (!confirm("确定要删除此队伍吗？")) return;

    try {
      await trpcClientDash.activeRegistrations.teams.delete.mutate({
        id: teamId,
      });
      msg.success("队伍删除成功");
      onRefresh();
    } catch (error) {
      msg.error(error instanceof Error ? error.message : "删除队伍失败");
    }
  };

  const watchingCount = registrations.filter((r) => r.is_watching).length;
  const participatingCount = registrations.filter((r) => !r.is_watching).length;

  return (
    <div className="flex flex-col gap-4">
      {/* 统计信息 */}
      <div className="stats stats-horizontal shadow w-full">
        <div className="stat">
          <div className="stat-title">队伍数</div>
          <div className="stat-value">{teams.length}</div>
        </div>
        <div className="stat">
          <div className="stat-title">已报名</div>
          <div className="stat-value">{participatingCount}</div>
        </div>
        <div className="stat">
          <div className="stat-title">观望中</div>
          <div className="stat-value">{watchingCount}</div>
        </div>
      </div>

      {/* 队伍管理 */}
      <div className="card bg-base-100 shadow-sm">
        <div className="card-body">
          <h2 className="card-title">队伍管理</h2>
          <div className="flex flex-col gap-4">
            {/* 创建队伍表单 */}
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  className="input input-bordered flex-1"
                  placeholder="队伍名称"
                  value={teamForm.name}
                  onChange={(e) =>
                    setTeamForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                />
                <input
                  type="number"
                  className="input input-bordered w-32"
                  placeholder="人数上限（留空无上限）"
                  value={teamForm.max_participants}
                  onChange={(e) =>
                    setTeamForm((prev) => ({
                      ...prev,
                      max_participants: e.target.value,
                    }))
                  }
                  min="1"
                />
                <button
                  className="btn btn-primary"
                  onClick={handleCreateTeam}
                  disabled={creating}
                >
                  <PlusIcon className="size-4" />
                  创建队伍
                </button>
              </div>
              <textarea
                className="textarea textarea-bordered textarea-sm"
                placeholder="队伍描述（可选）"
                value={teamForm.description}
                onChange={(e) =>
                  setTeamForm((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                rows={2}
              />
            </div>

            {/* 队伍列表 */}
            <div className="flex flex-col gap-2">
              {teams.length === 0 ? (
                <p className="text-base-content/50 text-center py-4">
                  暂无队伍，请先创建至少一个队伍
                </p>
              ) : (
                (() => {
                  // 按创建时间排序，第一个队伍不能删除
                  const sortedTeams = [...teams].sort((a, b) => {
                    const aTime = a.create_at
                      ? new Date(a.create_at).getTime()
                      : 0;
                    const bTime = b.create_at
                      ? new Date(b.create_at).getTime()
                      : 0;
                    return aTime - bTime;
                  });
                  const firstTeamId = sortedTeams[0]?.id;

                  return teams.map((team) => {
                    const isFirstTeam = team.id === firstTeamId;
                    return (
                      <div
                        key={team.id}
                        className="flex items-center justify-between p-3 border border-base-300 rounded-lg"
                      >
                        <div className="flex-1">
                          {editingTeam === team.id ? (
                            <div className="flex flex-col gap-2">
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  className="input input-sm input-bordered flex-1"
                                  defaultValue={team.name}
                                  onBlur={(e) => {
                                    if (e.target.value !== team.name) {
                                      handleUpdateTeam(team.id, {
                                        name: e.target.value,
                                      });
                                    }
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      e.currentTarget.blur();
                                    }
                                  }}
                                  autoFocus
                                />
                                <input
                                  type="number"
                                  className="input input-sm input-bordered w-24"
                                  defaultValue={team.max_participants ?? ""}
                                  placeholder="无上限"
                                  onBlur={(e) => {
                                    const value = e.target.value
                                      ? parseInt(e.target.value, 10)
                                      : null;
                                    if (value !== team.max_participants) {
                                      handleUpdateTeam(team.id, {
                                        max_participants: value,
                                      });
                                    }
                                  }}
                                  min="1"
                                />
                              </div>
                              <textarea
                                className="textarea textarea-sm textarea-bordered"
                                defaultValue={team.description ?? ""}
                                placeholder="队伍描述（可选）"
                                onBlur={(e) => {
                                  const newDescription =
                                    e.target.value.trim() || undefined;
                                  if (
                                    newDescription !==
                                    (team.description || undefined)
                                  ) {
                                    handleUpdateTeam(team.id, {
                                      description: newDescription,
                                    });
                                  }
                                }}
                                rows={2}
                              />
                            </div>
                          ) : (
                            <div>
                              <div className="font-semibold">{team.name}</div>
                              {team.description && (
                                <div className="text-sm text-base-content/60 mt-1">
                                  {team.description}
                                </div>
                              )}
                              <div className="text-sm text-base-content/70 mt-1">
                                {team.current_count} /{" "}
                                {team.max_participants ?? "∞"} 人
                                {team.is_full && (
                                  <span className="text-error ml-2">
                                    （已满）
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          {editingTeam !== team.id && (
                            <>
                              <button
                                className="btn btn-ghost btn-sm"
                                onClick={() => setEditingTeam(team.id)}
                              >
                                <PencilLineIcon className="size-4" />
                              </button>
                              {!isFirstTeam && (
                                <button
                                  className="btn btn-ghost btn-sm text-error"
                                  onClick={() => handleDeleteTeam(team.id)}
                                >
                                  <TrashIcon className="size-4" />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    );
                  });
                })()
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 报名列表 */}
      <div className="card bg-base-100 shadow-sm">
        <div className="card-body">
          <h2 className="card-title">报名列表</h2>
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>用户</th>
                  <th>队伍</th>
                  <th>状态</th>
                  <th>报名时间</th>
                </tr>
              </thead>
              <tbody>
                {registrations.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="text-center text-base-content/50"
                    >
                      暂无报名
                    </td>
                  </tr>
                ) : (
                  registrations.map((reg) => (
                    <tr key={reg.id}>
                      <td>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => onUserClick(reg.user_id)}
                        >
                          {reg.user?.userInfo?.nickname ??
                            reg.user?.name ??
                            "未知用户"}
                        </button>
                      </td>
                      <td>
                        {reg.team ? (
                          reg.team.name
                        ) : (
                          <span className="text-base-content/50">未分配</span>
                        )}
                      </td>
                      <td>
                        {reg.is_watching ? (
                          <span className="badge badge-warning">观望</span>
                        ) : (
                          <span className="badge badge-success">已报名</span>
                        )}
                      </td>
                      <td>
                        {reg.create_at
                          ? new Date(reg.create_at).toLocaleString("zh-CN")
                          : "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// 用户详情弹窗
type UserDetailsModalProps = {
  userId: string;
  onClose: () => void;
};

function UserDetailsModal({ userId, onClose }: UserDetailsModalProps) {
  const [user, setUser] = useState<Awaited<
    ReturnType<typeof trpcClientDash.activeRegistrations.getUserDetails.query>
  > | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        setLoading(true);
        const data =
          await trpcClientDash.activeRegistrations.getUserDetails.query({
            user_id: userId,
          });
        setUser(data);
      } catch (error) {
        console.error("获取用户详情失败", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [userId]);

  return (
    <div className="modal modal-open">
      <div className="modal-box">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg">用户详情</h3>
          <button className="btn btn-sm btn-circle" onClick={onClose}>
            <XIcon className="size-4" />
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <span className="loading loading-spinner loading-md"></span>
          </div>
        ) : user ? (
          <div className="flex flex-col gap-4">
            <div>
              <label className="label">
                <span className="label-text">昵称</span>
              </label>
              <div className="text-lg">
                {user.userInfo?.nickname ?? user.name ?? "未知"}
              </div>
            </div>
            <div>
              <label className="label">
                <span className="label-text">UID</span>
              </label>
              <div className="text-sm font-mono">
                {user.userInfo?.uid ?? "—"}
              </div>
            </div>
            <div>
              <label className="label">
                <span className="label-text">手机号</span>
              </label>
              <div>{user.userInfo?.phone ?? "—"}</div>
            </div>
            <div>
              <label className="label">
                <span className="label-text">邮箱</span>
              </label>
              <div>{user.email ?? "—"}</div>
            </div>
            <div>
              <label className="label">
                <span className="label-text">注册时间</span>
              </label>
              <div>
                {user.userInfo?.create_at
                  ? new Date(user.userInfo.create_at).toLocaleString("zh-CN")
                  : "—"}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-base-content/50">
            用户不存在
          </div>
        )}

        <div className="modal-action">
          <button className="btn" onClick={onClose}>
            关闭
          </button>
        </div>
      </div>
      <div className="modal-backdrop" onClick={onClose}></div>
    </div>
  );
}
