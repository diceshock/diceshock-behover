import { XIcon } from "@phosphor-icons/react/dist/ssr";
import clsx from "clsx";
import { useCallback, useEffect, useState } from "react";
import Modal from "@/client/components/modal";
import { useMessages } from "@/client/hooks/useMessages";
import trpcClientPublic from "@/shared/utils/trpc";

type BusinessCardModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  required?: boolean; // 是否必须填写（报名时）
};

export default function BusinessCardModal({
  isOpen,
  onClose,
  onSuccess,
  required = false,
}: BusinessCardModalProps) {
  const messages = useMessages();
  const [loading, setLoading] = useState(false);
  const [isLoadingCard, setIsLoadingCard] = useState(false);
  const [businessCard, setBusinessCard] = useState<{
    share_phone: boolean | null;
    wechat: string | null;
    qq: string | null;
    custom_content: string | null;
  } | null>(null);
  const [formData, setFormData] = useState({
    share_phone: false,
    wechat: "",
    qq: "",
    custom_content: "",
  });

  // 获取当前名片
  useEffect(() => {
    if (!isOpen) return;

    const fetchBusinessCard = async () => {
      try {
        setIsLoadingCard(true);
        const data = await trpcClientPublic.businessCard.getMyBusinessCard.query({});
        setBusinessCard(data);
        if (data) {
          setFormData({
            share_phone: data.share_phone ?? false,
            wechat: data.wechat ?? "",
            qq: data.qq ?? "",
            custom_content: data.custom_content ?? "",
          });
        }
      } catch (error) {
        console.error("获取名片失败", error);
      } finally {
        setIsLoadingCard(false);
      }
    };

    fetchBusinessCard();
  }, [isOpen]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      try {
        setLoading(true);
        await trpcClientPublic.businessCard.upsertBusinessCard.mutate({
          share_phone: formData.share_phone,
          wechat: formData.wechat.trim() || undefined,
          qq: formData.qq.trim() || undefined,
          custom_content: formData.custom_content.trim() || undefined,
        });
        messages.success("名片保存成功");
        // 重新获取名片数据
        const data = await trpcClientPublic.businessCard.getMyBusinessCard.query({});
        setBusinessCard(data);
        onSuccess?.();
        if (!required) {
          onClose();
        }
      } catch (error) {
        console.error("保存名片失败", error);
        messages.error(
          error instanceof Error ? error.message : "保存名片失败",
        );
      } finally {
        setLoading(false);
      }
    },
    [formData, messages, onSuccess, onClose, required],
  );

  const handleClose = useCallback(() => {
    if (!required) {
      onClose();
    } else {
      messages.warning("请先填写名片才能报名");
    }
  }, [required, onClose, messages]);

  if (isLoadingCard) {
    return (
      <Modal isCloseOnClick={!required} isOpen={isOpen} onToggle={handleClose}>
        <div
          className={clsx(
            "modal-box max-w-none md:max-w-120 min-h-64 max-h-[80vh] rounded-xl px-0 pb-4 flex flex-col",
            "absolute not-md:bottom-0 not-md:left-0 not-md:w-full not-md:rounded-none overflow-visible",
            "border border-base-content/30",
          )}
        >
          <div className="flex items-center justify-center py-12">
            <span className="loading loading-spinner loading-md"></span>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      isCloseOnClick={!required}
      isOpen={isOpen}
      onToggle={(evt) => {
        if (!evt.open) handleClose();
      }}
    >
      <div
        className={clsx(
          "modal-box max-w-none md:max-w-120 min-h-64 max-h-[80vh] rounded-xl px-0 pb-4 flex flex-col",
          "absolute not-md:bottom-0 not-md:left-0 not-md:w-full not-md:rounded-none overflow-visible",
          "border border-base-content/30",
        )}
      >
        {!required && (
          <button
            onClick={handleClose}
            className="btn btn-sm btn-circle absolute top-4 right-4"
            disabled={loading}
          >
            <XIcon className="size-4" weight="bold" />
          </button>
        )}

        <h3 className="text-base font-bold px-7 pb-4 flex items-center gap-1">
          {required ? "填写名片（必填）" : "登记/修改名片"}
        </h3>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4 py-4 px-12 overflow-y-auto flex-1"
        >
          {/* 是否分享手机号码 */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="checkbox checkbox-primary"
              checked={formData.share_phone}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  share_phone: e.target.checked,
                }))
              }
              disabled={loading}
            />
            <span className="label-text">分享手机号码</span>
          </label>

          {/* 微信号码 */}
          <label className="flex flex-col gap-2">
            <span className="label text-sm">微信号码（选填）</span>
            <input
              type="text"
              placeholder="请输入微信号码"
              className="input input-sm"
              value={formData.wechat}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  wechat: e.target.value,
                }))
              }
              disabled={loading}
            />
          </label>

          {/* QQ号码 */}
          <label className="flex flex-col gap-2">
            <span className="label text-sm">QQ号码（选填）</span>
            <input
              type="text"
              placeholder="请输入QQ号码"
              className="input input-sm"
              value={formData.qq}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  qq: e.target.value,
                }))
              }
              disabled={loading}
            />
          </label>

          {/* 自定义内容 */}
          <label className="flex flex-col gap-2">
            <span className="label text-sm">自定义内容（选填）</span>
            <textarea
              placeholder="请输入自定义内容"
              className="textarea textarea-sm min-h-24"
              value={formData.custom_content}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  custom_content: e.target.value,
                }))
              }
              disabled={loading}
            />
          </label>

          <div className="flex justify-end gap-2 mt-4">
            {!required && (
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                onClick={handleClose}
                disabled={loading}
              >
                取消
              </button>
            )}
            <button
              type="submit"
              className="btn btn-primary btn-sm"
              disabled={loading}
            >
              {loading ? "保存中..." : "保存"}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
